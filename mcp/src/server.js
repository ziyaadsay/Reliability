// Streamable HTTP MCP server at POST /mcp (JSON-RPC 2.0) exposing the
// Reliability Strategy dashboard data. Authentication is handled by the Gizmos
// platform before this worker runs, so the handler is auth-agnostic.
//
// This file is appended to the dashboard's data constants by mcp/build.mjs, so
// MONTHS, DATA, LOOKER, INITIATIVES, TV_PLATFORMS, TV_MIXED, SWEEPR,
// CALLS_SPLIT, HEALTH_COMMENTARY, OVERVIEW_ISSUES, PILLARS, PRODUCTS, LATEST,
// LATEST_PRIOR and CHURN_THRU are in scope.

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "relstrat-mcp", version: "1.0.0" };
const DASHBOARD_URL = "https://relstrat.telus.gizmos.run/";
const KPI_PRODUCTS = ["All", "HSIA", "TV", "SHS", "SH+"];
const METRICS = {
  callsOffered: { label: "Calls offered", unit: "count", goodWhenDown: true },
  callsAnswered: { label: "Calls answered", unit: "count", goodWhenDown: true },
  ticketVolume: { label: "Ticket volume", unit: "count", goodWhenDown: true },
  ticketRate: { label: "Ticket rate", unit: "per 100 subscribers", goodWhenDown: true, per100: true },
  repairVolume: { label: "Repair / dispatch volume", unit: "count", goodWhenDown: true },
  repairRate: { label: "Repair / dispatch rate", unit: "per 100 subscribers", goodWhenDown: true, per100: true },
  churnRate: { label: "Churn rate", unit: "per 100 subscribers", goodWhenDown: true, per100: true },
  subBase: { label: "Subscriber base", unit: "count", goodWhenDown: false },
  b2bVoC: { label: "Voice of Customer (B2B) score", unit: "% (lower is better)", goodWhenDown: true, rate: true }
};
const SOURCES = {
  kpis: "Churn Measurement 2026 workbook, Reliability/Deact KPIs tab (HSIA = HSIA West wired line; TV and SHS national).",
  calls: "TS Calls Offered by Product workbook, Actuals tabs. HSIA = every field containing HSIA (HSIA West, wHSIA, PFE - HSIA, TQ ILEC - HSIA); TV = IPTV West + TV+ (OPUS) + PFE - IPTV + TQ ILEC - IPTV.",
  tickets: "Looker Ticket Categories tabs of the Churn Measurement 2026 workbook; HSIA pain-point grouping from the hsia_ticket_recategorization tab.",
  initiatives: "Churn Measurement 2026 workbook, Initiatives tab (HSIA carries an Impact rating).",
  tvPlatforms: "Tickets: Looker split by product. Base: TV Customer Base Breakdown workbook, Customer Base - Provisioned tab (all regions except BTV and SPLUS). Repairs: 2026 Redwood Scorecard, Repair Tracking Detail (2026 onward). Swaps: Tableau Swapped Orders Combined View, Repair Swap Orders Volumes.",
  b2b: "HSIA West TCS PLT Charter and Toolkit workbook, HSIA West Scorecard tab, Reliability B2B rows. Lower is better.",
  selfServe: "HSIA West TCS PLT Charter and Toolkit workbook, HSIA West Scorecard tab, Sweepr rows (targets set for 2026 only).",
  shPlus: "SH+ reliability KPIs workbook (base, calls and ticket volume from Jan 2025; rates from Jul 2025).",
  frictionFree: "Friction Free Product Systems Program Update deck (Google Slides), August 2026 edition: burndown, benefits, billing tickets, CR delivery and finance."
};

// ---- helpers ----
const monthIdx = (m) => (m == null ? -1 : MONTHS.indexOf(m));
const lastIdx = (arr, upTo = MONTHS.length - 1) => { for (let i = Math.min(upTo, arr.length - 1); i >= 0; i--) if (arr[i] != null) return i; return -1; };
const round = (v, d) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);
function change(curr, prev, meta) {
  if (curr == null || prev == null) return null;
  const diff = curr - prev;
  const out = { from: prev, to: curr, direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat" };
  out.assessment = diff === 0 ? "flat" : (meta.goodWhenDown ? diff < 0 : diff > 0) ? "improving" : "deteriorating";
  if (meta.per100) out.per100 = round(diff, 3); else if (meta.rate) out.bps = Math.round(diff * 100); else { out.abs = diff; out.pct = prev ? round((diff / Math.abs(prev)) * 100, 1) : null; }
  return out;
}
function figures(series, meta, upTo) {
  const li = lastIdx(series, upTo);
  if (li < 0) return { latest: null, month: null };
  return { latest: series[li], month: MONTHS[li], mom: li >= 1 ? change(series[li], series[li - 1], meta) : null, yoy: li >= 12 ? change(series[li], series[li - 12], meta) : null };
}
function seriesFor(product, metric) {
  if (metric === "callsOffered" || metric === "callsAnswered") {
    const split = CALLS_SPLIT[product];
    if (split) return metric === "callsOffered" ? split.offered : split.answered;
    const key = product === "All" ? "All" : product === "SHS" || product === "SH+" ? product : null;
    return key ? DATA[metric][key] : null;
  }
  return DATA[metric] ? DATA[metric][product] : null;
}
function rangeIdx(from, to) {
  const a = from ? monthIdx(from) : 0, b = to ? monthIdx(to) : MONTHS.length - 1;
  if (a < 0) throw new Error(`Unknown month: ${from}. Use labels like "Jan 2026".`);
  if (b < 0) throw new Error(`Unknown month: ${to}. Use labels like "Jan 2026".`);
  return [Math.min(a, b), Math.max(a, b)];
}
const requireProduct = (p, allowed) => { if (!allowed.includes(p)) throw new Error(`product must be one of ${allowed.join(", ")}`); };
const text = (obj) => ({ content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] });

// ---- tools ----
const TOOLS = [
  { name: "list_products", description: "List the products and scopes the Reliability Strategy dashboard reports (HSIA, TV, SHS, SH+ and the All rollup), the months covered, the latest reported month, and which tools apply to each.", inputSchema: { type: "object", properties: {} } },
  { name: "get_kpi_series", description: "Monthly reliability KPI series for a product: calls offered/answered, ticket volume and rate, repair (dispatch) volume and rate, churn rate, subscriber base and the B2B Voice of Customer score. Rates are % of subscriber base; B2B is lower-is-better.", inputSchema: { type: "object", properties: { product: { type: "string", enum: KPI_PRODUCTS }, metrics: { type: "array", items: { type: "string", enum: Object.keys(METRICS) }, description: "Subset of metrics; omit for all" }, from: { type: "string", description: 'First month, e.g. "Jan 2026" (default Jan 2025)' }, to: { type: "string", description: 'Last month, e.g. "Sep 2026" (default latest)' } }, required: ["product"] } },
  { name: "get_kpi_summary", description: "Latest value with month-over-month and year-over-year change for every KPI of a product (what the dashboard's KPI cards show). Rate changes are in basis points; volumes carry absolute and % change. Optionally evaluate as of an earlier month.", inputSchema: { type: "object", properties: { product: { type: "string", enum: KPI_PRODUCTS }, month: { type: "string", description: 'Evaluate as of this month, e.g. "Aug 2026" (default latest)' } }, required: ["product"] } },
  { name: "get_ticket_issues", description: "Looker ticket issue detail for a product: top issues by volume with MoM and YoY change, the biggest month-over-month risers and fallers, the category stack series, and the monthly biggest-riser call-outs. HSIA rows also carry the customer pain-point grouping.", inputSchema: { type: "object", properties: { product: { type: "string", enum: ["HSIA", "TV", "SHS"] } }, required: ["product"] } },
  { name: "get_initiatives", description: "Reliability improvement initiatives from the Initiatives tab, with pillar, theme, status, timeline, prime, description and (HSIA only) impact rating. Filter by product, status, theme or pillar.", inputSchema: { type: "object", properties: { product: { type: "string", enum: ["HSIA", "TV", "SHS"] }, status: { type: "string", description: "Launched, In flight, Stalled or Ideation" }, theme: { type: "string" }, pillar: { type: "integer", minimum: 1, maximum: 4 } } } },
  { name: "get_tv_platforms", description: "TV by platform: Optik TV Legacy (Mediaroom) vs TV Evolution (OPUS) tickets, ticket rate, repairs, repair rate, provisioned subscriber base and 2026 repair swap volumes, plus the mixed-usage (both platforms) subscriber count.", inputSchema: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } } } },
  { name: "get_self_serve", description: "Self-serve (Sweepr) workflow metrics: resolved sessions, web/app resolution rate, CX easy-to-follow score, Sweepr-involved churn and deacts saved, with 2026 monthly targets where set.", inputSchema: { type: "object", properties: {} } },
  { name: "get_health_commentary", description: "The hand-written Health Read commentary for a product for the latest month (themes, root causes, initiatives), plus the recurring-issue overview totals.", inputSchema: { type: "object", properties: { product: { type: "string", enum: ["HSIA", "TV", "SHS", "SH+"] } }, required: ["product"] } },
  { name: "get_friction_free_program", description: "Friction Free Product Systems (FFPS) program update: CR and ticket burndown, benefit by quarter (CRs, non-billing and billing defects), billing ticket overview, CRs delivered Feb-Aug 2026 with run-rate benefit, the Sep-Dec CR delivery pipeline, and program finance (spend, allocation, forecast). Transcribed from the monthly program deck.", inputSchema: { type: "object", properties: { section: { type: "string", enum: ["burndown", "benefits", "billingTickets", "finance", "delivered", "pipeline"], description: "Return one section only; omit for the whole update." } } } },
  { name: "get_sources", description: "Source workbooks, tabs and scope definitions behind each dataset, and the dashboard URL.", inputSchema: { type: "object", properties: {} } }
];

function callTool(name, args = {}) {
  switch (name) {
    case "list_products":
      return text({
        dashboard: DASHBOARD_URL, latestMonth: LATEST, months: MONTHS, churnReportedThrough: CHURN_THRU,
        products: [
          { id: "All", label: "All products (HSIA + TV + SHS)", tools: ["get_kpi_series", "get_kpi_summary"], note: "Rates blended over the combined base; SH+ excluded" },
          { id: "HSIA", label: "High Speed Internet (HSIA West, PFE - HSIA, TQ ILEC - HSIA)", tools: ["get_kpi_series", "get_kpi_summary", "get_ticket_issues", "get_initiatives", "get_health_commentary"] },
          { id: "TV", label: "Optik TV (Legacy) and TV Evolution", tools: ["get_kpi_series", "get_kpi_summary", "get_ticket_issues", "get_initiatives", "get_tv_platforms", "get_health_commentary"] },
          { id: "SHS", label: "SmartHome Security", tools: ["get_kpi_series", "get_kpi_summary", "get_ticket_issues", "get_initiatives", "get_health_commentary"] },
          { id: "SH+", label: "SmartHome+", tools: ["get_kpi_series", "get_kpi_summary", "get_health_commentary"], note: "Calls, tickets and base from Jan 2025; rates from Jul 2025; no churn, ticket categories or initiatives yet" }
        ],
        metrics: Object.fromEntries(Object.entries(METRICS).map(([k, m]) => [k, `${m.label} (${m.unit})`]))
      });
    case "get_kpi_series": {
      requireProduct(args.product, KPI_PRODUCTS);
      const [a, b] = rangeIdx(args.from, args.to);
      const keys = args.metrics && args.metrics.length ? args.metrics : Object.keys(METRICS);
      const series = {};
      for (const k of keys) {
        if (!METRICS[k]) throw new Error(`Unknown metric: ${k}`);
        const s = seriesFor(args.product, k);
        if (s) series[k] = { label: METRICS[k].label, unit: METRICS[k].unit, values: s.slice(a, b + 1) };
      }
      return text({ product: args.product, months: MONTHS.slice(a, b + 1), series });
    }
    case "get_kpi_summary": {
      requireProduct(args.product, KPI_PRODUCTS);
      const upTo = args.month ? monthIdx(args.month) : MONTHS.length - 1;
      if (upTo < 0) throw new Error(`Unknown month: ${args.month}`);
      const kpis = {};
      for (const [k, meta] of Object.entries(METRICS)) {
        const s = seriesFor(args.product, k);
        if (!s) continue;
        const f = figures(s, meta, upTo);
        if (f.latest != null) kpis[k] = { label: meta.label, unit: meta.unit, ...f };
      }
      const annual = DATA.annualChurn && DATA.annualChurn[args.product];
      return text({ product: args.product, asOf: MONTHS[upTo], kpis, annualChurn: annual || null, notes: ["MoM and YoY compare the reported month with the prior month and the same month a year earlier.", "Ticket, repair and churn rates are per 100 subscribers; their changes are absolute differences in that unit (per100). The B2B score still moves in basis points (1 pt = 100 bps).", `Churn is reported through ${CHURN_THRU}.`] });
    }
    case "get_ticket_issues": {
      requireProduct(args.product, ["HSIA", "TV", "SHS"]);
      const L = LOOKER[args.product];
      const li = MONTHS.length - 1;
      const row = (r) => ({ issue: r.issue, group: r.grp, ...(args.product === "HSIA" ? { painPoint: hsiaPainPointFor(r.issue) } : {}), latest: r.a26, priorMonth: r.prev ?? null, priorYear: r.a25 || null, mom: change(r.a26, r.prev ?? null, { goodWhenDown: true }), yoy: r.a25 ? change(r.a26, r.a25, { goodWhenDown: true }) : "new in 2026" });
      return text({
        product: args.product, latestMonth: LATEST, priorMonth: MONTHS[li - 1], priorYear: LATEST_PRIOR,
        monthlyTotal: { months: MONTHS, values: L.monthlyTotal },
        topIssues: L.topIssues.map(row),
        rising: L.rising.map(row), falling: L.falling.map(row),
        categories: L.cats ? L.cats.map((c) => ({ name: c.name, values: c.series })) : null,
        categorySource: L.catSource === "recategorization" ? "hsia_ticket_recategorization pain points" : "Looker Category 1",
        biggestRiserByMonth: L.risers || null,
        notes: ["topIssues ranked by latest-month volume; rising/falling are the largest month-over-month volume movers among issues with 100+ tickets.", SOURCES.tickets]
      });
    }
    case "get_initiatives": {
      let items = INITIATIVES;
      if (args.product) { requireProduct(args.product, ["HSIA", "TV", "SHS"]); items = items.filter((i) => i.p === args.product); }
      if (args.status) items = items.filter((i) => i.status.toLowerCase() === String(args.status).toLowerCase());
      if (args.theme) items = items.filter((i) => i.theme.toLowerCase() === String(args.theme).toLowerCase());
      if (args.pillar) items = items.filter((i) => i.pillar === args.pillar);
      const pillarName = Object.fromEntries(PILLARS.map((p) => [p.n, p.name]));
      return text({
        count: items.length, pillars: PILLARS,
        initiatives: items.map((i) => ({ product: i.p, name: i.name, pillar: i.pillar, pillarName: pillarName[i.pillar], theme: i.theme, status: i.status, timeline: i.timeline, prime: i.prime, impact: i.impact ? { H: "High", M: "Medium", L: "Low" }[i.impact] : null, issues: i.issues, description: i.desc })),
        source: SOURCES.initiatives
      });
    }
    case "get_tv_platforms": {
      const [a, b] = rangeIdx(args.from, args.to);
      const cut = (arr) => (arr || []).slice(a, b + 1);
      return text({
        months: MONTHS.slice(a, b + 1),
        platforms: TV_PLATFORMS.map((p) => ({ id: p.id, name: p.name, platform: p.sub, tickets: cut(p.tickets), ticketRate: cut(p.ticketRate), repairs: cut(p.repairs), repairRate: cut(p.repairRate), subscriberBase: cut(p.base), repairSwaps2026: cut(p.swaps2026) })),
        mixedUsage: { name: TV_MIXED.name, definition: "Customers provisioned on both Mediaroom and TTV+", subscriberBase: cut(TV_MIXED.base) },
        notes: ["Rates are % of the platform's provisioned base. Repairs and swaps are reported for 2026 only; repairs are West-scope.", SOURCES.tvPlatforms]
      });
    }
    case "get_self_serve": {
      const labels = { resolved: "Resolved sessions (blended v2)", webAppRate: "Web/App resolution rate (%)", ivrRate: "CCAI IVR resolution rate (%)", cxEasy: "CX 'Easy to follow' score", cxSent: "CX comment sentiment score", churn: "Sweepr-involved churn rate (per 100 subs)", deacts: "Deacts saved" };
      return text({ months: MONTHS, metrics: Object.fromEntries(Object.entries(SWEEPR).map(([k, s]) => [k, { label: labels[k] || k, actuals: s.a, targets2026: s.t || null }])), source: SOURCES.selfServe });
    }
    case "get_health_commentary": {
      requireProduct(args.product, ["HSIA", "TV", "SHS", "SH+"]);
      const items = HEALTH_COMMENTARY[args.product] || [];
      // "@" marks a lead (context) bullet in the dashboard source; theme entries carry
      // root causes and initiative names, which are resolved against the register here.
      const bullets = items.filter((x) => typeof x === "string").map((x) => x.replace(/^@/, ""));
      const resolveInit = (x) => {
        if (typeof x !== "string") return { name: x.t, detail: x.sub };
        const it = INITIATIVES.find((i) => i.p === args.product && i.name === x);
        return it ? { name: it.name, status: it.status, timeline: it.timeline, prime: it.prime, theme: it.theme, impact: it.impact || null } : { name: x };
      };
      const themes = items.filter((x) => typeof x !== "string").map((t) => ({ theme: t.t, share: t.share || null, rootCauses: t.causes || [], inProgress: t.next || [], relatedInitiatives: (t.inits || []).map(resolveInit), note: t.note || null }));
      const overview = OVERVIEW_ISSUES.filter((r) => r[args.product]).map((r) => ({ issue: ISSUE_META[r.grp] ? ISSUE_META[r.grp].label : r.grp, latest: r[args.product][0], priorYear: r[args.product][1], yoy: change(r[args.product][0], r[args.product][1], { goodWhenDown: true }) }));
      return text({ product: args.product, month: LATEST, commentary: items.length ? { bullets, themes } : "No commentary has been added for this month.", recurringIssues: overview });
    }
    case "get_friction_free_program": {
      const { source, pipelineNote, ...rest } = FFPS;
      if (args.section) {
        if (!(args.section in rest)) throw new Error(`Unknown section: ${args.section}`);
        return text({ asOf: FFPS.asOf, period: FFPS.period, section: args.section, data: rest[args.section], ...(args.section === "pipeline" ? { note: pipelineNote } : {}), source: SOURCES.frictionFree });
      }
      return text({ ...rest, pipelineNote, source: SOURCES.frictionFree });
    }
    case "get_sources":
      return text({ dashboard: DASHBOARD_URL, latestMonth: LATEST, sources: SOURCES });
    default:
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  }
}

// HSIA customer pain-point grouping (mirrors hsiaPainPoint in the dashboard)
function hsiaPainPointFor(issue) {
  const [c1, c2 = ""] = issue.split(" › ").map((s) => s.trim());
  if (c1 === "Wireless" || c1 === "Wi-Fi connection" || c1 === "NWH") return c2 === "Slow Speeds" ? "Slow Speeds" : "WiFi Coverage Gaps";
  if (c1.startsWith("Incompatible Equipment") || c2 === "Incompatible Equipment" || c2 === "Slow Speeds") return "Slow Speeds";
  if (c1 === "Connectivity") return "Connection Instability & Disconnects";
  return "Not grouped";
}

// ---- JSON-RPC plumbing ----
const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const err = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

function handleMessage(msg) {
  try {
    switch (msg.method) {
      case "initialize":
        return ok(msg.id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: `Reliability Strategy dashboard data (${DASHBOARD_URL}). Start with list_products, then get_kpi_summary or get_kpi_series for a product. Latest reported month: ${LATEST}.` });
      case "tools/list":
        return ok(msg.id, { tools: TOOLS });
      case "tools/call": {
        const name = msg.params && msg.params.name;
        if (!TOOLS.some((t) => t.name === name)) return ok(msg.id, { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true });
        try { return ok(msg.id, callTool(name, (msg.params && msg.params.arguments) || {})); }
        catch (e) { return ok(msg.id, { content: [{ type: "text", text: String(e && e.message || e) }], isError: true }); }
      }
      case "ping":
        return ok(msg.id, {});
      default:
        return err(msg.id ?? null, -32601, `Method not found: ${msg.method}`);
    }
  } catch (e) {
    return err(msg.id ?? null, -32603, String(e && e.message || e));
  }
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "") {
      return json({ name: SERVER_INFO.name, version: SERVER_INFO.version, endpoint: "/mcp", transport: "streamable-http", dashboard: DASHBOARD_URL, latestMonth: LATEST, tools: TOOLS.map((t) => t.name) });
    }
    if (url.pathname !== "/mcp") return new Response("Not found", { status: 404 });
    if (request.method === "GET") return json({ error: "Use POST with JSON-RPC 2.0 messages; server-initiated streams are not offered." }, 405);
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    let payload;
    try { payload = await request.json(); } catch { return json(err(null, -32700, "Parse error"), 400); }
    const messages = Array.isArray(payload) ? payload : [payload];
    const responses = messages.filter((m) => m && typeof m === "object" && m.id != null).map(handleMessage);
    if (responses.length === 0) return new Response(null, { status: 202 });
    return json(Array.isArray(payload) ? responses : responses[0]);
  }
};
