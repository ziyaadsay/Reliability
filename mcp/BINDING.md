# Reliability binding

The Reliability Strategy dashboard's data, served to other Gizmos apps over RPC. This is the same data the `relstrat-mcp` MCP server serves at `/mcp`; every method below is one MCP tool, with the same name, the same arguments as one plain object, and the same reply as the tool, returned as an object rather than JSON text. A tool error is thrown as an `Error` whose message is the tool's error text.

Access is restricted to the apps listed in the producer's `BINDING_CALLERS` var. Any other caller gets `Error: caller not permitted` before anything else runs.

## Declaring it

```toml
# wrangler.toml of the calling gizmo
[[gizmos_custom_binding]]
binding = "RELIABILITY"
id      = "gzb_..."        # from `gizmos binding list`, entrypoint Reliability
```

```js
const summary = await env.RELIABILITY.get_kpi_summary({ product: "HSIA" });
// identical, raw protocol form:
const same = await env.RELIABILITY.call("get_kpi_summary", [{ product: "HSIA" }]);
```

## Valid keys

- **Products.** `All`, `HSIA`, `TV`, `SHS`, `SH+` for `get_kpi_series` and `get_kpi_summary`. `HSIA`, `TV`, `SHS` for `get_ticket_issues` and `get_initiatives`. `HSIA`, `TV`, `SHS`, `SH+` for `get_health_commentary`. `All` is the HSIA + TV + SHS rollup with rates blended over the combined base; SH+ is excluded from it.
- **Months.** Labels of the form `"Jan 2025"` through `"Sep 2026"` (the latest reported month). `list_products` returns the full list under `months` and the latest under `latestMonth`. Churn is reported one month behind, to `"Aug 2026"`.
- **Metrics** (for `get_kpi_series`): `callsOffered`, `callsAnswered`, `ticketVolume`, `ticketRate`, `repairVolume`, `repairRate`, `churnRate`, `subBase`, `b2bVoC`. Ticket, repair and churn rates are per 100 subscribers; changes in them are absolute differences in that unit, not percentages. `b2bVoC` is a percentage where lower is better.
- **Initiative statuses.** `Launched`, `In flight`, `On Hold`, `Stalled`, `Ideation` (case-insensitive).
- **FFPS sections.** `burndown`, `benefits`, `billingTickets`, `finance`, `delivered`, `pipeline`.

## Methods

### `list_products(args?)`

`args` is ignored; pass `{}` or nothing.

Returns `{ dashboard, latestMonth, months, churnReportedThrough, products: [{ id, label, tools, note? }], metrics: { key: "label (unit)" } }`. Call this first to learn the valid products, months and metric keys.

```js
const p = await env.RELIABILITY.list_products({});
p.products.map((x) => x.id); // ["All", "HSIA", "TV", "SHS", "SH+"]
```

### `get_kpi_series({ product, metrics?, from?, to? })`

- `product` (required): one of the KPI products above.
- `metrics` (optional): array of metric keys; omit for all nine.
- `from`, `to` (optional): month labels; default `"Jan 2025"` to the latest month. Order does not matter.

Returns `{ product, months: [...], series: { metricKey: { label, unit, values: [number | null, ...] } } }`, one value per month in `months`. Null means not reported for that month.

```js
const s = await env.RELIABILITY.get_kpi_series({ product: "TV", metrics: ["ticketRate", "ticketVolume"], from: "Jan 2026", to: "Sep 2026" });
s.series.ticketRate.values; // [3.27, 2.89, 3.26, ...] per 100 subscribers
```

### `get_kpi_summary({ product, month? })`

- `product` (required): one of the KPI products.
- `month` (optional): evaluate as of this month; default the latest.

Returns `{ product, month, kpis: { metricKey: { label, unit, latest, month, mom: { from, to, direction, assessment, ... }, yoy: {...} } } }`, which is what the dashboard's KPI cards show. Rate changes are absolute per-100 differences; volume changes carry absolute and percentage change.

```js
const k = await env.RELIABILITY.get_kpi_summary({ product: "HSIA" });
k.kpis.ticketRate.latest; // 2.66
```

### `get_ticket_issues({ product })`

- `product` (required): `HSIA`, `TV` or `SHS`.

Returns `{ product, month, priorYearMonth, topIssues: [{ issue, group, latest, priorYear, prev, mom, yoy, painPoint? }], rising: [...], falling: [...], categories: {...}, callouts: [...] }`. `rising` and `falling` are the biggest month-over-month movers. HSIA rows also carry `painPoint`.

```js
const t = await env.RELIABILITY.get_ticket_issues({ product: "TV" });
t.rising[0].issue; // "STB No Boot › Stuck on Initializing"
```

### `get_initiatives({ product?, status?, theme?, pillar? })`

All arguments optional. `product` is `HSIA`, `TV` or `SHS`; `status` is one of the statuses above; `theme` is an exact theme name (case-insensitive); `pillar` is 1 to 4.

Returns `{ count, pillars: [{ n, name, sub }], initiatives: [{ product, name, pillar, pillarName, theme, status, timeline, prime, description, impact? }] }`. `impact` (`H`, `M`, `L`) is set for HSIA only.

```js
const i = await env.RELIABILITY.get_initiatives({ product: "HSIA", status: "In flight" });
i.count;
```

### `get_tv_platforms({ from?, to? })`

Optional month range as in `get_kpi_series`.

Returns `{ months, platforms: [{ id, name, tickets, ticketRate, repairs, repairRate, base, swaps2026 }], mixed: { name, base }, notes }` for Optik TV Legacy (Mediaroom) and TV Evolution (OPUS), plus the mixed-usage subscriber count.

```js
const tv = await env.RELIABILITY.get_tv_platforms({ from: "Jul 2026" });
```

### `get_self_serve(args?)`

`args` is ignored.

Returns `{ months, metrics: { resolved, webAppRate, ivrRate, cxEasy, cxSent, churn, deacts: { label, actuals: [...], targets2026: [...] | null } }, source }`, one value per month in `months`.

```js
const ss = await env.RELIABILITY.get_self_serve({});
ss.metrics.resolved.actuals.at(-1); // 48614
```

### `get_health_commentary({ product })`

- `product` (required): `HSIA`, `TV`, `SHS` or `SH+`.

Returns `{ product, month, commentary: { bullets: [string], themes: [{ theme, share, rootCauses, inProgress, relatedInitiatives: [{ name, status?, timeline?, prime?, theme?, impact? }], note }] } | string, recurringIssues: [...] }`. `commentary` is the string `"No commentary has been added for this month."` when none exists (SHS and SH+ today).

```js
const c = await env.RELIABILITY.get_health_commentary({ product: "TV" });
c.commentary.themes[0].rootCauses;
```

### `get_friction_free_program({ section? })`

- `section` (optional): one of the FFPS sections above; omit for the whole update.

Returns the Friction Free Product Systems program update (August 2026 edition): `{ asOf, period, burndown, benefits, billingTickets, finance, delivered, pipeline, pipelineNote, source }`, or `{ asOf, period, section, data, note?, source }` when a section is requested.

```js
const f = await env.RELIABILITY.get_friction_free_program({ section: "burndown" });
f.data.crs.points; // open CR volume at start of year, end of Q2, end of August
```

### `get_sources(args?)`

`args` is ignored.

Returns `{ dashboard, latestMonth, sources: { kpis, calls, tickets, initiatives, tvPlatforms, b2b, selfServe, shPlus, frictionFree } }`, the workbook, tab and scope behind each dataset.

```js
const src = await env.RELIABILITY.get_sources({});
```

## Errors

- `caller not permitted`: the calling app is not in `BINDING_CALLERS`.
- `product must be one of ...`, `Unknown month: ...`, `Unknown metric: ...`, `Unknown section: ...`: the tool's own validation, thrown with the tool's message.

Data is frozen into the worker at each deploy from the dashboard's `site/App.jsx`, so a reply reflects the dashboard as last deployed.
