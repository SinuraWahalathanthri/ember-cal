# Downloadable release verification

Release: EmberCal VS Code edition 0.2.0 · 14 November 2026.

## Verified

- Clean local API startup without `dist`, a key, or Python.
- Fresh ZIP extraction: prebuilt production startup without node_modules; full browser checks against that extracted bundle; clean npm ci, all JavaScript tests and production rebuild.
- 20 JavaScript tests: math, NASA response normalization, three-call bounded fetching, empty responses, safe failures, origin checks, cache behavior, and actual local HTTP requests.
- 11 Python math tests in a fresh Python 3.12 virtual environment installed from the included pinned dependency versions.
- Optional FastAPI endpoints for calendar, climatology, anomaly, annual totals, hotspots and CSV; partial-month rejection.
- A recorded CSV ZIP imported to Parquet, including stable-ID deduplication.
- TypeScript/Vite/Worker production compilation and production-server page/asset/API routing.
- Production dependencies: npm audit reports zero known vulnerabilities after updating MapLibre and jsPDF.

Browser checks cover navigation, 26 calendar rows, seasonal and annual table views, coordinate/radius selection, rectangle drawing, rendered map-point popups, summary CSV, PDF and PNG downloads, observed records/CSV, local mock alerts, Accuracy, and mobile layout at 390 px. External map styles and fonts are substituted in this repeatable test, so tile-provider availability is not implied. See scripts/browser-smoke.mjs.

## Limits

- Tested on Linux with Node 24, Python 3.12 and Chromium. Windows/macOS are not directly tested; local launch scripts use cross-platform Node APIs and the download includes VS Code settings.
- Docker testing reached dependency installation but could not complete because the environment ran out of disk space. Its HTTPS-inspecting proxy also required a temporary CA mount. Docker configuration is included but not verified; use the tested npm workflow.
- External maps/fonts and live NASA refresh need internet. No permanent background monitoring, real external alert delivery, agency accounts or field validation is implemented.
- Historical charts and their uncertainty remain synthetic; recent snapshots are authentic NASA NRT observations downloaded on 14 November 2026. No scientific accuracy claim is made.
- Live key verification and observed-data retrieval were performed during the preceding hosted integration. The key is deliberately absent from this ZIP; users must put their key in a local ignored `.env` to refresh.

The archive contains source, a prebuilt production bundle, sample observations, tests, VS Code settings and documentation. It excludes `.env`, credentials, hosted Site identity, Git metadata, node_modules, Python virtual environments, caches and test screenshots.
