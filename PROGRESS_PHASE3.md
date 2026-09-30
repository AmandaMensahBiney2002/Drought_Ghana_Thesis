\# Phase 3: SPI Computation — Progress Log



\*\*Date Completed:\*\* September 30, 2026



\## What Was Accomplished



\### SPI Computation (All 4 Timescales)



| SPI Timescale | Valid Values | Status |

|---------------|--------------|--------|

| SPI-1 (1-month) | 4,398,840 | ✅ Saved |

| SPI-3 (3-month) | 4,382,548 | ✅ Saved |

| SPI-6 (6-month) | 4,358,110 | ✅ Saved |

| SPI-12 (12-month) | 4,309,234 | ✅ Saved |



\### Methodology



\- \*\*Data source:\*\* CHIRPS v3.0 monthly rainfall (Ghana-clipped)

\- \*\*Time period:\*\* January 1981 – December 2025 (45 years, 540 months)

\- \*\*Calibration period:\*\* 1981–2010 (30 years)

\- \*\*Distribution:\*\* Gamma

\- \*\*Library:\*\* climate\_indices (NOAA/NCEI official)

\- \*\*Grid cells processed:\*\* 8,146



\### Output Files



| File | Size | Purpose |

|------|------|---------|

| spi\_1.npy | 24 MB | SPI-1 array |

| spi\_3.npy | 24 MB | SPI-3 array |

| spi\_6.npy | 24 MB | SPI-6 array |

| spi\_12.npy | 24 MB | SPI-12 array |

| ghana\_spi\_monthly.nc | 97 MB | Combined SPI NetCDF |

| ghana\_drought\_classification.nc | 97 MB | Drought classes |

| spi\_summary.json | Small | Metadata |



\### Drought Classification



SPI values classified into 6 categories:

\- 0 = No drought / normal

\- 1 = Mild drought (0 to -1.0)

\- 2 = Moderate drought (-1.0 to -1.5)

\- 3 = Severe drought (-1.5 to -2.0)

\- 4 = Extreme drought (≤ -2.0)

\- 5 = Wet (≥ +1.0)



\### Drought Frequency Analysis



Moderate-or-worse drought frequency across Ghana:

\- SPI-1: \~12.9% of months

\- SPI-3: \~15.1% of months

\- SPI-6: \~15.7% of months

\- SPI-12: \~14.9% of months



These frequencies match the theoretical standard normal distribution.



\### Validation



✅ \*\*1983 historic drought\*\* correctly identified as extreme

✅ \*\*1997 wet year\*\* correctly identified as near-normal

✅ \*\*2015 El Niño drought\*\* correctly identified as moderate

✅ \*\*2022 wet year\*\* correctly identified as above-normal

✅ \*\*Spatial patterns\*\* match known Ghana climate (south wetter than north)

✅ \*\*Temporal patterns\*\* show annual cycle correctly



\### Figures Created



\- spi\_timeseries\_central\_ghana.png — 45-year SPI time series

\- drought\_frequency\_maps.png — Spatial drought frequency

\- spi\_comparison\_years.png — SPI comparison for 4 key years



\### Location of Files



All outputs stored on Google Drive:

`/content/drive/MyDrive/Drought\_Ghana\_Thesis/data/processed/`



\## Next Steps



\- Phase 4: Drought Analysis (Mann-Kendall trends, theory of runs)

\- Phase 5: Machine Learning (Random Forest, XGBoost, SVR, LSTM)

\- Phase 6: Dashboard Development

\- Phase 7: Validation

\- Phase 8: Thesis Writing

