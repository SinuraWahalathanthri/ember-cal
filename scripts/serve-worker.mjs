import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { loadLocalEnv } from "./env.mjs";
loadLocalEnv();
let worker;
if (process.argv.includes("--api-only")) {
  const { api } = await import("../worker/firms.mjs");
  const snapshots = {};
  for (const id of ["sri_lanka", "pantanal", "nsw"])
    snapshots[id] = JSON.parse(
      await readFile(
        new URL(`../data/observations/${id}.json`, import.meta.url),
        "utf8",
      ),
    );
  worker = { fetch: (request) => api(request, process.env, snapshots) };
} else {
  try {
    worker = (await import("../dist/server/index.js")).default;
  } catch {
    console.error(
      "Production build not found. Run npm run build, then npm start.",
    );
    process.exit(1);
  }
}
const port = Number(process.env.PORT || 3000),
  host = process.env.HOST || "127.0.0.1";
const server = createServer(async (req, res) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 16384) {
        res.writeHead(413);
        res.end("Request too large.");
        return;
      }
      chunks.push(chunk);
    }
    const method = req.method || "GET";
    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method,
      headers: req.headers,
      body:
        method === "GET" || method === "HEAD"
          ? undefined
          : Buffer.concat(chunks),
    });
    const response = await worker.fetch(request, process.env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(
      method === "HEAD" ? undefined : Buffer.from(await response.arrayBuffer()),
    );
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Local request failed. No secret details are logged.");
  }
});
server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `Port ${port} is already in use. Stop the other process or change PORT / EMBERCAL_API_PORT.`
      : "Could not start the local server.",
  );
  process.exit(1);
});
server.listen(port, host, () =>
  console.log(
    `EmberCal server ready at http://${host}:${server.address().port}`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
