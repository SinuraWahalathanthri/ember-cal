import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const child = spawn(
  process.execPath,
  ["scripts/serve-worker.mjs", "--api-only"],
  {
    env: { ...process.env, PORT: "0", HOST: "127.0.0.1", FIRMS_MAP_KEY: "" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
const base = await new Promise((resolve, reject) => {
  let out = "";
  child.stdout.on("data", (c) => {
    out += c;
    const m = out.match(/ready at (http:\/\/127\.0\.0\.1:\d+)/);
    if (m) resolve(m[1]);
  });
  child.on("error", reject);
  child.once("exit", (code) => reject(Error(`API exited ${code}`)));
  setTimeout(() => reject(Error("API startup timed out")), 10000).unref();
});
test.after(() => child.kill());
test("local server starts without a build or a key and reports snapshot mode", async () => {
  const r = await fetch(base + "/api/firms/status");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).configured, false);
});
test("all packaged regions provide real observed snapshots", async () => {
  for (const id of ["sri_lanka", "pantanal", "nsw"]) {
    const r = await fetch(base + "/api/live?region=" + id);
    const d = await r.json();
    assert.equal(r.status, 200);
    assert.equal(d.synthetic, false);
    assert.equal(d.sources.length, 3);
    assert.ok(Array.isArray(d.detections));
  }
});
test("unknown regions are rejected", async () =>
  assert.equal((await fetch(base + "/api/live?region=missing")).status, 400));
test("refresh rejects cross-origin callers", async () =>
  assert.equal(
    (
      await fetch(base + "/api/live/refresh", {
        method: "POST",
        headers: {
          Origin: "http://other.test",
          "Content-Type": "application/json",
        },
        body: "{}",
      })
    ).status,
    403,
  ));
test("verification without a key returns an explicit safe error", async () => {
  const r = await fetch(base + "/api/firms/verify", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(r.status, 503);
  assert.deepEqual(await r.json(), { configured: false, verified: false });
});
