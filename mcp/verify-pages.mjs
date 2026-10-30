// Verifies the built worker's page model without deploying: imports mcp/dist/src/index.js
// with a stub for cloudflare:workers, then checks that every product/page pair in
// list_pages returns at least one well-formed section, that a page a product does not have
// throws "page not available for <product>", that every reply carries schemaVersion, and
// that the pre-existing tools still answer. Prints the result table.
//
//   node mcp/build.mjs && node mcp/verify-pages.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tmp = join(here, "dist", "verify");
mkdirSync(tmp, { recursive: true });
writeFileSync(join(tmp, "cfw.mjs"), "export class WorkerEntrypoint { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }\n");
writeFileSync(join(tmp, "index.mjs"), readFileSync(join(here, "dist", "src", "index.js"), "utf8").replace('"cloudflare:workers"', '"./cfw.mjs"'));
const { Reliability } = await import(pathToFileURL(join(tmp, "index.mjs")).href);
const R = new Reliability({ props: { callerAppId: "verify" } }, {});

const KINDS = new Set(["cards", "series", "table", "text", "list"]);
const AS = new Set(["cards", "text", "quotes", "list", "table", "matrix", "bars", "grouped-bars", "stacked-bars", "paired-bars", "line", "bars-and-line", "area", "scatter", "gantt", "heatmap", "donut"]);
const CODE_IN_NOTE = /`|\bdata\.|\bschemaVersion\b|\bpriorQuarter\b|\bpriorValue\b|\bvsTarget\b|\b[a-z]+[A-Z][a-zA-Z]*\b|\b[a-z]+_[a-z_]+\b/;
const asByPage = [];
const rows = [];
let failures = 0;
const fail = (msg) => { failures += 1; console.error("FAIL: " + msg); };

const products = await R.list_products({});
if (products.schemaVersion !== 3) fail("schemaVersion is not 3");
for (const p of products.products) if (!Array.isArray(p.covers)) fail(`list_products: ${p.id} lacks covers`);

const pages = await R.list_pages({});
if (pages.schemaVersion == null) fail("list_pages lacks schemaVersion");
for (const pg of pages.pages) {
  let status = "ok", sections = 0, kinds = "";
  try {
    const r = await R.get_page({ product: pg.product, page: pg.id });
    sections = r.sections.length;
    if (r.schemaVersion == null) throw new Error("no schemaVersion");
    if (!sections) throw new Error("no sections");
    const ids = new Set();
    for (const s of r.sections) {
      if (!KINDS.has(s.kind)) throw new Error(`bad kind ${s.kind} in ${s.id}`);
      if (ids.has(s.id)) throw new Error(`duplicate section id ${s.id}`);
      ids.add(s.id);
      if (s.kind === "cards" && !Array.isArray(s.data)) throw new Error(`cards data not an array in ${s.id}`);
      if (s.kind === "series" && !(Array.isArray(s.data.months) && s.data.series)) throw new Error(`series shape in ${s.id}`);
      if (s.kind === "table" && !(Array.isArray(s.data.columns) && Array.isArray(s.data.rows))) throw new Error(`table shape in ${s.id}`);
      if (s.kind === "text" && !Array.isArray(s.data.paragraphs)) throw new Error(`text shape in ${s.id}`);
      if (s.kind === "list" && !Array.isArray(s.data)) throw new Error(`list shape in ${s.id}`);
      // presentation (schemaVersion 3)
      if (!s.display || !AS.has(s.display.as)) throw new Error(`${s.id}: display.as ${s.display && s.display.as} not in the fixed list`);
      if (s.display.chart && !AS.has(s.display.chart.as)) throw new Error(`${s.id}: display.chart.as not in the fixed list`);
      if (s.display.alsoAs && s.display.alsoAs !== "table") throw new Error(`${s.id}: alsoAs must be table`);
      if (typeof s.doc !== "string" || !s.doc) throw new Error(`${s.id}: missing doc`);
      if (!("groupId" in s)) throw new Error(`${s.id}: missing groupId`);
      if (s.note && CODE_IN_NOTE.test(s.note)) throw new Error(`${s.id}: note contains a code name or backtick: ${s.note.slice(0, 120)}`);
      if (/colou?r|#[0-9a-f]{6}\b/i.test(JSON.stringify(s.display))) throw new Error(`${s.id}: display carries a colour`);
      // the keys a chart names must exist in the section's own data
      const d = s.display, has = (set, k) => set.has(k);
      if (s.kind === "series" || (s.kind === "text" && s.data.series)) {
        const keys = new Set(Object.keys(s.kind === "series" ? s.data.series : s.data.series.series));
        const ref = s.kind === "text" ? d.chart : d;
        for (const k of [...(ref.y || []), ...(ref.bars || []), ...(ref.line || []), ...(ref.stack || []), ...((ref.axis && ref.axis.right) || []), ...(ref.dashed || []), ...(ref.total ? [ref.total] : [])]) if (!has(keys, k)) throw new Error(`${s.id}: display names series key ${k} that is not in the data`);
      }
      if (s.kind === "table") {
        const cols = new Set(s.data.columns.map((c) => c.key));
        const names = [d.label, d.value, d.change, d.total, d.lane, d.laneOrder, d.start, d.end, d.status, d.undatedText, ...(d.values || []), ...(d.pair || []), ...(d.cells || []), ...(d.as === "stacked-bars" ? d.stack || [] : [])].filter(Boolean);
        for (const k of names) if (!cols.has(k)) throw new Error(`${s.id}: display names column ${k} that is not in the data`);
        if (d.as === "gantt" && !(Array.isArray(d.statusOrder) && d.statusOrder.length && d.marker === "asOf")) throw new Error(`${s.id}: gantt lacks statusOrder or marker`);
      }
    }
    // groups
    if (!Array.isArray(r.groups)) throw new Error("page has no groups");
    const gids = new Set(r.groups.map((g) => g.id));
    for (const g of r.groups) {
      if (!(g.id && g.title && Array.isArray(g.sectionIds) && g.sectionIds.length && typeof g.open === "boolean")) throw new Error(`bad group ${JSON.stringify(g).slice(0, 80)}`);
      for (const sid of g.sectionIds) { const sec = r.sections.find((x) => x.id === sid); if (!sec) throw new Error(`group ${g.id} lists unknown section ${sid}`); if (sec.groupId !== g.id) throw new Error(`section ${sid} in group ${g.id} has groupId ${sec.groupId}`); }
    }
    for (const s of r.sections) if (s.groupId != null && !gids.has(s.groupId)) throw new Error(`${s.id}: groupId ${s.groupId} is not a group of the page`);
    const order = r.sections.map((x) => x.id);
    for (const g of r.groups) { const idx = g.sectionIds.map((x) => order.indexOf(x)); if (idx.some((v, i) => i && v < idx[i - 1])) throw new Error(`group ${g.id} sections out of page order`); }
    // list_pages must agree
    if (JSON.stringify(pg.groups) !== JSON.stringify(r.groups)) throw new Error("groups differ from list_pages");
    for (const s of r.sections) { const l = pg.sections.find((x) => x.id === s.id); if (!l || JSON.stringify(l.display) !== JSON.stringify(s.display) || l.groupId !== s.groupId) throw new Error(`${s.id}: list_pages display/groupId differ`); }
    asByPage.push([...new Set(r.sections.map((x) => x.display.as))].sort().join(","));
    kinds = [...new Set(r.sections.map((s) => s.kind))].join(",");
    if (JSON.stringify(r.sections.map((s) => [s.id, s.title, s.kind])) !== JSON.stringify(pg.sections.map((s) => [s.id, s.title, s.kind]))) throw new Error("section list differs from list_pages");
  } catch (e) { status = "ERROR: " + e.message; fail(`${pg.product}/${pg.id}: ${e.message}`); }
  rows.push({ product: pg.product, page: pg.id, url: pg.url, sections, groups: (pg.groups || []).length, kinds, as: asByPage[asByPage.length - 1] || "", status });
}
// windows
const w = await R.get_page({ product: "HSIA", page: "overview", from: "Jan 2026", to: "Jun 2026" });
const ser = w.sections.find((s) => s.kind === "series");
if (ser.data.months[0] !== "Jan 2026" || ser.data.months.at(-1) !== "Jun 2026") fail("from/to not applied to series");
if (w.asOf !== "Jun 2026" || w.sections[0].data[0].month !== "Jun 2026") fail("to not applied to cards/asOf");
// not available
const missing = [["SHS", "notes"], ["SH+", "review"], ["SHS", "review"], ["HSIA", "platforms"], ["All", "notes"]];
for (const [prod, pg] of missing) {
  try { await R.get_page({ product: prod, page: pg }); fail(`${prod}/${pg} did not throw`); rows.push({ product: prod, page: pg, status: "ERROR: no throw" }); }
  catch (e) { const ok = e.message === `page not available for ${prod}`; if (!ok) fail(`${prod}/${pg}: wrong error ${e.message}`); rows.push({ product: prod, page: pg, sections: 0, kinds: "", status: ok ? `throws "${e.message}"` : "ERROR: " + e.message }); }
}
// existing tools unchanged in shape (keys present)
const expectKeys = {
  list_products: ["dashboard", "latestMonth", "months", "churnReportedThrough", "products", "metrics"],
  get_kpi_series: ["product", "months", "series"], get_kpi_summary: ["product", "asOf", "kpis", "annualChurn", "notes"],
  get_ticket_issues: ["product", "latestMonth", "topIssues", "rising", "falling", "categories"], get_initiatives: ["count", "pillars", "initiatives", "source"],
  get_tv_platforms: ["months", "platforms", "mixedUsage", "notes"], get_self_serve: ["months", "metrics", "source"],
  get_health_commentary: ["product", "month", "commentary", "recurringIssues"], get_friction_free_program: ["asOf", "period", "burndown", "benefits", "pipeline"], get_sources: ["dashboard", "latestMonth", "sources"]
};
const argsFor = { get_kpi_series: { product: "TV" }, get_kpi_summary: { product: "HSIA" }, get_ticket_issues: { product: "SHS" }, get_health_commentary: { product: "TV" } };
for (const [tool, keys] of Object.entries(expectKeys)) {
  const r = await R[tool](argsFor[tool] || {});
  for (const k of keys) if (!(k in r)) fail(`${tool} lost field ${k}`);
  if (r.schemaVersion !== products.schemaVersion) fail(`${tool} schemaVersion mismatch`);
}

console.log(`schemaVersion ${products.schemaVersion} · ${pages.pages.length} pages · covers: ${products.products.map((p) => `${p.id}=${p.covers.join("+")}`).join("  ")}`);
for (const r of rows) console.log(`${String(r.product).padEnd(5)} ${String(r.page).padEnd(10)} sections=${String(r.sections).padStart(2)} groups=${r.groups ?? "-"} as=[${r.as || ""}] ${r.status === "ok" ? "ok" : r.status}`);
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
console.log("All page checks passed.");
