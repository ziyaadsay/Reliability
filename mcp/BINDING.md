# Reliability binding

The Reliability Strategy dashboard's data, served to other Gizmos apps over RPC. This is the same data the `relstrat-mcp` MCP server serves at `/mcp`; every method below is one MCP tool, with the same name, the same arguments as one plain object, and the same reply as the tool, returned as an object rather than JSON text. A tool error is thrown as an `Error` whose message is the tool's error text.

The binding is published to the whole TELUS org: any gizmo in the org can declare it and call it, no share or approval needed. The data is read-only reporting and carries no customer details.

Every reply carries `schemaVersion` (a number, currently `3`). It rises when a shape changes; existing fields never change meaning, new fields are only added. Version 3 adds the presentation fields (`display`, `groups`, `groupId`, `doc`) described under Presentation below; nothing from version 2 was renamed or removed.

## Declaring it

```toml
# wrangler.toml of the calling gizmo
[[gizmos_custom_binding]]
binding = "RELIABILITY"
id      = "gzb_9b9d545216df5baf39e8a0d51cc5a242"   # relstrat-mcp, entrypoint Reliability (from `gizmos binding list`)
```

```js
const summary = await env.RELIABILITY.get_kpi_summary({ product: "HSIA" });
// identical, raw protocol form:
const same = await env.RELIABILITY.call("get_kpi_summary", [{ product: "HSIA" }]);
```

## Valid keys

- **Products.** `All`, `HSIA`, `TV`, `SHS`, `SH+`. `All` is the HSIA + TV + SHS rollup with rates blended over the combined base; SH+ is excluded from it. `get_ticket_issues` and `get_initiatives` take `HSIA`, `TV`, `SHS`; `get_health_commentary` takes `HSIA`, `TV`, `SHS`, `SH+`; everything else takes all five.
- **Covers.** `list_products` returns `covers` per product: which scorecard boards it rolls up, using the keys `hsiawest`, `pfe`, `whsia`, `koodo`, `optikwest`, `shs10`, `shplus`.

  | product | covers | note |
  |---|---|---|
  | `All` | `hsiawest`, `pfe`, `optikwest`, `shs10` | HSIA + TV + SHS rollup |
  | `HSIA` | `hsiawest`, `pfe` | HSIA West + PFE + TQ ILEC (TQ ILEC has no board key) |
  | `TV` | `optikwest` | Optik TV Legacy and TV Evolution, rolled up |
  | `SHS` | `shs10` | SmartHome Security |
  | `SH+` | `shplus` | SmartHome+ |

  `whsia` and `koodo` are not reported by the dashboard. The KPI series are not split by board in the source workbook, so boards are **not** product keys; the TV platform split (Legacy vs TV Evolution) is available through `get_tv_platforms` and the TV `platforms` page.
- **Months.** Labels of the form `"Jan 2025"` through `"Sep 2026"` (the latest reported month). `list_products` returns the full list under `months` and the latest under `latestMonth`. Churn is reported through `"Sep 2026"`.
- **Metrics** (for `get_kpi_series`): `callsOffered`, `callsAnswered`, `ticketVolume`, `ticketRate`, `repairVolume`, `repairRate`, `churnRate`, `subBase`, `b2bVoC`. Ticket, repair and churn rates are per 100 subscribers; changes in them are absolute differences in that unit, not percentages. `b2bVoC` is a percentage where lower is better.
- **Pages** (for `get_page`): `executive`, `overview`, `platforms`, `notes`, `sentiment`, `cross`, `review`, `selfserve`, `ffps`. Which product has which page is in the table below and in `list_pages`.
- **Initiative statuses.** `Launched`, `In flight`, `On Hold`, `Stalled`, `Ideation` (case-insensitive).
- **FFPS sections.** `burndown`, `benefits`, `billingTickets`, `finance`, `delivered`, `pipeline`.

## Pages per product

| product | pages (in navigation order) |
|---|---|
| `All` | `overview` (the Overview home page), `executive` (Overview › Executive Summary), `selfserve`, `ffps` |
| `HSIA` | `overview`, `notes`, `sentiment`, `cross`, `review` |
| `TV` | `overview`, `platforms`, `notes`, `sentiment`, `cross` |
| `SHS` | `overview` |
| `SH+` | `overview` |

A page a product does not have throws `page not available for <product>`. Every page's `url` opens it in the dashboard (`https://relstrat.telus.gizmos.run/#<page>`).

## Presentation

Every section says how the dashboard draws it, and every page says how the dashboard groups its sections. The data is unchanged by this; it is a drawing recipe. The consumer picks colours itself from the words in the data (statuses, `read`, `direction`, group names); **no colours or colour names are served**.

### `display`

`display.as` is one of: `cards`, `text`, `quotes`, `list`, `table`, `matrix`, `bars`, `grouped-bars`, `stacked-bars`, `paired-bars`, `line`, `bars-and-line`, `area`, `scatter`, `gantt`, `heatmap`, `donut`. (`area`, `scatter` and `donut` are reserved; the dashboard does not draw them today.) The other keys name the section's own data keys: column keys for table sections, series keys for series sections.

| as | keys | draws |
|---|---|---|
| `cards` | none | a row of KPI cards |
| `text` | none | the narrative paragraphs; `data.read` as the badge. A Health Read lens also carries `chart` (below) |
| `quotes` | none | customer quotes, one block per theme (`title` is the theme, `meta.quotes` the quotes) |
| `list` | none | a bullet list of `title` / `body` |
| `table` | `wide?` | a table; `wide: true` means it scrolls sideways |
| `matrix` | `wide?` | a text matrix (the cross-analysis signal table), rows by lens |
| `bars` | `label`, `value`, `sort` (`as-is` or `desc`) | one horizontal bar per row: `label` is the text column, `value` the number column |
| `grouped-bars` | `label`, `values` (oldest first), `change?` | one cluster per row with one bar per column in `values`; `change` is the column holding the move |
| `stacked-bars` | `label`, `stack`, `total?` | one stacked bar per row, segments from the columns in `stack`. On a series section the bars are the months: `x: "months"` replaces `label`, and `stack` names series keys |
| `paired-bars` | `label`, `pair` (`[earlier, later]`), `reference?` | two bars per row, earlier then later; `reference` is a value to mark with a line (1 for lift) |
| `line`, `area` | `x: "months"`, `y`, `axis?`, `dashed?` | one line per series key in `y`; `dashed` names keys drawn dashed (targets, prior year) |
| `bars-and-line` | `x: "months"`, `bars`, `line`, `axis?` | bars for the keys in `bars`, lines for the keys in `line`; `axis.right` names the keys on a second axis (absent means one shared axis) |
| `scatter` | `label`, `x`, `y`, `note?` | reserved |
| `gantt` | `label`, `lane`, `laneOrder?`, `start`, `end`, `status`, `statusOrder`, `undatedText`, `marker` | a roadmap: one row per `label`, grouped into lanes by `lane` (ordered by `laneOrder`), a bar from `start` to `end` (month labels such as `"Sep 2026"`), shaded by `status` in the order `statusOrder`; rows with no dates are listed by their `undatedText`; `marker: "asOf"` means draw a marker at the page's as-of month |
| `heatmap` | `label`, `cells`, `scale` (`0-100` or `auto`) | a table whose cells in `cells` are shaded by value; `auto` shades within each column, `0-100` on a fixed percentage scale |
| `donut` | reserved | reserved |

Extra keys on `display`:

- `alsoAs: "table"`: the dashboard shows the same section as a chart with a table toggle; the table is the section's `data` shown as rows.
- `orient: "months"` (stacked-bars on a table section): the bars are the columns listed in `stack` (each a month) and the segments are the rows, named by the `label` column; used for the polarity splits.
- `groupBy`: the column whose words group the bars (the root-cause group of a driver); colour them from those words.
- `chart` (on a `text` section): the Health Read lens draws a chart under its narrative. `chart` has the same shape as a `line` display over the section's `data.series` (`y: ["actual", "prior"]`, `dashed: ["prior"]`). The prior-year line exists when the window starts in 2026 or later.

### `groups` and `groupId`

`groups: [{ id, title, sectionIds, open }]` lists the dashboard's collapsible groups in page order. `open` is how the group starts on the dashboard. `title` keeps the dashboard's numbering (`"01 · Health Read — Sep 2026"`). Every section carries `groupId`, the id of its group, or `null` when it is part of the page's top (always open): the KPI cards, the annual churn line and the sub-page links, for example. Sections stay in page order; a group's `sectionIds` follow that order. The Executive Summary page's groups are its four slides (the deck is paged rather than collapsible, so they are all `open: true`). On the Review page the closing sources-and-caveats section is ungrouped and comes last.

### `note` and `doc`

`note` is a sentence a product manager can read under the section title. Anything about data shapes, keys, windows or how the dashboard is built is in `doc` instead, along with a description of the section's `data`.

### One example per `as` value (from real sections)

```js
const hsia = await env.RELIABILITY.get_page({ product: "HSIA", page: "overview", from: "Jan 2026", to: "Sep 2026" });
const sec = (r, id) => r.sections.find((s) => s.id === id);

sec(hsia, "cards").display;                       // { as: "cards" }  (groupId null: the page's top)
sec(hsia, "annual-churn").display;                // { as: "text" }
sec(hsia, "s01-health-01-ticketRate").display;
// { as: "text", chart: { as: "line", x: "months", y: ["actual", "prior"], dashed: ["prior"] } }
sec(hsia, "s03-tickets").display;
// { as: "bars-and-line", x: "months", bars: ["ticketVolume"], line: ["ticketRate"], axis: { right: ["ticketRate"] }, alsoAs: "table" }
sec(hsia, "s03-categories").display;
// { as: "stacked-bars", x: "months", stack: ["cat1","cat2","cat3","cat4"], total: "total", alsoAs: "table" }
sec(hsia, "s06-churn").display;                   // { as: "line", x: "months", y: ["churnRate"], alsoAs: "table" }
sec(hsia, "s04-issues-rising").display;           // { as: "list" }
sec(hsia, "s04-issues-top-issues").display;       // { as: "table", wide: true }
sec(hsia, "s09-timeline").display;
// { as: "gantt", label: "initiative", lane: "pillarName", laneOrder: "pillar", start: "start", end: "end",
//   status: "status", statusOrder: ["Launched","In flight","Ideation","Stalled","On Hold"], undatedText: "timeline", marker: "asOf" }
hsia.groups[0]; // { id: "g01", title: "01 · Health Read — Sep 2026", sectionIds: [...], open: true }

const notes = await env.RELIABILITY.get_page({ product: "HSIA", page: "notes" });
sec(notes, "s03-fixes").display;
// { as: "grouped-bars", label: "name", values: ["Jul 2026","Aug 2026","Sep 2026"], change: "change", alsoAs: "table" }
sec(notes, "s02-domain-mix").display;
// { as: "heatmap", label: "agentDomain", cells: ["d1","d2","d3","d4","d5","d6","d7","d8"], scale: "0-100" }

const sentiment = await env.RELIABILITY.get_page({ product: "HSIA", page: "sentiment" });
sec(sentiment, "s03-attributes").display;  // { as: "bars", label: "attribute", value: "fairOrPoor", sort: "as-is", alsoAs: "table" }
sec(sentiment, "s04-polarity").display;    // { as: "stacked-bars", orient: "months", label: "polarity", stack: ["Jun","Jul","Aug"], alsoAs: "table" }

const cross = await env.RELIABILITY.get_page({ product: "HSIA", page: "cross" });
sec(cross, "s01-matrix").display;          // { as: "matrix", wide: true }

const tvSent = await env.RELIABILITY.get_page({ product: "TV", page: "sentiment" });
sec(tvSent, "s03-quotes").display;         // { as: "quotes" }

const review = await env.RELIABILITY.get_page({ product: "HSIA", page: "review" });
sec(review, "s6-lifts").display;           // { as: "paired-bars", label: "trait", pair: ["lift2025","lift2026"], reference: 1, alsoAs: "table" }
sec(review, "s5-bucket").display;
// { as: "heatmap", label: "category", cells: ["gponSev","outage","downtime","speed","ontCap","reboots","wifi","planChg","tenure"], scale: "auto", wide: true }

const selfServe = await env.RELIABILITY.get_page({ product: "All", page: "selfserve" });
sec(selfServe, "s01-resolved").display;    // { as: "line", x: "months", y: ["actual","target"], dashed: ["target"], alsoAs: "table" }
```

## Methods

### `list_products(args?)`

`args` is ignored; pass `{}` or nothing.

Returns `{ schemaVersion, dashboard, latestMonth, months, churnReportedThrough, products: [{ id, label, tools, covers, note? }], metrics: { key: "label (unit)" }, coversKeys, coversNote }`. Call this first to learn the valid products, months and metric keys.

```js
const p = await env.RELIABILITY.list_products({});
p.products.map((x) => `${x.id}:${x.covers.join("+")}`); // ["All:hsiawest+pfe+optikwest+shs10", "HSIA:hsiawest+pfe", ...]
```

### `list_pages({ product? })`

The dashboard's navigation as data. `product` (optional) narrows to one product.

Returns `{ schemaVersion, dashboard, latestMonth, kinds, pages: [{ id, label, product, nav, url, groups, sections: [{ id, title, kind, display, groupId }] }], notes }`. The section list is exactly what `get_page` returns for that page called with default arguments, in page order, with the same `display`, `groupId` and `groups`.

```js
const nav = await env.RELIABILITY.list_pages({ product: "TV" });
nav.pages.map((pg) => pg.id); // ["overview", "platforms", "notes", "sentiment", "cross"]
nav.pages[0].url;             // "https://relstrat.telus.gizmos.run/#TV"
```

### `get_page({ product, page, from?, to? })`

Everything the page shows, in page order.

- `product` (required), `page` (required): a pair from `list_pages`.
- `from`, `to` (optional): month labels, same rules as `get_kpi_series`. Chart series are cut to the window, and `to` is the month the KPI cards and the Health Read are evaluated at (the dashboard's "Reviewing" month). Pages built from a fixed analysis window (`notes`, `sentiment`, `cross`, `review`, `ffps`) ignore `from`/`to`.

Returns `{ schemaVersion, product, page, label, url, asOf, window: { from, to } | null, scope, groups: [{ id, title, sectionIds, open }], sections: [{ id, title, kind, display, groupId, note?, doc, data }] }`. `note` is one reader-facing sentence or two to show under the section title; `doc` is the technical description of the section's data (shapes, keys, windows). `kind` is one of five, and `data` follows the kind:

| kind | data | used for |
|---|---|---|
| `cards` | `[{ label, value, unit, month, mom: { delta, pct?, direction, read }, yoy: { same }, note? }]` | every row of KPI / stat cards. `delta` is the absolute move in the card's unit (per 100 for rates, points for percentages, count for volumes); `pct` is the relative move for volumes; `read` is `favourable`, `unfavourable` or `flat` |
| `series` | `{ months: [...], series: { key: { label, unit, values: [number \| null] } } }` | every chart over months (one value per month, `null` = not reported) |
| `table` | `{ columns: [{ key, label, unit? }], rows: [{ ... }] }` | every table, and charts whose x-axis is not months (the Review's bar charts) |
| `text` | `{ read?, paragraphs: [string] }` | narratives; `read` is the page's own word for the month (`Favourable`, `Unfavourable`, `Level`, `Improving`, `Deteriorating`, `Mixed`, `Steady`) |
| `list` | `[{ title, body?, meta? }]` | bullets, movers, recommendations, commentary themes, quotes |

Nothing shown on a page is left out: every chart comes through as `series`, every narrative as `text`, every table as `table`, every card row as `cards`, every bullet list as `list`. Section `id`s are stable; titles carry the page's own section number and heading.

A product's `overview` page carries, in order, after the top (cards, annual churn, sub-page links): its KPI `cards`; the annual churn line (`text`); the Health Read lenses in the dashboard's switcher order, one section each (`text`, titled `01 · <product> · <lens> · <metric>`, with `data.read` the lens's own read, `data.paragraphs` the hero statement and its narrative, and additionally `data.series` holding the lens chart in the `series` shape); the Commentary (`list`) and Additional Monthly Context (`text`, with the month's verdict as `read`); then Calls, Tickets, Ticket issues & movers, Repairs, Churn, B2B, Initiatives and Initiative timeline as the page shows them.

One example per kind:

```js
const pg = await env.RELIABILITY.get_page({ product: "HSIA", page: "overview", from: "Jan 2026", to: "Sep 2026" });

// cards
pg.sections[0].data[2];
// { label: "Ticket rate per 100 subs", value: 2.66, unit: "per 100 subscribers", month: "Sep 2026",
//   mom: { delta: -0.1, direction: "down", read: "favourable" }, yoy: { delta: 0.38, direction: "up", read: "unfavourable" } }

// text (a Health Read lens; also carries data.series, drawn as display.chart)
const lens = pg.sections.find((s) => s.id.startsWith("s01-health-01"));
lens.data.read;          // "Favourable"
lens.data.paragraphs[0]; // "Ticket rate per 100 subs was 2.66 in Sep'26, 0.1 per 100 lower MoM, which is favourable."
lens.data.series.months; // ["Jan 2026", ..., "Sep 2026"]

// series
const tickets = pg.sections.find((s) => s.id === "s03-tickets");
tickets.data.series.ticketRate.values; // [2.39, 2.17, 2.50, ...]

// table
const issues = pg.sections.find((s) => s.id.endsWith("-issues-top-issues"));
issues.data.columns.map((c) => c.key); // ["issue", "group", "painPoint", "latest", ...]
issues.data.rows[0].issue;             // "Connectivity › No Dataflow"

// list
const rising = pg.sections.find((s) => s.id.endsWith("-issues-rising"));
rising.data[0]; // { title: "Connectivity › Slow Speeds", body: "+271 MoM (+4.2%) · Slow Speeds", meta: {...} }
```

Other pages:

```js
const review = await env.RELIABILITY.get_page({ product: "HSIA", page: "review" });
review.sections.map((s) => s.id); // ["kpis", "kpis-table", "header", "in-short", "s1-stats", "s2-method", "s2-drivers", ...]

const deck = await env.RELIABILITY.get_page({ product: "All", page: "executive" });
deck.sections.filter((s) => s.id.startsWith("slide1")).map((s) => s.title); // one cards section per product

const notes = await env.RELIABILITY.get_page({ product: "TV", page: "notes" });
notes.sections.find((s) => s.id === "s01-agent-categories").data.rows[0]; // { name: "STB No Boot", "Jul 2026": 6711, "Aug 2026": 7097, "Sep 2026": 8514, change: 1417, changePct: 20, share: 22.8 }
```

### `get_kpi_series({ product, metrics?, from?, to? })`

- `product` (required): one of the KPI products above.
- `metrics` (optional): array of metric keys; omit for all nine.
- `from`, `to` (optional): month labels; default `"Jan 2025"` to the latest month. Order does not matter.

Returns `{ schemaVersion, product, months: [...], series: { metricKey: { label, unit, values: [number | null, ...] } } }`, one value per month in `months`. Null means not reported for that month.

```js
const s = await env.RELIABILITY.get_kpi_series({ product: "TV", metrics: ["ticketRate", "ticketVolume"], from: "Jan 2026", to: "Sep 2026" });
s.series.ticketRate.values; // [3.27, 2.89, 3.26, ...] per 100 subscribers
```

### `get_kpi_summary({ product, month? })`

- `product` (required): one of the KPI products.
- `month` (optional): evaluate as of this month; default the latest.

Returns `{ schemaVersion, product, asOf, kpis: { metricKey: { label, unit, latest, month, mom: { from, to, direction, assessment, ... }, yoy: {...} } }, annualChurn, notes }`, which is what the dashboard's KPI cards show. Rate changes are absolute per-100 differences; volume changes carry absolute and percentage change.

```js
const k = await env.RELIABILITY.get_kpi_summary({ product: "HSIA" });
k.kpis.ticketRate.latest; // 2.66
```

### `get_ticket_issues({ product })`

- `product` (required): `HSIA`, `TV` or `SHS`.

Returns `{ schemaVersion, product, latestMonth, priorMonth, priorYear, monthlyTotal, topIssues: [{ issue, group, latest, priorMonth, priorYear, mom, yoy, painPoint? }], rising: [...], falling: [...], categories, categorySource, biggestRiserByMonth, notes }`. `rising` and `falling` are the biggest month-over-month movers. HSIA rows also carry `painPoint`.

```js
const t = await env.RELIABILITY.get_ticket_issues({ product: "TV" });
t.rising[0].issue; // "STB No Boot › Stuck on Initializing"
```

### `get_initiatives({ product?, status?, theme?, pillar? })`

All arguments optional. `product` is `HSIA`, `TV` or `SHS`; `status` is one of the statuses above; `theme` is an exact theme name (case-insensitive); `pillar` is 1 to 4.

Returns `{ schemaVersion, count, pillars: [{ n, name, sub }], initiatives: [{ product, name, pillar, pillarName, theme, status, timeline, prime, impact, issues, description }], source }`. `impact` (`High`, `Medium`, `Low`) is set for HSIA only.

```js
const i = await env.RELIABILITY.get_initiatives({ product: "HSIA", status: "In flight" });
i.count;
```

### `get_tv_platforms({ from?, to? })`

Optional month range as in `get_kpi_series`.

Returns `{ schemaVersion, months, platforms: [{ id, name, platform, tickets, ticketRate, repairs, repairRate, subscriberBase, repairSwaps2026 }], mixedUsage: { name, definition, subscriberBase }, notes }` for Optik TV Legacy (Mediaroom) and TV Evolution (OPUS), plus the mixed-usage subscriber count.

```js
const tv = await env.RELIABILITY.get_tv_platforms({ from: "Jul 2026" });
```

### `get_self_serve(args?)`

`args` is ignored.

Returns `{ schemaVersion, months, metrics: { resolved, webAppRate, ivrRate, cxEasy, cxSent, churn, deacts: { label, actuals: [...], targets2026: [...] | null } }, source }`, one value per month in `months`.

```js
const ss = await env.RELIABILITY.get_self_serve({});
ss.metrics.resolved.actuals.at(-1); // 48614
```

### `get_health_commentary({ product })`

- `product` (required): `HSIA`, `TV`, `SHS` or `SH+`.

Returns `{ schemaVersion, product, month, commentary: { bullets: [string], themes: [{ theme, share, rootCauses, inProgress, relatedInitiatives: [{ name, status?, timeline?, prime?, theme?, impact? }], note }] } | string, recurringIssues: [...] }`. `commentary` is the string `"No commentary has been added for this month."` when none exists (SHS and SH+ today).

```js
const c = await env.RELIABILITY.get_health_commentary({ product: "TV" });
c.commentary.themes[0].rootCauses;
```

### `get_friction_free_program({ section? })`

- `section` (optional): one of the FFPS sections above; omit for the whole update.

Returns the Friction Free Product Systems program update (August 2026 edition): `{ schemaVersion, asOf, period, burndown, benefits, billingTickets, finance, delivered, pipeline, pipelineNote, source }`, or `{ schemaVersion, asOf, period, section, data, note?, source }` when a section is requested.

```js
const f = await env.RELIABILITY.get_friction_free_program({ section: "burndown" });
f.data.crs.points; // open CR volume at start of year, end of Q2, end of August
```

### `get_sources(args?)`

`args` is ignored.

Returns `{ schemaVersion, dashboard, latestMonth, sources: { kpis, calls, tickets, initiatives, tvPlatforms, b2b, selfServe, shPlus, frictionFree } }`, the workbook, tab and scope behind each dataset.

```js
const src = await env.RELIABILITY.get_sources({});
```

## Errors

- `product must be one of ...`, `page must be one of ...`, `Unknown month: ...`, `Unknown metric: ...`, `Unknown section: ...`: validation, thrown with the tool's message.
- `page not available for <product>`: the product has no such page (see the table above).
- `caller not permitted`: only if the producer has restricted the binding to an allow-list of app ids (it is open to the org today).

Data is frozen into the worker at each deploy from the dashboard's `site/App.jsx`, so a reply reflects the dashboard as last deployed. Health Read commentary edits made in a browser are local to that browser and are not served.
