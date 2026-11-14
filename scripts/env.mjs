import { existsSync } from "node:fs";
export function loadLocalEnv() {
  if (Number(process.versions.node.split(".")[0]) < 22) {
    throw new Error("EmberCal requires Node.js 22 or newer.");
  }
  if (existsSync(".env")) {
    try {
      process.loadEnvFile(".env");
    } catch {
      throw new Error(
        "Could not read .env. Check its KEY=value syntax; secret values are never logged.",
      );
    }
  }
}
