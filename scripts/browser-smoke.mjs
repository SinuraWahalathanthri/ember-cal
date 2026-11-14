import { chromium } from "playwright";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5173";
const child = process.env.TEST_BASE_URL
  ? null
  : spawn(process.execPath, ["scripts/dev.mjs"], { stdio: "pipe" });
child?.stdout.on("data", () => {});
child?.stderr.on("data", (c) => process.stderr.write(c));
async function waitFor() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(base + "/api/firms/status")).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw Error("Development server did not start");
}
let browser;
try {
  await waitFor();
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
    args: ["--disable-dev-shm-usage", "--enable-unsafe-swiftshader"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    acceptDownloads: true,
  });
  // Keep map interaction checks deterministic and independent of external tile availability.
  await context.route("https://basemaps.cartocdn.com/**", (route) =>
    route.fulfill({
      json: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "land",
            type: "background",
            paint: { "background-color": "#e4ece9" },
          },
        ],
      },
    }),
  );
  await context.route(
    /https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|api\.fontshare\.com)\//,
    (route) => route.abort(),
  );
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", r=>{if(r.url().startsWith(base)&&r.status()>=400&&/\.m?js(?:\?|$)/.test(r.url()))errors.push(`Script HTTP ${r.status()}: ${new URL(r.url()).pathname}`)});
  await page.goto(base);
  await page.getByRole("button", { name: "Explore the fire calendar" }).click();
  await page.locator(".heat-cell").first().waitFor();
  assert.equal(await page.locator(".heat-row:not(.heat-header)").count(), 26);
  await page.getByRole('button',{name:'Pan map',exact:true}).click();
  const {points}=await import('../web/src/analytics.mjs');
  const world=512*2**6.8;
  const project=(lat,lon)=>[world*(lon+180)/360,world*(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2];
  const center=project(7.9,80.8);
  const nearest=points().map(p=>{const xy=project(p.lat,p.lon);return {x:xy[0]-center[0],y:xy[1]-center[1]}}).sort((a,b)=>a.x*a.x+a.y*a.y-b.x*b.x-b.y*b.y)[0];
  const initialCanvas=await page.locator('.maplibregl-canvas').boundingBox();
  await page.waitForTimeout(1000);
  await page.mouse.click(initialCanvas.x+initialCanvas.width/2+nearest.x,initialCanvas.y+initialCanvas.height/2+nearest.y);
  await page.locator('.maplibregl-popup-content').waitFor({timeout:10000});
  await page.locator('.maplibregl-popup-close-button').click();

  await page
    .getByRole("button", { name: "Seasonal patterns", exact: true })
    .click();
  await page.locator(".svg-chart svg").waitFor();
  await page.getByRole("button", { name: "Table", exact: true }).click();
  assert.equal(await page.locator(".chart-card tbody tr").count(), 12);
  await page
    .getByRole("button", { name: "Annual comparison", exact: true })
    .click();
  assert.equal(await page.locator(".chart-card tbody tr").count(), 25);
  await page
    .getByRole("button", { name: "Burning calendar", exact: true })
    .click();
  await page.getByRole("button", { name: "Chart", exact: true }).click();
  await page
    .getByRole("button", { name: "Enter coordinates or upload GeoJSON" })
    .click();
  await page.getByRole("button", { name: "Apply area" }).click();
  await page
    .getByRole("heading", { name: "Custom area", exact: false })
    .waitFor();
  await page.getByRole("button", { name: "Clear custom selection" }).click();
  await page
    .getByRole("button", { name: "Draw rectangle", exact: true })
    .click();
  const canvas = page.locator(".maplibregl-canvas");
  await canvas.waitFor();
  const box = await canvas.boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + 75, box.y + 100);
  await page.mouse.click(box.x + 75, box.y + 100);
  await page.mouse.move(box.x + 160, box.y + 220, { steps: 12 });
  await page.mouse.click(box.x + 160, box.y + 220);
  await page
    .getByRole("heading", { name: "Custom area", exact: false })
    .waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "Export data" }).click();
  let promise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Monthly summary CSV", exact: true })
    .click();
  let download = await promise;
  assert.match(download.suggestedFilename(), /SYNTHETIC.csv/);
  assert.match(await readFile(await download.path(), "utf8"), /synthetic/);
  await page.getByRole("button", { name: "Export data" }).click();
  promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF briefing", exact: true }).click();
  download = await promise;
  assert.match(
    (await readFile(await download.path())).subarray(0, 5).toString(),
    /%PDF/,
  );
  await page.getByRole("button", { name: "Export data" }).click();
  promise = page.waitForEvent("download", { timeout: 30000 });
  await page.getByRole("button", { name: "Calendar PNG", exact: true }).click();
  download = await promise;
  assert.equal(
    (await readFile(await download.path())).subarray(0, 8).toString("hex"),
    "89504e470d0a1a0a",
  );
  await page
    .getByRole("button", { name: "Recent detections", exact: true })
    .click();
  await page.locator(".recent-stats").waitFor();
  await page.getByLabel("Monitoring region").selectOption("pantanal");
  await page.waitForFunction(
    () => document.querySelector(".recent-stats strong")?.textContent === "792",
  );
  promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Observed CSV" }).click();
  download = await promise;
  assert.match(
    await readFile(await download.path(), "utf8"),
    /VIIRS_NOAA20_NRT/,
  );
  await page.getByRole("button", { name: "Watch areas", exact: true }).click();
  await page.getByRole("button", { name: "New watch area" }).click();
  await page.getByLabel("Area name").fill("Smoke test area");
  await page.getByLabel("Responsible person’s email").fill("test@example.org");
  await page.getByRole("button", { name: "Save watch area" }).click();
  await page.getByRole("button", { name: "Send test alert" }).click();
  await page.locator(".outbox-item").waitFor();
  await page.getByRole("button", { name: "Accuracy", exact: true }).click();
  await page
    .getByRole("heading", { name: "Trust starts with measurement." })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await page.locator(".heat-cell").first().waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Mobile layout overflows horizontally",
  );
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: navigation, calendar/charts, coordinate and map selection, CSV/PDF/PNG, observed data, mock alerts, accuracy, and mobile layout.",
  );
} finally {
  await browser?.close();
  child?.kill("SIGTERM");
}
