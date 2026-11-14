# EmberCal — frontend

The React/TypeScript design for EmberCal, a fire-activity explorer. **This repository is frontend only: there is no backend.** Every page renders using mock data, so the whole design can be built and reviewed before a backend exists.

## Run it

Install **Node.js 22 LTS or 24 LTS**, then:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Stop with **Ctrl+C**. In VS Code you can also use **Terminal → Run Task → EmberCal: dev**.

Build a static site into `dist/` with `npm run build`, and preview it with `npm run preview`.

## Pages

- **Overview** (`/overview`): landing page.
- **Explore** (`/app`): area-of-interest map with rectangle, polygon and circle tools; coordinate, radius and GeoJSON area forms; historical calendar with raw, harmonized and anomaly modes; seasonal charts, annual ranking and tables; CSV, PNG and PDF exports; guided tour (`?tour`).
- **Recent detections** (`/recent`): observations map and table, sensor filter, bounding-box selection, refresh button, CSV export.
- **Watch areas** (`/alerts`): saved areas and a mock alert outbox.
- **Methods** and **Accuracy**: methodology content.

Regions: Sri Lanka, Pantanal (Brazil) and New South Wales (Australia).

## Connecting your backend

The places where data enters the UI:

| What | Where | Today |
| --- | --- | --- |
| Connection status (top bar, Explore banner) | `web/src/api.ts` → `getConnectionStatus()` | returns `{ configured: false }` |
| Recent detections for a region | `web/src/api.ts` → `getLiveSnapshot(regionId)` | loads `web/src/mock/<region>.json` |
| "Refresh observations" button | `web/src/api.ts` → `refreshLiveSnapshot(regionId)` | same mock data, with a new timestamp |
| Historical calendar, anomalies, charts | `web/src/analytics.mjs` → `fixture()`, `anomaly()` | synthetic numbers generated in the browser |
| Explore-map hotspots | `web/src/analytics.mjs` → `points()` | synthetic points |
| Regions list | `web/src/analytics.mjs` → `REGIONS` | hard-coded |
| Watch areas and alerts | `web/src/main.tsx` (localStorage keys `embercal-watches`, `embercal-alerts`) | stored in the browser |

`web/src/api.ts` documents the exact TypeScript response shapes (`ConnectionStatus`, `LiveSnapshot`, `Detection`). Replace each function body with a real request that returns the same shape, and the UI keeps working. To call a backend on another port during development, uncomment the `proxy` line in `vite.config.ts`.

## Tests

```sh
npm test                 # math helpers in analytics.mjs
npm run build            # type-check and production build
npx playwright install chromium
npm run test:browser     # browser flow checks; starts/stops its own dev server
```

## Notes

Map tiles (CARTO / OpenStreetMap) and web fonts load from external providers. The mock observation files hold NASA FIRMS records saved on 14 November 2026. Sri Lanka's file is empty on purpose, so the page's no-detections state is visible.

Maps: © OpenStreetMap contributors, © CARTO. Observations: NASA FIRMS MODIS C6.1 NRT and VIIRS NOAA-20/NOAA-21 375 m NRT. No NASA endorsement is implied. Project code: MIT licence.
