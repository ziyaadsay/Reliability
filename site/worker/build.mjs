// Packages the built dashboard (site/dist) as a Gizmos worker with the /api/ask endpoint.
//   node worker/build.mjs <dist dir> <out dir>
// Output: worker.js (assets embedded), wrangler.toml with the AI binding, favicon.ico.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [dist, out] = process.argv.slice(2);
if (!dist || !out) throw new Error("usage: node worker/build.mjs <dist dir> <out dir>");

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".ico": "image/x-icon", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".map": "application/json" };
const BINARY = new Set([".ico", ".png", ".woff2"]);
const assets = {};
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    const ext = extname(name), route = "/" + relative(dist, p).split("\\").join("/");
    if (!TYPES[ext]) throw new Error(`No content type for ${route}`);
    const bin = BINARY.has(ext);
    assets[route === "/index.html" ? "/" : route] = bin
      ? { t: TYPES[ext], b64: true, b: readFileSync(p).toString("base64") }
      : { t: TYPES[ext], b: readFileSync(p, "utf8") };
  }
})(dist);
if (!assets["/"]) throw new Error("dist has no index.html");

mkdirSync(out, { recursive: true });
const tpl = readFileSync(join(here, "worker.template.js"), "utf8");
writeFileSync(join(out, "worker.js"), tpl.replace("__ASSETS__", () => JSON.stringify(assets)));
writeFileSync(join(out, "wrangler.toml"), `name = "relstrat"
main = "worker.js"
compatibility_date = "2025-01-01"

# Answers the Health Read "Ask a question about the data" box through the Fuel iX gateway.
[[gizmos_ai]]
binding = "AI"
model = "gpt-4o-mini"
description = "Answers questions about the Reliability Strategy dashboard data"
`);
if (assets["/favicon.ico"]) copyFileSync(join(dist, "favicon.ico"), join(out, "favicon.ico"));
console.log(`worker: ${Object.keys(assets).length} assets, ${(readFileSync(join(out, "worker.js")).length / 1024).toFixed(0)} KB`);
