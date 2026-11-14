# User guide

Open `/app`, choose a region and use Analyst or Responder mode. The latter shows the most recent eight calendar rows and hides secondary chart cards. Responder and analyst share the same synthetic model.

Select a full date range, season or last-30-days preset. Choose a confidence filter. Draw a polygon, rectangle or circle using the map toolbar, or enter a point/radius, bounding box or GeoJSON. The demo approximates custom area statistics by bounding-box area scaling; exact clipping is not implemented.

Hover calendar cells for exact synthetic values. Click a complete usable month to update the anomaly summary. November 2026 selection is disabled because historical elapsed-day comparison is unavailable. Choose Raw MODIS or Anomaly for alternate views. Seasonal and annual tabs have table views. Gap cells are not zero.

Export summary/hotspot CSV, calendar PNG or a PDF briefing. Exported data explicitly labels synthetic values. Share copies the region link only, not custom geometry or filters. Open `/app?tour=1` to start the five-step explorer tour.

Watch areas store data on the current browser device. Add a name and illustrative recipient, then Send test alert. It adds a mock record to the local outbox; no external notification is sent. Removing an area does not erase previously generated outbox records. Clear browser storage to remove all saved local demo information.

## Observed recent detections
Open /recent. Choose a fixed monitoring region; the map and table display observed NASA FIRMS NRT records for the latest five-day request window. Draw an area to filter records by its bounding box, or choose a sensor. Export downloads observed records, separately from the synthetic historical exports. Refresh observations uses the protected server-side key and reuses central snapshots for 15 minutes. No automatic refresh schedule is enabled. Source confidence is a sensor-quality flag and not a validated fire label.
