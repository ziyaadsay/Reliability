// Presentation layer for the page model (schemaVersion 3). Appended after pages.js by
// mcp/build.mjs. decoratePage() runs on every page's sections, after the builders, and adds:
//   display   how the dashboard draws the section (one `as` from DISPLAY_AS plus the keys the
//             chart needs, naming the section's own data keys)
//   groupId   the collapsible group the section sits in, or null for the page's top
//   doc       everything about data shapes, keys and windows (moved out of `note`)
// and cleans `note` so it is a sentence a product manager can read under the section title.
// No colours or colour names are added anywhere; consumers colour from the words in the data.

const DISPLAY_AS = ["cards", "text", "quotes", "list", "table", "matrix", "bars", "grouped-bars", "stacked-bars", "paired-bars", "line", "bars-and-line", "area", "scatter", "gantt", "heatmap", "donut"];
const GANTT_STATUS_ORDER = ["Launched", "In flight", "Ideation", "Stalled", "On Hold"];

// ---- display rules ----
const T3 = ["Jul 2026", "Aug 2026", "Sep 2026"], SV = ["Jun", "Jul", "Aug"];
const seriesKeys = (s) => Object.keys(s.data.series);
const tbl = (s, extra) => ({ as: "table", ...(extra || {}) });
const wide = { wide: true };
const trendTable = (label, values, change) => ({ as: "grouped-bars", label, values, change, alsoAs: "table" });
const GANTT = { as: "gantt", label: "initiative", lane: "pillarName", laneOrder: "pillar", start: "start", end: "end", status: "status", statusOrder: GANTT_STATUS_ORDER, undatedText: "timeline", marker: "asOf" };

function seriesDisplay(page, s) {
  const id = s.id, keys = seriesKeys(s);
  if (page === "executive") return { as: "line", x: "months", y: keys };
  if (page === "platforms") return { as: "line", x: "months", y: keys, alsoAs: "table" };
  if (page === "selfserve") return { as: "line", x: "months", y: keys, ...(keys.includes("target") ? { dashed: ["target"] } : {}), alsoAs: "table" };
  if (/-calls$/.test(id)) return { as: "bars-and-line", x: "months", bars: ["offered"], line: ["answered"], alsoAs: "table" };
  if (/-tickets$/.test(id)) return { as: "bars-and-line", x: "months", bars: ["ticketVolume"], line: ["ticketRate"], axis: { right: ["ticketRate"] }, alsoAs: "table" };
  if (/-repairs$/.test(id)) return { as: "bars-and-line", x: "months", bars: ["repairVolume"], line: ["repairRate"], axis: { right: ["repairRate"] }, alsoAs: "table" };
  if (/-categories$/.test(id)) return { as: "stacked-bars", x: "months", stack: keys.filter((k) => k !== "total"), total: "total", alsoAs: "table" };
  if (/-fibre-spotlight$/.test(id)) return { as: "line", x: "months", y: keys };
  if (/-(churn|b2b)$/.test(id)) return { as: "line", x: "months", y: keys, alsoAs: "table" };
  return { as: "line", x: "months", y: keys };
}

function tableDisplay(page, product, s) {
  const id = s.id.replace(/^s\d\d-/, "");
  const cols = s.data.columns.map((c) => c.key);
  switch (page) {
    case "overview":
      if (/^scorecard$/.test(id)) return tbl(s, wide);
      if (/^(initiatives|issues-top-issues)$/.test(id)) return tbl(s, wide);
      if (/^timeline$/.test(id)) return GANTT;
      return tbl(s);
    case "executive":
      return tbl(s);
    case "notes":
      if (/^(agent-categories|resolution1|fixes|themes|devices|platform|access)$/.test(id)) return trendTable("name", T3, "change");
      if (id === "domain-mix") return { as: "heatmap", label: "agentDomain", cells: cols.filter((c) => /^d\d$/.test(c)), scale: "0-100" };
      if (/^by-category/.test(id)) return tbl(s, wide);
      return tbl(s);
    case "sentiment":
      if (id === "polarity") return { as: "stacked-bars", orient: "months", label: "polarity", stack: SV, alsoAs: "table" };
      if (id === "by-contact") return { as: "bars", label: "group", value: "Aug", sort: "as-is", alsoAs: "table" };
      if (id === "attributes") return { as: "bars", label: "attribute", value: "fairOrPoor", sort: "as-is", alsoAs: "table" };
      if (id === "drivers") return trendTable("driver", SV, "changeBps");
      if (id === "themes") return trendTable("name", SV, "changeBps");
      if (id === "issue-themes") return trendTable("name", SV, "change");
      if (id === "issues") return trendTable("name", SV, "changeBps");
      return tbl(s);
    case "cross":
      return { as: "matrix", wide: true };
    case "review":
      if (s.id === "kpis-table") return tbl(s, wide);
      if (s.id === "s2-drivers") return { as: "bars", label: "driver", value: "volumeTickets", sort: "as-is", groupBy: "group", alsoAs: "table" };
      if (s.id === "s5-bucket") return { as: "heatmap", label: "category", cells: ["gponSev", "outage", "downtime", "speed", "ontCap", "reboots", "wifi", "planChg", "tenure"], scale: "auto", wide: true };
      if (s.id === "s5-agent-categories") return { as: "bars", label: "category", value: "tickets", sort: "as-is", alsoAs: "table" };
      if (s.id === "s6-lifts") return { as: "paired-bars", label: "trait", pair: ["lift2025", "lift2026"], reference: 1, alsoAs: "table" };
      if (s.id === "s7-alignment") return { as: "stacked-bars", label: "category", stack: ["aligned", "noFault", "reattributed"], alsoAs: "table" };
      if (s.id === "s7-survey") return { as: "paired-bars", label: "driver", pair: ["Jun", "Aug"], alsoAs: "table" };
      return tbl(s);
    case "ffps":
      if (id === "crs" && s.id.startsWith("s02")) return { as: "stacked-bars", label: "quarter", stack: ["churn", "calls", "sbc"], total: "total", alsoAs: "table" };
      if (s.id === "s02-non-billing") return { as: "bars", label: "quarter", value: "total", sort: "as-is", alsoAs: "table" };
      if (s.id === "s02-billing") return { as: "bars", label: "month", value: "ebitda", sort: "as-is", alsoAs: "table" };
      if (/^(delivered|pipeline|quarterly)$/.test(id)) return tbl(s, wide);
      return tbl(s);
    default:
      return tbl(s);
  }
}

function displayFor(page, product, s) {
  switch (s.kind) {
    case "cards": return { as: "cards" };
    case "text": return s.data.series
      ? { as: "text", chart: { as: "line", x: "months", y: Object.keys(s.data.series.series), ...(s.data.series.series.prior ? { dashed: ["prior"] } : {}) } }
      : { as: "text" };
    case "list": return /quotes$/.test(s.id) ? { as: "quotes" } : { as: "list" };
    case "series": return seriesDisplay(page, s);
    case "table": return tableDisplay(page, product, s);
    default: return { as: "text" };
  }
}

// ---- groups: the dashboard's collapsible sections, in page order ----
const PRODUCT_GROUP_TITLE = (month) => ({ health: `Health Read — ${month}`, calls: "Calls", tickets: "Tickets", categories: "Tickets", "biggest-riser": "Tickets", issues: "Ticket issues & movers", repairs: "Repairs / Dispatches", "fibre-spotlight": "Repairs / Dispatches", churn: "Churn", b2b: "Voice of Customer (B2B)", initiatives: "Initiatives", timeline: "Initiative timeline" });
const NOTES_GROUPS = { 1: "Top issues by agent categorisation", 2: "Agent vs technician categorisation", 3: "Technician closures and fixes", 4: "What agents are writing", 5: "Recommendations" };
const SENTIMENT_GROUPS = { HSIA: { 1: "Perceived reliability", 2: "What drives a poor reliability rating", 3: "Performance against importance", 4: "Verbatim sentiment and themes", 5: "Issue descriptions and digital support", 6: "What customers said", 7: "Recommendations" }, TV: { 1: "Verbatim sentiment", 2: "Themes in customer verbatims", 3: "TV-specific issue verbatims", 4: "Digital support (chatbot) verbatims", 5: "Recommendations" } };
const CROSS_GROUPS = { 1: "Signal alignment matrix", 2: "Consolidated rising and falling drivers", 3: "Prioritised recommendations" };
const PLATFORM_GROUPS = { 1: "Subscriber base", 2: "Tickets", 3: "Repairs / Dispatches", 4: "Repair swaps", 5: "Mixed usage" };
const SELFSERVE_GROUPS = { 1: "Resolved sessions vs target", 2: "Resolution rates", 3: "Customer experience", 4: "Churn impact" };
const FFPS_GROUPS = { 1: "Burndown", 2: "Benefits", 3: "Billing tickets", 4: "CRs delivered (Feb – Aug 2026)", 5: "CR delivery timeline (Sep – Dec 2026)", 6: "Finance" };
const HOME_GROUPS = (month) => [
  { id: "g01", title: "01 · All products at a glance", open: true, test: (id) => ["cards", "top-issues", "how-to-read"].includes(id) },
  { id: "g02", title: `02 · Health Read — ${month}`, open: true, test: (id) => id.startsWith("s02-") },
  { id: "g03", title: "03 · Reliability scorecard", open: true, test: (id) => id.startsWith("s03-") },
  { id: "g04", title: `04 · Tickets by recurring issue — ${LATEST}`, open: true, test: (id) => id.startsWith("s04-") },
  { id: "g05", title: "05 · Initiatives by pillar", open: true, test: (id) => id.startsWith("s05-") },
  { id: "g06", title: "06 · Initiative timeline — HSIA, TV and SHS", open: false, test: (id) => id.startsWith("s06-") }
];
const nn = (id) => { const m = id.match(/^s(\d\d)-/); return m ? +m[1] : null; };
const g2 = (n) => String(n).padStart(2, "0");

// Returns the ordered group definitions for a page: [{ id, title, open, test(sectionId) }]
function groupDefs(page, product, sections, asOfMonth) {
  const byNumber = (titles, openIf) => Object.entries(titles).map(([n, title]) => ({ id: `g${g2(n)}`, title: `${g2(n)} · ${title}`, open: openIf(+n), test: (id) => nn(id) === +n }));
  switch (page) {
    case "overview":
      if (product === "All") return HOME_GROUPS(asOfMonth);
      return (() => {
        const titles = PRODUCT_GROUP_TITLE(asOfMonth), seen = new Map();
        for (const s of sections) { const m = s.id.match(/^s(\d\d)-([a-z0-9]+(?:-[a-z0-9]+)?)/); if (!m) continue; const slug = ["health", "calls", "tickets", "categories", "issues", "repairs", "fibre-spotlight", "churn", "b2b", "initiatives", "timeline", "biggest-riser"].find((k) => m[2] === k || m[2].startsWith(k + "-")); if (slug && !seen.has(+m[1])) seen.set(+m[1], titles[slug]); }
        return [...seen.entries()].sort((a, b) => a[0] - b[0]).map(([n, title]) => ({ id: `g${g2(n)}`, title: `${g2(n)} · ${title}`, open: n <= 2, test: (id) => nn(id) === n }));
      })();
    case "executive": {
      const month = asOfMonth, asOf = LATEST_SHORT;
      return [[1, `KPI scorecard · ${month}`], [2, `Top ticket issues and movers · ${asOf}`], [3, `Initiative milestones · ${month}`], [4, `Self-serve workflows (Sweepr) · ${month}`]].map(([n, t]) => ({ id: `slide${n}`, title: `Slide ${n} · ${t}`, open: true, test: (id) => id.startsWith(`slide${n}-`) }));
    }
    case "platforms": return byNumber(PLATFORM_GROUPS, (n) => n <= 1);
    case "notes": return byNumber(NOTES_GROUPS, () => false);
    case "sentiment": return byNumber(SENTIMENT_GROUPS[product], () => false);
    case "cross": return byNumber(CROSS_GROUPS, () => false);
    case "selfserve": return byNumber(SELFSERVE_GROUPS, (n) => n <= 1);
    case "ffps": return byNumber(FFPS_GROUPS, (n) => ![3, 6].includes(n));
    case "review": {
      const first = (re) => (sections.find((s) => re.test(s.id)) || {}).title;
      const titles = { 1: first(/^s1-stats$/), 2: first(/^s2-method$/), 3: first(/^s3-stats$/), 4: first(/^s4-intro$/), 5: first(/^s5-stats$/), 6: first(/^s6-stats$/), 7: "7. Field and customer evidence point the same way" };
      return Object.entries(titles).map(([n, title]) => ({ id: `g${n}`, title, open: false, test: (id) => id.startsWith(`s${n}-`) }));
    }
    default: return [];
  }
}

// ---- notes: reader-facing only; the rest moves to doc ----
const NOTE_REWRITES = [
  [/hsia_ticket_recategorization tab/g, "HSIA ticket recategorization tab"],
  [/on internet_daily/g, "on the daily internet table"],
  [/internet_daily/g, "the daily internet table"]
];
// Each override applies only when its `when` pattern matches the note as built, so a
// product whose note is already reader-facing (SH+ calls, tickets, repairs) is left alone.
const NOTE_OVERRIDES = {
  cards: [
    { when: /carry target and vsTarget/, note: "The self-serve cards also show their target and the gap to it." },
    { when: /as of the `to` month/, note: "Latest reported value for each KPI with its month-over-month and year-over-year move; rates are per 100 subscribers and B2B is in points." },
    { when: /carry target and vsTarget|where the source sets a 2026 target/, note: "Targets are set in the source for 2026 only." }
  ],
  "s01-health-commentary": [{ when: /browser-local/, note: "Published commentary for the latest month." }],
  "s03-tickets": [{ when: /left axis/, note: "Monthly ticket volume and ticket rate per 100 subscribers (Reliability Deact KPIs tab)." }],
  "s05-repairs": [{ when: /left axis/, note: "Monthly repair (dispatch) volume and repair rate per 100 subscribers." }],
  "s05-fibre-spotlight": [{ when: /not filtered by/, note: "Share of HSIA repairs coded as severely degraded fibre line. Currently the single largest identified driver of HSIA repairs." }],
  "s06-timeline": [{ when: /undated/, note: "Initiatives by pillar on a monthly timeline; initiatives without a firm date are listed separately. Latest reported month is Sep 2026." }],
  "s09-timeline": [{ when: /undated/, note: "Initiatives by pillar on a monthly timeline; initiatives without a firm date are listed separately. Latest reported month is Sep 2026." }],
  "s06-quarterly": [{ when: /null = TBD/, note: "Receipts marked TBD are not yet reported in the source." }],
  "slide2-HSIA-trend": [{ when: /Sparkline/, note: "Monthly tickets for the top ticket category, Jan 2025 – Sep 2026." }],
  "slide2-TV-trend": [{ when: /Sparkline/, note: "Monthly tickets for the top ticket category, Jan 2025 – Sep 2026." }],
  "slide2-SHS-trend": [{ when: /Sparkline/, note: "Monthly tickets for the top ticket category, Jan 2025 – Sep 2026." }]
};
const CODE_RE = /`|\bdata\.|series shape|\bkeys?\b|priorQuarter|priorValue|vsTarget|schemaVersion|browser-local|This table is [^.]*\.|\b[a-z]+[A-Z][a-zA-Z]*\b|\b[a-z]+_[a-z_]+\b/;
const CHART_RE = /left axis|right axis|\bbars?\b|\bsparkline\b|carry their chart|carry the comparison|drawn on/i;

function splitSentences(text) { return text.split(/(?<=[.!?])\s+(?=[A-Z“"(])/); }
function cleanNote(s, product, page) {
  const note = s.note;
  const moved = [];
  if (!note) return { note: undefined, moved };
  let out = note;
  for (const [re, to] of NOTE_REWRITES) out = out.replace(re, to);
  // Health Read lenses: keep "Verdict for the month: X." and move the rest
  if (/-health-\d\d-/.test(s.id)) {
    const v = out.match(/^Verdict for the month: [^.]*\./);
    return { note: v ? v[0] : undefined, moved };
  }
  for (const ov of NOTE_OVERRIDES[s.id] || NOTE_OVERRIDES[s.id.replace(/^s\d\d-/, "")] || []) {
    if (ov.when.test(note)) { moved.push(note); return { note: ov.note, moved }; }
  }
  // generic: sentences (or clauses) that talk about code, keys, axes or chart construction move to doc
  const flagged = (t) => CODE_RE.test(t) || CHART_RE.test(t);
  const keep = [];
  for (const sent of splitSentences(out)) {
    if (!flagged(sent)) { keep.push(sent); continue; }
    if (!sent.includes(";")) { moved.push(sent); continue; }
    const clauses = sent.replace(/[.]$/, "").split(/;\s+/);
    const ok = clauses.filter((c) => !flagged(c)), bad = clauses.filter(flagged);
    if (bad.length) moved.push(bad.join("; ") + ".");
    if (ok.length) keep.push(ok.join("; ") + ".");
  }
  return { note: keep.join(" ").trim() || undefined, moved };
}

// ---- doc: the data-shape description, plus anything moved out of note ----
function describeShape(s) {
  const d = s.data;
  switch (s.kind) {
    case "cards": return "data is an array of cards: { label, value, unit, month, mom, yoy }; mom and yoy are { delta, pct?, direction, read }.";
    case "series": return `data.months lists the months; data.series has the keys ${seriesKeys(s).join(", ")} (one value per month, null = not reported).`;
    case "table": return `data.columns lists the columns and data.rows the rows; column keys: ${d.columns.map((c) => c.key).join(", ")}.`;
    case "text": return d.series ? `data.paragraphs holds the narrative, data.read the page's own word, and data.series the lens chart in the series shape (keys ${seriesKeys({ data: d.series }).join(", ")}).` : "data.paragraphs holds the narrative" + (d.read ? "; data.read is the page's own word for it." : ".");
    case "list": return "data is an array of items: { title, body?, meta? }.";
    default: return "";
  }
}

function decoratePage(product, page, sections, asOfMonth) {
  const defs = groupDefs(page, product, sections, asOfMonth);
  const groups = defs.map((g) => ({ id: g.id, title: g.title, sectionIds: [], open: g.open }));
  const out = sections.map((s) => {
    const { note, moved } = cleanNote(s, product, page);
    const def = defs.find((g) => g.test(s.id));
    const groupId = def ? def.id : null;
    if (def) groups.find((g) => g.id === def.id).sectionIds.push(s.id);
    const display = displayFor(page, product, s);
    const doc = [describeShape(s), ...moved].filter(Boolean).join(" ");
    const { note: _n, ...rest } = s;
    return { id: rest.id, title: rest.title, kind: rest.kind, display, groupId, ...(note ? { note } : {}), doc, data: rest.data };
  });
  return { sections: out, groups: groups.filter((g) => g.sectionIds.length) };
}
