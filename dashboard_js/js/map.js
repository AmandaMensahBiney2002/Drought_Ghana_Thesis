/**
 * js/map.js
 *
 * MapLibre GL JS map management for the Ghana Drought Dashboard.
 *
 *   - initMaps(state)            : creates the observed + predicted maps
 *   - updateObservedMap(state)   : renders the SPI grid for state.year/state.month
 *   - updatePredictedMap(state)  : renders the district prediction choropleth
 *   - getSPIAtCell(lat, lon)     : helper for hover/report
 *
 * Globals provided by index.html: maplibregl (MapLibre GL JS).
 */

import { classifySPI, getColourForLabel, getCategoryLabel } from "./utils.js";


let observedMap = null;
let predictedMap = null;

const observedCache = {
    lat: null,
    lon: null,
    varName: null,
    values: null,
};

const BASEMAP_STYLE = {
    version: 8,
    sources: {
        osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
        },
    },
    layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/* Panning limit — keeps the view around Ghana. */
const GHANA_MAXBOUNDS = [
    [-6.5, 2.5],
    [4.5, 13.8],
];

/* ------------------------------------------------------------------ */
/* Initialise both maps                                               */
/* ------------------------------------------------------------------ */
export function initMaps(state) {
    observedMap = new maplibregl.Map({
        container: "observed-map",
        style: BASEMAP_STYLE,
        center: [-1.0, 7.95],
        zoom: 5,
        maxBounds: GHANA_MAXBOUNDS,
        attributionControl: true,
    });

    predictedMap = new maplibregl.Map({
        container: "predicted-map",
        style: BASEMAP_STYLE,
        center: [-1.0, 7.95],
        zoom: 5,
        maxBounds: GHANA_MAXBOUNDS,
        attributionControl: true,
    });

    observedMap.addControl(new maplibregl.NavigationControl(), "top-right");
    predictedMap.addControl(new maplibregl.NavigationControl(), "top-right");

    // Expose for debugging in the browser console
    window.__observedMap = observedMap;
    window.__predictedMap = predictedMap;

    observedMap.on("load", () => {
        observedMap.addSource("spi-grid", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
        });

        observedMap.addLayer({
            id: "spi-grid-fill",
            type: "fill",
            source: "spi-grid",
            paint: {
                "fill-color": ["get", "color"],
                "fill-opacity": 0.7,
                "fill-outline-color": "rgba(0,0,0,0.05)",
            },
        });

        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
        observedMap.on("mousemove", "spi-grid-fill", (e) => {
            if (!e.features || !e.features.length) return;
            const f = e.features[0].properties;
            observedMap.getCanvas().style.cursor = "pointer";
            popup
                .setLngLat(e.lngLat)
                .setHTML(`<strong>SPI:</strong> ${Number(f.spi).toFixed(2)}<br>${f.categoryLabel}`)
                .addTo(observedMap);
        });
        observedMap.on("mouseleave", "spi-grid-fill", () => {
            observedMap.getCanvas().style.cursor = "";
            popup.remove();
        });
    });

    predictedMap.on("load", () => {
        predictedMap.addSource("districts", {
            type: "geojson",
            data: state.districtsGeoJSON || { type: "FeatureCollection", features: [] },
        });

        predictedMap.addLayer({
            id: "district-fill",
            type: "fill",
            source: "districts",
            paint: {
                "fill-color": ["get", "color"],
                "fill-opacity": 0.75,
                "fill-outline-color": "#ffffff",
            },
        });

        predictedMap.addLayer({
            id: "district-outline",
            type: "line",
            source: "districts",
            paint: { "line-color": "rgba(0,0,0,0.25)", "line-width": 0.6 },
        });

        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
        predictedMap.on("mousemove", "district-fill", (e) => {
            if (!e.features || !e.features.length) return;
            const f = e.features[0].properties;
            predictedMap.getCanvas().style.cursor = "pointer";
            const v = (f.Predicted_SPI === null || f.Predicted_SPI === undefined)
                ? "No prediction"
                : Number(f.Predicted_SPI).toFixed(2);
            popup
                .setLngLat(e.lngLat)
                .setHTML(`<strong>${f.District}</strong><br>Predicted SPI: ${v}<br>${f.categoryLabel}`)
                .addTo(predictedMap);
        });
        predictedMap.on("mouseleave", "district-fill", () => {
            predictedMap.getCanvas().style.cursor = "";
            popup.remove();
        });
    });
}

/* ------------------------------------------------------------------ */
/* Observed SPI grid for the selected month + timescale              */
/* ------------------------------------------------------------------ */
export async function updateObservedMap(state) {
    if (!observedMap || !observedMap.getSource("spi-grid")) return;

    const ym = `${state.year}-${String(state.month).padStart(2, "0")}`;
    const url = `data/processed/spi/spi_${ym}.json`;

    let payload;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        payload = await res.json();
    } catch (err) {
        console.warn(`[map] could not load ${url}:`, err);
        return;
    }

    const varName = `spi_${state.timescale}`;
    const grid = payload.variables[varName];
    if (!grid) {
        console.warn(`[map] variable ${varName} missing in ${ym}`);
        return;
    }

    const lat = payload.lat;
    const lon = payload.lon;

    observedCache.lat = lat;
    observedCache.lon = lon;
    observedCache.varName = varName;
    observedCache.values = grid;

    const dLat = lat.length > 1 ? Math.abs(lat[0] - lat[1]) : 0.25;
    const dLon = lon.length > 1 ? Math.abs(lon[0] - lon[1]) : 0.25;
    const halfLat = dLat / 2;
    const halfLon = dLon / 2;

    const features = [];
    for (let i = 0; i < lat.length; i++) {
        for (let j = 0; j < lon.length; j++) {
            const v = grid[i][j];
            if (v === null || Number.isNaN(v)) continue;

            const cLat = lat[i];
            const cLon = lon[j];
            const cat = classifySPI(v);

            features.push({
                type: "Feature",
                properties: {
                    spi: v,
                    category: cat,
                    categoryLabel: getCategoryLabel(cat),
                    color: getColourForLabel(cat),
                },
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [cLon - halfLon, cLat - halfLat],
                        [cLon + halfLon, cLat - halfLat],
                        [cLon + halfLon, cLat + halfLat],
                        [cLon - halfLon, cLat + halfLat],
                        [cLon - halfLon, cLat - halfLat],
                    ]],
                },
            });
        }
    }

    observedMap.getSource("spi-grid").setData({
        type: "FeatureCollection",
        features,
    });

    // Fit the map to the real data extent every time a grid loads.
    // This guarantees the whole of Ghana is always visible,
    // regardless of container size or browser window.
    const latMin = Math.min(...lat);
    const latMax = Math.max(...lat);
    const lonMin = Math.min(...lon);
    const lonMax = Math.max(...lon);
    observedMap.fitBounds(
        [[lonMin, latMin], [lonMax, latMax]],
        { padding: 40, duration: 0 }
    );
}

/* ------------------------------------------------------------------ */
/* Predicted district choropleth                                      */
/* ------------------------------------------------------------------ */
export function updatePredictedMap(state) {
    if (!predictedMap || !predictedMap.getSource("districts")) return;

    const lookup = {};
    for (const row of state.predictions) {
        lookup[row.District] = row.Predicted_SPI;
    }

    const geo = JSON.parse(JSON.stringify(
        state.districtsGeoJSON || { type: "FeatureCollection", features: [] }
    ));

    for (const f of geo.features) {
        const name =
            f.properties.NAME_2 ||
            f.properties.NAME_1 ||
            f.properties.District ||
            f.properties.name ||
            "";
        const v = lookup[name];

        if (v === undefined || v === null) {
            f.properties.color = "rgba(0,0,0,0)";
            f.properties.categoryLabel = "No prediction";
            f.properties.Predicted_SPI = null;
            f.properties.District = name;
            continue;
        }
        const cat = classifySPI(v);
        f.properties.color = getColourForLabel(cat);
        f.properties.categoryLabel = getCategoryLabel(cat);
        f.properties.Predicted_SPI = v;
        f.properties.District = name;
    }

    predictedMap.getSource("districts").setData(geo);
}

/* ------------------------------------------------------------------ */
/* Hover helper                                                       */
/* ------------------------------------------------------------------ */
export function getSPIAtCell(lat, lon) {
    const { lat: lats, lon: lons, values } = observedCache;
    if (!lats || !lons || !values) return null;

    let iMin = 0, jMin = 0, dMin = Infinity;
    for (let i = 0; i < lats.length; i++) {
        for (let j = 0; j < lons.length; j++) {
            const d = (lats[i] - lat) ** 2 + (lons[j] - lon) ** 2;
            if (d < dMin) { dMin = d; iMin = i; jMin = j; }
        }
    }
    return values[iMin][jMin];
}