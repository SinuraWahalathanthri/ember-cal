import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCsv,
  normalizeRows,
  pullRegion,
  api,
  SOURCES,
} from "../worker/firms.mjs";
const csv =
  "latitude,longitude,acq_date,acq_time,satellite,confidence,frp,daynight,version\n7.2,81.1,2026-11-14,0042,N,high,22,D,2.0NRT\n";
test("FIRMS header-only response is an empty observation set, not a failed fetch", () =>
  assert.deepEqual(parseCsv(csv.split("\n")[0]), []));
test("normalized records retain provenance and are not assigned fake fire-confirmation labels", () => {
  const r = normalizeRows(
    parseCsv(csv.replace(",high,", ",h,")),
    "VIIRS_NOAA20_NRT",
  )[0];
  assert.equal(r.synthetic, false);
  assert.equal(r.time, "00:42 UTC");
  assert.equal(r.sensor_confidence, "high");
  assert.equal(r.confidence, undefined);
  assert.equal(r.source, "VIIRS_NOAA20_NRT");
});
test("a central pull makes exactly three bounded regional requests", async () => {
  const urls = [];
  const d = await pullRegion("sri_lanka", "test-secret", async (url) => {
    urls.push(url);
    return new Response(csv.split("\n")[0]);
  });
  assert.equal(urls.length, 3);
  assert.ok(urls.every((x) => x.endsWith("/5")));
  assert.equal(d.detections.length, 0);
  assert.equal(d.sources.length, 3);
  assert.equal(d.synthetic, false);
});
test("a failed source rejects the whole pull, never creates a partial-success snapshot", async () => {
  await assert.rejects(
    pullRegion("sri_lanka", "test-secret", async (url) =>
      url.includes("MODIS_NRT")
        ? new Response("failure", { status: 500 })
        : new Response(csv),
    ),
    /500/,
  );
});
test("network errors never return credential-bearing upstream URLs", async () => {
  const key = "test-secret";
  await assert.rejects(
    pullRegion("sri_lanka", key, async (url) => {
      throw Error(url);
    }),
    (err) => !err.message.includes(key),
  );
});
test("missing key fails before network calls", async () => {
  await assert.rejects(
    pullRegion("sri_lanka", "", () => assert.fail("network called")),
    /not configured/,
  );
});
test("read endpoint uses the central snapshot and never calls NASA", async () => {
  const r = await api(
    new Request("https://example.test/api/live?region=sri_lanka"),
    {},
    {
      sri_lanka: {
        detections: [],
        fetched_at: "2026-11-14T00:00:00Z",
        synthetic: false,
      },
    },
    null,
  );
  assert.equal((await r.json()).synthetic, false);
});
test("refresh rejects cross-origin and form submissions", async () => {
  const r = await api(
    new Request("https://example.test/api/live/refresh", {
      method: "POST",
      headers: {
        origin: "https://evil.test",
        "content-type": "application/json",
      },
    }),
    {},
    {},
    null,
  );
  assert.equal(r.status, 403);
});
test("fresh snapshots are reused without quota calls", async () => {
  const snapshot = {
    region: "sri_lanka",
    fetched_at: new Date().toISOString(),
    detections: [],
    synthetic: false,
  };
  const r = await api(
    new Request("https://example.test/api/live/refresh", {
      method: "POST",
      headers: {
        origin: "https://example.test",
        "content-type": "application/json",
      },
    }),
    {},
    { sri_lanka: snapshot },
    null,
  );
  const d = await r.json();
  assert.match(d.refresh_note, /reused/);
});
test("hosted API does not touch the restricted caches.default getter", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "caches");
  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: Object.defineProperty({}, "default", {
      get() {
        throw Error("Cache forbidden");
      },
    }),
  });
  try {
    const r = await api(
      new Request("https://example.test/api/firms/status"),
      { FIRMS_MAP_KEY: "test-secret" },
      {},
    );
    assert.equal(r.status, 200);
    assert.equal((await r.json()).configured, true);
  } finally {
    if (previous) Object.defineProperty(globalThis, "caches", previous);
    else delete globalThis.caches;
  }
});
