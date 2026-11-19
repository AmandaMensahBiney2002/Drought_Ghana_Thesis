r"""
extract_spi_grid.py

Reads ghana_spi_monthly.nc and exports the four SPI variables
(spi_1, spi_3, spi_6, spi_12) as ONE JSON FILE PER TIMESTEP, plus a
small index file. This keeps each browser request small (~1 MB)
instead of loading the entire 366 MB cube at once.

Run from the project root:
    cd C:\Users\airli\Drought_Ghana_Thesis
    conda activate drought_ghana
    python extract_spi_grid.py

Outputs:
    dashboard_js/data/processed/spi/spi_YYYY-MM.json   (one per month)
    dashboard_js/data/processed/spi/spi_index.json     (list of months)
"""

import json
import os
import numpy as np
import xarray as xr

# ----------------------------------------------------------------------
# Paths (relative to the project root)
# ----------------------------------------------------------------------
INPUT_NC    = os.path.join("data", "processed", "ghana_spi_monthly.nc")
OUTPUT_DIR  = os.path.join("dashboard_js", "data", "processed", "spi")
INDEX_JSON  = os.path.join("dashboard_js", "data", "processed", "spi_index.json")

SPI_VARS = ["spi_1", "spi_3", "spi_6", "spi_12"]


def to_plain_list(arr):
    """numpy array -> nested Python lists, NaN -> None (valid JSON)."""
    arr = np.asarray(arr, dtype=float)
    arr = np.where(np.isnan(arr), None, arr)
    return arr.tolist()


def main():
    print(f"Opening {INPUT_NC} ...")
    if not os.path.exists(INPUT_NC):
        raise FileNotFoundError(
            f"Input file not found: {INPUT_NC}\n"
            f"Run this script from C:\\Users\\airli\\Drought_Ghana_Thesis"
        )

    ds = xr.open_dataset(INPUT_NC)

    # ---- Axes ---------------------------------------------------------
    time_name = "time" if "time" in ds.dims else list(ds.dims)[0]
    times = ds[time_name].values
    # 'YYYY-MM' for filenames, 'YYYY-MM-DD' for the time axis inside JSON
    time_ym   = [str(t)[:7] for t in times]
    time_ymd  = [str(t)[:10] for t in times]

    lat_name = "lat" if "lat" in ds.coords else ("latitude" if "latitude" in ds.coords else None)
    lon_name = "lon" if "lon" in ds.coords else ("longitude" if "longitude" in ds.coords else None)

    lats = ds[lat_name].values.tolist() if lat_name else None
    lons = ds[lon_name].values.tolist() if lon_name else None

    print(f"  time steps : {len(time_ym)}")
    print(f"  lat points : {len(lats) if lats else 'unknown'}")
    print(f"  lon points : {len(lons) if lons else 'unknown'}")

    # ---- Pre-load each variable as (time, lat, lon) -------------------
    var_data = {}
    for var in SPI_VARS:
        if var not in ds:
            print(f"  WARNING: variable '{var}' not found — skipping")
            continue
        print(f"Loading {var} ...")
        if ds[var].dims != (time_name, lat_name, lon_name):
            var_data[var] = ds[var].transpose(time_name, lat_name, lon_name).values
        else:
            var_data[var] = ds[var].values

    ds.close()

    # ---- Write one file per timestep ---------------------------------
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    index = []

    print("Writing per-timestep files ...")
    for t_idx, (ym, ymd) in enumerate(zip(time_ym, time_ymd)):
        payload = {
            "time": ymd,
            "lat": lats,
            "lon": lons,
            "variables": {},
        }
        for var, arr in var_data.items():
            # arr shape: (time, lat, lon) -> this timestep: (lat, lon)
            payload["variables"][var] = to_plain_list(arr[t_idx])

        fname = f"spi_{ym}.json"
        fpath = os.path.join(OUTPUT_DIR, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(payload, f, separators=(",", ":"))

        index.append({"time": ymd, "file": fname})

        if (t_idx + 1) % 50 == 0 or (t_idx + 1) == len(time_ym):
            print(f"  {t_idx + 1}/{len(time_ym)} written")

    # ---- Write the index ---------------------------------------------
    with open(INDEX_JSON, "w", encoding="utf-8") as f:
        json.dump(index, f, separators=(",", ":"))

    # ---- Report sizes -------------------------------------------------
    sample = os.path.join(OUTPUT_DIR, index[0]["file"])
    sample_mb = os.path.getsize(sample) / (1024 * 1024)
    total_mb = sum(
        os.path.getsize(os.path.join(OUTPUT_DIR, e["file"]))
        for e in index
    ) / (1024 * 1024)

    print(f"\nWrote {len(index)} timestep files to {OUTPUT_DIR}")
    print(f"Per-file size : ~{sample_mb:.2f} MB")
    print(f"Total on disk : {total_mb:.1f} MB")
    print(f"Index written : {INDEX_JSON}")


if __name__ == "__main__":
    main()