/**
 * js/charts.js
 *
 * Chart.js rendering for the Ghana Drought Monitoring System.
 *
 * Responsibility: draw the SPI time-series line chart for a
 * given district and timescale, with the drought thresholds
 * marked as horizontal reference lines.
 *
 * Chart.js is loaded as a global (window.Chart) by index.html,
 * so we do not import it here. The annotation plugin is also
 * loaded globally, which is what allows the horizontal
 * reference lines.
 */

import { getCategoryColor } from "./utils.js";

/* ------------------------------------------------------------
   1. The chart instance
   There is exactly one chart at a time. When a new one is
   requested, the old one is destroyed first to free its canvas.
   ------------------------------------------------------------ */

let chartInstance = null;

/** Register the annotation plugin once, if it is present. */
if (window.Chart && window.Chart.registry && window["chartjs-plugin-annotation"]) {
    // The plugin is auto-registered by its own script tag in
    // modern Chart.js. Nothing to do here; this block is a
    // safeguard in case you ever load Chart.js without the
    // plugin bundled.
}

/* ------------------------------------------------------------
   2. Public rendering function
   ------------------------------------------------------------ */

/**
 * Render the SPI time-series chart.
 *
 * @param {string} canvasId     The id of the <canvas> element, e.g. "spi-history-chart"
 * @param {Array<{date: string, value: number}>} series
 *                              The SPI series for the selected district
 * @param {string} district     District name, used in the title
 * @param {string} timescale    "1" | "3" | "6" | "12"
 * @param {string|null} highlightDate
 *                              Optional ISO date to mark on the chart
 *                              with a vertical line. Pass null or omit
 *                              to skip the highlight.
 * @param {number|null} highlightValue
 *                              Value at that date, used for the marker.
 */
export function renderHistoryChart(canvasId, series, district, timescale, highlightDate = null, highlightValue = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn(`No canvas with id "${canvasId}"`);
        return;
    }

    // Destroy any existing chart on this canvas
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    const ctx = canvas.getContext("2d");
    const labels = series.map(p => p.date);
    const data = series.map(p => p.value);

    // Threshold annotations
    const annotations = {
        moderate: {
            type: "line",
            yMin: -1.0,
            yMax: -1.0,
            borderColor: "#fc8d59",
            borderWidth: 1,
            borderDash: [6, 6],
            label: {
                display: true,
                content: "Moderate (−1.0)",
                position: "end",
                backgroundColor: "rgba(252, 141, 89, 0.9)",
                color: "#ffffff",
                font: { size: 10 }
            }
        },
        severe: {
            type: "line",
            yMin: -1.5,
            yMax: -1.5,
            borderColor: "#d7301f",
            borderWidth: 1,
            borderDash: [6, 6],
            label: {
                display: true,
                content: "Severe (−1.5)",
                position: "end",
                backgroundColor: "rgba(215, 48, 31, 0.9)",
                color: "#ffffff",
                font: { size: 10 }
            }
        },
        zero: {
            type: "line",
            yMin: 0,
            yMax: 0,
            borderColor: "#9ca3af",
            borderWidth: 1
        }
    };

    // Optional vertical marker for the selected month
    if (highlightDate) {
        annotations.selectedMonth = {
            type: "line",
            xMin: highlightDate,
            xMax: highlightDate,
            borderColor: "#1a1a1a",
            borderWidth: 1.5,
            borderDash: [3, 3]
        };
        if (highlightValue !== null && highlightValue !== undefined) {
            annotations.selectedPoint = {
                type: "point",
                xValue: highlightDate,
                yValue: highlightValue,
                radius: 6,
                backgroundColor: getCategoryColor(highlightValue),
                borderColor: "#1a1a1a",
                borderWidth: 2
            };
        }
    }

    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: `SPI-${timescale} for ${district}`,
                    data: data,
                    borderColor: "#006b3f",
                    backgroundColor: "rgba(0, 107, 63, 0.08)",
                    borderWidth: 1.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    fill: false,
                    tension: 0.15,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    labels: {
                        boxWidth: 12,
                        font: { size: 11 }
                    }
                },
                title: {
                    display: true,
                    text: `Historical SPI-${timescale} — ${district}`,
                    font: { size: 13, weight: "600" },
                    padding: { bottom: 8 }
                },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            const v = ctx.parsed.y;
                            if (v === null || v === undefined) return "";
                            return `SPI = ${v.toFixed(2)}`;
                        }
                    }
                },
                annotation: {
                    annotations: annotations
                }
            },
            scales: {
                x: {
                    type: "category",
                    display: true,
                    title: {
                        display: true,
                        text: "Date",
                        font: { size: 11 }
                    },
                    ticks: {
                        maxTicksLimit: 12,
                        font: { size: 10 },
                        callback: function (val, index) {
                            const label = this.getLabelForValue(val);
                            if (!label) return "";
                            return label.slice(0, 7); // YYYY-MM
                        }
                    },
                    grid: { display: false }
                },
                y: {
                    display: true,
                    min: -3.5,
                    max: 3.5,
                    title: {
                        display: true,
                        text: "SPI",
                        font: { size: 11 }
                    },
                    ticks: {
                        stepSize: 0.5,
                        font: { size: 10 }
                    },
                    grid: {
                        color: "rgba(0, 0, 0, 0.06)"
                    }
                }
            }
        }
    });

    return chartInstance;
}

/* ------------------------------------------------------------
   3. Utility for other modules
   ------------------------------------------------------------ */

/**
 * Destroy the current chart if one exists. Used when clearing
 * the tab or replacing content. Not strictly required, because
 * renderHistoryChart destroys the previous chart on redraw.
 */
export function destroyChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}