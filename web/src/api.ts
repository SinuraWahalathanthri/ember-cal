/**
 * EmberCal data layer — the ONLY place the UI asks for server data.
 *
 * There is no backend in this repository. Every function below currently
 * returns mock data so the full design renders. To connect your own backend,
 * replace the body of each function with a real request (e.g. `fetch`) that
 * resolves to the same shape. Nothing else in the UI needs to change.
 *
 * Data that is NOT fetched from here (still generated in the browser):
 *  - Historical fire calendar, anomalies and charts → `analytics.mjs`
 *    (`fixture`, `anomaly`). Swap those for backend data when ready.
 *  - Explore-page map hotspots → `analytics.mjs` (`points`).
 *  - Watch areas and alerts → saved in the browser's localStorage
 *    (keys `embercal-watches` and `embercal-alerts` in `main.tsx`).
 */

/** Connection status shown in the top bar and the Explore banner. */
export type ConnectionStatus = {
  /** true → "FIRMS key configured"; false → "Snapshot mode · add a key". */
  configured: boolean;
};

/** One raw satellite detection on the Recent observations page. */
export type Detection = {
  id: string;
  lat: number;
  lon: number;
  /** YYYY-MM-DD */
  date: string;
  /** e.g. "03:42 UTC" */
  time: string;
  sensor: "VIIRS" | "MODIS";
  /** e.g. "NOAA-20", "NOAA-21", "Terra", "Aqua" */
  satellite: string;
  sensor_confidence: "high" | "nominal" | "low" | "unknown";
  /** Fire radiative power, MW */
  frp: number;
  /** e.g. "VIIRS_NOAA20_NRT" */
  source: string;
  /** Shown in the map popup */
  evidence?: string;
  [extra: string]: unknown;
};

/** Response for the Recent observations page. */
export type LiveSnapshot = {
  region: string;
  region_name: string;
  /** ISO timestamp, or null if never fetched. Older than 6h shows a "Data delayed" warning. */
  fetched_at: string | null;
  window_days: number;
  synthetic: boolean;
  status: string;
  sources: { source: string; count: number; status: string }[];
  detections: Detection[];
  limits: string;
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MOCK_SNAPSHOTS: Record<string, () => Promise<{ default: unknown }>> = {
  sri_lanka: () => import("./mock/sri_lanka.json"),
  pantanal: () => import("./mock/pantanal.json"),
  nsw: () => import("./mock/nsw.json"),
};

async function mockSnapshot(regionId: string): Promise<LiveSnapshot> {
  const load = MOCK_SNAPSHOTS[regionId];
  if (!load) throw new Error("Unknown region.");
  return structuredClone((await load()).default) as LiveSnapshot;
}

/** Replace with e.g. `fetch("/api/status").then((r) => r.json())`. */
export async function getConnectionStatus(): Promise<ConnectionStatus> {
  return { configured: false };
}

/** Load the latest saved observations for a region. */
export async function getLiveSnapshot(regionId: string): Promise<LiveSnapshot> {
  await delay(300);
  return mockSnapshot(regionId);
}

/** "Refresh observations" button: ask the backend to fetch new data. */
export async function refreshLiveSnapshot(
  regionId: string,
): Promise<LiveSnapshot> {
  await delay(800);
  return { ...(await mockSnapshot(regionId)), fetched_at: new Date().toISOString() };
}
