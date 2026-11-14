# EmberCal — VS Code edition

A local React/TypeScript fire-activity explorer with a Node server for protected NASA FIRMS requests. Includes complete source, saved observed datasets, tests, optional Python tools, and VS Code tasks/debug settings.

## Fastest start (prebuilt app)

Install Node.js 22/24, open the extracted folder in VS Code, and run `npm start`. Open **http://127.0.0.1:3000**. The ZIP includes a prebuilt bundle, so this path needs no dependency install. To edit the app with hot reload, follow the development steps below.

## Develop in VS Code

1. Install **Node.js 22 LTS or 24 LTS**. Open the extracted `embercal` folder in VS Code.
2. Open **Terminal → New Terminal** and run:

   ```sh
   npm ci
   npm run dev
   ```

3. Open **http://127.0.0.1:5173**. No separate build or Python installation is required.

The development command starts Vite and the local API together. Stop both with **Ctrl+C**. You can also use **Terminal → Run Task → EmberCal: dev**. The optional **EmberCal: launch in Chrome** debug configuration starts the app and opens Chrome.

## Enable live NASA refresh

Saved observed records work without an API key. To refresh them:

1. Copy `.env.example` to a file named `.env` in the project root. Use VS Code Explorer, or `Copy-Item .env.example .env` in PowerShell / `cp .env.example .env` on macOS or Linux.
2. Paste your own key after `FIRMS_MAP_KEY=` in `.env`.
3. Restart `npm run dev`, open **Recent detections**, and choose **Refresh observations**.

The supplied chat key is deliberately **not included in the download**. `.env` is ignored by Git and Docker. The local Node server reads the key; browser code never receives it. Do not prefix this variable with `VITE_`.

A refresh makes three fixed-region source requests, each using FIRMS' supported five-day window. All three must succeed before the cached snapshot changes. Successful snapshots are reused for 15 minutes within the server process. The cache resets on restart; no scheduled/background monitoring is enabled.

## What works in this release

- Overview, historical demo explorer, Methods, Accuracy, and watch-area pages.
- Three regions: Sri Lanka, Pantanal, and New South Wales.
- Map rectangle/polygon/circle tools, coordinate/radius and bounding-box forms, GeoJSON upload.
- Historical calendar with raw/harmonized/anomaly modes, seasonal charts, annual ranking, tables, and historical comparisons.
- CSV, PNG and PDF exports; region sharing; browser-local watch areas and mock alert outbox.
- Observed recent FIRMS detections with map/table views, sensor filtering, bounding-box selection, acquisition times, raw sensor confidence and CSV export.
- Production build and local production server; optional Python API, math tests, fixture reproduction, and archive-to-Parquet import.

**The historical calendar is still synthetic.** Its custom-area counts are bounding-box area estimates, not calibrated spatial queries. Recent observations are real NASA FIRMS records, but remain raw NRT detections: no validated fire-confidence model or industrial mask is applied. Watch alerts are mocked locally and send no email/Telegram. Ground-truth validation, full historical calibration, agency accounts and operational monitoring are unfinished. See `docs/ROADMAP.md`.

## Production-style local run

```sh
npm run build
npm start
```

Open **http://127.0.0.1:3000**. The production server reads `.env` too. Set `PORT` if you need another port. Development uses ports 5173 (UI) and 8787 (API); `EMBERCAL_API_PORT` in `.env` changes the API port. If 5173 is busy, stop the conflicting process.

The local servers bind only to your computer by default. Do not expose them publicly without adding authentication and deployment controls.

## Tests

```sh
npm test                 # JavaScript math, FIRMS and local-server integration
npm run build            # TypeScript and production compilation
npx playwright install chromium
npm run test:browser     # browser flow checks; starts/stops its own dev server
```

Browser checks cover navigation, charts, coordinate selection, drawing a rectangle, CSV/PDF/PNG downloads, observed records, mock alerts and mobile layout. Map tests use a deterministic local style so external tile outages do not break the test. To use an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path.

See **TEST_REPORT.md** for checks performed on this downloadable release and their limits.

## Optional Python tools

Python is **not needed** for the main app. For the extra API and scientific reference utilities, use Python 3.12:

```sh
python -m venv .venv
```

Activate with `.venv\Scripts\Activate.ps1` in PowerShell, or `source .venv/bin/activate` on macOS/Linux, then:

```sh
python -m pip install -r requirements.lock.txt
python -m unittest discover -s pipeline -p "test_*.py"
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:8000/docs**. This optional Python API serves synthetic monthly examples; the main app uses the Node server, not this API. `/api/daily` and `/api/events` deliberately return 501 because authentic daily history and event clustering are not implemented.

`python -m pipeline.demo --region sri_lanka` recreates the synthetic fixture. `python -m pipeline.import_archive archive.zip` imports FIRMS CSV archives to Parquet. The manual history downloader requires `FIRMS_MAP_KEY` in the process environment and uses resumable five-day windows; it does not run automatically.

## Optional Docker

With Docker Desktop running:

```sh
docker compose up --build
```

Open **http://localhost:3000**; the optional Python API is at **http://localhost:8000/docs**. Stop with `docker compose down`. The `.env` key is passed to the server at runtime and is not built into the image. See TEST_REPORT.md for the container test details.

## Network and data limits

Install requires internet access. Live refresh requires NASA FIRMS access; map tiles and web fonts use external providers. Charts, saved records, coordinate forms and exports remain available if the basemap cannot load. This is not an offline PWA. Saved observation snapshots were downloaded on **14 November 2026**; the UI shows fetch times and warns when stale.

Maps: © OpenStreetMap contributors, © CARTO. Observations: NASA FIRMS MODIS C6.1 NRT and VIIRS NOAA-20/NOAA-21 375 m NRT. No NASA endorsement is implied. Project code: MIT licence. See `submission/ai_disclosure.md`.
