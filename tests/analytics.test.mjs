import test from "node:test";
import assert from "node:assert/strict";
import {
  fixture,
  quantile,
  anomaly,
  csv,
  inBounds,
} from "../web/src/analytics.mjs";
test("quantiles interpolate and do not mutate input", () => {
  const a = [4, 1, 3, 2];
  assert.equal(quantile(a, 0.5), 2.5);
  assert.deepEqual(a, [4, 1, 3, 2]);
});
test("fixture covers 2001–2026 and all uncertainty bands contain estimates", () => {
  const rows = fixture();
  assert.equal(rows.length, 312);
  assert.ok(
    rows.every((r) => r.lo <= r.value && r.hi >= r.value && r.synthetic),
  );
  assert.equal(rows.at(-1).year, 2026);
});
test("anomaly excludes current year from historical baseline", () => {
  const rows = fixture();
  const a = anomaly(rows, 2026, 10);
  assert.equal(a.n, 26);
  assert.ok(a.rank >= 1 && a.rank <= 26);
  assert.ok(a.percentile >= 0 && a.percentile <= 100);
});
test("CSV escapes quotes and commas", () =>
  assert.equal(csv([{ a: 'a,"b' }]), '"a"\n"a,""b"'));
test("spatial bounds include edge points", () => {
  assert.ok(inBounds({ lat: 5, lon: 2 }, [2, 5, 4, 8]));
  assert.equal(inBounds({ lat: 9, lon: 2 }, [2, 5, 4, 8]), false);
});
