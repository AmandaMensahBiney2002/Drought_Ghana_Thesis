/**
 * js/data.js
 *
 * Data loading for the Ghana Drought Monitoring & Prediction System.
 *
 * This module is responsible for fetching and parsing:
 *
 *   1. The district SPI time series for all four timescales
 *      (district_spi_1.csv, district_spi_3.csv, district_spi_6.csv,
 *       district_spi_12.csv)
 *
 *   2. The eight prediction CSVs
 *      (latest_predictions_spi{ts}_lead{lead}.csv)
 *
 *   3. The district boundary GeoJSON
 *      (ghana_districts.geojson)
 *
 * Every file is fetched once and cached in module-level variables.
 * Subsequent calls return the cached result without another request.
 *
 * PapaParse is loaded as a global (window.Papa) by index.html, so
 * we do not import it here.
 */

/* ------------------------------------------------------------
   1. Module-level caches
   ------------------------------------------------------------ */

/** Cached district SPI data, keyed by timescale: { "1": {...}, "3": {...}, ... } */
let districtDataCache = null;

/** Cached GeoJSON FeatureCollection */
let geojsonCache = null;

/** Cached predictions, keyed by "spi{ts}_lead{lead}": { District, Predicted_SPI }[] */
const predictionCache = {};

/** Paths, defined once so a change is made in one place */
const PATHS = {
    districtCsv: (ts) => `data/processed/district_spi_${ts}.csv`,
    predictionCsv: (ts, lead) => `data/processed/latest_predictions_spi${ts}_lead${lead}.csv`,
    geojson: `data/shapefiles/ghana_districts.geojson`
};

const TIMESCALES = ["1", "3", "6", "12"];

/* ------------------------------------------------------------
   2. Low-level fetch helper
   ------------------------------------------------------------ */

/**
 * Fetch a text file and return its contents as a string.
 * Throws a clear error if the response is not OK.
 *
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
    }
    return response.text();
}

/* ------------------------------------------------------------
   3. District SPI series
   ------------------------------------------------------------ */

/**
 * Load all four district SPI CSVs.
 *
 * Each CSV has the form:
 *
 *   date,Asunafo North,Asunafo South,...
 *   1981-01-01,-0.29,0.08,...
 *   1981-02-01,0.09,0.12,...
 *   ...
 *
 * We transform each into a structure keyed by district:
 *
 *   {
 *     "Asunafo North": [
 *        { date: "1981-01-01", value: -0.29 },
 *        { date: "1981-02-01", value:  0.09 },
 *        ...
 *     ],
 *     "Asunafo South": [ ... ],
 *     ...
 *   }
 *
 * The result is cached so subsequent calls are instant.
 *
 * @returns {Promise<Object>}   { "1": {...}, "3": {...}, "6": {...}, "12": {...} }
 */
export async function loadAllDistrictData() {
    if (districtDataCache) return districtDataCache;

    const result = {};

    for (const ts of TIMESCALES) {
        const csvText = await fetchText(PATHS.districtCsv(ts));

        const parsed = Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
        });

        if (parsed.errors.length > 0) {
            console.warn(`District SPI-${ts} parse warnings:`, parsed.errors);
        }

        // The first column is the date. Every other column is a district.
        const headers = parsed.meta.fields;
        const dateColumn = headers[0];
        const districtNames = headers.slice(1);

        // Build per-district series
        const byDistrict = {};
        for (const district of districtNames) {
            byDistrict[district] = [];
        }

        for (const row of parsed.data) {
            const date = row[dateColumn];
            if (!date) continue;

            for (const district of districtNames) {
                const value = row[district];
                if (value !== null && value !== undefined) {
                    byDistrict[district].push({ date, value });
                }
            }
        }

        result[ts] = byDistrict;
    }

    districtDataCache = result;
    return result;
}

/**
 * Return the list of district names available for a given timescale.
 * If the data is not loaded yet, this returns an empty array.
 *
 * @param {string} ts  one of "1", "3", "6", "12"
 * @returns {string[]}
 */
export function getDistrictNames(ts) {
    if (!districtDataCache || !districtDataCache[ts]) return [];
    return Object.keys(districtDataCache[ts]).sort();
}

/* ------------------------------------------------------------
   4. Predictions
   ------------------------------------------------------------ */

/**
 * Load a prediction CSV for a given timescale and lead.
 *
 * Each CSV has two columns: District, Predicted_SPI.
 * Rows may contain null Predicted_SPI for districts with no model output.
 *
 * Results are cached per (ts, lead) key.
 *
 * @param {string} ts     "1" | "3" | "6" | "12"
 * @param {string} lead   "1" | "3"
 * @returns {Promise<Array<{District: string, Predicted_SPI: number|null}>>}
 */
export async function loadPredictions(ts, lead) {
    const key = `${ts}_${lead}`;
    if (predictionCache[key]) return predictionCache[key];

    const csvText = await fetchText(PATHS.predictionCsv(ts, lead));

    const parsed = Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
    });

    if (parsed.errors.length > 0) {
        console.warn(`Predictions SPI-${ts} Lead-${lead} parse warnings:`, parsed.errors);
    }

    const rows = parsed.data
        .filter(r => r.District)
        .map(r => ({
            District: r.District,
            Predicted_SPI: (r.Predicted_SPI === null || r.Predicted_SPI === undefined)
                ? null
                : Number(r.Predicted_SPI)
        }));

    predictionCache[key] = rows;
    return rows;
}

/**
 * Look up a single district's prediction from an already-loaded array.
 *
 * @param {Array<{District: string, Predicted_SPI: number|null}>} predictions
 * @param {string} district
 * @returns {number|null}
 */
export function getPredictionFor(predictions, district) {
    if (!predictions) return null;
    const match = predictions.find(p => p.District === district);
    return match ? match.Predicted_SPI : null;
}

/* ------------------------------------------------------------
   5. District GeoJSON
   ------------------------------------------------------------ */

/**
 * Load the district boundary GeoJSON.
 *
 * The FeatureCollection returned has one Feature per district. Each
 * Feature's `properties.NAME_2` holds the district name, matching
 * the column names in the district SPI CSVs (after normalisation).
 *
 * @returns {Promise<Object>}
 */
export async function loadGeoJSON() {
    if (geojsonCache) return geojsonCache;

    const text = await fetchText(PATHS.geojson);
    geojsonCache = JSON.parse(text);
    return geojsonCache;
}

/* ------------------------------------------------------------
   6. Diagnostic helper
   ------------------------------------------------------------ */

/**
 * Print a short summary of the loaded data to the console.
 * Used in Step 5's verification. Not required by the dashboard.
 */
export function printDataSummary() {
    if (!districtDataCache) {
        console.warn("District data not loaded yet.");
        return;
    }
    for (const ts of TIMESCALES) {
        const names = getDistrictNames(ts);
        const example = names[0];
        const len = example ? districtDataCache[ts][example].length : 0;
        console.log(`SPI-${ts}: ${names.length} districts, ${len} months each`);
        if (example) {
            const last = districtDataCache[ts][example][len - 1];
            console.log(`  Example: ${example}, last month ${last.date} = ${last.value}`);
        }
    }
}