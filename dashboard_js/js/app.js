/**
 * js/app.js
 *
 * Application entry point for the Ghana Drought Monitoring System.
 *
 * In Step 6 this file does only one thing: it loads the district
 * data and draws the SPI history chart. Later steps will add the
 * map rendering, the warning boxes, the tab switching and the
 * download buttons.
 */

import { loadAllDistrictData, getDistrictNames } from "./data.js";
import { renderHistoryChart } from "./charts.js";

/* ------------------------------------------------------------
   Application state
   ------------------------------------------------------------ */

const state = {
    district: null,
    timescale: "3"
};

/** Holds the loaded district data, keyed by timescale then district */
let localDistrictData = null;

/* ------------------------------------------------------------
   Initialisation
   ------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Starting dashboard...");

    // 1. Load the district data
    localDistrictData = await loadAllDistrictData();

    // 2. Populate the district dropdown
    populateDistrictDropdown();

    // 3. Set initial state
    state.district = document.getElementById("district-select").value;
    state.timescale = document.querySelector("#timescale-group .active").dataset.ts;

    // 4. Draw the first chart
    renderChart();

    // 5. Attach event listeners
    attachChartListeners();

    console.log(`Ready. Showing ${state.district}, SPI-${state.timescale}.`);
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
    console.log(`Populated dropdown with ${districts.length} districts.`);
}

/* ------------------------------------------------------------
   Chart rendering
   ------------------------------------------------------------ */

function renderChart() {
    const series = localDistrictData[state.timescale][state.district] || [];
    renderHistoryChart("spi-history-chart", series, state.district, state.timescale);
}

/* ------------------------------------------------------------
   Event listeners
   ------------------------------------------------------------ */

function attachChartListeners() {
    // District change
    document.getElementById("district-select").addEventListener("change", (e) => {
        state.district = e.target.value;
        renderChart();
    });

    // Timescale change
    document.querySelectorAll("#timescale-group button").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll("#timescale-group button").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            state.timescale = e.target.dataset.ts;
            renderChart();
        });
    });
}