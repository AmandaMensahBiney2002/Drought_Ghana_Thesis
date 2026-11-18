/**
 * js/utils.js
 *
 * Shared utility functions for the Ghana Drought Monitoring System.
 *
 * Everything in this file implements the Standardized Precipitation
 * Index (SPI) classification of McKee et al. (1993), which is the
 * classification adopted in the thesis proposal.
 *
 * Two responsibilities:
 *
 *   1. classifySPI(value)   — return the drought category name
 *                              for an SPI value
 *   2. getCategoryColor(v)  — return the hex colour for that value
 *
 * These functions are the single source of truth for the whole
 * dashboard. Every warning box, map layer and report uses them.
 * If you ever need to change a threshold or a colour, change it
 * here and nowhere else.
 */

/* ------------------------------------------------------------
   1. Drought categories, in the order used by McKee et al.
   ------------------------------------------------------------ */

/**
 * The seven SPI categories, defined in ascending SPI order.
 * "No data" is separate because it is not a category in
 * McKee et al.; it is what we display when a district has no
 * value for the selected month.
 *
 * The colours are the same palette used in the gridded maps
 * and in the prediction CSVs. Red = dry, blue = wet, grey =
 * normal. These are scientific colours, not decorative ones.
 */
export const SPI_CATEGORIES = [
    { label: "Extreme drought",    maxSpi: -2.00, colour: "#7f0000" },
    { label: "Severe drought",     maxSpi: -1.50, colour: "#d7301f" },
    { label: "Moderate drought",   maxSpi: -1.00, colour: "#fc8d59" },
    { label: "Near normal",        maxSpi:  1.00, colour: "#b8bfc7" },
    { label: "Moderately wet",     maxSpi:  1.50, colour: "#91bfdb" },
    { label: "Very wet",           maxSpi:  2.00, colour: "#4575b4" },
    { label: "Extremely wet",      maxSpi:  Infinity, colour: "#313695" }
];

/** Colour used when a value is null, NaN or absent. */
export const NO_DATA_COLOUR = "#bdbdbd";

/* ------------------------------------------------------------
   2. Classification
   ------------------------------------------------------------ */

/**
 * Return the SPI category label for a numeric value.
 *
 * The thresholds follow McKee et al. (1993):
 *   < -2.00          Extreme drought
 *   -2.00 to -1.50   Severe drought
 *   -1.50 to -1.00   Moderate drought
 *   -1.00 to  1.00   Near normal
 *    1.00 to  1.50   Moderately wet
 *    1.50 to  2.00   Very wet
 *   >=  2.00         Extremely wet
 *
 * Note that a value of exactly -0.03, which is what the
 * dashboard was previously getting wrong, will fall into
 * "Near normal", not into a drought category. This is the
 * whole point of classifying here.
 *
 * @param {number|null|undefined} value
 * @returns {string}  one of the SPI_CATEGORIES labels, or "No data"
 */
export function classifySPI(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "No data";
    }

    for (const category of SPI_CATEGORIES) {
        if (value < category.maxSpi) {
            return category.label;
        }
    }

    // Fallback, in theory unreachable because the last entry
    // has maxSpi = Infinity.
    return "Extremely wet";
}

/* ------------------------------------------------------------
   3. Colour lookup
   ------------------------------------------------------------ */

/**
 * Return the hex colour for a numeric SPI value.
 *
 * @param {number|null|undefined} value
 * @returns {string}  a hex colour such as "#fc8d59"
 */
export function getCategoryColor(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return NO_DATA_COLOUR;
    }

    const label = classifySPI(value);
    const category = SPI_CATEGORIES.find(c => c.label === label);

    return category ? category.colour : NO_DATA_COLOUR;
}

/* ------------------------------------------------------------
   4. Convenience helpers used by other files
   ------------------------------------------------------------ */

/**
 * Format an SPI value for display. Keeps two decimal places
 * and handles nulls cleanly.
 *
 * @param {number|null|undefined} value
 * @returns {string}
 */
export function formatSPI(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "N/A";
    }
    return value.toFixed(2);
}

/**
 * Normalise a district name so that CSV column names and
 * GeoJSON properties can be matched reliably.
 *
 * District names in the shapefile and in the CSV sometimes
 * differ in case, hyphens and trailing whitespace. This
 * function makes them comparable.
 *
 * @param {string|null|undefined} name
 * @returns {string}
 */
export function normaliseName(name) {
    if (!name) return "";
    return String(name)
        .toLowerCase()
        .replace(/-/g, " ")     // hyphens become spaces
        .replace(/\s+/g, " ")   // collapse whitespace
        .trim();
}