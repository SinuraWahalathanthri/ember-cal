import { spawn } from "node:child_process";
import { loadLocalEnv } from "./env.mjs";
loadLocalEnv();
const children = [];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill();
  setTimeout(() => process.exit(code), 200).unref();
}
console.log("EmberCal development: starting local API and Vite…");
const api = spawn(
  process.execPath,
  ["scripts/serve-worker.mjs", "--api-only"],
  {
    stdio: ["inherit", "pipe", "inherit"],
    env: {
      ...process.env,
      PORT: process.env.EMBERCAL_API_PORT || "8787",
      HOST: "127.0.0.1",
    },
  },
);
children.push(api);
let output = "";
api.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  output += chunk;
  if (output.includes("EmberCal server ready") && children.length === 1) {
    const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
      stdio: "inherit",
      env: process.env,
    });
    children.push(vite);
    vite.on("error", () => {
      console.error("Vite could not start. Run npm ci first.");
      stop(1);
    });
    vite.on("exit", (code) => {
      if (!closing) stop(code || 1);
    });
  }
});
api.on("error", () => {
  console.error("The local API process could not start.");
  stop(1);
});
api.on("exit", (code) => {
  if (!closing) stop(code || 1);
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
