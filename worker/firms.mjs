export const REGIONS = {
  sri_lanka: { name: "Sri Lanka", bbox: [79.5, 5.8, 82, 10] },
  pantanal: { name: "Pantanal, Brazil", bbox: [-59, -22, -54, -15] },
  nsw: { name: "New South Wales", bbox: [141, -37.5, 153.7, -28] },
};
export const SOURCES = ["VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "MODIS_NRT"];
export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines[0]?.startsWith("latitude,"))
    throw new Error("NASA FIRMS returned an unexpected response.");
  const keys = lines[0].split(",");
  return lines
    .slice(1)
    .filter(Boolean)
    .map((line) =>
      Object.fromEntries(line.split(",").map((v, i) => [keys[i], v])),
    );
}
export function normalizeRows(rows, source) {
  return rows.map((r) => {
    const lat = Number(r.latitude),
      lon = Number(r.longitude),
      isModis = source === "MODIS_NRT",
      c = isModis ? Number(r.confidence) : String(r.confidence).toLowerCase();
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    )
      throw new Error("Invalid coordinates from FIRMS.");
    const time = String(r.acq_time || "0").padStart(4, "0");
    const satellite =
      source === "MODIS_NRT"
        ? { T: "Terra", A: "Aqua" }[r.satellite] || r.satellite
        : source === "VIIRS_NOAA20_NRT"
          ? "NOAA-20"
          : "NOAA-21";
    return {
      id: `${satellite}|${r.acq_date}|${time}|${lat.toFixed(5)}|${lon.toFixed(5)}`,
      lat,
      lon,
      date: r.acq_date,
      time: `${time.slice(0, 2)}:${time.slice(2)} UTC`,
      sensor: isModis ? "MODIS" : "VIIRS",
      satellite,
      sensor_confidence: isModis
        ? c >= 80
          ? "high"
          : c >= 30
            ? "nominal"
            : "low"
        : { h: "high", n: "nominal", l: "low" }[c] || "unknown",
      confidence_raw: r.confidence,
      frp: Number(r.frp) || 0,
      daynight: r.daynight,
      version: r.version,
      source,
      is_nrt: true,
      synthetic: false,
      evidence:
        "NASA sensor confidence only. Industrial masking, land-cover evidence and fire confirmation have not been evaluated.",
    };
  });
}
export async function pullRegion(
  region,
  key,
  fetcher = fetch,
  now = new Date(),
) {
  if (!REGIONS[region]) throw new Error("Unknown monitoring region.");
  if (!key) throw new Error("FIRMS key is not configured.");
  const results = await Promise.all(
    SOURCES.map(async (source) => {
      let response;
      try {
        response = await fetcher(
          `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(key)}/${source}/${REGIONS[region].bbox.join(",")}/5`,
          { signal: AbortSignal.timeout(45000) },
        );
      } catch {
        throw new Error("NASA FIRMS could not be reached. Try again later.");
      }
      if (!response.ok)
        throw new Error(
          `NASA FIRMS request failed (${response.status}). Check availability and quota.`,
        );
      const rows = normalizeRows(parseCsv(await response.text()), source);
      return { source, rows };
    }),
  );
  const detections = [
    ...new Map(results.flatMap((r) => r.rows).map((r) => [r.id, r])).values(),
  ];
  return {
    region,
    region_name: REGIONS[region].name,
    fetched_at: now.toISOString(),
    window_days: 5,
    synthetic: false,
    status: "complete",
    sources: results.map((r) => ({
      source: r.source,
      count: r.rows.length,
      status: "ok",
    })),
    detections,
    limits:
      "NRT raw detections, not harmonized or confirmed fires. Five-day request window. No detections does not mean no fire.",
  };
}
const CENTRAL_SNAPSHOTS = new Map();
export async function api(request, env, snapshots, cache = null) {
  const url = new URL(request.url),
    region = url.searchParams.get("region") || "sri_lanka";
  if (!REGIONS[region])
    return Response.json({ error: "Unknown region." }, { status: 400 });
  const cacheRequest = new Request(
    `${url.origin}/_central_firms_cache/${region}`,
  );
  let cached = cache ? await cache.match(cacheRequest) : null;
  const getSaved = async () =>
    cached
      ? await cached.clone().json()
      : CENTRAL_SNAPSHOTS.get(region) || snapshots[region] || null;
  if (url.pathname === "/api/firms/verify" && request.method === "POST") {
    if (
      request.headers.get("Origin") !== url.origin ||
      request.headers.get("Content-Type") !== "application/json"
    )
      return Response.json(
        { error: "Same-origin JSON required." },
        { status: 403 },
      );
    if (!env.FIRMS_MAP_KEY)
      return Response.json(
        { configured: false, verified: false },
        { status: 503 },
      );
    try {
      const response = await fetch(
        `https://firms.modaps.eosdis.nasa.gov/mapserver/mapkey_status/?MAP_KEY=${encodeURIComponent(env.FIRMS_MAP_KEY)}`,
        { signal: AbortSignal.timeout(30000) },
      );
      if (!response.ok)
        return Response.json(
          {
            configured: true,
            verified: false,
            upstream_status: response.status,
          },
          { status: 502 },
        );
      const d = await response.json();
      if (
        !Number.isFinite(Number(d.transaction_limit)) ||
        Number(d.transaction_limit) <= 0
      )
        return Response.json(
          { configured: true, verified: false },
          { status: 502 },
        );
      return Response.json({
        configured: true,
        verified: true,
        transaction_limit: Number(d.transaction_limit) || null,
        current_transactions: Number(d.current_transactions) || 0,
        transaction_interval:
          typeof d.transaction_interval === "string" &&
          /^[0-9 ]+(minutes|hours)$/.test(d.transaction_interval)
            ? d.transaction_interval
            : null,
      });
    } catch {
      return Response.json(
        {
          configured: true,
          verified: false,
          error: "Could not verify FIRMS key; upstream details withheld.",
        },
        { status: 502 },
      );
    }
  }
  if (url.pathname === "/api/firms/status")
    return Response.json({
      configured: Boolean(env.FIRMS_MAP_KEY),
      provider: "NASA FIRMS",
      source: "server-side runtime secret",
      history: "synthetic",
      automatic_refresh: false,
    });
  if (url.pathname === "/api/live" && request.method === "GET") {
    const saved = await getSaved();
    return Response.json(
      saved || {
        region,
        status: "not_fetched",
        synthetic: false,
        detections: [],
        sources: [],
        fetched_at: null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  if (url.pathname === "/api/live/refresh" && request.method === "POST") {
    // This is an owner-private Site. Block cross-origin form or script writes.
    if (
      request.headers.get("Origin") !== url.origin ||
      request.headers.get("Content-Type") !== "application/json"
    )
      return Response.json(
        { error: "Same-origin JSON request required." },
        { status: 403 },
      );
    const saved = await getSaved();
    if (saved && Date.now() - Date.parse(saved.fetched_at) < 15 * 60 * 1000)
      return Response.json({
        ...saved,
        refresh_note:
          "Central snapshot is less than 15 minutes old; reused without additional FIRMS calls.",
      });
    try {
      const fresh = await pullRegion(region, env.FIRMS_MAP_KEY);
      CENTRAL_SNAPSHOTS.set(region, fresh);
      if (cache)
        await cache.put(
          cacheRequest,
          Response.json(fresh, {
            headers: { "Cache-Control": "max-age=3600" },
          }),
        );
      return Response.json(fresh, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      return Response.json(
        {
          error: e.message || "FIRMS refresh failed.",
          previous_snapshot_available: Boolean(saved),
        },
        { status: 502 },
      );
    }
  }
  return Response.json({ error: "Unknown endpoint." }, { status: 404 });
}
