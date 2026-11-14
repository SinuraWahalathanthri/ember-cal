# Methods and implementation boundary

The hosted demonstration uses a seeded, deterministic seasonal fixture for 2001–2026. Values are generated directly, not derived from satellite observations. The uncertainty range is illustrative (wider before 2012), not a bootstrap result. Synthetic MODIS raw counts use a seasonal divisor. A smooth-looking demo series is not proof of sensor harmonization.

The requested production algorithm is: consistently filter static/non-vegetation sources and low confidence; deduplicate overlapping swaths; count local-date common-grid fire cell-days; fit VIIRS/MODIS overlap ratios by calibration cell × season × day/night; hierarchically shrink to parent ratios; bootstrap overlap years; and convert early MODIS estimates into the reference-VIIRS scale. One reference constellation must be maintained across transitions. NOAA-21 must not inflate reference-calendar counts.

Implemented reference functions include geometric shrinkage, year-block bootstrap, Pettitt test, R²/MAPE/bias, Wilson intervals, stable detection IDs, MODIS/VIIRS confidence normalization and transparent confidence labels. These are building blocks only: no calibrated ratio table or authentic confidence evidence exists yet.

The demo anomaly compares a complete selected month with that month in earlier years. It uses median, rank and empirical percentile. Alert categories are Normal (<75th), Above normal (75th–90th), High (90th–97.5th) and Extreme (>97.5th). Current partial-month anomaly is deliberately disabled. A production implementation must compare identical elapsed-day ranges.

Custom area values are approximate bounding-box scaling; not clipped spatial aggregates. User points are illustrative and may not correspond to actual vegetation. CSV weights are examples, not fitted production weights.

Live detection confidence and historical harmonization answer different questions. Harmonization must never make an individual live detection alert-worthy. Multi-source live discovery can use all satellites, but historical-context escalation must use the same reference sensor and units as the baseline.

No-fire-detected does not imply no fire. Clouds, smoke, small fires and satellite timing cause omissions. FIRMS sensor-availability and retirement dates in the supplied brief need independent confirmation before implementation. NASA API index was reachable on 14 Nov 2026 and linked the area, country and data-availability APIs; actual authenticated retrieval was not tested.

## Observed NRT view
The /recent view is separate from the synthetic history. It uses actual area CSV responses for VIIRS_NOAA20_NRT, VIIRS_NOAA21_NRT and MODIS_NRT, with a fixed regional bounding box and a five-day latest-data request. Stable IDs deduplicate exact same-satellite acquisition/coordinate records. Sensor confidence is preserved and explicitly not called independently confirmed fire confidence. Cross-sensor duplicates remain separate observations. Static sources and non-vegetation are not yet masked. A raw count is not a harmonized hotspot total or fire-event count.

The key is a hosted runtime secret. Refresh is a same-origin JSON POST protected by the owner-private Site boundary. All three responses must succeed before replacing cached data. Reads never make NASA calls. Worker-instance refreshes are throttled for 15 minutes and expire; packaged snapshots are fallback. No durable monitoring pipeline or automatic scheduled refresh is claimed.
