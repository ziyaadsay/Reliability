// Page model: every dashboard page as data, in the order the page shows it.
// Appended after server.js by mcp/build.mjs, so the data constants, the helpers lifted
// from site/App.jsx (INDICATORS, hsiaPainPoint, issueThemes, TV_RECS, ...) and the server's
// `figures`/`change`/`rangeIdx` are all in scope. list_pages and get_page are wired into
// callTool through PAGE_TOOL_NAMES / pageTool below.

const SCHEMA_VERSION = 3;

// Which scorecard boards each product rolls up (see list_products.covers).
const COVERS = {
  All: ["hsiawest", "optikwest", "shs10"],
  HSIA: ["hsiawest"],
  TV: ["optikwest"],
  SHS: ["shs10"],
  "SH+": ["shplus"]
};
const COVERS_NOTE = "HSIA = HSIA West + TQ ILEC (TQ ILEC has no board key); PFE is excluded from the HSIA KPIs. pfe, whsia and koodo are not reported by the dashboard. The KPI series are not split by board in the source, so boards are not product keys.";

// ---- formatters (function declarations: INDICATORS above references fmtNumK/fmtRate at load) ----
function fmtNum(v) { return v == null ? "—" : Math.round(v).toLocaleString("en-CA"); }
function fmtNumK(v) { return v == null ? "—" : v >= 10000 ? (v / 1000).toFixed(1) + "K" : Math.round(v).toLocaleString("en-CA"); }
function fmtRate(v, d = 2) { return v == null ? "—" : Number(v).toFixed(d); }
function fmtPct(v, d = 2) { return v == null ? "—" : Number(v).toFixed(d) + "%"; }
function fmtBig(v) {
  if (v == null) return "—";
  const a = Math.abs(v), sign = v < 0 ? "−" : "";
  if (a >= 1e9) return sign + (a / 1e9).toFixed(a >= 1e11 ? 0 : a >= 1e10 ? 1 : 2) + "B";
  if (a >= 1e6) return sign + (a / 1e6).toFixed(a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2) + "M";
  if (a >= 1e4) return sign + (a / 1e3).toFixed(a >= 1e5 ? 0 : 1) + "K";
  return sign + Math.round(a).toLocaleString("en-CA");
}
const sPct = (x, d = 1) => (x == null ? "n/a" : (x > 0 ? "+" : "") + Number(x).toFixed(d) + "%");
const aPct = (x, d = 1) => (x == null ? "n/a" : Math.abs(x).toFixed(d) + "%");
const sNum = (v) => (v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(Math.round(v)).toLocaleString("en-CA"));
const sDec = (x, d = 2) => (x == null ? "n/a" : (x > 0 ? "+" : "") + Number(x).toFixed(d));
const pctChange = (a, b) => (a != null && b ? ((a - b) / b) * 100 : null);
const shortM = (m) => (m ? m.replace(/ \d{2}(\d{2})$/, "'$1") : m);
const LATEST_IDX = MONTHS.length - 1;

// ---- page registry ----
const PAGE_LABEL = { executive: "Executive Summary", overview: "Overview", platforms: "By Platform", notes: "Notes Analysis", sentiment: "Customer Sentiment Analysis", cross: "Cross Analysis", review: "Review", octreview: "Oct Review", selfserve: "Self-serve", ffps: "Friction Free Program" };
const PAGE_HASH = {
  "All|executive": "execsummary", "All|overview": "home", "All|selfserve": "selfserve", "All|ffps": "ffps",
  "HSIA|overview": "HSIA", "HSIA|notes": "hsiatickets", "HSIA|sentiment": "hsiasentiment", "HSIA|cross": "hsiacross", "HSIA|review": "hsiabrief",
  "TV|overview": "TV", "TV|platforms": "tvplatforms", "TV|notes": "tvtickets", "TV|sentiment": "tvsentiment", "TV|cross": "tvcross", "TV|review": "tvbrief", "TV|octreview": "tvoctreview",
  "SHS|overview": "SHS", "SH+|overview": "SH+"
};
const PAGES = [
  { product: "All", id: "overview", nav: "Overview" },
  { product: "All", id: "executive", nav: "Overview › Executive Summary" },
  { product: "HSIA", id: "overview", nav: "HSIA" },
  { product: "HSIA", id: "notes", nav: "HSIA › Notes Analysis" },
  { product: "HSIA", id: "sentiment", nav: "HSIA › Customer Sentiment Analysis" },
  { product: "HSIA", id: "cross", nav: "HSIA › Cross Analysis" },
  { product: "TV", id: "overview", nav: "TV" },
  { product: "TV", id: "platforms", nav: "TV › By Platform" },
  { product: "TV", id: "notes", nav: "TV › Notes Analysis" },
  { product: "TV", id: "sentiment", nav: "TV › Customer Sentiment Analysis" },
  { product: "TV", id: "cross", nav: "TV › Cross Analysis" },
  { product: "TV", id: "octreview", nav: "TV › Oct Review" },
  { product: "SHS", id: "overview", nav: "SHS" },
  { product: "SH+", id: "overview", nav: "SH+" },
  { product: "All", id: "selfserve", nav: "Self-serve" },
  { product: "All", id: "ffps", nav: "Friction Free Program" },
  { product: "HSIA", id: "review", nav: "Archive › HSIA Review" },
  { product: "TV", id: "review", nav: "Archive › TV Review (Stuck on Initializing)" }
];
const pageUrl = (product, id) => `${DASHBOARD_URL}#${encodeURIComponent(PAGE_HASH[`${product}|${id}`])}`;

// ---- section builders ----
const sec = (id, title, kind, data, note) => ({ id, title, kind, ...(note ? { note } : {}), data });
const textSec = (id, title, paragraphs, read, note, extra) => sec(id, title, "text", { ...(read ? { read } : {}), paragraphs: paragraphs.filter(Boolean), ...(extra || {}) }, note);
const tableSec = (id, title, columns, rows, note) => sec(id, title, "table", { columns, rows }, note);
const listSec = (id, title, items, note) => sec(id, title, "list", items, note);
const col = (key, label, unit) => ({ key, label, ...(unit ? { unit } : {}) });

function readOf(diff, goodWhenDown) {
  if (diff == null) return null;
  if (diff === 0) return "flat";
  return (diff < 0) === !!goodWhenDown ? "favourable" : "unfavourable";
}
// A card's MoM / YoY move. delta is the absolute move in the card's unit (per 100 for
// rates, points for percentages, count for volumes); pct is the relative move for volumes.
function cardMove(curr, prev, goodWhenDown, isRate) {
  if (curr == null || prev == null) return null;
  const d = curr - prev;
  const out = { delta: isRate ? round(d, 3) : round(d, 0), direction: d > 0 ? "up" : d < 0 ? "down" : "flat", read: readOf(d, goodWhenDown) };
  if (!isRate) out.pct = prev ? round((d / Math.abs(prev)) * 100, 1) : null;
  return out;
}
function cardFromSeries(label, series, { unit, goodWhenDown = true, isRate = false, upTo = LATEST_IDX } = {}) {
  const li = lastIdx(series || [], upTo);
  if (li < 0) return { label, value: null, unit, month: null, mom: null, yoy: null };
  return { label, value: series[li], unit, month: MONTHS[li], mom: li >= 1 ? cardMove(series[li], series[li - 1], goodWhenDown, isRate) : null, yoy: li >= 12 ? cardMove(series[li], series[li - 12], goodWhenDown, isRate) : null };
}
// Analysis-page cards: three analysis months, MoM is the last against the previous.
function cardFrom3(label, values, { unit, goodWhenDown = true, isRate = false, months, note } = {}) {
  const v = values;
  return { label, value: v[2], unit, month: months ? months[2] : null, mom: cardMove(v[2], v[1], goodWhenDown, isRate), yoy: null, ...(note ? { note } : {}) };
}
const cardStatic = (label, value, unit, month, note) => ({ label, value, unit, month: month || null, mom: null, yoy: null, ...(note ? { note } : {}) });

function seriesData(a, b, defs) {
  const series = {};
  for (const d of defs) if (d.values) series[d.key] = { label: d.label, unit: d.unit || "count", values: d.values.slice(a, b + 1) };
  return { months: MONTHS.slice(a, b + 1), series };
}
const seriesSec = (id, title, a, b, defs, note) => sec(id, title, "series", seriesData(a, b, defs), note);
// Three-month analysis table rows: name, each month, change and %.
function monthRows(items, months, extra) {
  return items.map((it) => {
    const row = { name: it.name };
    months.forEach((m, i) => { row[m] = it.v[i]; });
    row.change = it.v[2] != null && it.v[1] != null ? it.v[2] - it.v[1] : null;
    row.changePct = it.v[1] ? round(((it.v[2] - it.v[1]) / it.v[1]) * 100, 1) : null;
    if (extra) Object.assign(row, extra(it));
    return row;
  });
}
const monthCols = (first, months, more = []) => [col("name", first), ...months.map((m) => col(m, m, "count")), col("change", "Change (latest vs prior)", "count"), col("changePct", "Change %", "%"), ...more];

// Product list guard for pages
function requirePage(product, id) {
  if (!SCOPES.includes(product)) throw new Error(`product must be one of ${SCOPES.join(", ")}`);
  if (!PAGES.some((p) => p.id === id)) throw new Error(`page must be one of ${[...new Set(PAGES.map((p) => p.id))].join(", ")}`);
  if (!PAGES.some((p) => p.product === product && p.id === id)) throw new Error(`page not available for ${product}`);
}

// ---- Health Read (mirrors MonthlyNarrative in site/App.jsx) ----
const NOTES_ANALYSIS = { HSIA: HSA, TV: TVA };
const callsSeries = (sc) => (CALLS_SPLIT[sc] ? CALLS_SPLIT[sc].offered : DATA.callsOffered[sc]);
function narrativeFacts(sc, i) {
  const at = (arr, k) => (arr && k >= 0 && k < arr.length ? arr[k] : null);
  const pick = (arr) => ({ now: at(arr, i), prev: at(arr, i - 1), yoy: at(arr, i - 12) });
  const bps = (o, k) => (o.now != null && o[k] != null ? +(o.now - o[k]).toFixed(2) : null);
  const calls = pick(callsSeries(sc));
  const tv = pick(DATA.ticketVolume[sc]), tr = pick(DATA.ticketRate[sc]), rv = pick(DATA.repairVolume[sc]), rr = pick(DATA.repairRate[sc]), base = pick(DATA.subBase[sc]);
  return {
    sc, i, month: MONTHS[i], prevMonth: MONTHS[i - 1], calls, tv, tr, rv, rr, base, basePct: pctChange(base.now, base.prev),
    trBps: bps(tr, "prev"), rrBps: bps(rr, "prev"), trBpsY: bps(tr, "yoy"), rrBpsY: bps(rr, "yoy"),
    callsPct: pctChange(calls.now, calls.prev), callsPctY: pctChange(calls.now, calls.yoy),
    tvPct: pctChange(tv.now, tv.prev), tvPctY: pctChange(tv.now, tv.yoy), rvPct: pctChange(rv.now, rv.prev), rvPctY: pctChange(rv.now, rv.yoy),
    per100: tv.now && rv.now != null ? (rv.now / tv.now) * 100 : null, per100Prev: tv.prev && rv.prev != null ? (rv.prev / tv.prev) * 100 : null,
    perTicket: calls.now != null && tv.now ? calls.now / tv.now : null, perTicketPrev: calls.prev != null && tv.prev ? calls.prev / tv.prev : null
  };
}
function ticketDriver(product, i, prefer = 0) {
  const L = LOOKER[product];
  if (!L || !L.cats || i < 1) return null;
  let rows = L.cats.filter((c) => !/^Other/.test(c.name)).map((c) => ({ name: c.name, now: c.series[i], prev: c.series[i - 1], d: c.series[i] - c.series[i - 1] })).filter((r) => r.now != null && r.prev != null);
  if (!rows.length) return null;
  if (prefer && rows.some((r) => Math.sign(r.d) === prefer)) rows = rows.filter((r) => Math.sign(r.d) === prefer);
  rows.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const total = L.monthlyTotal[i] - L.monthlyTotal[i - 1];
  return { ...rows[0], total, pct: rows[0].prev ? (rows[0].d / rows[0].prev) * 100 : null };
}
function verdictOf(f) {
  const t = f.trBps, r = f.rrBps;
  if (t == null && r == null) return { label: "No read yet", tone: "flat" };
  if (t > 0 && (r == null || r >= 0)) return { label: "Deteriorating", tone: "bad" };
  if (t < 0 && (r == null || r <= 0)) return { label: "Improving", tone: "good" };
  if (t === 0 && (r == null || r === 0)) return { label: "Steady", tone: "flat" };
  return { label: "Mixed", tone: "flat" };
}
const upDown = (x, up = "rose", down = "fell", flat = "held") => (x == null ? flat : x > 0 ? up : x < 0 ? down : flat);
const sBps = (b) => (b == null ? "n/a" : (b > 0 ? "+" : "") + b + " per 100");
function healthMetricDefs(sc, i) {
  return [
    { key: "ticketRate", eyebrow: "Tickets", name: "Ticket rate per 100 subs", data: DATA.ticketRate[sc], fmt: (x) => fmtRate(x, 2), rate: true, goodDown: true, unit: "per 100 subscribers" },
    { key: "ticketVolume", eyebrow: "Tickets", name: "Ticket volume", data: DATA.ticketVolume[sc], fmt: fmtBig, goodDown: true, unit: "count" },
    { key: "repairRate", eyebrow: "Repairs", name: "Repair / dispatch rate per 100 subs", data: DATA.repairRate[sc], fmt: (x) => fmtRate(x, 2), rate: true, goodDown: true, unit: "per 100 subscribers" },
    { key: "repairVolume", eyebrow: "Repairs", name: "Dispatches", data: DATA.repairVolume[sc], fmt: fmtBig, goodDown: true, unit: "count" },
    { key: "callsOffered", eyebrow: "Calls", name: "Calls offered", data: callsSeries(sc), fmt: fmtBig, goodDown: true, unit: "count" },
    { key: "subBase", eyebrow: "Base", name: "Subscriber base", data: DATA.subBase[sc], fmt: fmtBig, goodDown: false, unit: "count" },
    { key: "b2bVoC", eyebrow: "B2B VoC", name: "B2B reliability score", data: DATA.b2bVoC[sc], fmt: (x) => (x == null ? "—" : x.toFixed(1)), goodDown: true, pts: true, unit: "% (lower is better)" }
  ].filter((m) => m.data && m.data[i] != null);
}
// Everything the Health Read shows for a product as of month index i: the verdict, the
// per-lens hero statements, the context blocks and the top issues.
function healthRead(sc, i, a) {
  const f = narrativeFacts(sc, i);
  if (f.tv.now == null || f.tr.now == null) return { empty: `${sc} has no reported tickets for ${f.month}, so there is no narrative for this month.`, lenses: [] };
  const v = verdictOf(f);
  const prefer = v.tone === "good" ? -1 : v.tone === "bad" ? 1 : 0;
  const baseEffect = f.trBps != null && f.tvPct != null && f.basePct != null && Math.sign(f.trBps) !== 0 && Math.sign(f.tvPct) !== 0 && Math.sign(f.trBps) !== Math.sign(f.tvPct);
  const label = sc === "All" ? "Across HSIA, TV and SHS" : `For ${sc}`;
  let driverText = null, driverProduct = sc;
  const catText = (d) => `${d.name} ${d.d >= 0 ? "added" : "shed"} ${Math.abs(d.d).toLocaleString("en-CA")} tickets (${sPct(d.pct)}) versus ${f.prevMonth}`;
  if (baseEffect) driverText = `The ticket rate ${upDown(f.trBps)} because the subscriber base ${upDown(f.basePct, "grew", "shrank")} ${aPct(f.basePct)} while ticket volume ${upDown(f.tvPct)} ${aPct(f.tvPct)}; the underlying ticket count is ${f.tvPct > 0 ? "still rising" : "falling"}.`;
  if (sc === "All") {
    const per = PRODUCTS.map((p) => ({ p, f: narrativeFacts(p, i) })).filter((x) => x.f.tv.now != null && x.f.tv.prev != null);
    per.sort((x, y) => Math.abs(y.f.tv.now - y.f.tv.prev) - Math.abs(x.f.tv.now - x.f.tv.prev));
    if (per.length) {
      const lead = per[0]; driverProduct = lead.p;
      const d = ticketDriver(lead.p, i, baseEffect ? 0 : prefer);
      const lt = `${lead.p} was the largest mover: ticket volume ${upDown(lead.f.tv.now - lead.f.tv.prev)} ${Math.abs(lead.f.tv.now - lead.f.tv.prev).toLocaleString("en-CA")} (${sPct(lead.f.tvPct)}) and its ticket rate ${upDown(lead.f.trBps)} ${Math.abs(lead.f.trBps)} per 100` + (d ? `, led by ${d.name} (${d.d > 0 ? "+" : ""}${d.d.toLocaleString("en-CA")}, ${sPct(d.pct)}).` : ".");
      driverText = driverText ? `${driverText} ${lt}` : lt;
    }
  } else {
    const d = ticketDriver(sc, i, baseEffect ? 0 : prefer);
    if (d) {
      const share = d.total && Math.sign(d.d) === Math.sign(d.total) ? `, ${Math.min(100, Math.round((Math.abs(d.d) / Math.abs(d.total)) * 100))}% of the net change` : d.total ? `, against a net ${d.total > 0 ? "rise" : "fall"} of ${Math.abs(d.total).toLocaleString("en-CA")}` : "";
      const ct = `${catText(d)}, the largest ${baseEffect ? "" : prefer < 0 ? "downward " : prefer > 0 ? "upward " : ""}category move${share}.`;
      driverText = driverText ? `${driverText} ${ct}` : ct;
    } else if (sc === "SH+") {
      const st = "SH+ has no ticket category breakdown yet, so the read rests on the rate and volume movements.";
      driverText = driverText ? `${driverText} ${st}` : st;
    }
  }
  let notesText = null, closureText = null;
  const NA = NOTES_ANALYSIS[driverProduct];
  if (NA && f.month === NA.months[NA.months.length - 1]) {
    const r = NA.tickets.rising[0];
    if (r) notesText = `In the ${driverProduct} agent notes the biggest sub-category mover was ${r.name} (${r.v[1].toLocaleString("en-CA")} → ${r.v[2].toLocaleString("en-CA")}, ${sPct(r.pct)}).`;
    const c = NA.tickets.closure;
    if (c && c.length >= 2 && c[c.length - 1].field_visit_pct != null) closureText = `Field visits closed ${c[c.length - 1].field_visit_pct}% of ${driverProduct} tickets against ${c[c.length - 2].field_visit_pct}% the month before (notes analysis).`;
  }
  const tickets = [
    `Ticket rate ${upDown(f.trBps)} ${f.trBps == null ? "" : Math.abs(f.trBps) + " per 100 subs "}to ${fmtRate(f.tr.now, 2)} per 100 subs${f.trBpsY != null ? ` (${sBps(f.trBpsY)} year over year)` : ""}.`,
    f.tv.prev != null ? `Volume ${upDown(f.tvPct)} ${aPct(f.tvPct)} to ${fmtNum(f.tv.now)}${f.tvPctY != null ? ` (${sPct(f.tvPctY)} YoY)` : ""}.` : `Volume was ${fmtNum(f.tv.now)}.`,
    f.basePct != null ? `Subscriber base ${upDown(f.basePct, "grew", "shrank")} ${aPct(f.basePct)}.` : null,
    notesText
  ].filter(Boolean).join(" ");
  const repairs = f.rr.now == null ? "Repairs are not reported for this month." : [
    `Repair rate ${upDown(f.rrBps)} ${f.rrBps == null ? "" : Math.abs(f.rrBps) + " per 100 subs "}to ${fmtRate(f.rr.now, 2)} per 100 subs${f.rrBpsY != null ? ` (${sBps(f.rrBpsY)} YoY)` : ""}.`,
    f.rv.now != null ? `${fmtNum(f.rv.now)} dispatches${f.rvPct != null ? ` (${sPct(f.rvPct)} MoM${f.rvPctY != null ? `, ${sPct(f.rvPctY)} YoY` : ""})` : ""}.` : null,
    f.per100 != null && f.per100Prev != null ? `${f.per100Prev.toFixed(1)} → ${f.per100.toFixed(1)} dispatches per 100 tickets, so ${f.per100 < f.per100Prev - 0.05 ? "a smaller" : f.per100 > f.per100Prev + 0.05 ? "a larger" : "the same"} share of tickets needed a field visit.` : null,
    closureText
  ].filter(Boolean).join(" ");
  const calls = f.calls.now == null ? "Calls are not reported for this month." : [
    `Calls offered ${upDown(f.callsPct)} ${aPct(f.callsPct)} to ${fmtNum(f.calls.now)}${f.callsPctY != null ? ` (${sPct(f.callsPctY)} YoY)` : ""}.`,
    f.perTicket != null && f.perTicketPrev != null ? `${f.perTicketPrev.toFixed(2)} → ${f.perTicket.toFixed(2)} calls per ticket: ${f.callsPct != null && f.tvPct != null && f.callsPct > f.tvPct + 1 ? "contacts are growing faster than tickets, which points to repeat and status calls rather than new faults" : f.callsPct != null && f.tvPct != null && f.callsPct < f.tvPct - 1 ? "contacts grew more slowly than tickets, so more of the demand is converting into tickets than into repeat calls" : "contacts tracked tickets"}.` : null
  ].filter(Boolean).join(" ");
  const baseClause = baseEffect ? ` (volume ${upDown(f.tvPct)} ${aPct(f.tvPct)}; the base ${upDown(f.basePct, "grew", "shrank")} ${aPct(f.basePct)})` : "";
  const headline = v.tone === "bad"
    ? `${label}, reliability deteriorated in ${f.month}: the ticket rate ${upDown(f.trBps)} ${Math.abs(f.trBps || 0)} per 100${baseClause}${f.rrBps != null ? ` and the repair rate ${upDown(f.rrBps)} ${Math.abs(f.rrBps)} per 100` : ""}.`
    : v.tone === "good"
      ? `${label}, reliability improved in ${f.month}: the ticket rate ${upDown(f.trBps)} ${Math.abs(f.trBps || 0)} per 100${baseClause}${f.rrBps != null ? ` and the repair rate ${upDown(f.rrBps)} ${Math.abs(f.rrBps)} per 100` : ""}.`
      : `${label}, the ${f.month} read is mixed: the ticket rate ${upDown(f.trBps)} ${Math.abs(f.trBps || 0)} per 100 while the repair rate ${upDown(f.rrBps)} ${Math.abs(f.rrBps || 0)} per 100.`;
  const yoyT = (a26, a25) => (a25 ? sPct(((a26 - a25) / a25) * 100) : null);
  let topIssues = [];
  if (sc === "All") topIssues = PRODUCTS.filter((p) => LOOKER[p] && LOOKER[p].topIssues.length).map((p) => ({ ...LOOKER[p].topIssues[0], p })).sort((x, y) => y.a26 - x.a26).slice(0, 3).map((t) => ({ title: `${t.p} · ${t.issue}`, body: `${t.a26.toLocaleString("en-CA")} tickets${yoyT(t.a26, t.a25) ? ` (${yoyT(t.a26, t.a25)} YoY)` : ""}`, meta: { product: t.p, tickets: t.a26, priorYear: t.a25 || null } }));
  else if (LOOKER[sc]) topIssues = LOOKER[sc].topIssues.slice(0, 3).map((t) => ({ title: t.issue, body: `${t.a26.toLocaleString("en-CA")} tickets${yoyT(t.a26, t.a25) ? ` (${yoyT(t.a26, t.a25)} YoY)` : ""}`, meta: { tickets: t.a26, priorYear: t.a25 || null } }));

  // lenses: one per metric, in the dashboard's switcher order
  const defs = healthMetricDefs(sc, i);
  const yearStart = Math.floor(i / 12) * 12;
  const lenses = defs.map((metric, k) => {
    const mNow = metric.data[i], mPrev = metric.data[i - 1], mYoy = metric.data[i - 12];
    const mDelta = mPrev == null ? null : metric.rate ? +(mNow - mPrev).toFixed(2) : metric.pts ? +(mNow - mPrev).toFixed(1) : ((mNow - mPrev) / mPrev) * 100;
    const mDeltaY = mYoy == null ? null : metric.rate ? +(mNow - mYoy).toFixed(2) : metric.pts ? +(mNow - mYoy).toFixed(1) : ((mNow - mYoy) / mYoy) * 100;
    const chg = (d) => { if (d == null) return null; if (d === 0 || (!metric.rate && Math.abs(d) < 0.05)) return "flat"; const amt = metric.rate ? `${Math.abs(d)} per 100` : metric.pts ? `${Math.abs(d).toFixed(1)} pts` : `${Math.abs(d).toFixed(1)}%`; return `${amt} ${d > 0 ? "higher" : "lower"}`; };
    const favourable = mDelta == null || mDelta === 0 ? null : (mDelta < 0) === metric.goodDown;
    const run = metric.data.slice(yearStart, i + 1).map((x, j) => ({ x, m: MONTHS[yearStart + j] })).filter((r) => r.x != null);
    const runMin = run.length ? run.reduce((p, q) => (q.x < p.x ? q : p)) : null, runMax = run.length ? run.reduce((p, q) => (q.x > p.x ? q : p)) : null;
    const hero = `${metric.name} was ${metric.fmt(mNow)} in ${shortM(f.month)}${mDelta != null ? `, ${chg(mDelta)} MoM${favourable == null ? "" : favourable ? ", which is favourable." : ", which is unfavourable."}` : "."}`;
    const supporting = [
      run.length > 1 && runMin && runMax ? `${run.length} months of ${MONTHS[i].slice(-4)} have run between ${metric.fmt(runMin.x)} in ${shortM(runMin.m)} and ${metric.fmt(runMax.x)} in ${shortM(runMax.m)}.` : null,
      mYoy != null ? `${shortM(f.month)} sits ${chg(mDeltaY)} than ${shortM(MONTHS[i - 12])} (${metric.fmt(mYoy)}), which is ${(mDeltaY < 0) === metric.goodDown ? "favourable" : mDeltaY === 0 ? "level" : "unfavourable"} year over year.` : null,
      metric.eyebrow === "Tickets" ? driverText : metric.eyebrow === "Repairs" ? repairs : metric.eyebrow === "Calls" ? calls : null
    ].filter(Boolean).join(" ");
    const prior = a >= 12 ? metric.data.slice(a - 12, i + 1 - 12) : null;
    return { no: String(k + 1).padStart(2, "0"), key: metric.key, name: metric.name, eyebrow: metric.eyebrow, read: favourable == null ? "Level" : favourable ? "Favourable" : "Unfavourable", hero, supporting, unit: metric.unit, data: metric.data, prior: prior && prior.some((x) => x != null) ? prior : null, priorLabel: String(+MONTHS[i].slice(-4) - 1) };
  });
  return { f, verdict: v.label, headline, driverText, tickets, repairs, calls, topIssues, lenses, footnote: `Month-over-month against ${f.prevMonth}; rate movements are per 100 subscribers. Churn is excluded from this read until the churn model refresh lands (last reported ${CHURN_THRU}).` };
}
function healthSections(sc, i, a, b, prefix = "health") {
  const h = healthRead(sc, i, a);
  const out = [];
  if (h.empty) return [textSec(`${prefix}`, `Health Read — ${MONTHS[i]}`, [h.empty])];
  h.lenses.forEach((l) => {
    const defs = [{ key: "actual", label: "Actual", unit: l.unit, values: l.data }];
    if (l.prior) defs.push({ key: "prior", label: l.priorLabel, unit: l.unit, values: l.prior.concat(Array(Math.max(0, (b - a + 1) - l.prior.length)).fill(null)) });
    const series = { months: MONTHS.slice(a, b + 1), series: { actual: { label: "Actual", unit: l.unit, values: l.data.slice(a, b + 1) }, ...(l.prior ? { prior: { label: l.priorLabel, unit: l.unit, values: l.prior } } : {}) } };
    out.push(textSec(`${prefix}-${l.no}-${l.key}`, `${l.no} · ${sc === "All" ? "All products" : sc} · ${l.eyebrow} · ${l.name}`, [l.hero, l.supporting], l.read, `Verdict for the month: ${h.verdict}. Lens sections carry their chart under data.series (series shape).`, { series }));
  });
  if (sc !== "All") {
    const c = toolReply("get_health_commentary", { product: sc }).commentary;
    const items = typeof c === "string" ? [{ title: "Commentary", body: c }] : [
      ...c.bullets.map((bl) => ({ title: "Context", body: bl })),
      ...c.themes.map((t) => ({ title: t.theme, body: [t.share, t.note].filter(Boolean).join(" · "), meta: { share: t.share, rootCauses: t.rootCauses, inProgress: t.inProgress, relatedInitiatives: t.relatedInitiatives, note: t.note } }))
    ];
    out.push(listSec(`${prefix}-commentary`, "Commentary", items, `Published commentary for ${LATEST}; edits made in the dashboard are browser-local and not served here.`));
  }
  out.push(textSec(`${prefix}-context`, "Additional Monthly Context", [h.headline, h.driverText ? `Main reason · ${h.driverText}` : null, `Tickets · ${h.tickets}`, `Repairs / dispatches · ${h.repairs}`, `Calls · ${h.calls}`], h.verdict, h.footnote));
  if (h.topIssues.length) out.push(listSec(`${prefix}-top-issues`, `Top issues — ${LATEST_SHORT}`, h.topIssues));
  return out;
}

// ---- KPI cards (mirrors scopeTiles) ----
function kpiCards(sc, upTo) {
  if (sc === "SH+") return [
    cardFromSeries("Calls offered (SH+)", DATA.callsOffered["SH+"], { unit: "count", upTo }),
    cardFromSeries("Ticket volume", DATA.ticketVolume["SH+"], { unit: "count", upTo }),
    cardFromSeries("Ticket rate per 100 subs", DATA.ticketRate["SH+"], { unit: "per 100 subscribers", isRate: true, upTo }),
    cardFromSeries("Repair volume", DATA.repairVolume["SH+"], { unit: "count", upTo }),
    cardFromSeries("Repair / dispatch rate per 100 subs", DATA.repairRate["SH+"], { unit: "per 100 subscribers", isRate: true, upTo }),
    cardFromSeries("Subscriber base", DATA.subBase["SH+"], { unit: "count", goodWhenDown: false, upTo })
  ];
  return [
    cardFromSeries(sc === "All" ? "Calls offered (all products)" : `Calls offered (${sc})`, callsSeries(sc), { unit: "count", upTo }),
    cardFromSeries(sc === "All" ? "Ticket volume (all products)" : "Ticket volume", DATA.ticketVolume[sc], { unit: "count", upTo }),
    cardFromSeries("Ticket rate per 100 subs", DATA.ticketRate[sc], { unit: "per 100 subscribers", isRate: true, upTo }),
    cardFromSeries("Repair / dispatch rate per 100 subs", DATA.repairRate[sc], { unit: "per 100 subscribers", isRate: true, upTo }),
    cardFromSeries("Churn rate per 100 subs", DATA.churnRate[sc], { unit: "per 100 subscribers", isRate: true, upTo }),
    cardFromSeries("Subscriber base", DATA.subBase[sc], { unit: "count", goodWhenDown: false, upTo }),
    ...(DATA.b2bVoC[sc] ? [cardFromSeries("Voice of Customer (B2B)", DATA.b2bVoC[sc], { unit: "% (lower is better)", isRate: true, upTo })] : [])
  ];
}
function annualChurnText(p) {
  const y = DATA.annualChurn[p];
  if (!y) return null;
  return `Annual churn (go/national RGU): ${y.yoyPts <= 0 ? "▼" : "▲"} ${Math.abs(y.yoyPts).toFixed(2)} per 100 subs YoY — 2026 YTD ${y.y2026.toFixed(2)} vs 2025 ${y.y2025.toFixed(2)} per 100 subs`;
}

// ---- initiatives (table + timeline, mirrors InitiativeRows / InitiativeTimeline) ----
const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monAbs = (mon, yr) => yr * 12 + MON3.indexOf(mon);
function parseTimeline(tl) {
  if (!tl) return null;
  let m;
  if ((m = tl.match(/^([A-Z][a-z]{2}) [–-] ([A-Z][a-z]{2}) (\d{4})$/)) && MON3.includes(m[1]) && MON3.includes(m[2])) return { s: monAbs(m[1], +m[3]), e: monAbs(m[2], +m[3]), kind: "range" };
  if ((m = tl.match(/^([A-Z][a-z]{2}) (\d{4})/)) && MON3.includes(m[1])) { const a = monAbs(m[1], +m[2]); return { s: a, e: a, kind: "month" }; }
  if ((m = tl.match(/^Q([1-4]) (\d{4})$/))) { const s = +m[2] * 12 + (+m[1] - 1) * 3; return { s, e: s + 2, kind: "quarter" }; }
  if ((m = tl.match(/^(\d{4})\b/))) { const s = +m[1] * 12; return { s, e: s + 11, kind: "year" }; }
  return null;
}
const absLabel = (a) => `${MON3[a % 12]} ${Math.floor(a / 12)}`;
function timelineHasMonth(tl, month) {
  if (tl.includes(month)) return true;
  const m = tl.match(/^([A-Z][a-z]{2}) [–-] ([A-Z][a-z]{2}) (\d{4})$/), [mon, yr] = month.split(" ");
  if (!m || m[3] !== yr) return false;
  const a = MON3.indexOf(m[1]), b = MON3.indexOf(m[2]), i = MON3.indexOf(mon);
  return a >= 0 && b >= 0 && i >= a && i <= b;
}
const IMPACT_LABEL = { H: "High", M: "Medium", L: "Low" };
const pillarName = (n) => (PILLARS.find((p) => p.n === n) || {}).name || null;
const initRow = (it) => ({ initiative: it.name, product: it.p, theme: it.theme, status: it.status, timeline: it.timeline, prime: it.prime, impact: it.impact ? IMPACT_LABEL[it.impact] : null, pillar: it.pillar, pillarName: pillarName(it.pillar), description: it.desc });
const INIT_COLS = [col("initiative", "Initiative"), col("product", "Product"), col("theme", "Theme"), col("status", "Status"), col("timeline", "Timeline"), col("prime", "Prime"), col("impact", "Impact (HSIA only)"), col("pillar", "Pillar"), col("pillarName", "Pillar name"), col("description", "Description")];
function initiativesTable(id, title, items, note) { return tableSec(id, title, INIT_COLS, items.map(initRow), note); }
function timelineTable(id, title, items, note) {
  const parsed = items.map((it) => ({ it, t: parseTimeline(it.timeline) }));
  const rows = parsed.map(({ it, t }) => ({ initiative: it.name, product: it.p, pillar: it.pillar, pillarName: pillarName(it.pillar), status: it.status, timeline: it.timeline, start: t ? absLabel(t.s) : null, end: t ? absLabel(t.e) : null, kind: t ? t.kind : "undated", prime: it.prime, theme: it.theme }));
  rows.sort((x, y) => (x.pillar - y.pillar) || ((x.start || "zz") > (y.start || "zz") ? 1 : -1));
  return tableSec(id, title, [col("initiative", "Initiative"), col("product", "Product"), col("pillar", "Pillar"), col("pillarName", "Pillar name"), col("status", "Status"), col("timeline", "Timeline (as written)"), col("start", "Start month"), col("end", "End month"), col("kind", "Timeline kind"), col("prime", "Prime"), col("theme", "Theme")], rows, note || `Gantt rows by pillar; undated timelines ("—", "Ongoing", "In planning") carry kind "undated". Latest reported month ${LATEST}.`);
}

// ---- ticket issues & movers (mirrors TicketIssuesSection) ----
function issueRow(product, r) {
  const themes = issueThemes(product, r.issue), cov = initiativesByTheme(product, themes, r.issue);
  return { issue: r.issue, group: r.grp, ...(product === "HSIA" ? { painPoint: hsiaPainPoint(r.issue) } : {}), latest: r.a26, priorMonth: r.prev ?? null, priorYear: r.a25 || null, momDelta: r.prev != null ? r.a26 - r.prev : null, momPct: r.prev ? round(((r.a26 - r.prev) / r.prev) * 100, 1) : null, yoyDelta: r.a25 ? r.a26 - r.a25 : null, yoyPct: r.a25 ? round(((r.a26 - r.a25) / r.a25) * 100, 1) : null, newIn2026: !r.a25, initiativeThemes: themes, initiativeCoverage: cov.length, coveringInitiatives: cov.map((c) => c.name) };
}
const ISSUE_COLS = (product) => [col("issue", "Issue (Category › Sub-category)"), col("group", "Recurring-issue group"), ...(product === "HSIA" ? [col("painPoint", "Customer pain point")] : []), col("latest", LATEST_SHORT, "count"), col("priorMonth", LATEST_PREV_SHORT, "count"), col("priorYear", LATEST_PRIOR_SHORT, "count"), col("momDelta", "MoM", "count"), col("momPct", "MoM %", "%"), col("yoyDelta", "YoY", "count"), col("yoyPct", "YoY %", "%"), col("newIn2026", "New in 2026"), col("initiativeThemes", "Initiative theme"), col("initiativeCoverage", "Initiative coverage (count)"), col("coveringInitiatives", "Covering initiatives")];
function ticketIssueSections(product, prefix, n) {
  const L = LOOKER[product];
  const t = (s) => `${n} · Ticket issues & movers · ${s}`;
  const out = [
    listSec(`${prefix}-rising`, t(`Top rising issues · ${LATEST_MOM}`), L.rising.map((r) => ({ title: r.issue, body: `${sNum(r.delta)} MoM (${sPct(r.prev ? (r.delta / r.prev) * 100 : null)})${product === "HSIA" ? ` · ${hsiaPainPoint(r.issue)}` : ""}`, meta: issueRow(product, r) }))),
    listSec(`${prefix}-falling`, t(`Top falling issues · ${LATEST_MOM}`), L.falling.map((r) => ({ title: r.issue, body: `${sNum(r.delta)} MoM (${sPct(r.prev ? (r.delta / r.prev) * 100 : null)})${product === "HSIA" ? ` · ${hsiaPainPoint(r.issue)}` : ""}`, meta: issueRow(product, r) }))),
    tableSec(`${prefix}-top-issues`, t(`Top issues by ticket volume — ${LATEST}`), ISSUE_COLS(product), L.topIssues.map((r) => issueRow(product, r)), `Looker ticket categories from the Churn Measurement 2026 workbook; each issue is mapped to the theme(s) used by the product's initiatives and coverage counts the initiatives carrying those themes${product === "SHS" ? " (SHS themes are the pillar sub-themes from the workbook)" : ""}. MoM compares ${LATEST} against the prior month; YoY compares ${LATEST} against ${LATEST_PRIOR}. Rising and falling issues are the largest month-over-month volume movers among issues with 100+ tickets.`)
  ];
  if (product === "HSIA") out.push(listSec(`${prefix}-pain-points`, t("Customer pain points · how Looker ticket types are grouped (hsia_ticket_recategorization tab)"), HSIA_PAIN_POINTS.map((pp) => ({ title: pp.name, body: pp.types }))));
  return out;
}

// ---- product overview page (mirrors ProductPage) ----
function overviewPage(product, a, b) {
  const upTo = b, latestLabel = MONTHS[b];
  const S = [];
  S.push(sec("cards", "KPI cards", "cards", kpiCards(product, upTo), "Latest value as of the `to` month with MoM and YoY; rates per 100 subscribers, B2B in points."));
  const ac = annualChurnText(product);
  if (ac) S.push(textSec("annual-churn", "Annual churn", [ac], DATA.annualChurn[product].yoyPts <= 0 ? "favourable" : "unfavourable"));
  if (CHILD_PAGES[product]) S.push(listSec("sub-pages", "Sub-pages", CHILD_PAGES[product].map((id) => ({ title: CHILD_LABEL[id], meta: { url: `${DASHBOARD_URL}#${id}` } }))));
  if (product === "SH+") S.push(textSec("about", "About SH+", ["SmartHome+ KPIs come from the SH+ reliability KPIs workbook: subscriber base, calls and ticket volume from Jan 2025, ticket and repair rates from Jul 2025. Churn, ticket categories and improvement initiatives are not yet reported for SH+."]));
  let n = 0; const num = () => String(++n).padStart(2, "0");
  // 01 Health Read
  const hn = num();
  healthSections(product, upTo, a, b, `s${hn}-health`).forEach((s) => S.push({ ...s, title: `${hn} · Health Read — ${latestLabel} · ${s.title}` }));
  // 02 Calls
  const split = CALLS_SPLIT[product];
  const callsNote = product === "SHS" ? "SHS contacts, offered vs. answered." : product === "SH+" ? "SH+ contacts offered vs answered (SH+ reliability KPIs workbook)." : product === "HSIA" ? "HSIA contacts offered vs answered — TS Calls Offered by Product workbook (Actuals tabs), summing every field containing HSIA." : "TV contacts offered vs answered, rolled up across platforms — TS Calls Offered by Product workbook (Actuals tabs): IPTV West + TV+ (OPUS) + PIK + PFE - IPTV + TQ ILEC - IPTV.";
  S.push(seriesSec(`s${num()}-calls`, `${String(n).padStart(2, "0")} · Calls · Contacts (${product}) — offered (bars) and answered (line)`, a, b, [{ key: "offered", label: "Offered", values: split ? split.offered : DATA.callsOffered[product] }, { key: "answered", label: "Answered", values: split ? split.answered : DATA.callsAnswered[product] }], callsNote));
  // 03 Tickets
  const tn = num();
  S.push(seriesSec(`s${tn}-tickets`, `${tn} · Tickets — volume (bars) and rate (line, per 100 subs)`, a, b, [{ key: "ticketVolume", label: "Ticket volume", values: DATA.ticketVolume[product] }, { key: "ticketRate", label: "Ticket rate", unit: "per 100 subscribers", values: DATA.ticketRate[product] }], product === "SH+" ? "SH+ ticket volume from Jan 2025 and ticket rate from Jul 2025 (SH+ reliability KPIs workbook)." : "Ticket volume on the left axis, ticket rate on the right axis (Reliability Deact KPIs tab)."));
  const L = LOOKER[product];
  if (L) {
    const risers = Object.entries(L.risers || {}).filter(([m]) => { const k = MONTHS.indexOf(m); return k >= a && k <= b; }).map(([m, r]) => ({ month: m, issue: r.issue, pct: r.pct, from: r.from, to: r.to }));
    S.push(seriesSec(`s${tn}-categories`, `${tn} · ${L.catSource === "recategorization" ? `Ticket volume by customer pain point — largest ${L.topCat.name}` : `Looker ticket volume by category — top category ${L.topCat.name}`}`, a, b, [{ key: "total", label: "Total", values: L.monthlyTotal }, ...L.cats.map((c, k) => ({ key: `cat${k + 1}`, label: c.name, values: c.series }))], L.catSource === "recategorization" ? `hsia_ticket_recategorization tab, Churn Measurement 2026 workbook. Looker ticket types rolled up to customer pain points; ${L.topCat.name} sits at the base of each bar.` : `Looker ticket categories, Churn Measurement 2026 workbook. The five largest Category 1 groups (by ${LATEST} volume) with the remainder as other categories.`));
    S.push(tableSec(`s${tn}-biggest-riser`, `${tn} · Biggest riser vs prior month (chart tooltip, 2026)`, [col("month", "Month"), col("issue", "Issue"), col("pct", "Rise %", "%"), col("from", "From", "count"), col("to", "To", "count")], risers, "Biggest month-over-month % riser among Looker Category 1 › 2 issues with 100+ tickets in the prior month."));
    ticketIssueSections(product, `s${num()}-issues`, String(n).padStart(2, "0")).forEach((s) => S.push(s));
  }
  // Repairs
  const rn = num();
  S.push(seriesSec(`s${rn}-repairs`, `${rn} · Repairs / Dispatches — volume (bars) and rate (line, per 100 subs)`, a, b, [{ key: "repairVolume", label: "Repair volume", values: DATA.repairVolume[product] }, { key: "repairRate", label: "Repair rate", unit: "per 100 subscribers", values: DATA.repairRate[product] }], product === "SH+" ? "SH+ repairs are reported from Jul 2025 (SH+ reliability KPIs workbook)." : "Repair (dispatch) volume on the left axis, repair rate on the right axis."));
  if (product === "HSIA") S.push(sec(`s${rn}-fibre-spotlight`, `${rn} · HSIA spotlight — severely degraded fibre line`, "series", { months: DATA.hsiaFibreMonths, series: { fibrePct: { label: "Severely degraded fibre line, % of HSIA repairs", unit: "%", values: DATA.hsiaFibrePct } } }, "Share of HSIA repairs coded as severely degraded fibre line (own reporting window in the source; not filtered by from/to). Currently the single largest identified driver of HSIA repairs."));
  if (product !== "SH+") { const cn = num(); S.push(seriesSec(`s${cn}-churn`, `${cn} · Churn · Churn rate per 100 subs (go/national RGU)`, a, b, [{ key: "churnRate", label: product, unit: "per 100 subscribers", values: DATA.churnRate[product] }], `Churn runs behind the other indicators in the source (reported through ${CHURN_THRU}; Jan 2025 was never reported).`)); }
  if (DATA.b2bVoC[product]) { const bn = num(); S.push(seriesSec(`s${bn}-b2b`, `${bn} · Voice of Customer (B2B) · Reliability B2B score`, a, b, [{ key: "b2bVoC", label: product, unit: "% (lower is better)", values: DATA.b2bVoC[product] }], "HSIA West TCS PLT Charter and Toolkit workbook, HSIA West Scorecard tab (Reliability B2B rows). Lower is better.")); }
  const prodInits = INITIATIVES.filter((it) => it.p === product);
  const inn = num();
  if (prodInits.length) {
    S.push(initiativesTable(`s${inn}-initiatives`, `${inn} · Initiatives`, prodInits, `${product} initiatives from ${product === "HSIA" ? "the Product Technical | Churn & VOC Projects Impact sheet" : "the workbook's Initiatives tab"} (${prodInits.length}).`));
    const tln = num();
    S.push(timelineTable(`s${tln}-timeline`, `${tln} · Initiative timeline`, prodInits));
  } else S.push(textSec(`s${inn}-initiatives`, `${inn} · Initiatives`, [`${product} initiatives have not been added to the source workbook yet — this section will populate once they are.`]));
  return S;
}

// ---- All overview (the Overview home page in All scope; mirrors HomePage) ----
function homePage(a, b) {
  const upTo = b, latestLabel = MONTHS[b];
  const S = [];
  const cards = kpiCards("All", upTo);
  const res = sweeprFigure("resolved", upTo), dea = sweeprFigure("deacts", upTo);
  cards.splice(6, 0,
    { label: "Self-serve resolved sessions", value: res.latest, unit: "count", month: res.month, mom: res.mom, yoy: res.yoy, target: res.target, vsTarget: res.vsTarget, note: "Sweepr workflows" },
    { label: "Self-serve deacts saved", value: dea.latest, unit: "count", month: dea.month, mom: dea.mom, yoy: dea.yoy, note: "Sweepr workflows" });
  S.push(sec("cards", "01 · Executive summary · All products at a glance", "cards", cards, "Self-serve cards carry target and vsTarget in addition to the standard fields."));
  S.push(listSec("top-issues", `01 · Top ticket issue per product — ${LATEST_SHORT}`, PRODUCTS.filter((p) => LOOKER[p]).map((p) => { const t = LOOKER[p].topIssues[0]; return { title: `${p} · ${t.issue}`, body: `${t.a26.toLocaleString("en-CA")} tickets${t.a25 != null ? ` · ${sPct(((t.a26 - t.a25) / t.a25) * 100)} YoY` : ""}`, meta: { product: p, tickets: t.a26, priorYear: t.a25 || null, worse: t.a25 != null && t.a26 > t.a25 } }; })));
  S.push(textSec("how-to-read", "01 · How to read this", [`Comparisons are year-over-year at the end of the selected range. Latest reported month: ${LATEST} for calls, tickets, repairs and base; churn (go/national RGU) is reported through ${CHURN_THRU}. All-product rates are blended: total volume over total subscriber base (churn: base-weighted mean); calls are HSIA + TV + SHS contacts offered. SH+ is reported separately and is not yet included in the All rollup.`, `Annual churn: HSIA ${DATA.annualChurn.HSIA.y2026.toFixed(2)}% 2026 YTD vs ${DATA.annualChurn.HSIA.y2025.toFixed(2)}% 2025 · TV ${DATA.annualChurn.TV.y2026.toFixed(2)}% vs ${DATA.annualChurn.TV.y2025.toFixed(2)}% · SHS ${DATA.annualChurn.SHS.y2026.toFixed(2)}% vs ${DATA.annualChurn.SHS.y2025.toFixed(2)}%.`]));
  healthSections("All", upTo, a, b, "s02-health").forEach((s) => S.push({ ...s, title: `02 · Health Read — ${latestLabel} · ${s.title}` }));
  // 03 scorecard
  const months = MONTHS.slice(a, b + 1);
  const rows = INDICATORS.flatMap((ind) => ind.rows.map((r) => { const row = { category: ind.name, product: r.label, avg2025: agg2025(r.data, ind.agg2025) }; months.forEach((m, k) => { row[m] = r.data[a + k]; }); return row; }));
  S.push(tableSec("s03-scorecard", "03 · Monthly scorecard · Reliability scorecard", [col("category", "Category"), col("product", "Product"), col("avg2025", "2025 (sum for calls, average for rates)"), ...months.map((m) => col(m, m))], rows, `The month at the end of the selected range is the one under review. Calls are contacts offered. HSIA and TV call series come from the TS Calls Offered by Product workbook (Actuals tabs); SHS calls come from the KPI workbook. Churn rate is first reported for Feb 2025.`));
  // 04 recurring issues
  const prods = PRODUCTS.filter((p) => LOOKER[p]);
  S.push(tableSec("s04-recurring-issues", `04 · Ticket analysis · Tickets by recurring issue — ${LATEST}`, [col("issue", "Recurring issue"), ...prods.map((p) => col(p, `${p} · ${LATEST_SHORT}`, "count")), col("total", `Total · ${LATEST_SHORT}`, "count"), col("priorYearTotal", `Total · ${LATEST_PRIOR_SHORT}`, "count"), col("yoyDelta", "YoY", "count"), col("yoyPct", "YoY %", "%")],
    OVERVIEW_ISSUES.filter((r) => prods.some((p) => r[p])).map((r) => { const a26 = prods.reduce((s, p) => s + (r[p] ? r[p][0] : 0), 0), a25 = prods.reduce((s, p) => s + (r[p] ? r[p][1] : 0), 0); const row = { issue: ISSUE_META[r.grp].label }; prods.forEach((p) => { row[p] = r[p] ? r[p][0] : null; }); return { ...row, total: a26, priorYearTotal: a25, yoyDelta: a26 - a25, yoyPct: a25 ? round(((a26 - a25) / a25) * 100, 1) : null }; }),
    "Ticket counts grouped by the five recurring issues from the cross-source reliability synthesis. HSIA counts are the customer pain points from the hsia_ticket_recategorization tab (its Other group sits in the Support row); TV and SHS use the Looker ticket categories. SHS device categories sit outside the 5-issue framework. A falling count is favourable."));
  // 05 pillars
  S.push(tableSec("s05-pillars", "05 · Reliability program · Initiatives by pillar", [col("pillar", "Pillar"), col("pillarName", "Pillar name"), col("sub", "Sub-themes"), col("count", "Initiatives", "count"), col("HSIA", "HSIA", "count"), col("TV", "TV", "count"), col("SHS", "SHS", "count")], PILLARS.map((pl) => { const items = INITIATIVES.filter((it) => it.pillar === pl.n); return { pillar: pl.n, pillarName: pl.name, sub: pl.sub, count: items.length, HSIA: items.filter((i) => i.p === "HSIA").length, TV: items.filter((i) => i.p === "TV").length, SHS: items.filter((i) => i.p === "SHS").length }; }), "Every initiative from the registers grouped under the reliability program's four pillars; the full rows follow."));
  S.push(initiativesTable("s05-initiatives", "05 · Reliability program · All initiatives", INITIATIVES, "HSIA from the Product Technical | Churn & VOC Projects Impact sheet; TV and SHS from the Churn Measurement 2026 workbook's Initiatives tab."));
  S.push(timelineTable("s06-timeline", "06 · Reliability program · Initiative timeline — HSIA, TV and SHS", INITIATIVES));
  return S;
}
function sweeprFigure(key, upTo) {
  const s = SWEEPR[key], li = lastIdx(s.a, upTo);
  if (li < 0) return { latest: null, month: null, target: null, vsTarget: null, mom: null, yoy: null };
  const isRate = key === "churn" || key === "webAppRate" || key === "ivrRate" || key === "cxEasy" || key === "cxSent";
  const goodDown = key === "churn";
  return { latest: s.a[li], month: MONTHS[li], target: s.t[li], vsTarget: s.t[li] != null ? cardMove(s.a[li], s.t[li], goodDown, isRate) : null, mom: li >= 1 ? cardMove(s.a[li], s.a[li - 1], goodDown, isRate) : null, yoy: li >= 12 ? cardMove(s.a[li], s.a[li - 12], goodDown, isRate) : null };
}

// ---- Executive Summary (mirrors buildDeck: four slides) ----
function executivePage(a, b) {
  const upTo = b, month = MONTHS[b];
  const S = [];
  PRODUCTS.forEach((p) => S.push(sec(`slide1-${p}`, `Slide 1 · KPI scorecard · ${month} · ${p}`, "cards", kpiCards(p, upTo), "The slide shows the latest value and the YoY move for each KPI.")));
  const asOf = LATEST_SHORT, compare = LATEST_MOM;
  PRODUCTS.filter((p) => LOOKER[p]).forEach((p) => {
    const L = LOOKER[p], t = L.topIssues[0], worse = t.a25 != null && t.a26 > t.a25;
    const mv = (r) => ({ title: r.issue, body: `${sNum(r.delta)} (${sPct(r.prev ? (r.delta / r.prev) * 100 : null)}) · ${compare}`, meta: { delta: r.delta, latest: r.a26, priorMonth: r.prev } });
    S.push(listSec(`slide2-${p}-top-issue`, `Slide 2 · Top ticket issues and movers · ${asOf} · ${p} · top ticket issue`, [{ title: t.issue, body: `${t.a26.toLocaleString("en-CA")} tickets · ${t.a25 != null ? `${sPct(((t.a26 - t.a25) / t.a25) * 100)} YoY` : "new in 2026"}`, meta: { tickets: t.a26, priorYear: t.a25 || null, read: worse ? "unfavourable" : "favourable" } }]));
    S.push(sec(`slide2-${p}-trend`, `Slide 2 · ${p} · ${L.topCat.name} tickets (${L.catSource === "recategorization" ? "recategorized" : "Looker"})`, "series", { months: MONTHS, series: { topCat: { label: L.topCat.name, unit: "count", values: L.topCat.series } } }, `Sparkline ${MONTHS[0]} – ${LATEST}; the slide always shows the full window.`));
    S.push(listSec(`slide2-${p}-rising`, `Slide 2 · ${p} · Rising · ${compare}`, L.rising.slice(0, 3).map(mv)));
    S.push(listSec(`slide2-${p}-falling`, `Slide 2 · ${p} · Falling · ${compare}`, L.falling.slice(0, 3).map(mv)));
  });
  const milestones = INITIATIVES.filter((it) => timelineHasMonth(it.timeline, month));
  S.push(milestones.length
    ? tableSec("slide3-milestones", `Slide 3 · Initiative milestones · ${month}`, [col("product", "Product"), col("initiative", "Initiative"), col("pillarName", "Pillar"), col("theme", "Theme"), col("status", "Status"), col("timeline", "Timeline"), col("prime", "Prime")], milestones.map((it) => ({ product: it.p, initiative: it.name, pillarName: pillarName(it.pillar), theme: it.theme, status: it.status, timeline: it.timeline, prime: it.prime })))
    : textSec("slide3-milestones", `Slide 3 · Initiative milestones · ${month}`, [`No initiative has a milestone dated ${month}.`]));
  S.push(sec("slide4-self-serve", `Slide 4 · Self-serve workflows (Sweepr) · ${month}`, "cards", selfServeCards(upTo), "Self-serve customer workflows are powered by the Sweepr platform. Targets are set in the source for 2026 only; churn impact and deacts saved carry no target."));
  S.push(textSec("source", "Deck source line", [DECK_SOURCE_LINE]));
  return S;
}
const DECK_SOURCE_LINE = "Source: Churn Measurement 2026 workbook (KPIs, Looker ticket categories, HSIA ticket recategorization, initiatives) · Self Assure metrics (Sweepr) · ticket, repair and churn rates are per 100 subscribers";
function selfServeCards(upTo) {
  const res = sweeprFigure("resolved", upTo), web = sweeprFigure("webAppRate", upTo), easy = sweeprFigure("cxEasy", upTo), chn = sweeprFigure("churn", upTo), dea = sweeprFigure("deacts", upTo);
  const c = (label, f, unit) => ({ label, value: f.latest, unit, month: f.month, mom: f.mom, yoy: f.yoy, target: f.target, vsTarget: f.vsTarget });
  return [c("Resolved sessions", res, "count"), c("Web/App resolution rate", web, "%"), c("CX 'Easy to follow'", easy, "score"), c("Sweepr involved churn per 100 subs", chn, "per 100 subscribers"), c("Deacts saved", dea, "count")];
}

// ---- TV by platform (mirrors TvPlatformsPage; the page always shows the 2026 window) ----
function platformsPage(a, b) {
  const S = [];
  const upTo = b;
  TV_PLATFORMS.forEach((p) => {
    const swapTotal = p.swaps2026 ? p.swaps2026.filter((v) => v != null).reduce((x, y) => x + y, 0) : null;
    S.push(sec(`cards-${p.id}`, `${p.name} · ${p.sub}`, "cards", [
      cardFromSeries("Subscriber base", p.base, { unit: "count", goodWhenDown: false, upTo }),
      cardFromSeries("Ticket volume", p.tickets, { unit: "count", upTo }),
      cardFromSeries("Ticket rate per 100 subs", p.ticketRate, { unit: "per 100 subscribers", isRate: true, upTo }),
      cardFromSeries("Repair volume", p.repairs, { unit: "count", upTo }),
      cardFromSeries("Repair rate per 100 subs", p.repairRate, { unit: "per 100 subscribers", isRate: true, upTo }),
      { ...cardFromSeries("Repair swaps · 2026 total", p.swaps2026 || [], { unit: "count", upTo }), value: swapTotal, note: "value is the 2026 total; mom is the latest month's move" }
    ]));
  });
  S.push(sec("cards-pik", `${TV_PIK.name} · minor product line · ticket volume only`, "cards", [cardFromSeries("Ticket volume", TV_PIK.tickets, { unit: "count", upTo })]));
  S.push(sec("cards-mixed", `${TV_MIXED.name} · ${TV_MIXED.sub} · subscriber count only`, "cards", [cardFromSeries("Subscriber base", TV_MIXED.base, { unit: "count", goodWhenDown: false, upTo })]));
  S.push(textSec("sources", "Sources", ["Tickets: Looker Ticket Categories split by product (Optik TV (Legacy), TV Evolution and Pik TV). The TV ticket volume and rate include Pik TV, a minor product line shown for volume only; its subscribers are not in the rate base and it is left out of the analysis sections. Subscriber base: TV Customer Base Breakdown workbook, Customer Base - Provisioned tab (month-end provisioned subscribers, all regions except BTV and SPLUS) — Legacy = MediaRoom only, TV Evolution = TTV+ only, Mixed usage = customers on both platforms; the three sum to the TV subscriber base on the TV page. Repairs: 2026 Redwood Scorecard, Repair Tracking Detail — Legacy = IPTV West + TQ ILEC TV; TV Evolution = OPUS + PFE Vulcan - TV; the repair split is reported for 2026 onward and is West-scope, so platform repair rates can differ from the rolled-up TV repair rate. Swap volumes are repair swap orders from the Tableau Swapped Orders Combined View dashboard, all technologies (Total TV = Legacy; Total OPUS = TV Evolution), Jan – Aug 2026; the September swap pull was not yet available when this update was made."]));
  const plat = (field, unit) => TV_PLATFORMS.map((p) => ({ key: p.id, label: p.name, unit, values: p[field] }));
  S.push(seriesSec("s01-base", "01 · Subscriber base · Subscriber base by platform", a, b, [...plat("base"), { key: "mixed", label: TV_MIXED.name, values: TV_MIXED.base }], "Month-end provisioned subscribers (Customer Base - Provisioned). The migration from Mediaroom to TTV+ is visible in the diverging trends; mixed-usage customers are counted separately from either platform."));
  S.push(seriesSec("s02-tickets", "02 · Tickets · Ticket volume by platform", a, b, plat("tickets")));
  S.push(seriesSec("s02-ticket-rate", "02 · Tickets · Ticket rate by platform (per 100 platform subs)", a, b, plat("ticketRate", "per 100 subscribers"), "Platform tickets over the platform's provisioned subscriber base (Customer Base - Provisioned)."));
  S.push(seriesSec("s03-repairs", "03 · Repairs / Dispatches · Repair volume by platform", a, b, plat("repairs"), "Repair split reported for 2026 onward."));
  S.push(seriesSec("s03-repair-rate", "03 · Repairs / Dispatches · Repair rate by platform (per 100 platform subs)", a, b, plat("repairRate", "per 100 subscribers")));
  S.push(seriesSec("s04-swaps", "04 · Repair swaps · Repair swap volume by platform", a, b, plat("swaps2026"), "Repair swap orders across all technologies, Tableau Swapped Orders Combined View. Reported for 2026; September is not yet pulled."));
  S.push(seriesSec("s05-mixed", "05 · Mixed usage · Mixed-usage subscribers (MR + TTV+)", a, b, [{ key: "mixed", label: TV_MIXED.name, values: TV_MIXED.base }], "Customers provisioned on both Mediaroom and TTV+ at month end (Customer Base - Provisioned). Subscriber count only; tickets and repairs are not yet split for this group."));
  return S;
}

// ---- Self-serve (mirrors SelfServePage) ----
function selfServePage(a, b) {
  const S = [];
  S.push(sec("cards", "Self-serve KPI cards", "cards", selfServeCards(b), "Cards carry target and vsTarget where the source sets a 2026 target."));
  S.push(listSec("banner", "Self Assure program", [{ title: "Self Assure program", body: "The full overview and strategy for the Self Assure program", meta: { url: "https://selfserve.telus.gizmos.run/" } }]));
  S.push(textSec("about", "About", ["Self-serve customer workflows are powered by the Sweepr platform. Targets are set in the source for 2026 only; churn impact and deacts saved carry no target."]));
  const ts = (key, label, unit) => [{ key: "actual", label, unit, values: SWEEPR[key].a }, { key: "target", label: "2026 target", unit, values: SWEEPR[key].t }];
  S.push(seriesSec("s01-resolved", "01 · Resolved sessions vs target · Blended (v2) resolved sessions", a, b, ts("resolved", "Resolved sessions"), "Blended resolved sessions across self-serve workflows. The target series is the 2026 monthly target from the source scorecard."));
  S.push(seriesSec("s02-webapp", "02 · Resolution rates · Web/App resolution rate", a, b, ts("webAppRate", "Web/App rate", "%"), "Share of Web/App self-serve workflow sessions resolved without an agent. 2026 target rises through the year."));
  S.push(seriesSec("s02-ivr", "02 · Resolution rates · CCAI IVR resolution rate", a, b, ts("ivrRate", "CCAI IVR rate", "%"), "Reported Jan – Apr 2026; the source marks May 2026 onward as not available. Target is 14.0% for 2026."));
  S.push(seriesSec("s03-easy", "03 · Customer experience · CX 'Easy to follow' score", a, b, ts("cxEasy", "Easy to follow", "score"), "Customer-rated ease of following the workflow. Reported from Oct 2025; the 2026 target is 4.00."));
  S.push(seriesSec("s03-sentiment", "03 · Customer experience · CX 'Comment sentiment' score", a, b, ts("cxSent", "Comment sentiment", "score"), "Sentiment of free-text workflow comments on a negative scale — less negative is better. Reported from Oct 2025; the 2026 target is -0.50."));
  S.push(seriesSec("s04-churn", "04 · Churn impact · Sweepr involved churn rate (per 100 subs)", a, b, [{ key: "churn", label: "Churn rate", unit: "per 100 subscribers", values: SWEEPR.churn.a }], "Churn rate among customers whose journey involved a Sweepr workflow. Reported for 2026 only; no target is set in the source."));
  S.push(seriesSec("s04-deacts", "04 · Churn impact · Deacts saved", a, b, [{ key: "deacts", label: "Deacts saved", values: SWEEPR.deacts.a }], "Deactivations avoided through self-serve workflow saves. Reported for 2026 only; no target is set in the source."));
  return S;
}

// ---- Friction Free Program (mirrors FfpsPage; no month range) ----
function ffpsPage() {
  const F = FFPS, B = F.benefits, FIN = F.finance, S = [];
  const crsEnd = F.burndown.crs.points[2], crsStart = F.burndown.crs.points[0], tkEnd = F.burndown.tickets.points[2];
  const last = F.delivered[F.delivered.length - 1];
  const totalBenefit = B.totals.reduce((x, t) => x + t.v, 0);
  S.push(sec("cards", "Program KPI cards", "cards", [
    cardStatic("Open CRs", crsEnd.v, "count", F.asOf, `${crsEnd.label} · ${crsStart.v} at start of year · ${sNum(crsEnd.net)} vs end of Q2 · ${sNum(F.burndown.crs.ytd.net)} YTD`),
    cardStatic("Open tickets", tkEnd.v, "count", F.asOf, `${tkEnd.label} · billing + non-billing · ${sNum(tkEnd.net)} vs end of Q2 · ${sNum(F.burndown.tickets.ytd.net)} YTD`),
    cardStatic("Recurring benefit", B.recurring, "$M", F.asOf, `End of Q3 · against $4M spent · $${(totalBenefit / 1e6).toFixed(2)}M across CRs, non-billing and billing`),
    cardStatic("CR run-rate benefit", last.rate, "$K per month", last.m, `${F.delivered.reduce((x, m) => x + m.crs.length, 0)} CRs delivered since Feb · $${(last.cum / 1000).toFixed(2)}M cumulative`),
    cardStatic(`${FIN.month} spend`, FIN.monthSpend, "$M", FIN.month, `vs forecast $${FIN.monthForecast.toFixed(2)}M · YTD $${FIN.spendToDate.ytd.toFixed(1)}M · $${FIN.remaining.toFixed(1)}M remaining (${FIN.remainingPct}% of budget)`)
  ]));
  S.push(textSec("about", "About", [`Transcribed from the Friction Free Product Systems program update deck (${F.asOf} edition, ${F.period}). This page does not follow the month range selector.`]));
  const flowCols = [col("label", "Point"), col("open", "Open", "count"), col("net", "Net move", "count"), col("opened", "New", "count"), col("closed", "Closed", "count")];
  S.push(tableSec("s01-crs", `01 · Burndown · ${F.burndown.crs.label}`, flowCols, F.burndown.crs.points.map((p) => ({ label: p.label, open: p.v, net: p.net ?? null, opened: p.opened ?? null, closed: p.closed ?? null })), `${F.burndown.crs.sub}. Year to date (through ${F.burndown.crs.ytd.through}): ${F.burndown.crs.ytd.opened} new CRs, ${F.burndown.crs.ytd.closed} closed, net ${sNum(F.burndown.crs.ytd.net)}.`));
  S.push(tableSec("s01-tickets", `01 · Burndown · ${F.burndown.tickets.label}`, flowCols.slice(0, 3), F.burndown.tickets.points.map((p) => ({ label: p.label, open: p.v, net: p.net ?? null })), `${F.burndown.tickets.sub}. Net change vs start of year ${sNum(F.burndown.tickets.ytd.net)}. Year to date: ${F.burndown.tickets.ytd.opened.toLocaleString("en-CA")} new (${F.burndown.tickets.ytd.openedTickets} tickets · ${F.burndown.tickets.ytd.openedProactive} proactive), ${F.burndown.tickets.ytd.closed} closed, ${F.burndown.tickets.ytd.cancelled} cancelled. ${F.burndown.tickets.note}`));
  S.push(textSec("s02-headline", "02 · Benefits", [B.headline, B.sub]));
  S.push(tableSec("s02-crs", `02 · Benefits · ${B.crs.title}`, [col("quarter", "Quarter"), col("churn", "Churn", "$"), col("calls", "Calls", "$"), col("sbc", "SBC", "$"), col("total", "Total", "$")], B.crs.labels.map((q, i) => ({ quarter: q, churn: B.crs.churn[i], calls: B.crs.calls[i], sbc: B.crs.sbc[i], total: B.crs.churn[i] + B.crs.calls[i] + B.crs.sbc[i] })), B.crs.notes.join(" · ")));
  S.push(tableSec("s02-non-billing", `02 · Benefits · ${B.nonBilling.title}`, [col("quarter", "Quarter"), col("total", "Benefit", "$")], B.nonBilling.labels.map((q, i) => ({ quarter: q, total: B.nonBilling.total[i] })), B.nonBilling.notes.join(" · ")));
  S.push(tableSec("s02-billing", `02 · Benefits · ${B.billing.title}`, [col("month", "Month"), col("ebitda", "Cumulative EBITDA benefit", "$")], B.billing.labels.map((m, i) => ({ month: m, ebitda: B.billing.ebitda[i] }))));
  S.push(tableSec("s02-billing-drivers", "02 · Benefits · Billing defects: remediation drivers", [col("month", "Month"), col("calls", "Calls", "count"), col("contra", "Contra", "$")], B.billing.drivers.map((d) => ({ month: d.m, calls: d.calls, contra: d.contra })), B.billing.note));
  S.push(listSec("s02-totals", "02 · Benefits · Totals", B.totals.map((t) => ({ title: t.label, body: `$${t.v.toLocaleString("en-CA")}`, meta: { value: t.v, unit: "$" } }))));
  S.push(sec("s03-billing-tickets", "03 · Billing tickets · Billing tickets: executive overview", "cards", [cardStatic(`${F.billingTickets.start.m} total billing tickets`, F.billingTickets.start.v, "count", F.billingTickets.start.m), cardStatic(`${F.billingTickets.end.m} total billing tickets`, F.billingTickets.end.v, "count", F.billingTickets.end.m), cardStatic(`Change (${F.billingTickets.start.m.slice(0, 3)} → ${F.billingTickets.end.m.slice(0, 3)})`, F.billingTickets.delta, "count", F.billingTickets.end.m), cardStatic("Closed to date", F.billingTickets.closed, "count", F.billingTickets.end.m), cardStatic("Cancelled to date", F.billingTickets.cancelled, "count", F.billingTickets.end.m)], F.billingTickets.period));
  const crCols = [col("month", "Month"), col("id", "CR"), col("name", "Name"), col("statement", "Customer problem statement"), col("tag", "Benefit tag")];
  S.push(tableSec("s04-pipeline", "04 · CR delivery timeline (Sep – Dec 2026)", [...crCols, col("expectedRate", "Expected monthly benefit", "$K per month")], F.pipeline.flatMap((mo) => mo.crs.map((c) => ({ month: mo.m, id: c.id, name: c.name || null, statement: c.t, tag: c.tag || null, expectedRate: mo.rate }))), F.pipelineNote));
  S.push(sec("s05-finance-cards", "05 · Finance", "cards", [
    cardStatic(`${FIN.month} spend`, FIN.monthSpend, "$M", FIN.month, `vs forecast $${FIN.monthForecast.toFixed(2)}M`),
    cardStatic("Spend to date", FIN.spendToDate.ytd, "$M", FIN.month, `Q1 $${Math.round(FIN.spendToDate.q1 * 1000)}K · Q2 $${FIN.spendToDate.q2.toFixed(2)}M · Q3 $${FIN.spendToDate.q3.toFixed(2)}M`),
    cardStatic("H2 forecast Q3", FIN.h2Forecast.q3, "$M", null), cardStatic("H2 forecast Q4", FIN.h2Forecast.q4, "$M", null),
    cardStatic("Remaining budget", FIN.remaining, "$M", FIN.month, `${FIN.remainingPct}% of total`),
    cardStatic("H1 spend", FIN.h1.spend, "$M"), cardStatic("H1 benefits", FIN.h1.benefits, "$M"), cardStatic("H2 spend (forecast)", FIN.h2.spend, "$M"), cardStatic("H2 benefits", FIN.h2.benefits, "$M")
  ]));
  S.push(tableSec("s05-projects", "05 · Finance · Project spend summary", [col("project", "Project"), col("monthSpend", `${FIN.month} spend`, "$K"), col("toDate", "Spend to date", "$K"), col("allocation", "Allocation", "$K"), col("remaining", "Remaining to spend", "$K")], [...FIN.projects, FIN.projectTotal].map((p) => ({ project: p.name, monthSpend: p.m, toDate: p.toDate, allocation: p.alloc, remaining: p.remaining }))));
  S.push(tableSec("s05-quarterly", "05 · Finance · Spend and receipts by quarter", [col("project", "Project"), col("q1Spend", "Q1 spend", "$K"), col("q1Receipts", "Q1 receipts", "$K"), col("q2Spend", "Q2 spend", "$K"), col("q2Receipts", "Q2 receipts", "$K"), col("q3Spend", "Q3 spend", "$K"), col("q3Receipts", "Q3 receipts", "$K"), col("q4Spend", "Q4 forecast spend", "$K"), col("q4Receipts", "Q4 forecast receipts", "$K")], [...FIN.quarterly, FIN.quarterlyTotal].map((p) => ({ project: p.name, q1Spend: p.q1[0], q1Receipts: p.q1[1], q2Spend: p.q2[0], q2Receipts: p.q2[1], q3Spend: p.q3[0], q3Receipts: p.q3[1], q4Spend: p.q4[0], q4Receipts: p.q4[1] })), "Receipts null = TBD, not yet reported in the source."));
  return S;
}

// ---- Notes Analysis (mirrors HsiaTicketAnalysisPage / TvTicketAnalysisPage) ----
const AN_MONTHS = HSA.months.map((m) => m.slice(0, 3)), AN_SURVEY_MONTHS = ["Jun", "Jul", "Aug"];
const recItems = (recs, product) => recs.map((r) => ({ title: `${r.pri} · ${r.title}`, body: `Evidence: ${r.evidence} Action: ${r.action}`, meta: { priority: r.pri, tag: r.tag, evidence: r.evidence, action: r.action, initiatives: r.initiatives || [], product } }));
const moverItems = (rows) => rows.map((r) => ({ title: r.name, body: `${sNum(r.delta)}${r.unit || ""}${r.pct != null ? ` (${sPct(r.pct, 0)})` : ""}`, meta: { values: r.v || null, delta: r.delta, pct: r.pct ?? null } }));
function notesPage(product) {
  const A = NOTES_ANALYSIS[product], K = A.tickets, months = A.months, S = [];
  const dAll = K.divergence.all, dF = K.divergence.field;
  const latest = months[2];
  S.push(sec("cards", "Notes analysis KPI cards", "cards", [
    cardFrom3(`${product} tickets analysed`, K.total, { unit: "count", months, note: `${latest} · agent + technician notes` }),
    cardFrom3("Field visits", K.closure.map((c) => c.field_visit_pct), { unit: "% of tickets", isRate: true, goodWhenDown: false, months, note: `tickets with a technician determination · ${months[0].slice(0, 3)} ${K.closure[0].field_visit_pct}% · ${months[1].slice(0, 3)} ${K.closure[1].field_visit_pct}%` }),
    cardFrom3("Education / no-fault closures", dAll.map((d) => d.nofault), { unit: "% of closed tickets", isRate: true, months }),
    cardFrom3("Categorisation divergence", dAll.map((d) => d.reattribution), { unit: "% (closure domain ≠ agent category, all closures)", isRate: true, months }),
    cardFrom3("Field-visit divergence", dF.map((d) => d.reattribution), { unit: "% (technician finding ≠ agent category)", isRate: true, months })
  ]));
  S.push(textSec("about", "About", [product === "HSIA"
    ? `${fmtNum(K.total[0] + K.total[1] + K.total[2])} HSIA tickets, ${months[0].slice(0, 3)} – ${latest}, from the weekly notes exports (the October export runs to the 30th); movements compare ${latest} with ${months[1]}. Agent grouping = Category 1–3 and Agent Notes; closure grouping = Resolution 1–3 and Resolution Text (a technician determination is present on ${K.closure[2].field_visit_pct}% of tickets; ${K.closure[2].no_closure_code_pct}% carry no closure code). Text themes are keyword-classified and indicative.`
    : `${fmtNum(K.total[0] + K.total[1] + K.total[2])} TV tickets, ${months[0].slice(0, 3)} – ${latest} (the October export runs to the 30th); movements compare ${latest} with ${months[1]}. Agent grouping = Category 1–3 and Agent Notes; closure grouping = Resolution 1–3 and Resolution Text (a technician determination is present on ${K.closure[2].field_visit_pct}% of tickets; the rest are agent closures). Text themes are keyword-classified and indicative.`]));
  // 01 top issues by agent categorisation
  if (K.c1) S.push(sec("s01-category1", "01 · Top issues by agent categorisation · Category 1 (agent)", "cards", K.c1.map((c) => cardFrom3(c.name, c.v, { unit: "count", months, note: `${(c.v[2] / K.total[2] * 100).toFixed(1)}% of ${latest} tickets` }))));
  S.push(tableSec("s01-agent-categories", `01 · Top issues by agent categorisation · ${product === "HSIA" ? "Category 1 › Category 2 (agent)" : "Category 1 (agent)"}`, monthCols("Agent category", months, [col("share", `Share · ${latest}`, "%")]), monthRows(K.agentCat, months, (it) => ({ share: round((it.v[2] / K.total[2]) * 100, 1) }))));
  S.push(listSec("s01-movers-rising", `01 · Sub-category movers · Rising · ${latest} vs ${months[1]}`, moverItems(K.rising)));
  S.push(listSec("s01-movers-falling", `01 · Sub-category movers · Falling · ${latest} vs ${months[1]}`, moverItems(K.falling)));
  S.push(textSec("s01-notes", "01 · Sources & notes", [product === "HSIA"
    ? "Movers rank sub-categories with at least 150 tickets in Sep or Oct by absolute change (Oct vs Sep). October is a broad easing on the access side: Connectivity › No Dataflow › All Devices Affected fell 1,108 tickets (−9.2%), ONT Not Ranged › Alarm Light 443 (−12.0%) and No Sync › No DSL Light 321 (−14.1%). Wi-Fi is the one area still rising: Wireless › Can't Connect › Some Devices Affected is the top riser (+180, +21.4%) and Wireless › Disconnects edged up. Incompatible Equipment and its Connectivity sub-code fell together (3,466 → 3,170, −8.5%)."
    : "Movers rank sub-categories with at least 150 tickets in Sep or Oct by absolute change (Oct vs Sep). The September risers have stopped rising: STB No Boot › Stuck on Initializing eased 182 tickets (−3.5%, with the export ending on 30 Oct), Digital Box › No Boot fell 218 (−9.1%) and Reboot Loop 148 (−13.8%). The October risers are picture quality: Video Issues › Stop/Stuttering/Freezing +431 (+18.7%) and Pixelization +128 (+43.0%), with Channel Issues › Missing Channels +141 (+7.3%)."]));
  // 02 agent vs technician
  S.push(textSec("s02-about", "02 · Agent vs technician categorisation · About this section", [product === "HSIA"
    ? "Each agent Category 1 › 2 maps to a symptom domain (access line & ONT, gateway / dataflow, speed, Wi-Fi, equipment compatibility); each closure (Resolution 1–2) maps to a cause domain. Alignment means the closure domain is one the symptom would predict; divergence is everything else, with education / no fault broken out because it is the single largest cause. The all-closures panel scores every closed ticket; the field-visits panel scores only tickets with a written technician determination."
    : "Each agent Category 1 maps to a symptom domain, each closure (Resolution 1–2) to a cause domain. Alignment means the closure domain is one the symptom would predict (STB No Boot closing as STB hardware or connectivity, for example); divergence is everything else, with education / no fault broken out because it is the single largest cause. The all-closures panel scores every closed ticket; the field-visits panel scores only tickets with a written technician determination."]));
  const divRows = (D, isField) => {
    const keys = [["Divergence score (re-attributed)", "reattribution"], ["Aligned with agent category", "alignment"], ["Closed as education / no fault", "nofault"]].concat(isField || product === "HSIA" ? [["Determined non-TELUS caused", "nontelus"]] : []);
    const rows = keys.map(([label, key]) => { const r = { indicator: label }; months.forEach((m, i) => { r[m] = D[i][key]; }); r.changeBps = Math.round((D[2][key] - D[1][key]) * 100); return r; });
    const base = { indicator: isField ? "Field visits" : "Closed tickets" }; months.forEach((m, i) => { base[m] = isField ? D[i].visits : D[i].closed; }); base.changeBps = null;
    return rows.concat([base]);
  };
  const divCols = [col("indicator", "Indicator"), ...months.map((m) => col(m, m, "%")), col("changeBps", `Δ ${months[2].slice(0, 3)} vs ${months[1].slice(0, 3)}`, "bps")];
  S.push(tableSec("s02-all-closures", "02 · Agent vs technician categorisation · All closures (agent or technician)", divCols, divRows(dAll, false)));
  S.push(tableSec("s02-field-visits", "02 · Agent vs technician categorisation · Field visits only (technician determination)", divCols, divRows(dF, true)));
  if (K.domainMix) S.push(tableSec("s02-domain-mix", `02 · Where closures land — agent symptom domain × closure cause domain, all closures, ${latest}`, [col("agentDomain", "Agent domain"), col("closed", "Closed", "count"), ...K.closureDomains.map((h, i) => col(`d${i + 1}`, h, "% of closed"))], K.domainMix.map((r) => { const row = { agentDomain: r.agent, closed: r.n }; r.v.forEach((x, i) => { row[`d${i + 1}`] = r.n ? round((x / r.n) * 100, 0) : null; }); return row; })));
  S.push(tableSec("s02-by-category", `02 · By agent category — all closures, ${latest}`, [col("category", "Agent category"), col("tickets", "Tickets", "count"), col("aligned", "Aligned", "%"), col("divergence", "Divergence", "%"), col("noFault", "Education / no fault", "%"), col("topClosureDomains", "Most common closure domains")], K.divergence.perCat.map((c) => ({ category: c.cat, tickets: c.n, aligned: c.alignment, divergence: round(100 - c.alignment, 1), noFault: c.nofault, topClosureDomains: c.techTop }))));
  S.push(tableSec("s02-by-category-field", `02 · By agent category — field visits only, ${latest}`, [col("category", "Agent category"), col("visits", "Visits", "count"), col("aligned", "Aligned", "%"), col("noFaultFound", "No fault found", "%"), col("nonTelus", "Non-TELUS caused", "%"), col("topFinding", "Technician's top finding")], K.divergence.perCatField.map((c) => ({ category: c.cat, visits: c.n, aligned: c.alignment, noFaultFound: c.nofault, nonTelus: c.nontelus, topFinding: c.techTop }))));
  S.push(textSec("s02-notes", "02 · Sources & notes", [product === "HSIA"
    ? "Reading the gap: on all closures the Wireless categories diverge most (66% to 67%), driven by education closures; on field visits they are still the weakest match (46% to 51% aligned) because technicians find an access-line or gateway fault on about half of the Wi-Fi tickets they attend. ONT Not Ranged and Historical Data are the best-matched categories (91% to 93% aligned on visits) but ONT Not Ranged carries the highest non-TELUS-caused share (21%)."
    : "Reading the gap: Channel Issues and Recording Issues carry the widest divergence on all closures (87% and 76%), driven by education closures; on field visits, HS & TV Affected (63% aligned) and Recording Issues (65%, technicians most often find STB hardware) are the weakest matches and Digital Box has the highest non-TELUS-caused share (26%)."]));
  // 03 technician closures and fixes
  S.push(tableSec("s03-resolution1", "03 · Technician closures and fixes · Resolution 1 (closure)", monthCols("Resolution 1", months), monthRows(K.techR1, months)));
  const detTot = K.determination[2][0] + K.determination[2][1];
  S.push(tableSec("s03-determination", "03 · Technician determination · field visits", [col("determination", "Determination"), ...months.map((m) => col(m, m, "count")), col("share", `${latest} share`, "%")], [["TELUS caused (no fee)", 0], ["Non-TELUS caused (fee applied)", 1]].map(([label, idx]) => { const r = { determination: label }; months.forEach((m, i) => { r[m] = K.determination[i][idx]; }); r.share = round((K.determination[2][idx] / detTot) * 100, 1); return r; }), product === "HSIA"
    ? "Non-TELUS-caused determinations eased again to 12.8% of visits in October (1,608 of 12,585) from 13.4% in September (1,969 of 14,673) and 13.8% in August, while determined visits fell 14.2% with the export ending on 30 Oct. Found OK › Not Required closures kept falling (705 → 452, −35.9%), although Found OK › Avoidable Dispatch rose 27.1% (214 → 272)."
    : "Non-TELUS-caused visits eased to 16.6% of determinations in October from 17.9% in September, still above August's 14.4%, so about one in six dispatches reaches a home where the fault is customer equipment or setup."));
  S.push(tableSec("s03-fixes", "03 · What technicians fixed (themes in Resolution Text, field visits)", monthCols("Fix theme", months, product === "HSIA" ? [col("shareOfVisits", `Share of visits · ${latest}`, "%")] : []), monthRows(K.fixes, months, product === "HSIA" ? (it) => ({ shareOfVisits: round((it.v[2] / dF[2].visits) * 100, 1) }) : undefined)));
  S.push(listSec("s03-closure-rising", `03 · Closure movers (Resolution 1 › Resolution 2) · Rising · ${latest} vs ${months[1]}`, moverItems(K.techRising)));
  S.push(listSec("s03-closure-falling", `03 · Closure movers (Resolution 1 › Resolution 2) · Falling · ${latest} vs ${months[1]}`, moverItems(K.techFalling)));
  if (product === "HSIA") S.push(textSec("s03-notes", "03 · Sources & notes", ["Fibre work (ONT, light level, splice) is still the largest field fix at 33% of visits and Wi-Fi / Boost placement the second at 29%; both fell about 11% in volume with the smaller October export, and modem replacements fell 19%. Closures moved the same way: Education › HSIA −6.5%, HSIA › Modem/Gateway −14.7%, GPON › Inside Premise Equipment −8.8%, GPON › Outside Plant −12.8% and Found OK › Not Required −35.9%. The few risers are hardware-specific or back-office: Boost Wi-Fi 6 (+28.5%), Found OK › Avoidable Dispatch (+27.1%), NetCracker › Stuck (+10.0%) and Connectivity › Modem/Gateway (+1.6%)."]));
  // 04 what agents are writing
  S.push(textSec("s04-about", "04 · What agents are writing", [`Themes are keyword-classified from the agent's own comment block (${product === "HSIA" ? "InSight" : "system"} diagnostic text excluded). A written agent comment was found on ${fmtNum(K.commentCoverage[2])} of ${fmtNum(K.total[2])} ${latest} tickets; counts are tickets whose comment mentions the theme.`]));
  S.push(tableSec("s04-themes", "04 · Theme in agent comments", monthCols("Theme", months), monthRows(K.themes, months)));
  S.push(tableSec("s04-devices", "04 · Equipment mentioned in notes", monthCols("Device", months), monthRows(K.devices, months)));
  if (K.platform) S.push(tableSec("s04-platform", "04 · Platform mentioned in notes", monthCols("Platform", months), monthRows(K.platform, months), "Legacy Mediaroom mentions fell back in October (VIP5662W PVR −9%, VIP5602W wireless STB −2%, Mediaroom −6%) while OPUS mentions edged up (+2%), consistent with the By Platform split where Legacy still carries two thirds of TV tickets on a shrinking base."));
  if (K.access) S.push(tableSec("s04-access", "04 · Access technology mentioned in notes", monthCols("Access", months), monthRows(K.access, months), "Fibre-related mentions (ONT, PureFibre, GPON) fell 2.3% and copper / DSL mentions fell 7.7% in October, tracking the drop in No Sync › No DSL Light tickets (−14.1%). Among Wi-Fi hardware, Boost Wi-Fi 7 (BV3) mentions kept rising (+5.0%) while Boost Wi-Fi 6 (−9.5%) and the older Wi-Fi Hub (−14.0%) both fell back; legacy Actiontec modem mentions fell 10.7%."));
  // 05 recommendations
  const recs = product === "HSIA" ? HSIA_RECS.filter((r) => ["P1", "P3"].includes(r.pri)) : TV_RECS.filter((r) => ["P1", "P3"].includes(r.pri) || r.tag === "Emerging");
  S.push(listSec("s05-recommendations", "05 · Recommendations", recItems(recs, product)));
  return S;
}

// ---- Customer Sentiment (mirrors HsiaSentimentPage / TvSentimentPage) ----
const bpsMove = (arr) => (arr[2] != null && arr[1] != null ? Math.round((arr[2] - arr[1]) * 100) : null);
const pctRows = (items, months, extra) => items.map((t) => { const r = { name: t.name }; months.forEach((m, i) => { r[m] = t.pct[i]; }); r.changeBps = bpsMove(t.pct); if (extra) Object.assign(r, extra(t)); return r; });
const pctCols = (first, months, more = []) => [col("name", first), ...months.map((m) => col(m, `${m} · % of respondents`, "%")), col("changeBps", "Aug vs Jul", "bps"), ...more];
const polarityRows = (P, N, months) => ["positive", "neutral", "negative"].map((p) => { const r = { polarity: p }; months.forEach((m, i) => { r[m] = P[p][i]; r[`${m} n`] = N ? N[p][i] : null; }); r.changeBps = bpsMove(P[p]); return r; });
const polarityCols = (months) => [col("polarity", "Polarity"), ...months.flatMap((m) => [col(m, m, "%"), col(`${m} n`, `${m} count`, "count")]), col("changeBps", "Aug vs Jul", "bps")];
const quoteItems = (quotes) => Object.entries(quotes).map(([theme, qs]) => ({ title: theme, body: qs.map((q) => `“${q}”`).join(" "), meta: { quotes: qs } }));
const themeMovers = (themes, { skipPositive = true, withPct = false } = {}) => themes.filter((t) => !(skipPositive && t.name.startsWith("Positive"))).map((t) => ({ name: t.name, delta: Math.round((t.pct[2] - t.pct[1]) * 100), pct: withPct && t.pct[1] ? +(((t.pct[2] - t.pct[1]) / t.pct[1]) * 100).toFixed(0) : null, unit: " bps" })).filter((t) => t.delta !== 0);

function hsiaSentimentPage() {
  const S = HSS, M = AN_SURVEY_MONTHS, A = S.attributes, out = [];
  const chatTot = S.chatbot.positive.map((_, i) => S.chatbot.positive[i] + S.chatbot.neutral[i] + S.chatbot.negative[i]);
  const chatNegPct = chatTot.map((t, i) => (t ? +((S.chatbot.negative[i] / t) * 100).toFixed(1) : 0));
  const topDriver = S.drivers[0];
  out.push(sec("cards", "Sentiment KPI cards", "cards", [
    cardFrom3("Survey respondents", S.respondents, { unit: "count", goodWhenDown: false, months: S.months, note: "CF&R TELUS Internet · Aug 2026" }),
    cardFrom3("Reliability rated fair or poor", S.reliability.bottom2, { unit: "% of respondents", isRate: true, months: S.months, note: `${fmtNum(S.reliability.bottom2N[2])} of ${fmtNum(S.respondents[2])} respondents · Aug` }),
    cardFrom3("Negative verbatims", S.polarity.negative, { unit: "% of reason-for-rating comments", isRate: true, months: S.months, note: `of ${fmtNum(S.verbatimBase[2])} comments · Aug` }),
    cardFrom3(`Top driver: ${topDriver.name.toLowerCase()}`, topDriver.pct, { unit: "% of those rating reliability fair or poor", isRate: true, months: S.months, note: `of the ${fmtNum(S.driverBase[2])} rating reliability fair or poor · Aug` }),
    cardFrom3("Considering switching or cancelling", S.churn.at_risk, { unit: "% of respondents", isRate: true, months: S.months, note: `${fmtNum(S.churn.at_riskN[2])} respondents · Aug` })
  ]));
  out.push(textSec("about", "About this page", [`CF&R TELUS Internet survey, Jun to Aug 2026, ${fmtNum(S.respondents[0])} / ${fmtNum(S.respondents[1])} / ${fmtNum(S.respondents[2])} respondents. Unweighted counts: the export carries a survey weight which is not applied, so figures match the raw base. Comparisons are Aug against Jul. Rating questions use the five-point Excellent to Poor scale and "fair or poor" is the bottom two boxes. The performance and importance batteries rotate month to month, so they are shown as single-month readings rather than a trend. Verbatim themes and sentiment are keyword-classified, so treat them as direction rather than precise measurement.`]));
  out.push(tableSec("s01-reliability", "01 · Perceived reliability · Rating of HSIA reliability", [col("rating", "Rating"), ...M.map((m) => col(m, m, "%")), col("changeBps", "Aug vs Jul", "bps")], [["Excellent or very good", S.reliability.top2], ["Good", S.reliability.good], ["Fair or poor", S.reliability.bottom2]].map(([lbl, arr]) => { const r = { rating: lbl }; M.forEach((m, i) => { r[m] = arr[i]; }); r.changeBps = bpsMove(arr); return r; }), "Reliability perception is broadly flat but drifting the wrong way: the fair-or-poor share has risen in each of the three months and the top-two-box share sits below its June level."));
  out.push(tableSec("s01-by-contact", "01 · Fair-or-poor reliability by contact behaviour — Aug 2026", [col("group", "Contact behaviour"), ...M.map((m) => col(m, m, "%")), col("changeBps", "Aug vs Jul", "bps"), col("base", "Base (Aug)", "count")], [["issue_no_contact", "Had an issue, did not contact"], ["contacted", "Contacted TELUS about an issue"], ["no_issue", "No issue in the past month"]].map(([k, lbl]) => { const r = S.reliabilityByContact[k], row = { group: lbl }; M.forEach((m, i) => { row[m] = r.pct[i]; }); row.changeBps = bpsMove(r.pct); row.base = r.base[2]; return row; }), "Customers who hit a problem and never called are the most negative group and the only one getting materially worse. They rate reliability fair or poor more often than customers who did contact support, so the ticket queue understates the reliability problem."));
  out.push(tableSec("s02-drivers", "02 · What drives a poor reliability rating · Driver selected", [col("driver", "Driver selected"), ...M.flatMap((m) => [col(m, m, "%"), col(`${m} n`, `${m} count`, "count")]), col("changeBps", "Aug vs Jul", "bps")], S.drivers.filter((d) => d.name !== "Other").map((d) => { const r = { driver: d.name }; M.forEach((m, i) => { r[m] = d.pct[i]; r[`${m} n`] = d.v[i]; }); r.changeBps = bpsMove(d.pct); return r; }), `Asked only of respondents who rated reliability fair or poor (${fmtNum(S.driverBase[0])} / ${fmtNum(S.driverBase[1])} / ${fmtNum(S.driverBase[2])} in Jun / Jul / Aug). Multi-select, so shares sum above 100%. Connection loss is the single biggest driver, and the connection and speed drivers together dominate, which lines up with Connection Instability and Disconnects being the largest pain point in the ticket data.`));
  out.push(tableSec("s03-attributes", "03 · Performance against importance", [col("attribute", "Service attribute"), col("fairOrPoor", `Fair or poor · ${A.perfMonth}`, "%"), col("base", "Base", "count"), col("important", `Important · ${A.impMonth}`, "%"), col("priority", "Priority")], A.rows.map((r) => ({ attribute: r.name, fairOrPoor: r.pct, base: r.base, important: r.imp ?? null, priority: r.imp != null && r.imp >= 75 && r.pct >= 25 ? "Close the gap" : null })), `Performance is the share rating each attribute fair or poor in ${A.perfMonth}; importance is the share calling it important in ${A.impMonth}. The two batteries rotate, so they come from different months and are read side by side rather than as a trend. "Close the gap" marks attributes that at least 75% call important and at least 25% rate fair or poor. Online gaming scores badly but only 45.6% call it important, so it ranks lower as a priority.`));
  out.push(tableSec("s04-polarity", "04 · Verbatim sentiment and themes · Polarity", polarityCols(M), polarityRows(S.polarity, S.polarityN, M), "One classification per respondent across the four reason-for-rating verbatims. Sentiment has worsened in each month: negative comments are up 300 bps since June and positive comments down 290 bps."));
  const mv = themeMovers(S.themes);
  out.push(listSec("s04-themes-rising", "04 · Rising themes · Aug vs Jul", moverItems(mv.filter((t) => t.delta > 0).sort((x, y) => y.delta - x.delta).slice(0, 5))));
  out.push(listSec("s04-themes-falling", "04 · Falling themes · Aug vs Jul", moverItems(mv.filter((t) => t.delta < 0).sort((x, y) => x.delta - y.delta).slice(0, 5))));
  out.push(tableSec("s04-themes", "04 · Theme mentioned", pctCols("Theme mentioned", M, [col("negativeAug", "Negative in Aug", "count"), col("negativeSharePct", "Negative share of theme mentions (Aug)", "%")]), pctRows(S.themes, M, (t) => ({ negativeAug: t.neg[2], negativeSharePct: t.v[2] ? Math.round((t.neg[2] / t.v[2]) * 100) : 0 })), "Share of respondents whose reason-for-rating comments mention each theme; a comment can carry several themes, so shares sum above 100%. Price and customer service dominate the open comments and both are still rising, while the network themes are steadier. The last column is how often the theme appears in a comment scored negative overall."));
  out.push(tableSec("s05-issue-themes", "05 · Issue descriptions and digital support · Themes in the issue descriptions", monthCols("Theme", M), monthRows(S.issueThemes, M), "Issue-description verbatims mentioning each theme, across the contact, Wi-Fi, connection, streaming, support and Wi-Fi Plus deep-dive questions. Speed and connection complaints lead and both grew in August."));
  out.push(tableSec("s05-chatbot", "05 · Chatbot and digital support comments", [col("polarity", "Polarity"), ...M.map((m) => col(m, m, "count"))], [...["positive", "neutral", "negative"].map((p) => { const r = { polarity: p }; M.forEach((m, i) => { r[m] = S.chatbot[p][i]; }); return r; }), (() => { const r = { polarity: "Negative share (%)" }; M.forEach((m, i) => { r[m] = chatNegPct[i]; }); return r; })()], `Chatbot comments grew with the sample but turned less negative: the negative share fell from ${chatNegPct[1]}% in July to ${chatNegPct[2]}% in August, the clearest improvement on this page. Needing to reach a person remains the dominant complaint.`));
  out.push(listSec("s06-quotes", "06 · What customers said", quoteItems(S.quotes), "August 2026 verbatims that scored clearly negative and match the theme shown, quoted as written including typing errors. No customer identifiers are held in this dashboard."));
  out.push(listSec("s07-recommendations", "07 · Recommendations", recItems(HSIA_SENTIMENT_RECS, "HSIA")));
  return out;
}

function tvSentimentPage() {
  const S = TVA.survey, M = AN_SURVEY_MONTHS, out = [];
  const supTot = S.support.positive.map((_, i) => S.support.positive[i] + S.support.neutral[i] + S.support.negative[i]);
  const topIssue = S.tvIssues.filter((t) => !t.name.startsWith("Customer service"))[0];
  const months = ["Jun 2026", "Jul 2026", "Aug 2026"];
  out.push(sec("cards", "Sentiment KPI cards", "cards", [
    cardFrom3("Survey respondents", S.respondents, { unit: "count", goodWhenDown: false, months, note: "Optik TV survey · Aug 2026" }),
    cardFrom3("Negative verbatims", S.polarity.negative, { unit: "% of reason-for-rating verbatims", isRate: true, months }),
    cardFrom3("Positive verbatims", S.polarity.positive, { unit: "% of reason-for-rating verbatims", isRate: true, goodWhenDown: false, months }),
    cardFrom3(`Top TV issue: ${topIssue.name.split(" /")[0]}`, topIssue.pct, { unit: "% of respondents describing it", isRate: true, months }),
    cardStatic("Chatbot verbatims negative", round((S.support.negative[2] / supTot[2]) * 100, 1), "% of digital-support comments", "Aug 2026", `of ${fmtNum(supTot[2])} comments · positive ${fmtPct((S.support.positive[2] / supTot[2]) * 100, 1)}`)
  ]));
  out.push(textSec("about", "About", ["Verbatims only: the general reason-for-rating comments (v1, v2, v3, v6), the TV-specific issue descriptions, and the digital-support comments from the CF&R Optik TV survey, Jun – Aug 2026; movements compare Aug with Jul. Score columns (NPS and ratings) are excluded. Sentiment is a positive/negative lexicon applied to each respondent's combined comments; themes are keyword-classified in English and French."]));
  out.push(tableSec("s01-polarity", "01 · Verbatim sentiment · Polarity", polarityCols(M), polarityRows(S.polarity, S.polarityN, M), "Sentiment moved negative again in August: positive comments fell 110 bps and negative rose 150 bps against July (positive is down 360 bps since June). The shift is concentrated in support-access, price and home-network comments rather than TV reliability itself, which lost 110 bps of share."));
  out.push(tableSec("s02-themes", "02 · Themes in customer verbatims", pctCols("Theme", M, [col("negJul", "Negative mentions Jul", "count"), col("negAug", "Negative mentions Aug", "count")]), pctRows(S.themes, M, (t) => ({ negJul: t.neg[1], negAug: t.neg[2] }))));
  const mv = themeMovers(S.themes, { withPct: true });
  out.push(listSec("s02-rising", "02 · Rising share · Aug vs Jul (bps of respondents)", moverItems(mv.filter((t) => t.delta > 0).sort((x, y) => y.delta - x.delta).slice(0, 5))));
  out.push(listSec("s02-falling", "02 · Falling share · Aug vs Jul (bps of respondents)", moverItems(mv.filter((t) => t.delta < 0).sort((x, y) => x.delta - y.delta).slice(0, 5))));
  out.push(textSec("s02-notes", "02 · Sources & notes", ["Customer service and price dominate the reason-for-rating verbatims and carry the most negative mentions; TV reliability sits third and lost share in August. Internet & Wi-Fi (+180 bps), picture and sound (+90 bps), recording (+60 bps) and channels (+60 bps) gained share against July."]));
  out.push(textSec("s03-about", "03 · TV-specific issue verbatims", ["Respondents who flagged a TV problem were asked to describe it. Mention rate is the share of all respondents who wrote a description for that issue, so it tracks how many customers experience each problem month to month."]));
  out.push(tableSec("s03-issues", "03 · TV issue described", [col("name", "TV issue described"), ...M.map((m) => col(m, `${m} · mentions`, "count")), col("augRate", "Aug rate", "%"), col("changeBps", "Rate Aug vs Jul", "bps")], S.tvIssues.map((t) => { const r = { name: t.name }; M.forEach((m, i) => { r[m] = t.v[i]; }); r.augRate = t.pct[2]; r.changeBps = bpsMove(t.pct); return r; })));
  const im = S.tvIssues.map((t) => ({ name: t.name, delta: Math.round((t.pct[2] - t.pct[1]) * 100), pct: t.pct[1] ? +(((t.pct[2] - t.pct[1]) / t.pct[1]) * 100).toFixed(0) : null, unit: " bps" }));
  out.push(listSec("s03-rising", "03 · Rising issue rate · Aug vs Jul (bps)", moverItems(im.filter((t) => t.delta > 0).sort((x, y) => y.delta - x.delta).slice(0, 5))));
  out.push(listSec("s03-falling", "03 · Falling issue rate · Aug vs Jul (bps)", moverItems(im.filter((t) => t.delta < 0).sort((x, y) => x.delta - y.delta).slice(0, 5))));
  out.push(listSec("s03-quotes", "03 · In their words", quoteItems(S.quotes)));
  out.push(tableSec("s04-chatbot", "04 · Digital support (chatbot) verbatims", [col("polarity", "Polarity"), ...M.map((m) => col(m, m, "count")), col("augShare", "Aug share", "%")], ["positive", "neutral", "negative"].map((p) => { const r = { polarity: p }; M.forEach((m, i) => { r[m] = S.support[p][i]; }); r.augShare = round((S.support[p][2] / supTot[2]) * 100, 1); return r; }), "Comments about the chatbot and digital support run roughly four negative for every positive; the recurring complaint is being unable to reach a person for anything beyond a simple question."));
  out.push(listSec("s05-recommendations", "05 · Recommendations", recItems(TV_SENTIMENT_RECS, "TV")));
  return out;
}

// ---- Cross Analysis (mirrors HsiaCrossPage / TvCrossPage) ----
function crossPage(product) {
  const out = [], K = NOTES_ANALYSIS[product].tickets;
  const isTV = product === "TV";
  const MATRIX = isTV ? TV_CROSS_MATRIX : HSIA_CROSS_MATRIX, rising = isTV ? TV_CROSS_RISING : HSIA_CROSS_RISING, falling = isTV ? TV_CROSS_FALLING : HSIA_CROSS_FALLING;
  const fv = K.divergence.field;
  const months = NOTES_ANALYSIS[product].months;
  out.push(sec("cards", "Cross analysis KPI cards", "cards", isTV ? [
    cardStatic("Confirmed rising drivers", 3, "count", null, "tickets, notes, technician and verbatims agree: legacy STB boot, OPUS onboarding, support friction"),
    cardStatic("Emerging driver", 1, "count", null, "ticket-only signal so far: YouTube app, August"),
    cardStatic("Falling drivers", 2, "count", null, "fixes visible in every source: recording playback, power supply"),
    cardFrom3("Field-visit divergence", fv.map((d) => d.reattribution), { unit: "% (technician finding ≠ agent category)", isRate: true, months }),
    cardFrom3("Negative verbatims", TVA.survey.polarity.negative, { unit: "% of reason-for-rating comments", isRate: true, months: ["Jun 2026", "Jul 2026", "Aug 2026"] })
  ] : [
    cardStatic("Confirmed rising drivers", 3, "count", null, "tickets, agent notes and technician findings agree: no dataflow, incompatible equipment, copper no sync"),
    cardStatic("Diagnosis gap", 1, "count", null, "volume flat, closures diverging: Wireless dispatches"),
    cardStatic("Falling drivers", 2, "count", null, "improvement visible in every lens: degraded fibre, speed"),
    cardFrom3("Field-visit divergence", fv.map((d) => d.reattribution), { unit: "% (technician finding ≠ agent category)", isRate: true, months }),
    cardFrom3("Non-TELUS-caused visits", fv.map((d) => d.nontelus), { unit: "% of technician determinations", isRate: true, months })
  ]));
  out.push(textSec("about", "About", [isTV
    ? "Each driver is read across four lenses, comparing Aug 2026 with Jul 2026: ticket categories (agent), agent comment themes, technician findings on field visits, and customer survey verbatims. A driver is confirmed when the direction agrees across sources; ticket-only movement is flagged as emerging."
    : "Each driver is read across the available lenses, comparing Aug 2026 with Jul 2026: ticket categories from the notes export (agent), Looker ticket volumes year over year (Aug 2026 vs Aug 2025), agent comment themes, and technician findings on field visits. A driver is confirmed when the direction agrees across sources. Customer survey verbatims are not yet available for HSIA and will be added as a fifth lens when they are."]));
  out.push(tableSec("s01-matrix", "01 · Signal alignment matrix", isTV
    ? [col("driver", "Driver"), col("tickets", "Ticket trend"), col("notes", "Agent notes"), col("tech", "Technician findings"), col("voice", "Customer verbatims"), col("verdict", "Verdict")]
    : [col("driver", "Driver"), col("tickets", "Ticket trend (notes, Aug vs Jul)"), col("looker", "Looker volume (Aug 2026 vs Aug 2025)"), col("notes", "Agent notes"), col("tech", "Technician findings"), col("verdict", "Verdict")], MATRIX.map((r) => ({ ...r }))));
  out.push(listSec("s02-rising", "02 · Consolidated rising drivers · Aug vs Jul 2026", rising.map((it, i) => ({ title: `${i + 1}. ${it.name}`, body: it.src }))));
  out.push(listSec("s02-falling", "02 · Consolidated falling drivers · Aug vs Jul 2026", falling.map((it, i) => ({ title: `${i + 1}. ${it.name}`, body: it.src }))));
  out.push(listSec("s03-recommendations", "03 · Prioritised recommendations", recItems(isTV ? TV_RECS : HSIA_RECS, product)));
  return out;
}

// ---- HSIA Review (mirrors HsiaBriefPage) ----
function reviewPage() {
  const Y = HSIA_YOY, out = [];
  const i2 = MONTHS.indexOf("Sep 2026"), mi = [i2 - 2, i2 - 1, i2], yi = mi.map((i) => i - 12);
  const mons = mi.map((i) => MONTHS[i]), shortMon = (m) => m.slice(0, 3);
  const range = `${shortMon(mons[0])} – ${shortMon(mons[2])} ${mons[2].slice(-4)}`, prevRange = `${shortMon(mons[0])} – ${shortMon(mons[2])} ${MONTHS[yi[2]].slice(-4)}`;
  const S = { calls: CALLS_SPLIT.HSIA.offered, tv: DATA.ticketVolume.HSIA, tr: DATA.ticketRate.HSIA, rv: DATA.repairVolume.HSIA, rr: DATA.repairRate.HSIA, base: DATA.subBase.HSIA };
  const sum = (arr, idx) => idx.reduce((x, i) => x + (arr[i] || 0), 0), avg = (arr, idx) => sum(arr, idx) / idx.length;
  const num = (v, d = 0) => (v == null ? "—" : d ? v.toFixed(d) : Math.round(v).toLocaleString("en-CA"));
  const big = fmtBig, sbig = (v) => (v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + fmtBig(Math.abs(v)));
  const q = { calls: sum(S.calls, mi), tv: sum(S.tv, mi), rv: sum(S.rv, mi), tr: avg(S.tr, mi), rr: avg(S.rr, mi), base: avg(S.base, mi) };
  const qy = { calls: sum(S.calls, yi), tv: sum(S.tv, yi), rv: sum(S.rv, yi), tr: avg(S.tr, yi), rr: avg(S.rr, yi), base: avg(S.base, yi) };
  const per100 = mi.map((i) => (S.rv[i] / S.tv[i]) * 100);
  const K = HSA.tickets, sv = HSS, svM = sv.months.map((m) => m.slice(0, 3));
  const fibreIdx = DATA.hsiaFibreMonths.indexOf("Sep 2026"), fibre = [2, 1, 0].map((k) => DATA.hsiaFibrePct[fibreIdx - k]);
  const qName = `Q${Math.floor((i2 % 12) / 3) + 1}`, qNow = `${qName} ${MONTHS[i2].slice(-4)}`, qPrev = `${qName} ${MONTHS[yi[2]].slice(-4)}`;
  const churnQ = (idx) => (idx.every((i) => DATA.churnRate.HSIA[i] != null) ? avg(DATA.churnRate.HSIA, idx) : null);
  const cq = { now: churnQ(mi), prev: churnQ(yi) };
  const qCard = (label, now, prev, unit, isRate, goodDown = true) => ({ label: `${label} · ${qNow}`, value: isRate ? round(now, 2) : Math.round(now), unit, month: qNow, mom: null, yoy: cardMove(isRate ? round(now, 2) : Math.round(now), isRate ? round(prev, 2) : Math.round(prev), goodDown, isRate), priorQuarter: qPrev, priorValue: isRate ? round(prev, 2) : Math.round(prev) });
  const cards = [qCard("Calls offered", q.calls, qy.calls, "count"), qCard("Tickets", q.tv, qy.tv, "count"), qCard("Ticket rate per 100 subs", q.tr, qy.tr, "per 100 subscribers", true), qCard("Repairs / dispatches", q.rv, qy.rv, "count"), qCard("Repair rate per 100 subs", q.rr, qy.rr, "per 100 subscribers", true), qCard("Subscriber base (avg)", q.base, qy.base, "count", false, false)];
  if (cq.now != null && cq.prev != null) cards.push(qCard("Churn rate per 100 subs", cq.now, cq.prev, "per 100 subscribers", true));
  out.push(sec("kpis", `${qPrev} to ${qNow} at a glance`, "cards", cards, `${qNow} is ${range}, against ${prevRange}. Calls, tickets and repairs are quarter totals; rates and the subscriber base are quarter averages of the monthly figures, with rates per 100 subscribers. The move is the quarter against the same quarter a year earlier (yoy); priorQuarter and priorValue carry the comparison.`));
  const flag = (v, goodDown = true, thr = 3) => (v == null ? null : Math.abs(v) < thr ? "flat" : v > 0 ? "up" : "down");
  const mrow = (measure, vals, now, prev, change, f) => { const r = { measure }; mons.forEach((m, k) => { r[shortMon(m)] = vals[k]; }); r[range] = now; r[prevRange] = prev; r.change = change; r.flag = f; return r; };
  out.push(tableSec("kpis-table", "Dashboard measures · latest quarter against the same quarter a year earlier", [col("measure", "Dashboard measure"), ...mons.map((m) => col(shortMon(m), shortMon(m))), col(range, range), col(prevRange, prevRange), col("change", "Change"), col("flag", "Flag")], [
    mrow("Tickets (Looker Assure)", mi.map((i) => S.tv[i]), q.tv, qy.tv, sPct(pctChange(q.tv, qy.tv)), flag(pctChange(q.tv, qy.tv))),
    mrow("Ticket rate per 100 subs", mi.map((i) => S.tr[i]), round(q.tr, 2), round(qy.tr, 2), sDec(q.tr - qy.tr), flag(pctChange(q.tr, qy.tr))),
    mrow("Calls offered", mi.map((i) => S.calls[i]), q.calls, qy.calls, sPct(pctChange(q.calls, qy.calls)), flag(pctChange(q.calls, qy.calls))),
    mrow("Repairs / dispatches", mi.map((i) => S.rv[i]), q.rv, qy.rv, sPct(pctChange(q.rv, qy.rv)), flag(pctChange(q.rv, qy.rv))),
    mrow("Dispatches per 100 tickets", per100.map((v) => round(v, 1)), round((q.rv / q.tv) * 100, 1), round((qy.rv / qy.tv) * 100, 1), sDec((q.rv / q.tv - qy.rv / qy.tv) * 100, 1), flag(pctChange(q.rv / q.tv, qy.rv / qy.tv))),
    mrow("Severely degraded fibre, % of repairs", fibre.map((v) => (v == null ? null : round(v, 1))), round(fibre.reduce((x, y) => x + (y || 0), 0) / 3, 1), null, `${sDec(fibre[2] - fibre[0], 1)} pts`, flag(fibre[2] - fibre[0], true, 1))
  ], "The dashboard's quarter and the analysis measure different populations (HSIA West plus TQ ILEC and PFE on Looker Assure tickets, against all TELUS internet excluding Koodo on internet_daily), so the two are shown side by side and not reconciled. They tell the same story: demand up by a sixth, dispatches up far less."));
  out.push(textSec("header", `HSIA · ${Y.period} ${Y.y1} vs ${Y.y0} · why tickets rose, what drives No Dataflow, and whether the fixes are aimed at it`, [
    `HSIA tickets are up ${Y.tickets.pct}% on last year. A quarter of that is a bigger base; the rest is degraded fibre, orders and provisioning, and unstable gateways.`,
    `The year-over-year ticket analysis for all TELUS internet (excluding Koodo), read against the dashboard's own quarter: KPIs for ${range}, agent and technician notes, the customer survey and the initiative register.`,
    `Reliability Strategy · Analysis data to ${Y.dataThrough} · Dashboard data to Sep 2026 · Survey to ${sv.months[sv.months.length - 1]}`]));
  // derived
  const drivers = Y.drivers, growth = drivers[0], adj = drivers[drivers.length - 1];
  const condTotal = drivers.filter((d) => d.group !== "Base growth" && d.group !== "Adjustment").reduce((x, d) => x + d.v, 0);
  const groupTotals = ["Network: GPON", "Provisioning", "In-home telemetry", "Plan change"].map((g) => ({ g, v: drivers.filter((d) => d.group === g).reduce((x, d) => x + d.v, 0) })).sort((x, y) => y.v - x.v);
  const gshare = (g) => ((g.v / Y.tickets.delta) * 100).toFixed(0);
  const gt = (g) => groupTotals.find((x) => x.g === g);
  const O = Y.orders, B = Y.bucket, ND = Y.noDataflow, nd = B.rows[0];
  const wifiAlign = K.divergence.perCat.filter((r) => r.cat.startsWith("Wireless")).map((r) => r.alignment);
  const align = K.divergence.perCat.slice(0, 7).map((r) => ({ label: r.cat.replace("Connectivity › ", "").replace("Wireless › ", "Wi-Fi: "), aligned: r.alignment, noFault: r.nofault, reattributed: round(Math.max(0, 100 - r.alignment - r.nofault), 1) }));
  const svDrivers = sv.drivers.slice(0, 5);
  const perDay = (arr) => sPct(pctChange(arr[1], arr[0]), 1);
  const byName = (names) => names.map((n) => INITIATIVES.find((it) => it.p === "HSIA" && it.name === n)).filter(Boolean);
  const initGroups = [
    { g: "Network: GPON", title: "Network: degraded fibre and outages", share: gshare(gt("Network: GPON")), why: `GPON severely degraded, outage and unknown states add about ${num(gt("Network: GPON").v)} tickets; ONT Not Ranged and Historical Data are the call categories most tied to them.`, items: byName(["GPONe Fibre Degradation Proactive Campaign", "Fibre Check — Severely Degraded from the OLT", "GPONe Geographic Analysis & Infrastructure Optimization", "Service Guarantee: Internet Backup to Cellular", "Fibre Check — Bit Errors & Critical Alarms", "XGSPON Light Requirements Enhancement"]) },
    { g: "Provisioning", title: "Provisioning, orders and plan changes", share: (((gt("Provisioning").v + gt("Plan change").v) / Y.tickets.delta) * 100).toFixed(0), why: `Orders rose ${O.pct}% and a customer who has just had an order calls 3 to 4 times as often for 30 days; deliveries, plan changes, failing speed tests, early tenure and ONT capping add about ${num(gt("Provisioning").v + gt("Plan change").v)} tickets.`, items: byName(["DIY Revamp Live ONT Check", "Gigabit Speed Compatibility ICU Intervention", "3 Gig Upgrade on TELUS.com", "Copper to WHSIA Technology Change in CSR", "Copper to Fibre Repair Intercept", "Cloudcheck Server Upgrades & Speed Test Improvements", "GPON/XGSPON Mis-tagging", "No Internet after Release Activation", "Restore Orders Profile Rebuild (after Suspend and Resume Order Fails)"]) },
    { g: "In-home telemetry", title: "In-home: gateway reboots and poor Wi-Fi", share: gshare(gt("In-home telemetry")), why: `Lines with 3+ gateway reboots a week grew 37% and poor-Wi-Fi lines 27%, adding about ${num(gt("In-home telemetry").v)} tickets; technicians close only ${Math.round(Math.min(...wifiAlign))}% to ${Math.round(Math.max(...wifiAlign))}% of Wi-Fi visits aligned with the agent's diagnosis.`, items: byName(["Wi-Fi Scaling — Proactive Campaigns", "Wi-Fi RouteThis RAVA Pilot Proactive Campaign", "Cloudcheck Fine Tuning", "Technician WiFi Certification Tool", "Fix Auto Channel Disabled — Firmware", "HSIA Legacy Hardware Upgrades"]) }
  ];
  const initCount = initGroups.reduce((x, g) => x + g.items.length, 0), launched = initGroups.reduce((x, g) => x + g.items.filter((it) => /launch/i.test(it.status)).length, 0);
  out.push(listSec("in-short", "In short", [
    { title: `Tickets rose ${num(Y.tickets.delta)} (${sPct(Y.tickets.pct)}) in ${Y.period} ${Y.y1}.`, body: `${num(Y.tickets.y0)} to ${num(Y.tickets.y1)}, and the rise is steady in every month. Our own quarter agrees: ${range} tickets are ${aPct(pctChange(q.tv, qy.tv), 0)} above ${prevRange} and the ticket rate is ${sDec(q.tr - qy.tr)} per 100 subscribers higher.` },
    { title: `${growth.share.toFixed(0)}% is simply a larger base.`, body: `${num(Y.lines.delta)} more lines (+${Y.lines.pct}%) at the ${Y.y0} ticket rate account for ${num(growth.v)} of the extra tickets. Everything else is a higher rate of trouble per line.` },
    { title: "Four root-cause groups explain the rest.", body: `${groupTotals.map((g) => `${g.g.replace("Network: ", "")} ${gshare(g)}%`).join(", ")} of the increase, before removing ${num(Math.abs(adj.v))} of double counting. GPON severely degraded is the single largest condition at ${num(drivers[1].v)}, with the caveat that GPON figures are August scaled to nine months.` },
    { title: "Orders are the biggest lever we control.", body: `Orders rose ${O.pct}% (automated BackEnd orders ${sPct(O.backendPct, 0)}), a customer calls 3 to 4 times as often in the 30 days after one, and tickets within 90 days of an order added about ${num(O.after90.extra)}, roughly ${O.after90.shareOfIncrease}% of the year-over-year increase.` },
    { title: "No Dataflow is the category to shrink.", body: `It is ${B.noDataflowPct}% of the ${num(B.tickets)} reactive tickets and grew ${B.noDataflowGrowthPct}% from January to September. Its callers are up ${ND.pct}%, ${ND.tenuredSharePct}% of that growth is customers with a year or more of tenure, and about ${ND.offnetSharePct}% is the offnet (Bell) East group that is under ${ND.offnetBasePct}% of customers. ${nd.noFault}% of No Dataflow callers showed no line fault in telemetry at ticket time.` },
    { title: "The register covers the network and provisioning drivers; the gaps are orders, offnet East and the NH20A gateway.", body: `${initCount} initiatives map to the three driver groups, ${launched} launched. None targets post-order contact, the offnet East provisioning stack, or the NH20A firmware build running at 1.7× lift.` }
  ]));
  // 1
  out.push(sec("s1-stats", "1. The rise is steady, and a quarter of it is a bigger base", "cards", [
    cardStatic(`Tickets · ${Y.period} ${Y.y0}`, Y.tickets.y0, "count", `${Y.period} ${Y.y0}`), cardStatic(`Tickets · ${Y.period} ${Y.y1}`, Y.tickets.y1, "count", `${Y.period} ${Y.y1}`),
    cardStatic(`Increase (${sPct(Y.tickets.pct)})`, Y.tickets.delta, "count"), cardStatic(`Average active lines (+${Y.lines.pct}%)`, Y.lines.delta, "count", null, `${big(Y.lines.y0)} to ${big(Y.lines.y1)}`),
    cardStatic("Expected from base growth", growth.v, "count", null, `${big(Y.lines.delta)} × ${Y.lines.ratePerLine9mo} tickets per line · ${growth.share}% of the increase`)
  ]));
  // 2
  out.push(textSec("s2-method", `2. What the ${sNum(Y.tickets.delta)} breaks down into`, [
    `Each driver is credited by volume alone: how many more customers entered the state, times what that state cost in tickets in ${Y.y0}. Holding the rate at its ${Y.y0} level stops a group looking worse just because more of the kind of customers who call joined it. A customer can sit in several states at once, so an adjustment removes the double counting and the drivers reconcile to the total.`,
    "Customer growth first, then each condition's volume-only contribution, then the adjustment for overlap. Colours group drivers by root cause."]));
  out.push(tableSec("s2-drivers", `2. Contribution to the ${sNum(Y.tickets.delta)} increase, ${Y.period}, volume only (growth in the population × ${Y.y0} rate)`, [col("driver", "Driver"), col("group", "Group"), col("growth", "Growth in the population"), col("rate2025", `${Y.y0} rate`), col("volumeTickets", "Volume tickets", "count"), col("actualChange", "Actual change", "count"), col("share", "Share", "%"), col("capped", "Capped"), col("caveat", "Aug × 9")], drivers.map((d) => ({ driver: d.name, group: d.group, growth: d.delta || null, rate2025: d.rate || null, volumeTickets: d.v, actualChange: d.actual ?? null, share: d.share, capped: !!d.capped, caveat: !!d.caveat })), `Condition drivers add ${sNum(condTotal)} before adjustment; the overlap removed is ${sNum(adj.v)}. GPON outage and the 3 to 5 reboot band are capped at their actual change because their per-line rates fell. GPON figures are August × 9 because telemetry covered only about half of fibre lines in Jan to Jul ${Y.y0}, so they are directional. This table is the chart's data.`));
  out.push(textSec("s2-campaigns", "2. Proactive campaigns shaped the contact volume", [`Internet proactive campaigns with a callback option reached ${(Y.campaigns.reach[1] / Y.campaigns.reach[0]).toFixed(1)}× more customers than a year ago (${num(Y.campaigns.reach[0])} to ${num(Y.campaigns.reach[1])} touches). Completed callbacks rose ${num(Y.campaigns.callbacks[0])} to ${num(Y.campaigns.callbacks[1])} (${sNum(Y.campaigns.callbacks[1] - Y.campaigns.callbacks[0])}). These are contacts we generated and they sit inside the ${sNum(Y.tickets.delta)}; there is no campaign tag in the ticket data to net them out.`]));
  out.push(textSec("s2-copper", "2. Copper is not a driver", [`Per surviving copper line it got worse (${Y.copper.ratePct[0]}% to ${Y.copper.ratePct[1]}% per month), but the base shrank ${aPct(pctChange(Y.copper.lines[1], Y.copper.lines[0]), 0)} (${num(Y.copper.lines[0])} to ${num(Y.copper.lines[1])} lines), so copper tickets fell ${num(Y.copper.tickets[0])} to ${num(Y.copper.tickets[1])} and removed volume rather than adding it.`]));
  // 3
  out.push(sec("s3-stats", "3. Orders are one of the biggest drivers, and the one we control", "cards", [
    cardStatic(`PureFibre orders, ${Y.period} (YoY %)`, O.pct, "%", null, `${big(O.total[0])} to ${big(O.total[1])}`), cardStatic("BackEnd (automated) orders (YoY %)", O.backendPct, "%", null, `${big(O.backend[0])} to ${big(O.backend[1])}`),
    cardStatic("Ticket rate in the 30 days after an order", O.rate30[1], "%", String(Y.y1), `against a ${O.baseRate[1]}% monthly base rate: 3 to 4×`), cardStatic("Extra tickets within 90 days of an order", O.after90.extra, "count", null, `about ${O.after90.shareOfIncrease}% of the ${sbig(O.after90.hsicIncrease)} HSIC increase`)
  ]));
  out.push(tableSec("s3-channels", "3. Orders by channel", [col("channel", "Channel"), col("orders2025", `Orders ${Y.y0}`, "count"), col("orders2026", `Orders ${Y.y1}`, "count"), col("yoyPct", "YoY", "%"), col("rate30_2025", `30-day ticket rate ${Y.y0}`, "%"), col("rate30_2026", `30-day ticket rate ${Y.y1}`, "%")], O.channels.map((c) => ({ channel: c.name, orders2025: c.o[0], orders2026: c.o[1], yoyPct: c.pct, rate30_2025: c.rate[0], rate30_2026: c.rate[1] }))));
  out.push(textSec("s3-prose", "3. Account activity", [`Account activity rose across every order type. The surge is led by automated BackEnd orders, which carry a low call rate (about 2.5%), so the overall post-order rate eased from ${O.rate30[0]}% to ${O.rate30[1]}%. Had the rate stayed at ${Y.y0} levels, order growth would have added about ${num(O.after90.expectedExtra)} tickets; the actual was ${num(O.after90.extra)}. By about 120 days after an order, customers call at their normal rate again.`]));
  out.push(textSec("s3-aug-sep", "3. August to September: orders still rising", [`Orders per day ${num(O.augSep.ordersPerDay[0])} to ${num(O.augSep.ordersPerDay[1])} (${perDay(O.augSep.ordersPerDay)}) and No Dataflow tickets per day ${O.augSep.noDataflowPerDay[0]} to ${O.augSep.noDataflowPerDay[1]} (${perDay(O.augSep.noDataflowPerDay)}), while all tickets per day were flat (${num(O.augSep.ticketsPerDay[0])} to ${num(O.augSep.ticketsPerDay[1])}, ${perDay(O.augSep.ticketsPerDay)}). September's lower monthly total is the calendar, not fewer calls. CSR orders, the 9.8% call-rate channel, rose 14% in September while low-rate automated orders fell, so order-driven tickets were expected to grow faster than orders.`]));
  out.push(tableSec("s3-gpon", "3. The fibre network was calmer in September", [col("measure", "GPON measure"), col("aug", "August", "count"), col("sep", "September", "count"), col("pct", "Change", "%")], O.gponAugSep.map((r) => ({ measure: r.m, aug: r.v[0], sep: r.v[1], pct: r.pct })), `That matches the fall in ONT Not Ranged (${aPct(K.agentCat.find((c) => c.name === "Connectivity › ONT Not Ranged").pct)} MoM in our notes data), No Sync and No IP, and offset the extra order-driven calls.`));
  // 4
  out.push(textSec("s4-intro", "4. The fixes in flight, mapped to the analysis's driver groups", [`Register initiatives that act on each root-cause group, with live status, timeline, prime and HSIA impact rating. The share is each group's part of the ${sNum(Y.tickets.delta)} increase.`]));
  initGroups.forEach((g, k) => out.push(listSec(`s4-group-${k + 1}`, `4. ${g.title} · ${g.share}% of the rise`, g.items.map((it) => ({ title: it.name, body: `${it.status} · ${it.timeline} · ${it.prime}${it.impact ? ` · ${IMPACT_LABEL[it.impact]} impact` : ""}`, meta: { status: it.status, timeline: it.timeline, prime: it.prime, impact: it.impact ? IMPACT_LABEL[it.impact] : null, theme: it.theme } })), g.why)));
  out.push(listSec("s4-gaps", "4. Gaps the analysis exposes", [
    { title: `Nothing in the register targets post-order contact, although orders explain about ${O.after90.shareOfIncrease}% of the increase. A post-order check-in or a fix for avoidable orders would be the largest single lever.` },
    { title: `Nothing targets the offnet (Bell) East and SalesOne group, about ${ND.offnetSharePct}% of No Dataflow caller growth from under ${ND.offnetBasePct}% of customers.` },
    { title: `Gateway reboots (3+ a week, ${sNum(drivers[2].v)} tickets) have no HSIA initiative; the sequential reboot work exists only for TV set-top boxes.` },
    { title: "The NH20A v1.18.07 firmware (1.7× lift) and Boost Wi-Fi 7 (1.8×) need a device-team review." }]));
  out.push(listSec("s4-working", "4. Working", [
    { title: `Severely degraded fibre fell from ${fibre[0].toFixed(1)}% to ${fibre[2].toFixed(1)}% of repairs and GPON severely degraded lines fell ${aPct(O.gponAugSep[2].pct)} from August to September, in line with the GPON campaigns.` },
    { title: `ONT Not Ranged tickets fell ${aPct(pctChange(LOOKER.HSIA.topIssues[3].a26, LOOKER.HSIA.topIssues[3].a25), 0)} year over year and ${aPct(K.agentCat.find((c) => c.name === "Connectivity › ONT Not Ranged").pct)} month over month.` },
    { title: `The post-order ticket rate eased from ${O.rate30[0]}% to ${O.rate30[1]}%, so the order effect per order is not getting worse even as volume grows.` },
    { title: `A smaller share of tickets reaches a truck: ${((q.rv / q.tv) * 100).toFixed(1)} dispatches per 100 tickets against ${((qy.rv / qy.tv) * 100).toFixed(1)} in ${prevRange}.` }]));
  // 5
  out.push(sec("s5-stats", "5. The reactive bucket is line-side, and No Dataflow is the piece to shrink", "cards", [
    cardStatic(`Reactive tickets with telemetry, ${Y.period} ${Y.y1}`, B.tickets, "count", null, "Remedy High Speed, matched to a monitored line"), cardStatic("Line-side (Connectivity)", B.lineSidePct, "%", null, `about ${B.wifiPct}% is in-home Wi-Fi`),
    cardStatic("No Dataflow, the largest symptom", B.noDataflowPct, "% of reactive tickets", null, `${sPct(B.noDataflowGrowthPct, 0)} January to September`), cardStatic("Callers with no line fault in telemetry", B.noLineFaultPct, "%", null, "none of the six line-health signals at ticket time")
  ]));
  out.push(textSec("s5-intro", "5. Telemetry signals by call category", ["For each call category, the share of callers whose line showed each telemetry signal at ticket time. Darker cells are higher within the column. The last column is the share of callers whose line showed none of the six line-health faults."]));
  out.push(tableSec("s5-bucket", "5. Share of callers whose line showed each telemetry signal at ticket time", [col("category", "Call category"), col("callers", "Callers", "count"), col("gponSev", "GPON sev.", "%"), col("outage", "GPON outage", "%"), col("downtime", "Downtime", "%"), col("speed", "Speed test <50%", "%"), col("ontCap", "ONT capped", "%"), col("reboots", "Reboots 3+", "%"), col("wifi", "Poor Wi-Fi", "%"), col("planChg", "Plan change", "%"), col("tenure", "Early tenure", "%"), col("noFault", "No line fault", "%")], B.rows.map((r) => ({ category: r.cat, callers: r.n, gponSev: r.gponSev, outage: r.outage, downtime: r.downtime, speed: r.speed, ontCap: r.ontCap, reboots: r.reboots, wifi: r.wifi, planChg: r.planChg, tenure: r.tenure, noFault: r.noFault })), `Speed test validates the mapping: it peaks on Slow Speeds. Plan change and ONT capping drive Incompatible Equipment; downtime and GPON drive ONT Not Ranged and Historical Data. No Dataflow callers are ${nd.noFault}% fault-free in telemetry and ${nd.tenure}% are in early tenure, which is why proactive detection and the onboarding and order path matter more than any one network fix.`));
  out.push(tableSec("s5-agent-categories", `5. Our agent categories agree: ${shortMon(mons[2])} tickets by agent category (notes export)`, [col("category", "Agent category"), col("tickets", `${shortMon(mons[2])} tickets`, "count")], K.agentCat.slice(0, 8).map((c) => ({ category: c.name.replace(" › ", ": "), tickets: c.v[2] })), `No Dataflow was ${num(K.agentCat[0].v[0])} in ${shortMon(mons[0])} and ${num(K.agentCat[0].v[2])} in ${shortMon(mons[2])}, ${((K.agentCat[0].v[2] / K.total[2]) * 100).toFixed(0)}% of our HSIA tickets and ${sPct(pctChange(LOOKER.HSIA.topIssues[0].a26, LOOKER.HSIA.topIssues[0].a25), 0)} on ${shortMon(mons[2])} last year in Looker. Slow Speeds (${sPct(K.agentCat[2].pct)}) and Incompatible Equipment (${sPct(K.agentCat[9].pct)}) are the categories still rising month over month. This table is the bar chart's data.`));
  // 6
  out.push(sec("s6-stats", "6. No Dataflow callers: the same kinds of customers, just more of them", "cards", [
    cardStatic("No Dataflow callers, Jul to Sep (YoY %)", ND.pct, "%", null, `${big(ND.callers[0])} to ${big(ND.callers[1])} customer-days`), cardStatic("of the growth is customers with 1+ year tenure", ND.tenuredSharePct, "%", null, `${big(ND.tenure.oneYearPlus[0])} to ${big(ND.tenure.oneYearPlus[1])}; first 30 days ${big(ND.tenure.first30[0])} to ${big(ND.tenure.first30[1])}`),
    cardStatic("of the growth is the offnet (Bell) East group (approx.)", ND.offnetSharePct, "%", null, `under ${ND.offnetBasePct}% of customers; the group tripled in size`)
  ]));
  out.push(textSec("s6-intro", "6. Lift", ["Every No Dataflow caller from 1 July to 27 September in each year, compared with all internet customers. Lift is the share of callers with a trait divided by the share of the base with it: 1× means no more common among callers than among everyone."]));
  out.push(tableSec("s6-lifts", `6. Lift of selected traits among No Dataflow callers, ${Y.y0} and ${Y.y1}`, [col("trait", "Trait"), col("lift2025", `Lift ${Y.y0}`, "×"), col("lift2026", `Lift ${Y.y1}`, "×"), col("callers2025", `Callers ${Y.y0}`, "count"), col("callers2026", `Callers ${Y.y1}`, "count")], ND.lifts.map((l) => ({ trait: l.t, lift2025: l.lift[0], lift2026: l.lift[1], callers2025: l.n[0], callers2026: l.n[1] })), `Line faults and GPON problems run 5 to 10× in both years, 3+ reboots about 4×, the first 30 days of service about 8×, and recent deliveries or plan changes about 3×. No new telemetry signal appeared in ${Y.y1}; the growth is more customers in the same states. Not factors: ${ND.notFactors}. This table is the bar chart's data.`));
  out.push(textSec("s6-devices", "6. Two device findings to review", [`The Arcadyan NH20A gateway runs at 1.4× in both years, and in ${Y.y1} its main firmware build v1.18.07-build02 runs at 1.7× while v1.18.06-build02 runs at 0.7×. The new TELUS Boost Wi-Fi 7 extender runs at 1.8×. Traits overlap with new installs, so a check within one tenure group and region would separate them.`]));
  out.push(textSec("s6-offnet", "6. The offnet East group", [`Offnet (Bell network), PureFibre East, the 1.5GB XT plans and the SalesOne provisioning stack are the same customers. The group tripled and its No Dataflow callers rose ${num(ND.lifts[6].n[0])} to ${num(ND.lifts[6].n[1])}. SalesOne did not exist in ${Y.y0}. No initiative in the register targets this group.`]));
  // 7
  const noSync = K.divergence.perCat.find((r) => r.cat.endsWith("No Sync"));
  out.push(tableSec("s7-alignment", `7. How ${shortMon(mons[2])} field visits closed, by what the agent diagnosed`, [col("category", "Agent diagnosis"), col("aligned", "Aligned with the agent", "%"), col("noFault", "No fault found", "%"), col("reattributed", "Re-attributed elsewhere", "%")], align.map((r) => ({ category: r.label, aligned: r.aligned, noFault: r.noFault, reattributed: r.reattributed })), `Technicians confirm the line-side categories (ONT Not Ranged ${K.divergence.perCat[2].alignment.toFixed(0)}% aligned, No Sync ${noSync ? noSync.alignment.toFixed(0) : "—"}%) and not the Wi-Fi ones (${Math.round(Math.min(...wifiAlign))}% to ${Math.round(Math.max(...wifiAlign))}% aligned, most closing as no fault). That mirrors the telemetry: the in-home drivers are real but are the hardest to diagnose remotely, which is where the Wi-Fi certification and CloudCheck work earns its place. This table is the stacked chart's data.`));
  out.push(tableSec("s7-survey", `7. Why customers rated reliability fair or poor, ${svM[0]} and ${svM[2]} (share of detractors citing each)`, [col("driver", "Driver"), col(svM[0], svM[0], "%"), col(svM[2], svM[2], "%")], svDrivers.map((d) => ({ driver: d.name, [svM[0]]: d.pct[0], [svM[2]]: d.pct[2] })), `Frequent loss of connection is the top reason at ${sv.drivers[0].pct[2].toFixed(0)}% and grew ${sDec(sv.drivers[0].pct[2] - sv.drivers[0].pct[0], 1)} points over the summer, the customer's words for No Dataflow and outage-tagged tickets. Negative verbatims rose ${sDec(sv.polarity.negative[2] - sv.polarity.negative[0], 1)} points to ${sv.polarity.negative[2].toFixed(1)}%. The survey runs to ${sv.months[sv.months.length - 1]}, one month behind the operational data. This table is the bar chart's data.`));
  out.push(textSec("footer", "Sources, caveats and method", [
    `Sources: "TELUS Internet: why support tickets rose year over year" (support ticket analysis, ${Y.period} ${Y.y1} vs ${Y.y0}, all TELUS-branded internet excluding Koodo, data through ${Y.dataThrough}; internet_daily, Remedy, HSIC orders and tickets, CloudCheck and GPON telemetry); Churn Measurement 2026 workbook (KPIs, Looker ticket categories); TS Calls Offered by Product (calls); HSIA agent and technician notes analysis (${HSA.months[0]} to ${HSA.months[2]}); CF&R TELUS Internet survey (${sv.months[0]} to ${sv.months[2]}); Initiatives register.`,
    `Caveats carried from the analysis: ${Y.caveats.join(" ")}`,
    "Method notes: dashboard quarter totals sum the three months and rates are the simple average of the monthly rates per 100 subscribers; technician alignment is the share of field-visit closures whose domain matches the agent's category. Analysis figures are transcribed, not recomputed, and are refreshed when a new edition of the analysis is supplied."]));
  return out;
}

// ---- TV Review (mirrors TvBriefPage): STB No Boot › Stuck on Initializing, Aug – Oct 2026 ----
function tvReviewPage() {
  const R = TV_REVIEW, D = R.daily, L = R.looker, out = [];
  const sum = (arr) => arr.reduce((x, y) => x + (y || 0), 0);
  const num = (v, d = 0) => (v == null ? "—" : d ? v.toFixed(d) : Math.round(v).toLocaleString("en-CA"));
  const KEYS = ["aug", "sep", "oct"];
  const M = KEYS.map((k) => { const d = D[k]; return { key: k, label: d.label, days: d.days, tickets: sum(d.tickets), stuck: sum(d.stuck), all: sum(d.all), multi: sum(d.multi), one: sum(d.one) }; });
  const [A, S, O] = M;
  const perDay = (m, f) => round(m[f] / m.days, 1);
  const iAug = MONTHS.indexOf("Aug 2026"), iSep = MONTHS.indexOf("Sep 2026");
  const K = { tv: DATA.ticketVolume.TV, tr: DATA.ticketRate.TV, calls: CALLS_SPLIT.TV.offered, rv: DATA.repairVolume.TV, rr: DATA.repairRate.TV, ch: DATA.churnRate.TV, base: DATA.subBase.TV };
  const legacy = TV_PLATFORMS.find((p) => p.id === "legacy"), opus = TV_PLATFORMS.find((p) => p.id === "opus");
  const lSep = L.months.indexOf("Sep 2026"), lOct = L.months.indexOf("Oct 2026"), lAug = L.months.indexOf("Aug 2026"), lJul = L.months.indexOf("Jul 2026");
  const yr26 = L.months.map((m, i) => i).filter((i) => L.months[i].endsWith("2026"));
  const octNote = `Oct 1 – ${R.octDays}`;
  const f2 = (v) => v.toFixed(2), num10 = (v) => num(Math.round(v / 10) * 10);
  const nbS = LOOKER.TV.topCat.series, nbBase = sum(nbS.slice(12, 19)) / 7, nbOctExcess = nbS[21] - nbBase, stuckOctExcess = L.total[lOct] - L.baseline.total, nbJulVsJun = pctChange(nbS[18], nbS[17]);
  // weekly blocks (Monday to Sunday)
  const dayList = [];
  KEYS.forEach((k) => { const d = D[k]; const mon = { aug: 7, sep: 8, oct: 9 }[k]; for (let i = 0; i < d.days; i++) dayList.push({ date: new Date(Date.UTC(2026, mon, i + 1)), tickets: d.tickets[i], stuck: d.stuck[i], all: d.all[i], multi: d.multi[i], one: d.one[i] }); });
  const weeks = [];
  dayList.forEach((d) => { const dow = (d.date.getUTCDay() + 6) % 7; const start = new Date(d.date); start.setUTCDate(d.date.getUTCDate() - dow); let w = weeks.find((x) => x.start.getTime() === start.getTime()); if (!w) { w = { start, days: 0, tickets: 0, stuck: 0, all: 0, multi: 0, one: 0 }; weeks.push(w); } w.days += 1; w.tickets += d.tickets; w.stuck += d.stuck; w.all += d.all; w.multi += d.multi; w.one += d.one; });
  const iso = (dt) => dt.toISOString().slice(0, 10);
  const roll = (arr, n = 7) => arr.map((_, i) => (i < n - 1 ? null : round(sum(arr.slice(i - n + 1, i + 1)) / n, 1)));
  const rAll = roll(dayList.map((d) => d.all)), rOne = roll(dayList.map((d) => d.one)), rMulti = roll(dayList.map((d) => d.multi)), rStuck = roll(dayList.map((d) => d.stuck));
  const cujo = dayList.findIndex((d) => d.date.getUTCMonth() === 8 && d.date.getUTCDate() === 25);
  const beforeCujo = round(sum(dayList.slice(cujo - 14, cujo).map((d) => d.stuck)) / 14, 1), afterCujo = round(sum(dayList.slice(cujo, cujo + 14).map((d) => d.stuck)) / 14, 1);
  const allUpVsAug = round(pctChange(O.all / O.days, A.all / A.days), 1), oneUpVsAug = round(pctChange(O.one / O.days, A.one / A.days), 1);
  const stuckSepVsAug = round(pctChange(S.stuck, A.stuck), 1), stuckOctVsSep = round(pctChange(O.stuck / O.days, S.stuck / S.days), 1);
  const allShare = (m) => round((m.all / m.stuck) * 100, 1);
  const allVsBase = round(pctChange(L.all[lSep], L.baseline.all), 0), oneVsBase = round(pctChange(L.one[lSep], L.baseline.one), 0), totVsBase = round(pctChange(L.total[lSep], L.baseline.total), 0);
  const risePts = L.total[lSep] - L.baseline.total, riseAll = L.all[lSep] - L.baseline.all;
  const restOct = (R.stbNoBootTotal[2] - O.stuck) / O.days, restSep = (R.stbNoBootTotal[1] - S.stuck) / S.days;
  const mshare = (m, i) => round((m.v[i] / R.markersBase[i]) * 100, 1);
  const T3 = R.markers[0], SEQ = R.markers[5], DISP = R.markers[6], TECH = R.markers[7];
  const octWeeks = weeks.filter((w) => w.start.getUTCMonth() === 9 && w.days >= 5).map((w) => w.stuck / w.days);
  const card = (label, value, unit, month, note, prior) => ({ ...cardStatic(label, value, unit, month, note), ...(prior ? { prior } : {}) });
  // top
  out.push(sec("kpis", "August to October at a glance", "cards", [
    card(`Stuck on Initializing per day · ${octNote}`, perDay(O, "stuck"), "tickets per day", "Oct 2026", `Aug ${perDay(A, "stuck")} · Sep ${perDay(S, "stuck")} · ${sPct(stuckOctVsSep, 0)} vs Sep`, { aug: perDay(A, "stuck"), sep: perDay(S, "stuck") }),
    card(`All STBs Affected per day · ${octNote}`, perDay(O, "all"), "tickets per day", "Oct 2026", `Aug ${perDay(A, "all")} · Sep ${perDay(S, "all")} · ${sPct(allUpVsAug, 0)} vs Aug`, { aug: perDay(A, "all"), sep: perDay(S, "all") }),
    card(`One STB Affected per day · ${octNote}`, perDay(O, "one"), "tickets per day", "Oct 2026", `Aug ${perDay(A, "one")} · Sep ${perDay(S, "one")} · ${sPct(oneUpVsAug, 0)} vs Aug`, { aug: perDay(A, "one"), sep: perDay(S, "one") }),
    card("All STBs share of Stuck tickets · Oct", allShare(O), "%", "Oct 2026", `Aug ${allShare(A)}% · Sep ${allShare(S)}%`, { aug: allShare(A), sep: allShare(S) }),
    card("Stuck on Initializing share of TV tickets · Oct", round((O.stuck / O.tickets) * 100, 1), "%", "Oct 2026", `Aug ${round((A.stuck / A.tickets) * 100, 1)}% · Sep ${round((S.stuck / S.tickets) * 100, 1)}%`),
    card("TV ticket rate per 100 subs · Sep", K.tr[iSep], "per 100 subscribers", "Sep 2026", `Aug ${K.tr[iAug]} · ${sDec(K.tr[iSep] - K.tr[iAug])} per 100 · October not yet reported`, { aug: K.tr[iAug] })
  ], `Daily figures come from the TV agent ticket exports (Aug 1 to Oct ${R.octDays}); the dashboard's own KPIs run to ${LATEST}. Rates are per 100 subscribers.`));
  const mrow = (measure, aug, sep, oct, change, flagV, goodDown = true) => ({ measure, aug, sep, oct, change, flag: flagV == null ? null : Math.abs(flagV) < 3 ? "flat" : flagV > 0 ? "up" : "down" });
  out.push(tableSec("kpis-table", "Dashboard measures · August to October", [col("measure", "Dashboard measure"), col("aug", "Aug"), col("sep", "Sep"), col("oct", `Oct (to ${R.octDays}th)`), col("change", "Sep vs Aug"), col("flag", "Flag")], [
    mrow("TV tickets (Looker Assure)", K.tv[iAug], K.tv[iSep], null, sPct(pctChange(K.tv[iSep], K.tv[iAug])), pctChange(K.tv[iSep], K.tv[iAug])),
    mrow("TV tickets in the agent exports", A.tickets, S.tickets, O.tickets, sPct(pctChange(S.tickets, A.tickets)), pctChange(S.tickets, A.tickets)),
    mrow("Ticket rate per 100 subs", K.tr[iAug], K.tr[iSep], null, sDec(K.tr[iSep] - K.tr[iAug]), pctChange(K.tr[iSep], K.tr[iAug])),
    mrow("Calls offered", K.calls[iAug], K.calls[iSep], null, sPct(pctChange(K.calls[iSep], K.calls[iAug])), pctChange(K.calls[iSep], K.calls[iAug])),
    mrow("Repairs / dispatches", K.rv[iAug], K.rv[iSep], null, sPct(pctChange(K.rv[iSep], K.rv[iAug])), pctChange(K.rv[iSep], K.rv[iAug])),
    mrow("Repair rate per 100 subs", K.rr[iAug], K.rr[iSep], null, sDec(K.rr[iSep] - K.rr[iAug]), pctChange(K.rr[iSep], K.rr[iAug])),
    mrow("Churn rate per 100 subs", K.ch[iAug], K.ch[iSep], null, sDec(K.ch[iSep] - K.ch[iAug]), pctChange(K.ch[iSep], K.ch[iAug])),
    mrow("Optik TV Legacy tickets (Looker)", legacy.tickets[iAug], legacy.tickets[iSep], null, sPct(pctChange(legacy.tickets[iSep], legacy.tickets[iAug])), pctChange(legacy.tickets[iSep], legacy.tickets[iAug])),
    mrow("Optik TV Legacy ticket rate per 100 subs", legacy.ticketRate[iAug], legacy.ticketRate[iSep], null, sDec(legacy.ticketRate[iSep] - legacy.ticketRate[iAug]), pctChange(legacy.ticketRate[iSep], legacy.ticketRate[iAug])),
    mrow("TV Evolution tickets (Looker)", opus.tickets[iAug], opus.tickets[iSep], null, sPct(pctChange(opus.tickets[iSep], opus.tickets[iAug])), pctChange(opus.tickets[iSep], opus.tickets[iAug])),
    mrow("Stuck on Initializing (Looker, Legacy)", L.total[lAug], L.total[lSep], L.total[lOct], sPct(pctChange(L.total[lSep], L.total[lAug])), pctChange(L.total[lSep], L.total[lAug])),
    mrow("Stuck on Initializing (agent exports)", A.stuck, S.stuck, O.stuck, sPct(stuckSepVsAug), stuckSepVsAug)
  ], `October dashboard KPIs (ticket rate, calls, repairs, churn) arrive with the November scorecard; the Looker Stuck count for October is the full month while the agent export ends on 30 Oct, which is most of the gap between the two October counts.`));
  out.push(textSec("header", `TV · ${R.period} · STB No Boot › Stuck on Initializing: what happened in September, is October the same, and what is being done`, [
    `Stuck on Initializing jumped ${sPct(stuckSepVsAug, 0)} in September and has held there through October. The whole rise is households where every STB is stuck, which points at the gateway, not the box.`,
    `TV performance for August to October 2026 (agent exports to Oct ${R.octDays}), the Stuck on Initializing trend against its 2025 and Jan to Jul 2026 baselines with the All STBs Affected / One STB Affected split, the root-cause hypotheses as the STB No Boot interlocks left them, the first device-level test of the leading one, and the fixes in flight.`,
    `Reliability Strategy · Agent exports to ${R.asOf} · Looker to Oct 2026 (full month) · Dashboard KPIs to ${LATEST} · Interlocks 21, 22, 27 and 28 Oct 2026 · Side-load cohorts 2 Nov 2026`]));
  out.push(listSec("in-short", "In short", [
    { title: "September was a step change, and October is the new level, not a further climb.", body: `Stuck on Initializing went from ${num(A.stuck)} tickets in August to ${num(S.stuck)} in September (${sPct(stuckSepVsAug, 0)}); October is running at ${num(O.stuck / O.days)} a day against ${num(S.stuck / S.days)} in September (${sPct(stuckOctVsSep, 0)}); ${num(O.stuck)} tickets in the 30 days exported against ${num(L.total[lOct])} in Looker for the full month. Every October week sits between ${num(Math.min(...octWeeks))} and ${num(Math.max(...octWeeks))} a day.` },
    { title: "The rise is almost entirely All STBs Affected.", body: `In Looker, All STBs Affected ran at ${num(L.baseline.all)} a month from January to July, ${num(L.all[lAug])} in August and ${num(L.all[lSep])} in September (${sPct(allVsBase, 0)} on the baseline); One STB Affected moved from ${num(L.baseline.one)} to ${num(L.one[lSep])} (${sPct(oneVsBase, 0)}). Of the ${sNum(risePts)} September tickets above baseline, ${sNum(riseAll)} (${Math.round((riseAll / risePts) * 100)}%) are All STBs Affected. The agent exports agree: All STBs Affected is ${sPct(allUpVsAug, 0)} per day on August in October, One STB Affected ${sPct(oneUpVsAug, 0)}.` },
    { title: "Every box in the home failing at once is a gateway symptom.", body: `${mshare(T3, 1)}% of October Stuck tickets name the T3200M gateway and it is ${R.t3200ShareOfGatewayNamed[1]}% of the gateways named; the interlock data puts about 70% of affected customers on the T3200M. There is no correlation to STB model, number of STBs, or fibre versus copper, and repeat callers are not the driver: repeats are up in step but stay about ${Math.round(SLS.repNB[1])}% of affected devices.` },
    { title: "Leading hypothesis: the CloudCheck agent side-load upgrade (v2.5 to 3.418, 6 Jul to 16 Aug) on T3200M gateways, aggravated by long gateway uptime.", body: `Onset lags two to four weeks, ticketed gateways skew to no reboot in more than 30 days, and the fault clears with a gateway-then-STB reboot. Rolling the agent back was rejected on security grounds. Cujo being disabled on 25 September did not move the series (${beforeCujo} a day in the fortnight before, ${afterCujo} after).` },
    { title: "The first device-level test points the same way.", body: `Across ${SLS.n} side-load dates with more than 10,000 devices each (${num(SLS.devices)} devices), the share of devices with a No Boot ticket rose from ${f2(SLS.anyNB[0])}% to ${f2(SLS.anyNB[1])}% after the side-load and with a Valid IP ticket from ${f2(SLS.anyVIP[0])}% to ${f2(SLS.anyVIP[1])}%, in every cohort and over windows of about ${Math.round(SLS.postDays)} to ${Math.round(SLS.preDays)} days either side. It is a before and after cut with no control group and no All STBs / One STB split, so it supports the hypothesis without yet proving the mechanism.` },
    { title: "The fixes have not reached customers yet.", body: "The Sequential Reboot campaign (In flight, Nov 2026) is the only initiative aimed at the mechanism and its pilot cohort was agreed on 22 October; the InSight TV Hardware Check fix (Launched, Oct 2026) improves diagnosis; the agent release delta and gateway-marker analysis are due the week of 2 November. The full October month landed flat on September in Looker (5,205 tickets against 5,236)." },
    { title: "Wider TV performance moved with it.", body: `TV tickets rose ${sPct(pctChange(K.tv[iSep], K.tv[iAug]), 0)} and the ticket rate ${sDec(K.tr[iSep] - K.tr[iAug])} per 100 subscribers from August to September; Optik TV Legacy tickets rose ${sPct(pctChange(legacy.tickets[iSep], legacy.tickets[iAug]), 0)} on a base that shrank ${Math.abs(pctChange(legacy.base[iSep], legacy.base[iAug])).toFixed(1)}%. The rest of STB No Boot is down ${Math.abs(pctChange(restOct, restSep)).toFixed(0)}% per day in October on September, so the elevated plateau is now this one symptom.` }
  ]));
  // 1
  out.push(sec("s1-stats", "1. TV performance, August to October", "cards", [
    card("TV tickets · Sep", K.tv[iSep], "count", "Sep 2026", `${num(K.tv[iAug])} in Aug · ${sPct(pctChange(K.tv[iSep], K.tv[iAug]))}`, { aug: K.tv[iAug] }),
    card("Ticket rate per 100 subs · Sep", K.tr[iSep], "per 100 subscribers", "Sep 2026", `${K.tr[iAug]} in Aug · ${sDec(K.tr[iSep] - K.tr[iAug])}`, { aug: K.tr[iAug] }),
    card("Calls offered · Sep", K.calls[iSep], "count", "Sep 2026", `${num(K.calls[iAug])} in Aug · ${sPct(pctChange(K.calls[iSep], K.calls[iAug]))}`, { aug: K.calls[iAug] }),
    card("Repair rate per 100 subs · Sep", K.rr[iSep], "per 100 subscribers", "Sep 2026", `${K.rr[iAug]} in Aug · ${sDec(K.rr[iSep] - K.rr[iAug])}`, { aug: K.rr[iAug] }),
    card("Churn rate per 100 subs · Sep", K.ch[iSep], "per 100 subscribers", "Sep 2026", `${K.ch[iAug]} in Aug · ${sDec(K.ch[iSep] - K.ch[iAug])}`, { aug: K.ch[iAug] }),
    card("Optik TV Legacy base · Sep", legacy.base[iSep], "count", "Sep 2026", `${num(legacy.base[iAug])} in Aug · ${sPct(pctChange(legacy.base[iSep], legacy.base[iAug]))}`, { aug: legacy.base[iAug] })
  ]));
  out.push(textSec("s1-prose", "1. How the quarter read", [
    `September is the seasonal peak for TV and 2026 followed the pattern, but harder: tickets rose ${sPct(pctChange(K.tv[iSep], K.tv[iAug]), 0)} on August against ${sPct(pctChange(K.tv[iSep - 12], K.tv[iAug - 12]), 0)} over the same two months of 2025, and the ticket rate reached ${K.tr[iSep]} per 100 subscribers. STB No Boot is the largest TV category and added ${sNum(TVA.tickets.agentCat[0].v[2] - TVA.tickets.agentCat[0].v[1])} tickets in September; Stuck on Initializing alone added ${sNum(S.stuck - A.stuck)}, about ${Math.round(((S.stuck - A.stuck) / (S.tickets - A.tickets)) * 100)}% of the whole TV increase in the agent exports. Repairs and churn did not follow: the repair rate stayed at ${K.rr[iSep]} and churn at ${K.ch[iSep]} per 100, because the fault is cleared by a reboot rather than a truck or a swap.`,
    `October in the agent exports is ${num(O.tickets / O.days)} TV tickets a day against ${num(S.tickets / S.days)} in September, so total TV demand eased about ${Math.abs(pctChange(O.tickets / O.days, S.tickets / S.days)).toFixed(0)}% and Stuck on Initializing ${sPct(stuckOctVsSep, 0)}: the category is holding at its September level rather than climbing further. Video freezing and pixelization are the October risers; Digital Box No Boot, Reboot Loop and remote programming are down.`]));
  // 2
  out.push(sec("s2-stats", "2. Stuck on Initializing against its baseline", "cards", [
    card("2025 monthly average", L.baseline2025.total, "tickets per month", null, `All STBs ${num(L.baseline2025.all)} · One STB ${num(L.baseline2025.one)}`),
    card(L.baselineLabel, L.baseline.total, "tickets per month", null, `All STBs ${num(L.baseline.all)} · One STB ${num(L.baseline.one)}`),
    card("September 2026", L.total[lSep], "tickets", "Sep 2026", `${sPct(totVsBase, 0)} on the Jan – Jul average · ${sPct(pctChange(L.total[lSep], L.total[lSep - 12]), 0)} YoY`),
    card("October (Looker, full month)", L.total[lOct], "tickets", "Oct 2026", `${sPct(pctChange(L.total[lOct], L.total[lSep]), 1)} vs Sep · All STBs ${num(L.all[lOct])} · One STB ${num(L.one[lOct])}`)
  ]));
  out.push(sec("s2-history", "2. Optik TV Legacy › STB No Boot › Stuck on Initializing by Category 3, monthly, Jan 2025 to Oct 2026", "series", { months: L.months, series: { one: { label: "One STB Affected", unit: "count", values: L.one }, multi: { label: "Multiple STBs Affected", unit: "count", values: L.multi }, all: { label: "All STBs Affected", unit: "count", values: L.all }, total: { label: "Total", unit: "count", values: L.total } } },
    `Through 2025 and the first seven months of 2026 the category drifted down with the Legacy base (One STB Affected fell from about ${num(L.one[0])} to ${num(L.one[lJul])} a month) while All STBs Affected held near ${num(L.baseline.all)}. From August All STBs Affected broke out: ${num(L.all[lJul])} in July, ${num(L.all[lAug])} in August, ${num(L.all[lSep])} in September and ${num(L.all[lOct])} in October. One STB Affected rose with the season and is back near its baseline in October.`));
  out.push(tableSec("s2-table", "2. Stuck on Initializing by Category 3, 2026 by month", [col("category", "Category 3"), ...yr26.map((i) => col(L.months[i].slice(0, 3), L.months[i].slice(0, 3), "count"))],
    [["All STBs Affected", L.all], ["Multiple STBs Affected", L.multi], ["One STB Affected", L.one], ["Total", L.total]].map(([category, arr]) => { const r = { category }; yr26.forEach((i) => { r[L.months[i].slice(0, 3)] = arr[i]; }); return r; })
      .concat([(() => { const r = { category: "All STBs share (%)" }; yr26.forEach((i) => { r[L.months[i].slice(0, 3)] = round((L.all[i] / L.total[i]) * 100, 0); }); return r; })()]),
    `${L.source}`));
  // 3
  out.push(sec("s3-stats", "3. Day by day: the rise is All STBs Affected, and October has plateaued", "cards", [
    card("All STBs Affected per day · Oct", perDay(O, "all"), "tickets per day", "Oct 2026", `Aug ${perDay(A, "all")} · Sep ${perDay(S, "all")} · ${sPct(allUpVsAug, 0)} October on August`, { aug: perDay(A, "all"), sep: perDay(S, "all") }),
    card("One STB Affected per day · Oct", perDay(O, "one"), "tickets per day", "Oct 2026", `Aug ${perDay(A, "one")} · Sep ${perDay(S, "one")} · ${sPct(oneUpVsAug, 0)} October on August`, { aug: perDay(A, "one"), sep: perDay(S, "one") }),
    card("Multiple STBs Affected per day · Oct", perDay(O, "multi"), "tickets per day", "Oct 2026", `Aug ${perDay(A, "multi")} · Sep ${perDay(S, "multi")} · ${sPct(pctChange(O.multi / O.days, A.multi / A.days), 0)} October on August`, { aug: perDay(A, "multi"), sep: perDay(S, "multi") }),
    card("Stuck per day, 14 days after Cujo was disabled (25 Sep)", afterCujo, "tickets per day", null, `${beforeCujo} a day in the 14 days before · no step change either way`, { before: beforeCujo })
  ]));
  out.push(tableSec("s3-daily", `3. Stuck on Initializing tickets per day by Category 3, Aug 1 to Oct ${R.octDays} 2026`, [col("date", "Date"), col("tickets", "TV tickets", "count"), col("stuck", "Stuck on Initializing", "count"), col("all", "All STBs Affected", "count"), col("multi", "Multiple STBs Affected", "count"), col("one", "One STB Affected", "count"), col("stuck7", "Stuck, 7-day average", "count"), col("all7", "All STBs, 7-day average", "count"), col("multi7", "Multiple STBs, 7-day average", "count"), col("one7", "One STB, 7-day average", "count")],
    dayList.map((d, i) => ({ date: iso(d.date), tickets: d.tickets, stuck: d.stuck, all: d.all, multi: d.multi, one: d.one, stuck7: rStuck[i], all7: rAll[i], multi7: rMulti[i], one7: rOne[i] })),
    `All STBs Affected climbed through August, reached its September level in the second week of September and has stayed there since; One STB Affected moved far less and is seasonal. The August climb starts about three weeks after the CloudCheck agent rollout began on 6 July and runs through the rollout's end on 16 August. The Jan – Jul 2026 baseline for All STBs Affected is about ${Math.round(L.baseline.all / 30.4)} a day.`));
  out.push(tableSec("s3-weekly", "3. Stuck on Initializing by week (Monday to Sunday)", [col("weekStart", "Week starting"), col("days", "Days in the data", "count"), col("stuckPerDay", "Stuck per day", "count"), col("allPerDay", "All STBs per day", "count"), col("onePerDay", "One STB per day", "count"), col("allShare", "All STBs share", "%")],
    weeks.map((w) => ({ weekStart: iso(w.start), days: w.days, stuckPerDay: round(w.stuck / w.days, 1), allPerDay: round(w.all / w.days, 1), onePerDay: round(w.one / w.days, 1), allShare: round((w.all / w.stuck) * 100, 0) })), "Partial weeks at the start of August and the end of October carry their day count."));
  out.push(tableSec("s3-share", "3. Share of Stuck on Initializing tickets by Category 3", [col("month", "Month"), col("all", "All STBs Affected", "%"), col("multi", "Multiple STBs Affected", "%"), col("one", "One STB Affected", "%")],
    M.map((m) => ({ month: m.key === "oct" ? `${m.label} (to ${R.octDays}th)` : m.label, all: allShare(m), multi: round((m.multi / m.stuck) * 100, 1), one: round((m.one / m.stuck) * 100, 1) })),
    `All STBs Affected was ${allShare(A).toFixed(0)}% of Stuck tickets in August and ${allShare(O).toFixed(0)}% in October. A single box failing to initialise is usually that box; every box failing at once is the gateway or the middleware session behind it.`));
  // 4
  out.push(tableSec("s4-subcats", `4. STB No Boot sub-categories, tickets per day · Aug, Sep, Oct (to ${R.octDays}th)`, [col("name", "Sub-category"), col("augPerDay", "Aug per day", "count"), col("sepPerDay", "Sep per day", "count"), col("octPerDay", "Oct per day", "count"), col("aug", "Aug", "count"), col("sep", "Sep", "count"), col("oct", `Oct (to ${R.octDays}th)`, "count")],
    R.stbNoBoot.map((r) => ({ name: r.name, augPerDay: round(r.v[0] / A.days, 1), sepPerDay: round(r.v[1] / S.days, 1), octPerDay: round(r.v[2] / O.days, 1), aug: r.v[0], sep: r.v[1], oct: r.v[2] })),
    `STB No Boot in total: ${num(R.stbNoBootTotal[0] / A.days)}, ${num(R.stbNoBootTotal[1] / S.days)} and ${num(R.stbNoBootTotal[2] / O.days)} tickets a day. Stuck on Initializing and Red X are the only sub-categories more than 10% above their August run rate; the other boot symptoms are back within a few percent of August and below their September peak, so the category's plateau is one symptom. Stuck on Initializing is ${Math.round((O.stuck / R.stbNoBootTotal[2]) * 100)}% of the category in October against ${Math.round((A.stuck / R.stbNoBootTotal[0]) * 100)}% in August.`));
  out.push(tableSec("s4-markers", "4. Markers in the Stuck on Initializing ticket notes, Sep and Oct", [col("name", "Marker"), col("sep", "Sep tickets", "count"), col("sepShare", "Sep share", "%"), col("oct", `Oct tickets (to ${R.octDays}th)`, "count"), col("octShare", "Oct share", "%")],
    R.markers.map((m) => ({ name: m.name, sep: m.v[0], sepShare: mshare(m, 0), oct: m.v[1], octShare: mshare(m, 1) })),
    `The profile of a Stuck ticket did not change between September and October: the T3200M is named in ${mshare(T3, 0)}% then ${mshare(T3, 1)}% of tickets and is ${R.t3200ShareOfGatewayNamed[0]}% then ${R.t3200ShareOfGatewayNamed[1]}% of the gateways named. A sequential reboot is recorded in ${mshare(SEQ, 0)}% then ${mshare(SEQ, 1)}%, a dispatch in ${mshare(DISP, 0)}% then ${mshare(DISP, 1)}%, and a technician determination in ${mshare(TECH, 0)}% then ${mshare(TECH, 1)}%. The fix is still an agent-led reboot in the great majority of cases. Written agent comments cover ${Math.round((R.commentCoverage.oct[0] / R.commentCoverage.oct[1]) * 100)}% of October tickets.`));
  // 5
  const STATUS_LABEL = { leading: "Leading hypothesis", contributing: "Contributing factor", open: "Open question", "ruled out": "Ruled out" };
  out.push(listSec("s5-causes", "5. Possible root causes", R.causes.map((c) => ({ title: `${c.name} · ${STATUS_LABEL[c.status]}`, body: c.evidence + (c.next && c.next !== "None." ? ` Next: ${c.next}` : ""), meta: { status: c.status, statusLabel: STATUS_LABEL[c.status], next: c.next } })),
    "As the STB No Boot interlocks left them on 28 October. The working picture: a change on the T3200M gateway in July and August made gateways with long uptime lose the middleware session for every attached Mediaroom STB, and it clears when the gateway is rebooted before the boxes."));
  // 5b. side-load cohorts
  const sl = SLS;
  out.push(textSec("s5-sideload-intro", "5. First device-level test of the leading hypothesis", [
    `Chris Tanner compared the same devices before and after their own side-load date for the ${sl.n} deployment dates with more than 10,000 devices (${num(sl.devices)} devices: 11 and 12 May, then 15 July to 11 August), measuring the share of devices with a No Boot ticket and with a Valid IP ticket in each window. The windows are close to the same length (about ${Math.round(sl.preDays)} days before and ${Math.round(sl.postDays)} after, with the post window the shorter one in ${sl.postNotLonger} of ${sl.n} cohorts), so the shares are comparable and, if anything, understate the rise.`]));
  out.push(sec("s5-sideload-stats", "5. Side-load cohorts: devices with a ticket, before and after", "cards", [
    card("Devices with a No Boot ticket", round(sl.anyNB[1], 2), "% of devices", "after the side-load", `${f2(sl.anyNB[0])}% before · ${sPct(sl.upAnyNB, 0)} · one ticket ${f2(sl.m.oneNB[0])}% to ${f2(sl.m.oneNB[1])}%`, { before: round(sl.anyNB[0], 2) }),
    card("Devices with a Valid IP ticket", round(sl.anyVIP[1], 2), "% of devices", "after the side-load", `${f2(sl.anyVIP[0])}% before · ${sPct(sl.upAnyVIP, 0)} · one ticket ${f2(sl.m.oneVIP[0])}% to ${f2(sl.m.oneVIP[1])}%`, { before: round(sl.anyVIP[0], 2) }),
    card("Devices with two or more No Boot tickets", round(sl.m.twoNB[1], 2), "% of devices", "after the side-load", `${f2(sl.m.twoNB[0])}% before · ${sPct(sl.upTwoNB, 0)} · ${Math.round(sl.repNB[1])}% of affected devices (${Math.round(sl.repNB[0])}% before)`, { before: round(sl.m.twoNB[0], 2) }),
    card("Cohort and measure pairs worse after", sl.worse, "count", null, `of ${sl.pairs}: all ${sl.n} cohorts on all four measures`),
    card("More devices a month with a No Boot ticket", Math.round(sl.extra.nb / 10) * 10, "devices per month", null, `these ${sl.n} cohorts only · Looker Stuck on Initializing ${sNum(stuckOctExcess)} on its baseline in October`),
    card("More devices a month with a Valid IP ticket", Math.round(sl.extra.vip / 10) * 10, "devices per month", null, "same cohorts · not in the Stuck on Initializing count")
  ]));
  const slCols = (a, b) => [col("date", "Side-load date"), col("devices", "Devices", "count"), col("preDays", "Days before", "count"), col("postDays", "Days after", "count"), col(a + "Before", "One ticket, before", "%"), col(a + "After", "One ticket, after", "%"), col(a + "Change", "One ticket, change", "%"), col(b + "Before", "Two or more, before", "%"), col(b + "After", "Two or more, after", "%")];
  const slRows = (a, b, ka, kb) => sl.rows.map((r) => ({ date: iso(new Date(r.date + "T00:00:00Z")), devices: r.devices, preDays: r.preDays, postDays: r.postDays, [a + "Before"]: r[ka][0], [a + "After"]: r[ka][1], [a + "Change"]: r.up[ka] == null ? null : round(r.up[ka], 0), [b + "Before"]: r[kb][0], [b + "After"]: r[kb][1] }));
  out.push(tableSec("s5-sideload-nb", "5. No Boot by side-load date, % of devices in the window", slCols("one", "two"), slRows("one", "two", "oneNB", "twoNB"),
    `Every cohort is up, by ${sPct(sl.upMin, 0)} to ${sPct(sl.upMax, 0)} on one ticket. One ticket means exactly one ticket in the window and two or more means repeats, read as separate groups. Weighted by devices: one ticket ${f2(sl.m.oneNB[0])}% to ${f2(sl.m.oneNB[1])}%, two or more ${f2(sl.m.twoNB[0])}% to ${f2(sl.m.twoNB[1])}%.`));
  out.push(tableSec("s5-sideload-vip", "5. Valid IP by side-load date, % of devices in the window", slCols("one", "two"), slRows("one", "two", "oneVIP", "twoVIP"),
    `Valid IP tickets rise ${sPct(sl.upOneVIP, 0)} on one ticket per device, a bigger relative move than No Boot, in every cohort. The source rounds to two decimals, so the two-or-more figures (${f2(sl.twoVIPRange[0])}% to ${f2(sl.twoVIPRange[1])}%) are only indicative.`));
  out.push(listSec("s5-sideload-adds", "5. What the side-load cohorts add", [
    { title: "It moves the leading hypothesis from timing to devices.", body: `The case so far rested on the rollout dates and the gateway model. Here the same devices are compared with themselves, and all ${sl.pairs} cohort and measure pairs worsened after the side-load.` },
    { title: "The effect follows each device's own side-load date, not the calendar.", body: `The two May cohorts (${num(sl.may.devices)} devices) closed their post window in early August, when Looker STB No Boot tickets had moved only ${sPct(nbJulVsJun, 0)} from June to July, and still rose ${sPct(sl.may.upOneNB, 0)} on one-ticket No Boot, against ${sPct(sl.julAug.upOneNB, 0)} for the July and August cohorts. A fleet-wide or seasonal change starting in August cannot do that.` },
    { title: "It ties the Valid IP rise to the same event.", body: `One-ticket Valid IP went from ${f2(sl.m.oneVIP[0])}% to ${f2(sl.m.oneVIP[1])}% of devices, about ${num10(sl.extra.vip)} more devices a month across these cohorts alone. That is the first direct evidence that the miscategorised internet tickets belong to the same event, and they are not in the Stuck on Initializing count.` },
    { title: "It is big enough to account for the rise.", body: `About ${num10(sl.extra.nb)} more devices a month with a No Boot ticket from these cohorts alone, against ${sNum(nbOctExcess)} STB No Boot tickets a month in Looker over its January to July average in October (${sNum(stuckOctExcess)} for Stuck on Initializing alone). Smaller deployment dates are not in the file.` },
    { title: "Repeats rose in step but are not the driver.", body: `Devices with two or more No Boot tickets went from ${f2(sl.m.twoNB[0])}% to ${f2(sl.m.twoNB[1])}%, about ${Math.round(sl.repNB[0])}% of affected devices before and ${Math.round(sl.repNB[1])}% after, and ${Math.round(sl.repAddedNB)}% of the devices added.` }]));
  out.push(listSec("s5-sideload-open", "5. What the side-load cohorts do not settle", [
    { title: "No control group.", body: "The after figures include anything that changed for every device between August and October. The staggered dates allow a cleaner test: side-loaded devices against not-yet-side-loaded devices on the same calendar days." },
    { title: "No time profile.", body: `Windows of about ${Math.round(sl.postDays)} to ${Math.round(sl.preDays)} days cannot show whether the rise starts straight after the side-load or builds over two to four weeks, as the uptime hypothesis predicts. A weekly days-since-side-load curve would separate the two.` },
    { title: "No sub-category, All STBs / One STB split or gateway uptime.", body: "The cut cannot show that the extra tickets are Stuck on Initializing and All STBs Affected, or that they sit on long-uptime gateways, which is what would tie it to the mechanism." },
    { title: "May.", body: "The 11 and 12 May cohorts sit outside the 6 July to 16 August rollout window in the interlock notes. What was deployed on those dates, and whether it was the same agent, needs confirming." }]));
  // 6
  out.push(textSec("s6-intro", "6. What is being done", ["Register initiatives with live status, then the commitments from the October interlocks. The Sequential Reboot campaign is the only item aimed at the mechanism itself; the others improve diagnosis or confirm the cause. Only the diagnosis fix has launched and nothing aimed at the mechanism has reached customers yet, so the October full-month figure should be read as the pre-fix baseline."]));
  const inits = INITIATIVES.filter((it) => it.p === "TV" && R.actions.some((a) => a.kind === "initiative" && a.name === it.name));
  out.push(listSec("s6-initiatives", "6. Initiatives in the register", inits.map((it) => { const a = R.actions.find((x) => x.name === it.name); return { title: it.name, body: `${it.status} · ${it.timeline} · ${it.prime}. ${a ? a.detail : it.desc}`, meta: { status: it.status, timeline: it.timeline, prime: it.prime, theme: it.theme, pillar: it.pillar } }; })));
  out.push(tableSec("s6-actions", "6. Interlock commitments", [col("action", "Commitment"), col("owner", "Owner"), col("due", "Due"), col("status", "Status"), col("detail", "Detail")], R.actions.filter((a) => a.kind === "action").map((a) => ({ action: a.name, owner: a.owner, due: a.when, status: a.status, detail: a.detail }))));
  out.push(listSec("s6-gaps", "6. Gaps", [
    { title: "No customer-facing fix is live. The reboot pilot has a cohort but no start date, and the campaign excludes mixed OPUS and SHS homes, so part of the base stays uncovered." },
    { title: `About ${Math.round(((R.markersBase[1] - DISP.v[1]) / R.markersBase[1]) * 100)}% of Stuck tickets close without a dispatch, mostly on an agent-led reboot, so the same gateways will fault again until the uptime driver is addressed proactively.` },
    { title: `Miscategorised internet tickets (HS Valid IP, No Dataflow on Mediaroom homes) are not yet counted in the impact or the campaign measurement; the side-load cohorts alone show about ${num10(sl.extra.vip)} extra devices a month with a Valid IP ticket.` }]));
  out.push(listSec("s6-working", "6. Working", [
    { title: `The rise has stopped: October is ${sPct(stuckOctVsSep, 0)} per day on September, and the All STBs Affected weekly run rate has been flat since mid-September.` },
    { title: `The agent-led gateway-then-STB reboot clears the fault, so repairs and swaps have not followed tickets: the TV repair rate is ${K.rr[iSep]} per 100 and STB replacements are flat.` },
    { title: "The cause has been narrowed to one gateway model and one change window, with the first device-level test supporting it and the gateway-marker analysis due the week of 2 November." }]));
  out.push(textSec("footer", "Sources, caveats and method", [
    `Sources: TV agent ticket exports, Aug 1 to Oct ${R.octDays} 2026 (Category 1 to 3, agent notes and resolution text; counts per day, no customer data retained); Churn Measurement 2026 workbook (Reliability/Deact KPIs; TV Looker Ticket Categories, Look 2154, Optik TV (Legacy) › STB No Boot › Stuck on Initializing by Category 3, Jan 2025 to Oct 2026); TS Calls Offered by Product; TV Customer Base Breakdown (platform base); STB No Boot interlock notes of 21, 22, 27 and 28 Oct 2026; Sideload Pre/Post Dashboard (Chris Tanner, 2 Nov 2026; aggregates by deployment date, no customer data); Initiatives register.`,
    `Method notes: per-day figures divide month totals by days in the month (October by ${R.octDays}); the 7-day averages are trailing; weeks run Monday to Sunday and partial weeks are shown with their day count. Baselines are simple monthly averages of the Looker series (2025, and January to July 2026). Note markers are regular-expression matches over the agent notes and resolution text of Stuck on Initializing tickets with the same patterns in both months; they count tickets that mention a thing, not confirmed causes. Side-load cohorts: the deployment dates with more than 10,000 devices from the Sideload Pre/Post Dashboard, each device compared over the days before and after its own side-load date (84 to 87 days before, 73 to 85 after); one ticket means exactly one ticket in the window and two or more means repeats, read as separate groups as the source adds them; weights are device counts. The cut is by ticket group, with no control group. Interlock content is transcribed from the meeting notes and will be refreshed as the analyses land.`]));
  return out;
}

// ---- TV October Review (mirrors TvOctReviewPage): what drove the rise in TV video tickets in October ----
function tvOctReviewPage() {
  const R = OCT_REVIEW, out = [];
  const sum = (arr) => arr.reduce((x, y) => x + (y || 0), 0);
  const iSep = MONTHS.indexOf("Sep 2026"), iOct = MONTHS.indexOf("Oct 2026");
  const legacy = TV_PLATFORMS.find((p) => p.id === "legacy"), opus = TV_PLATFORMS.find((p) => p.id === "opus");
  const stSep = sum(R.stutter.sep), stOct = sum(R.stutter.oct), O = R.outage;
  const excess = (O.peak - O.normal) + (O.next - O.normal);
  const share = (rows) => rows.map(([name, sep, oct]) => ({ name, sep, oct, change: `${oct - sep >= 0 ? "+" : "−"}${Math.abs(oct - sep)} pts` }));
  const shareCols = (first) => [col("name", first), col("sep", "Sep", "%"), col("oct", "Oct", "%"), col("change", "Change")];
  const moveRows = (rows) => rows.map(([name, sep, oct]) => ({ name, sep, oct, change: oct - sep, changePct: round(pctChange(oct, sep), 1) }));
  const moveCols = (first) => [col(first === "x" ? "name" : "name", first), col("sep", "Sep", "count"), col("oct", "Oct", "count"), col("change", "Change", "count"), col("changePct", "Change %", "%")];
  const callsOff = CALLS_SPLIT.TV.offered, callsAns = CALLS_SPLIT.TV.answered, tk = DATA.ticketVolume.TV, tr = DATA.ticketRate.TV, rv = DATA.repairVolume.TV, rr = DATA.repairRate.TV, ch = DATA.churnRate.TV, bs = DATA.subBase.TV;
  const iY = iOct - 12;
  const platRepSep = legacy.repairs[iSep] + opus.repairs[iSep], platRepOct = legacy.repairs[iOct] + opus.repairs[iOct];
  out.push(textSec("short", "In short", [
    `Demand rose a little, cost to serve rose more. Tickets ${fmtNum(tk[iOct])} (${sPct(pctChange(tk[iOct], tk[iSep]))}, ${sPct(pctChange(tk[iOct], tk[iY]))} on Oct 2025), calls offered ${fmtNum(callsOff[iOct])} (${sPct(pctChange(callsOff[iOct], callsOff[iSep]))}, ${sPct(pctChange(callsOff[iOct], callsOff[iY]))} on Oct 2025), dispatches ${fmtNum(rv[iOct])} (${sPct(pctChange(rv[iOct], rv[iSep]))}, partly a source difference). Churn ${ch[iOct]} per 100 (${sDec(ch[iOct] - ch[iSep])}); base ${sNum(bs[iOct] - bs[iSep])}.`,
    `Mediaroom is the upside: Optik TV Legacy tickets ${sNum(legacy.tickets[iOct] - legacy.tickets[iSep])} (${sPct(pctChange(legacy.tickets[iOct], legacy.tickets[iSep]))}), rate ${legacy.ticketRate[iSep]} to ${legacy.ticketRate[iOct]} per 100, on a base that shrank ${fmtNum(legacy.base[iSep] - legacy.base[iOct])}.`,
    `OPUS is the downside, which is good news: TV Evolution tickets ${sNum(opus.tickets[iOct] - opus.tickets[iSep])} (${sPct(pctChange(opus.tickets[iOct], opus.tickets[iSep]))}), rate ${opus.ticketRate[iSep]} to ${opus.ticketRate[iOct]} per 100, base +${fmtNum(opus.base[iOct] - opus.base[iSep])}. Against Oct 2025 OPUS tickets are ${sPct(pctChange(opus.tickets[iOct], opus.tickets[iY]), 0)} and Legacy ${sPct(pctChange(legacy.tickets[iOct], legacy.tickets[iY]), 0)}.`,
    `Video quality is what moved Mediaroom: Video Issues ${sNum(R.categories[0][2] - R.categories[0][1])}; stuttering ${sNum(R.movers[0][2] - R.movers[0][1])} and pixelization ${sNum(R.movers[2][2] - R.movers[2][1])}, mostly on Mediaroom boxes. One ${O.area} outage on ${O.day} October explains about a fifth (stuttering tickets ${O.peak} that day against about ${O.normal}, roughly ${excess} extra; ${O.citing} and ${O.citingNext} tickets name it); the rest is a higher everyday level (${Math.round(stOct / 30)} a day against ${Math.round(stSep / 30)}).`,
    `STB No Boot eased: ${fmtNum(R.categories[3][1])} to ${fmtNum(R.categories[3][2])} (${sPct(pctChange(R.categories[3][2], R.categories[3][1]))}); Stuck on Initializing held at ${fmtNum(R.movers[5][2])} against ${fmtNum(R.movers[5][1])}.`,
    `Missing Channels ${sNum(R.movers[1][2] - R.movers[1][1])} is a provisioning problem: about ${R.missing.causes[0][2]}% of tickets with a stated cause cite middleware or subscription sync; the fix is a sync or a Tier 2 provisioning escalation.`
  ]));
  const kcol = [col("measure", "Measure"), col("sep", "Sep 2026"), col("oct", "Oct 2026"), col("change", "Change"), col("yoy", "Oct 2025"), col("vsYoy", "vs Oct 2025")];
  const krow = (measure, ser, kind, fmt = (v) => (v == null ? null : Math.round(v * 100) / 100)) => ({ measure, sep: fmt(ser[iSep]), oct: fmt(ser[iOct]), change: kind === "n" ? sPct(pctChange(ser[iOct], ser[iSep])) : sDec(ser[iOct] - ser[iSep]), yoy: fmt(ser[iY]), vsYoy: kind === "n" ? sPct(pctChange(ser[iOct], ser[iY])) : sDec(ser[iOct] - ser[iY]) });
  out.push(tableSec("tv-whole", "TV as a whole: calls, tickets, dispatches, churn", kcol, [
    krow("Calls offered", callsOff, "n", Math.round), krow("Calls answered", callsAns, "n", Math.round),
    krow("Answer rate (%)", callsAns.map((v, i) => (callsOff[i] ? (v / callsOff[i]) * 100 : null)), "r"), krow("Calls offered per 100 subs", callsOff.map((v, i) => (v / bs[i]) * 100), "r"),
    krow("Tickets", tk, "n", Math.round), krow("Ticket rate per 100 subs", tr, "r"), krow("Repairs / dispatches", rv, "n", Math.round), krow("Repair rate per 100 subs", rr, "r"),
    krow("Churn rate per 100 subs", ch, "r"), krow("Subscriber base", bs, "n", Math.round)
  ], `Calls are not split by platform in the source. The KPI tab shows dispatches ${fmtNum(rv[iSep])} to ${fmtNum(rv[iOct])}, but the platform source gives ${fmtNum(platRepSep)} to ${fmtNum(platRepOct)} (${sPct(pctChange(platRepOct, platRepSep))}); October matches the platform total, September does not, so part of the apparent rise is a source difference.`));
  const prow = (measure, key, f = (v) => v) => ({ measure, mrSep: f(legacy[key][iSep]), mrOct: f(legacy[key][iOct]), mrChange: sNum(legacy[key][iOct] - legacy[key][iSep]), opusSep: f(opus[key][iSep]), opusOct: f(opus[key][iOct]), opusChange: sNum(opus[key][iOct] - opus[key][iSep]) });
  out.push(tableSec("platforms", "What is driving it: Mediaroom (Optik TV Legacy) or OPUS (TV Evolution)", [col("measure", "Measure"), col("mrSep", "Mediaroom Sep"), col("mrOct", "Mediaroom Oct"), col("mrChange", "Mediaroom change"), col("opusSep", "OPUS Sep"), col("opusOct", "OPUS Oct"), col("opusChange", "OPUS change")], [
    prow("Tickets", "tickets"), { ...prow("Ticket rate per 100 subs", "ticketRate"), mrChange: sDec(legacy.ticketRate[iOct] - legacy.ticketRate[iSep]), opusChange: sDec(opus.ticketRate[iOct] - opus.ticketRate[iSep]) },
    prow("Subscriber base", "base"), prow("Repairs / dispatches", "repairs"), { ...prow("Repair rate per 100 subs", "repairRate"), mrChange: sDec(legacy.repairRate[iOct] - legacy.repairRate[iSep], 3), opusChange: sDec(opus.repairRate[iOct] - opus.repairRate[iSep], 3) },
    { measure: "Tickets vs Oct 2025", mrSep: legacy.tickets[iY], mrOct: legacy.tickets[iOct], mrChange: sPct(pctChange(legacy.tickets[iOct], legacy.tickets[iY])), opusSep: opus.tickets[iY], opusOct: opus.tickets[iOct], opusChange: sPct(pctChange(opus.tickets[iOct], opus.tickets[iY])) }
  ], `Mediaroom is the month's upside (${sNum(legacy.tickets[iOct] - legacy.tickets[iSep])} tickets on a shrinking base); OPUS is the downside (${sNum(opus.tickets[iOct] - opus.tickets[iSep])} on a growing base). September's step-up was shared; in October only Mediaroom kept rising. Year over year OPUS is behind the improvement while Legacy's rate is higher because its base is smaller.`));
  out.push(tableSec("platform-notes", "Which platform each category sits on (from the notes; about 62% of tickets identified)", [col("name", "Category"), col("mrSep", "Mediaroom Sep"), col("mrOct", "Mediaroom Oct"), col("opusSep", "OPUS Sep"), col("opusOct", "OPUS Oct")], R.platformNotes.map(([name, a, b, c, d]) => ({ name, mrSep: a, mrOct: b, opusSep: c, opusOct: d })), "Platform is taken from device models in the notes, and the October export ends on the 30th, so read this as direction. The platform table above is the authority for totals."));
  const nbRows = TV_REVIEW.stbNoBoot.map((x) => ({ name: x.name, sep: x.v[1], oct: x.v[2], change: x.v[2] - x.v[1], changePct: round(pctChange(x.v[2], x.v[1]), 1) }));
  out.push(tableSec("stb-no-boot", "Focus: STB No Boot sub-categories (notes export, October to 30th)", moveCols("Sub-category"), [...nbRows, { name: "STB No Boot total", sep: TV_REVIEW.stbNoBootTotal[1], oct: TV_REVIEW.stbNoBootTotal[2], change: TV_REVIEW.stbNoBootTotal[2] - TV_REVIEW.stbNoBootTotal[1], changePct: round(pctChange(TV_REVIEW.stbNoBootTotal[2], TV_REVIEW.stbNoBootTotal[1]), 1) }], `Looker: STB No Boot ${fmtNum(R.categories[3][1])} to ${fmtNum(R.categories[3][2])}; Stuck on Initializing ${fmtNum(R.movers[5][1])} to ${fmtNum(R.movers[5][2])}; Reboot Loop ${fmtNum(R.movers[7][1])} to ${fmtNum(R.movers[7][2])}. About nine in ten identifiable STB No Boot tickets are on Mediaroom boxes. The root-cause work is in the archived TV Review (page review).`));
  out.push(tableSec("categories", "By ticket category (Looker), Sep to Oct 2026", moveCols("Category"), moveRows(R.categories)));
  out.push(tableSec("movers", "Largest movers (Category 1 › 2), Sep to Oct 2026", moveCols("Ticket type"), moveRows(R.movers), "Looker counts."));
  out.push(sec("daily", "Stop/Stuttering/Freezing tickets per day, September and October 2026", "series", { months: R.stutter.oct.map((_, i) => `Day ${i + 1}`), series: [{ name: "September", data: R.stutter.sep }, { name: "October", data: R.stutter.oct }] }, `Note exports: ${fmtNum(stSep)} in September, ${fmtNum(stOct)} in October. The spike on ${O.day} October (${O.peak}) is the ${O.area} outage.`));
  out.push(tableSec("causes", "Root causes cited, video quality (share of tickets with a root-cause line)", shareCols("Root cause"), share(R.causes), `${fmtNum(R.video.n[1])} October tickets (${fmtNum(R.video.n[0])} in September), ${fmtNum(R.video.rca[1])} with an explicit root-cause line. A ticket can cite more than one cause. Gateway uptime is quoted in only ${R.uptime.cited[1]} tickets (median ${R.uptime.median[1]} days against ${R.uptime.median[0]} in September).`));
  out.push(tableSec("fixes", "Fixes applied, video quality (share of tickets with a resolution line)", shareCols("Fix"), share(R.fixes), `${fmtNum(R.video.fixN[1])} October tickets with resolution text (${fmtNum(R.video.fixN[0])} in September); fixes are often combined.`));
  out.push(tableSec("missing-causes", "Missing Channels: root causes cited", shareCols("Root cause"), share(R.missing.causes), `${fmtNum(R.missing.n[1])} October tickets (${fmtNum(R.missing.n[0])} in September), ${fmtNum(R.missing.rca[1])} with a root-cause line.`));
  out.push(tableSec("missing-fixes", "Missing Channels: fixes in the notes (share of all tickets)", shareCols("Fix"), share(R.missing.fixes)));
  out.push(textSec("footer", "Sources, caveats and method", [
    `Sources: Looker ticket categories (Churn Measurement 2026 workbook), TV platform data, and the September and October TV ticket exports with agent notes and resolution text (${fmtNum(R.files)} October tickets to 30 October against ${fmtNum(R.looker)} in Looker for the month).`,
    "Only aggregates are kept; no customer details are retained. Root causes and fixes come from keyword matching on free text, mostly the structured Copilot summaries, so shares are indicative. About 58% of tickets do not name the platform in the notes."
  ]));
  return out;
}

// ---- list_pages / get_page ----
const PAGE_SCOPE = {
  "All|overview": `Overview home page, All scope: KPI cards, Health Read, scorecard, recurring issues, initiatives by pillar, initiative timeline`,
  "All|executive": `Executive summary · slide view of the overview: KPIs, top ticket issues, initiative milestones, self-serve`,
  "All|selfserve": "Self-serve workflows (Sweepr): resolved sessions, resolution rates, CX, churn impact",
  "All|ffps": `Friction Free Product Systems (FFPS) · ${FFPS.period} · CR and ticket burndown, benefits, billing tickets, CR delivery, finance`,
  "HSIA|overview": "HSIA: calls, tickets, repairs/dispatches, churn, base, initiatives, ticket issues and movers, B2B VoC",
  "HSIA|notes": `HSIA notes analysis · ${HSA.months[2]} vs ${HSA.months[1]} · agent and technician notes: top issues, movers, categorisation divergence, recommendations`,
  "HSIA|sentiment": "CF&R TELUS Internet survey · Aug vs Jul 2026 · reliability perception, drivers, verbatim themes and sentiment",
  "HSIA|cross": "HSIA cross analysis · Aug vs Jul 2026 · ticket trends × Looker volumes × agent/technician notes",
  "HSIA|review": "HSIA review · year-over-year ticket drivers (Jan – Sep 2026 vs 2025) read against the latest quarter, agent and technician notes, customer sentiment, and the initiatives in flight",
  "TV|overview": "TV: calls, tickets, repairs/dispatches, churn, base, initiatives, ticket issues and movers, B2B VoC",
  "TV|platforms": "TV platforms · Optik TV Legacy vs TV Evolution vs Mixed usage: base, tickets, repairs, swaps",
  "TV|notes": `TV notes analysis · ${TVA.months[2]} vs ${TVA.months[1]} · agent and technician notes: top issues, movers, categorisation divergence, recommendations`,
  "TV|sentiment": "Optik TV survey verbatims · Aug vs Jul 2026 · themes, TV issue mentions, text sentiment (scores excluded)",
  "TV|cross": "TV cross analysis · Aug vs Jul 2026 · ticket trends × agent/technician notes × customer verbatims",
  "TV|review": `TV review · Aug – Oct 2026 (agent exports to ${TV_REVIEW.asOf}) · TV performance, STB No Boot › Stuck on Initializing against its baseline with the All STBs / One STB split, root causes and the fixes in flight`,
  "TV|octreview": `TV October review · dashboard KPIs to Oct 2026, agent and technician notes to ${OCT_REVIEW.asOf} · TV as a whole, Mediaroom vs OPUS, focus on video quality and STB No Boot`,
  "SHS|overview": "SHS: calls, tickets, repairs/dispatches, churn, base, initiatives, ticket issues and movers, B2B VoC",
  "SH+|overview": "SH+: calls, tickets, repairs/dispatches, base"
};
const FIXED_WINDOW = new Set(["notes", "sentiment", "cross", "review", "octreview", "ffps"]);
function buildPage(product, id, a, b) {
  switch (id) {
    case "overview": return product === "All" ? homePage(a, b) : overviewPage(product, a, b);
    case "executive": return executivePage(a, b);
    case "platforms": return platformsPage(a, b);
    case "notes": return notesPage(product);
    case "sentiment": return product === "HSIA" ? hsiaSentimentPage() : tvSentimentPage();
    case "cross": return crossPage(product);
    case "review": return product === "TV" ? tvReviewPage() : reviewPage();
    case "octreview": return tvOctReviewPage();
    case "selfserve": return selfServePage(a, b);
    case "ffps": return ffpsPage();
    default: throw new Error(`page not available for ${product}`);
  }
}
function buildDecorated(product, id, a, b) {
  return decoratePage(product, id, buildPage(product, id, a, b), MONTHS[b]);
}
function pageEntry(p, a, b) {
  const { sections, groups } = buildDecorated(p.product, p.id, a, b);
  return { id: p.id, label: PAGE_LABEL[p.id], product: p.product, nav: p.nav, url: pageUrl(p.product, p.id), groups, sections: sections.map((s) => ({ id: s.id, title: s.title, kind: s.kind, display: s.display, groupId: s.groupId })) };
}
const PAGE_TOOLS = [
  { name: "list_pages", description: "The dashboard's navigation as data: every page per product (executive, overview, platforms, notes, sentiment, cross, review, octreview, selfserve, ffps) with its URL and the ordered list of sections get_page returns. Pass product to narrow.", inputSchema: { type: "object", properties: { product: { type: "string", enum: SCOPES } } } },
  { name: "get_page", description: "Everything a dashboard page shows, in page order, as typed sections: cards (KPI cards with MoM/YoY and a favourable/unfavourable read), series (charts: months + series), table (columns + rows), text (narratives, with the page's own read where it has one) and list (bullets, movers, recommendations). from/to follow get_kpi_series month rules; `to` is also the month the cards and Health Read are evaluated at. Pages built from a fixed analysis window (notes, sentiment, cross, review, ffps) ignore from/to.", inputSchema: { type: "object", properties: { product: { type: "string", enum: SCOPES }, page: { type: "string", enum: [...new Set(PAGES.map((p) => p.id))] }, from: { type: "string", description: 'First month, e.g. "Jan 2026" (default Jan 2025)' }, to: { type: "string", description: 'Last month, e.g. "Sep 2026" (default latest)' } }, required: ["product", "page"] } }
];
const PAGE_TOOL_NAMES = PAGE_TOOLS.map((t) => t.name);
function pageTool(name, args) {
  if (name === "list_pages") {
    const list = args.product ? (requireProduct(args.product, SCOPES), PAGES.filter((p) => p.product === args.product)) : PAGES;
    return text({ dashboard: DASHBOARD_URL, latestMonth: LATEST, kinds: ["cards", "series", "table", "text", "list"], pages: list.map((p) => pageEntry(p, 0, LATEST_IDX)), notes: ["Sections, groups and display describe get_page called with default arguments (Jan 2025 to the latest month); a different window cuts the chart series, and the lens charts gain a prior-year line when the window starts in 2026 or later.", "url opens the page in the dashboard."] });
  }
  requirePage(args.product, args.page);
  const [a, b] = rangeIdx(args.from, args.to);
  const fixed = FIXED_WINDOW.has(args.page);
  const { sections, groups } = buildDecorated(args.product, args.page, a, b);
  return text({ product: args.product, page: args.page, label: PAGE_LABEL[args.page], url: pageUrl(args.product, args.page), asOf: fixed ? LATEST : MONTHS[b], window: fixed ? null : { from: MONTHS[a], to: MONTHS[b] }, scope: PAGE_SCOPE[`${args.product}|${args.page}`], groups, sections });
}
