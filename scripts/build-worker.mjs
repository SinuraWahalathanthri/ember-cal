import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};
const assets = {};
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await collect(file);
    else {
      const name =
        "/" + path.relative("dist/client", file).split(path.sep).join("/");
      assets[name] = {
        type: types[path.extname(file)] || "application/octet-stream",
        body: (await readFile(file)).toString("base64"),
      };
    }
  }
}
await collect("dist/client");
const snapshots = {};
for (const name of ["sri_lanka", "pantanal", "nsw"])
  try {
    snapshots[name] = JSON.parse(
      await readFile(`data/observations/${name}.json`, "utf8"),
    );
  } catch {}
let core = await readFile("worker/firms.mjs", "utf8");
core = core.replaceAll("export ", "");
const server = `${core}\nconst ASSETS=${JSON.stringify(assets)};const SNAPSHOTS=${JSON.stringify(snapshots)};export default{async fetch(request,env){const u=new URL(request.url);if(u.pathname.startsWith('/api/'))return api(request,env,SNAPSHOTS);const a=ASSETS[u.pathname]||(!u.pathname.split('/').at(-1).includes('.')?ASSETS['/index.html']:null);if(!a)return new Response('Not found',{status:404});return new Response(Uint8Array.from(atob(a.body),c=>c.charCodeAt(0)),{headers:{'Content-Type':a.type,'Cache-Control':u.pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}})}};`;
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await writeFile("dist/server/index.js", server);
await writeFile(
  "dist/.openai/hosting.json",
  await readFile(".openai/hosting.json"),
);
console.log(
  `Worker built: ${Object.keys(assets).length} embedded assets; ${Object.keys(snapshots).length} observed snapshots; no secret inputs.`,
);
