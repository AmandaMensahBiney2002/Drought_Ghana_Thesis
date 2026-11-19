/**
 * js/utils.js
 *
 * Shared utility functions for the Ghana Drought Monitoring System.
 * Implements the SPI classification of McKee et al. (1993).
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

export const NO_DATA_COLOUR = "#bdbdbd";

export function classifySPI(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "No data";
    }
    for (const category of SPI_CATEGORIES) {
        if (value < category.maxSpi) {
            return category.label;
        }
    }
    return "Extremely wet";
}

export function getCategoryColor(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return NO_DATA_COLOUR;
    }
    const label = classifySPI(value);
    const category = SPI_CATEGORIES.find(c => c.label === label);
    return category ? category.colour : NO_DATA_COLOUR;
}

export function formatSPI(value) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return "N/A";
    }
    return value.toFixed(2);
}

export function normaliseName(name) {
    if (!name) return "";
    return String(name)
        .toLowerCase()
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/* ------------------------------------------------------------
   Added for map.js: colour lookup by category LABEL
   ------------------------------------------------------------ */

export function getColourForLabel(label) {
    if (!label || label === "No data") return NO_DATA_COLOUR;
    const category = SPI_CATEGORIES.find(c => c.label === label);
    return category ? category.colour : NO_DATA_COLOUR;
}

export function getCategoryLabel(label) {
    return label || "No data";
}