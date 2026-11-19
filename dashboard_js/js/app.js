/**
 * js/app.js
 *
 * Application entry point for the Ghana Drought Monitoring System.
 *
 * Responsibilities:
 *   - load district data + GeoJSON
 *   - populate district dropdown, month/year pickers
 *   - initialise both maps
 *   - drive chart + observed map + predicted map from a single state
 *   - wire district / timescale / lead / month / year controls
 *   - populate the current + forecast warning boxes
 *   - generate downloadable drought report (TXT) and predictions (CSV)
 */

import { loadAllDistrictData, getDistrictNames, loadGeoJSON, loadPredictions } from "./data.js";
import { renderHistoryChart } from "./charts.js";
import { initMaps, updateObservedMap, updatePredictedMap } from "./map.js";
import { classifySPI, getCategoryColor, formatSPI } from "./utils.js";

/* ------------------------------------------------------------
   Application state
   ------------------------------------------------------------ */
const state = {
    district: null,
    timescale: "3",
    lead: "1",
    year: 2025,
    month: 12,
    predictions: [],
    districtsGeoJSON: null,
};

let localDistrictData = null;

/* ------------------------------------------------------------
   Initialisation
   ------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", async () => {
    console.log("Starting dashboard...");

    localDistrictData = await loadAllDistrictData();
    state.districtsGeoJSON = await loadGeoJSON();

    populateDistrictDropdown();
    populateMonthYearPickers();

    state.district = document.getElementById("district-select").value;
    state.timescale = document.querySelector("#timescale-group .active")?.dataset.ts || "3";
    state.lead = document.querySelector("#lead-group .active")?.dataset.lead || "1";
    state.year = Number(document.getElementById("year-select").value);
    state.month = Number(document.getElementById("month-select").value);

    initMaps(state);

    state.predictions = await loadPredictions(state.timescale, state.lead);

    await refreshAll();
    attachListeners();

    console.log(`Ready. ${state.district}, SPI-${state.timescale}, lead ${state.lead}, ${state.year}-${state.month}.`);
});

/* ------------------------------------------------------------
   UI population
   ------------------------------------------------------------ */
function populateDistrictDropdown() {
    const select = document.getElementById("district-select");
    const districts = getDistrictNames(state.timescale);
    select.innerHTML = "";
    for (const d of districts) {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        select.appendChild(opt);
    }
}

function populateMonthYearPickers() {
    const monthSelect = document.getElementById("month-select");
    const yearSelect = document.getElementById("year-select");

    const months = ["January","February","March","April","May","June",
                    "July","August","September","October","November","December"];
    if (monthSelect && !monthSelect.options.length) {
        monthSelect.innerHTML = months
            .map((m, i) => `<option value="${i + 1}" ${i === 11 ? "selected" : ""}>${m}</option>`)
            .join("");
    }
    if (yearSelect && !yearSelect.options.length) {
        const years = Array.from({ length: 45 }, (_, i) => 1981 + i); // 1981..2025
        yearSelect.innerHTML = years
            .map(y => `<option value="${y}" ${y === 2025 ? "selected" : ""}>${y}</option>`)
            .join("");
    }
}

/* ------------------------------------------------------------
   Refresh everything for the current state
   ------------------------------------------------------------ */
async function refreshAll() {
    renderChart();
    await updateObservedMap(state);
    updatePredictedMap(state);
    updateWarningBoxes();
}

function renderChart() {
    const series = localDistrictData[state.timescale]?.[state.district] || [];
    renderHistoryChart("spi-history-chart", series, state.district, state.timescale);
}

/* ------------------------------------------------------------
   Warning boxes
   ------------------------------------------------------------ */
function getLatestSPIForDistrict(district, timescale) {
    const series = localDistrictData?.[timescale]?.[district];
    if (!series || series.length === 0) return null;
    const last = series[series.length - 1];
    return last && last.value !== undefined ? last.value : null;
}

function getForecastSPIForDistrict(district) {
    if (!state.predictions || state.predictions.length === 0) return null;
    const row = state.predictions.find(p => p.District === district);
    return row ? row.Predicted_SPI : null;
}

function setWarningBox(elementId, label, spiValue) {
    const box = document.getElementById(elementId);
    if (!box) return;

    if (spiValue === null || spiValue === undefined || Number.isNaN(spiValue)) {
        box.textContent = `${label}: no data`;
        box.style.background = "#bdbdbd";
        box.style.color = "#ffffff";
        return;
    }

    const category = classifySPI(spiValue);
    const colour = getCategoryColor(spiValue);

    box.textContent = `${label}: ${category} (SPI ${formatSPI(spiValue)})`;
    box.style.background = colour;

    const lightCategories = ["Near normal", "Moderately wet"];
    box.style.color = lightCategories.includes(category) ? "#1a1a1a" : "#ffffff";
}

function updateWarningBoxes() {
    const currentSPI = getLatestSPIForDistrict(state.district, state.timescale);
    const forecastSPI = getForecastSPIForDistrict(state.district);

    setWarningBox("current-warning", "Current", currentSPI);
    setWarningBox("forecast-warning", `Forecast (+${state.lead} mo)`, forecastSPI);
}

/* ------------------------------------------------------------
   Downloads
   ------------------------------------------------------------ */
function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function buildDroughtReport() {
    const district = state.district;
    const ts = state.timescale;
    const lead = state.lead;
    const ym = `${state.year}-${String(state.month).padStart(2, "0")}`;

    const series = localDistrictData?.[ts]?.[district] || [];
    const currentSPI = getLatestSPIForDistrict(district, ts);
    const forecastSPI = getForecastSPIForDistrict(district);

    const currentCat = currentSPI === null ? "No data" : classifySPI(currentSPI);
    const forecastCat = forecastSPI === null ? "No data" : classifySPI(forecastSPI);

    const currentStr = currentSPI === null
        ? "No data"
        : `${currentCat} (SPI ${formatSPI(currentSPI)})`;
    const forecastStr = forecastSPI === null
        ? "No data"
        : `${forecastCat} (SPI ${formatSPI(forecastSPI)})`;

    const last6 = series.slice(-6);
    const historyLines = last6.length
        ? last6.map(p => `  ${p.date}   SPI ${formatSPI(p.value)}   ${classifySPI(p.value)}`).join("\n")
        : "  (no history available)";

    const lines = [
        "============================================================",
        "GHANA DROUGHT MONITORING & PREDICTION SYSTEM",
        "District Drought Report",
        "============================================================",
        "",
        `District        : ${district}`,
        `SPI timescale   : SPI-${ts}`,
        `Forecast lead   : ${lead} month(s)`,
        `Month of record : ${ym}`,
        `Generated       : ${new Date().toISOString()}`,
        "",
        "------------------------------------------------------------",
        "CURRENT CONDITIONS",
        "------------------------------------------------------------",
        `  ${currentStr}`,
        "",
        "------------------------------------------------------------",
        `FORECAST (+${lead} month${lead === "1" ? "" : "s"})`,
        "------------------------------------------------------------",
        `  ${forecastStr}`,
        "",
        "------------------------------------------------------------",
        "LAST 6 MONTHS (observed SPI)",
        "------------------------------------------------------------",
        historyLines,
        "",
        "------------------------------------------------------------",
        "CLASSIFICATION (McKee et al., 1993)",
        "------------------------------------------------------------",
        "  SPI < -2.00   Extreme drought",
        "  -2.00 to -1.50 Severe drought",
        "  -1.50 to -1.00 Moderate drought",
        "  -1.00 to  1.00 Near normal",
        "   1.00 to  1.50 Moderately wet",
        "   1.50 to  2.00 Very wet",
        "  SPI >= 2.00   Extremely wet",
        "",
        "------------------------------------------------------------",
        "DATA SOURCES",
        "------------------------------------------------------------",
        "  Observed SPI : CHIRPS monthly rainfall, 1981-present",
        "  Forecast     : Machine-learning model selected per",
        "                 timescale and lead (see thesis Chapter 4)",
        "",
        "============================================================",
        "End of report",
        "============================================================",
        ""
    ];

    return lines.join("\n");
}

function downloadDroughtReport() {
    const filename = `drought_report_${state.district.replace(/\s+/g, "_")}_SPI-${state.timescale}_${state.year}-${String(state.month).padStart(2, "0")}.txt`;
    downloadTextFile(filename, buildDroughtReport());
}

function downloadPredictionsCSV() {
    if (!state.predictions || state.predictions.length === 0) {
        alert("No prediction data loaded for this configuration.");
        return;
    }

    const header = "District,Predicted_SPI,Category\n";
    const rows = state.predictions.map(p => {
        const v = p.Predicted_SPI;
        const cat = (v === null || v === undefined || Number.isNaN(v))
            ? "No data"
            : classifySPI(v);
        const value = (v === null || v === undefined || Number.isNaN(v)) ? "" : v;
        const name = `"${String(p.District).replace(/"/g, '""')}"`;
        return `${name},${value},${cat}`;
    }).join("\n");

    const filename = `predictions_SPI-${state.timescale}_lead${state.lead}_${state.year}-${String(state.month).padStart(2, "0")}.csv`;
    downloadTextFile(filename, header + rows + "\n");
}

/* ------------------------------------------------------------
   Event listeners
   ------------------------------------------------------------ */
function attachListeners() {
    // District
    document.getElementById("district-select").addEventListener("change", (e) => {
        state.district = e.target.value;
        renderChart();
        updateWarningBoxes();
    });

    // Timescale
    document.querySelectorAll("#timescale-group button").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            document.querySelectorAll("#timescale-group button").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            state.timescale = e.target.dataset.ts;
            await refreshAll();
        });
    });

    // Lead time
    document.querySelectorAll("#lead-group button").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            document.querySelectorAll("#lead-group button").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            state.lead = e.target.dataset.lead;
            state.predictions = await loadPredictions(state.timescale, state.lead);
            updatePredictedMap(state);
            updateWarningBoxes();
        });
    });

    // Month / year
    document.getElementById("month-select")?.addEventListener("change", async (e) => {
        state.month = Number(e.target.value);
        await updateObservedMap(state);
    });
    document.getElementById("year-select")?.addEventListener("change", async (e) => {
        state.year = Number(e.target.value);
        await updateObservedMap(state);
    });

    // Tabs
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            const tab = e.target.dataset.tab;
            document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
            document.getElementById(`tab-${tab}`)?.classList.add("active");
            if (tab === "prediction") window.__predictedMap?.resize();
            if (tab === "monitoring") window.__observedMap?.resize();
        });
    });

    // Download report
    document.getElementById("btn-download-report")?.addEventListener("click", () => {
        downloadDroughtReport();
    });

    // Download predictions CSV
    document.getElementById("btn-download-preds")?.addEventListener("click", () => {
        downloadPredictionsCSV();
    });
}