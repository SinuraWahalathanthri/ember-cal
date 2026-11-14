# Decisions

This delivery is a browser-local demonstration of the requested experience. No FIRMS credential or verified ground-truth dataset was supplied. All counts, points, confidence evidence and uncertainty ranges are synthetic and labelled accordingly. No measured scientific accuracy is claimed. The full Python/Parquet/DuckDB production pipeline, authentic evidence layers, agency authentication and external delivery require follow-up implementation. Sites hosts the compiled React application. The Sites helper scripts and managed browser entrypoint are absent from this environment; use ordinary Git and supported static archive layout, and report browser verification unavailable.

## FIRMS connection update
The user supplied a FIRMS key. It was stored with native Sites environment management as a secret, not written to disk or source. Key status returned HTTP 200. A 10-day area request was rejected with an explicit 1–5-day constraint; all integration windows now use 5 days. All three region snapshots were fetched successfully and are shown in a separate observed-data view. Historical synthetic values are not relabelled as authentic. Hosting migrated to a Worker ES module with embedded Vite assets, because static hosting cannot protect or use a runtime key. Browser QA remains unavailable.

Hosted verification exposed a Sites restriction on caches.default. The integration now uses temporary per-Worker-instance snapshot memory with packaged fallback, and no restricted cache APIs. The 15-minute reuse guarantee applies within an instance; durable cross-instance caching remains future work.

## Downloadable edition
This copy is independent of the hosted Site. It includes no Site identity or secret. Local development uses a Node API and Vite, with no initial build dependency. A prebuilt Worker bundle supports npm start without installing packages. Map controls wait for loading before enabling. MapLibre and jsPDF were updated to patched versions, and source files were formatted for editing. Docker validation is incomplete because of the test environment disk limit.
