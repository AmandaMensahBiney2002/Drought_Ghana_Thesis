\# Project Progress Log



\## Development of an Interactive Monitoring and Prediction System for Drought in Ghana



\*\*Author:\*\* Amanda Esi Korkor Mensah-Biney

\*\*Supervisor:\*\* Prof. Andam-Akorful

\*\*Institution:\*\* Kwame Nkrumah University of Science and Technology (KNUST)



\---



\## Progress Timeline



\### September 2026: Environment Setup and Data Preparation



\*\*Completed:\*\*

\- Set up Anaconda environment (`drought\_ghana`)

\- Created project folder structure

\- Set up Git and GitHub with SSH authentication

\- Downloaded 540 CHIRPS v3.0 monthly rainfall files (1981-2025)

\- Clipped all 540 files to Ghana's national boundary

\- Fixed 11 corrupted TIFF downloads

\- Reduced data from \~5 GB to \~5 MB



\*\*Data Source:\*\*

\- CHIRPS v3.0 Africa monthly TIFFs

\- URL: https://data.chc.ucsb.edu/products/CHIRP-v3.0/monthly/africa/tifs/



\*\*Data Location:\*\*

\- Google Drive: `Drought\_Ghana\_Thesis/data/processed/ghana\_monthly/`



\---



\## Completed Deliverables



\- \[x] Data acquisition: 540 CHIRPS v3.0 files (1981-2025)

\- \[x] Data clipping: All files clipped to Ghana

\- \[ ] NetCDF creation: Combining TIFFs into single NetCDF

\- \[ ] SPI computation: SPI-1, SPI-3, SPI-6, SPI-12

\- \[ ] Drought analysis: Trends, frequency, spatial patterns

\- \[ ] ML models: LSTM, Random Forest, XGBoost, SVR

\- \[ ] Dashboard: Interactive Streamlit app

\- \[ ] Validation: Historical drought events

\- \[ ] Thesis writing: 6 chapters



\---



\## Next Steps



1\. Combine 540 clipped TIFFs into a single NetCDF file

2\. Compute SPI at 1-, 3-, 6-, and 12-month timescales

3\. Analyze drought patterns

4\. Train machine learning models

5\. Build the interactive dashboard

6\. Validate results

7\. Write and submit thesis

