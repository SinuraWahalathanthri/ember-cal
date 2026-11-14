# Validation status

Historical calibration and validation data have not been ingested. Raw recent NRT observations are now available separately at /recent. No detections have been checked against Sentinel-2 scars or responder confirmation. Sample size = 0; precision, commission error, omission error, held-out R², MAPE, bias and sensor-transition results are unmeasured. No scientific acceptance criterion is claimed to pass.

Software checks: JavaScript tests cover interpolation, fixture shape, rank baseline, CSV escaping and coordinate-edge matching. Python tests cover shrinkage, bootstrap reproducibility, a known synthetic change point, metrics, Wilson intervals, normalization and rule-based confidence. Local API smoke checks exercise calendar, climatology, anomaly, annual, hotspots and CSV plus invalid-region and partial-month rejection.

Browser/visual, WCAG/axe, colour-vision simulation, Docker, authentic ingestion, dependency vulnerability scanning, load testing and alert-delivery integration have not been verified. Managed browser QA could not run because the required cua_repl.js entrypoint was absent.

Before any agency pilot: collect ≥100 stratified Sri Lanka ground-truth examples; independently review burn scars; publish per-label Wilson 95% intervals; compare industrial masking before/after; fit overlap ratios on 2012–2018 and evaluate 2019–2025; compare baseline methods; test transition and seasonality; test spatial query correctness and live-feed idempotence.

The FIRMS integration is tested with fixtures for source normalization, exactly-three bounded calls, empty results, all-or-nothing failures, key-redacted network errors, same-origin enforcement, and cache reuse. The actual supplied key passed NASA key-status and area-CSV requests. These checks do not establish scientific accuracy.

## Downloadable VS Code edition
The local release now has automated Chromium checks for core browser flows, exports, drawing and mobile layout, plus isolated local-server and Python checks. This supersedes the earlier hosted-session browser-verification limit. See TEST_REPORT.md for the current software checks and remaining environment limits. Scientific validation remains unmeasured.
