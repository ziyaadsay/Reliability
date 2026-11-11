# Reliability Strategy dashboard

## Deploying changes

Always make updates live unless the user says not to. After committing and pushing a change to the
dashboard (`site/`) or MCP server (`mcp/`):

1. Work on and push to `relstrat`, the repo's default branch (there is no `main`). Pull and merge
   `relstrat` before pushing: other sessions push and deploy from it, and a deploy only contains
   what is on the branch it runs from. Never deploy from a side branch, it overwrites the live site
   with a build that lacks the other sessions' work.
   Then trigger both workflows with `workflow_dispatch` on `relstrat`:
   - "Deploy to Gizmos" (`deploy-gizmos.yml`), with input `publish=publish`. Goes live at
     https://relstrat.telus.gizmos.run/.
   - "Deploy MCP server to Gizmos" (`deploy-mcp.yml`). Updates `relstrat-mcp` in User Auth
     mode (`gizmos push --mcp --auth-mode user_auth`) and verifies
     `/.well-known/oauth-protected-resource`. Never push `relstrat-mcp` without
     `--auth-mode user_auth`: it resets the app to Dev Keys mode and the connector loads no tools.
   The dashboard is served by a worker (`site/worker/build.mjs`) so the Health Read "Ask a question
   about the data" box can call the Gizmos AI binding. `hosting` defaults to `worker`: never deploy
   `relstrat` with `hosting=static`, it drops the Ask box. Use `app=relstrat-dev` for test copies.
2. Wait for both runs to finish and confirm they succeeded before reporting the update as live.

Changes that touch neither `site/` nor `mcp/` (docs, this file) don't need a deploy.

## Conventions

- Ticket, repair and churn rates are reported per 100 subscribers, not as percentages. Changes in
  those rates are absolute differences in that unit (e.g. 0.05), not basis points. Use `fmtRate` and
  `deltaRate` in `site/App.jsx`. Survey and notes-analysis shares stay as percentages with bps moves.
- The Looker ticket categories (`LOOKER`, `LOOKER_EXTRA`, `OVERVIEW_ISSUES`) can be refreshed a month
  ahead of the KPI tabs. Their series align with `LOOKER_MONTHS` (currently the same as `MONTHS`) and
  their issue tables use the `LOOKER_*` labels; `MONTHS` / `LATEST` and every KPI series stay at the
  last month the "Reliability/Deact KPIs" tab reports. Move `MONTHS` forward only when that tab has the
  month. Series whose source lags (SH+, self-serve, B2B VoC, the TS calls split, TV platform tickets
  and swaps) are padded with `null` until their month lands.
- HSIA initiatives come from the "Product Technical | Churn & VOC Projects Impact" Google Sheet
  (https://docs.google.com/spreadsheets/d/1hFqUsmWcpEBSlO8GV-zvRfKpj8mp9lTo_5Trm03lUac, current
  "2026 Executive Summary." tab, gid 610989644; it was renamed from the monthly "Sept 2026 Executive
  Summary." tab and is now a single running tab), not the Churn Measurement 2026
  workbook's Initiatives tab. TV and SHS initiatives still use the Churn Measurement workbook.
  Re-pull from it into `INITIATIVES` in `site/App.jsx`: map "Launched monitoring" to "Launched",
  and keep the Health Read and HSIA Review initiative lists in step with any new or renamed projects.
- The **Archive** menu item is always the last menu option, set off by a divider, and hosts completed
  reviews and miscellaneous pages (`ARCHIVE_ITEMS`, `CHILD_PAGES.archive` in `site/App.jsx`). Archived
  pages are frozen: do not roll them forward with the monthly update. The HSIA Review (`hsiabrief`) is
  archived and pinned to Q3 2026 via `HSIA_REVIEW_LATEST`; it ignores `LATEST`. The TV Review
  (`tvbrief`, Stuck on Initializing) is archived too, pinned via `TV_REVIEW_LATEST`; TV › Oct Review
  (`tvoctreview`, `OCT_REVIEW`) is the current TV review.
- HSIA › PFE (PureFibre East, `hsiapfe`, `HsiaPfePage`, `PFE` in `site/App.jsx`) is a separate series from
  HSIA West + TQ ILEC: calls from the TS Calls Offered by Product workbook ("PFE - HSIA" field), and
  tickets from the Churn Measurement 2026 workbook's "HSIA Recategorization Looker" tab, "HSIA PFE" block
  (Look 2188) Grand Total (equal to the KPI tab PFE column), and base, repairs and churn from the PFE column of each
  month on its "Reliability/Deact KPIs" tab. Refresh it with the monthly KPI update; PFE rates are
  volume over the PFE base per 100.
- TV scope: the TV ticket volume and rate (KPI tab) are Optik TV (Legacy) + TV Evolution + Pik TV, and TV calls
  offered/answered are IPTV West + TV+ (OPUS) + PIK + PFE - IPTV + TQ ILEC - IPTV (TS Calls Offered by Product,
  Actuals tabs). Pik TV (`TV_PIK`) is a minor line: it is in the volumes and rates and shown on By Platform for
  tickets only, but it is excluded from the Looker ticket categories, the TV analysis sections and the Oct Review.
  The archived TV Review keeps its own snapshot of the earlier KPI series (`TV_REVIEW_FROZEN`).
- Self-serve (Sweepr, `SWEEPR` in `site/App.jsx`, the Self-serve page and `get_self_serve`) is updated from the Self Assure
  metrics MCP (https://self-assure-metrics-mcp.telus.gizmos.run/mcp; plain curl works through the Gizmos network secret:
  `initialize`, then `tools/call` `get_metric`). Map `resolved_sessions_ivr_web` to `resolved`, `resolution_rate_web_only`
  to `webAppRate`, `cx_easy_to_follow` to `cxEasy`, `cx_comment_sentiment` to `cxSent`, `churn_rate_sweepr_involved` to
  `churn` and `deacts_saved` to `deacts`. Re-read every month (the source restates earlier months; the Nov pull restated churn and deacts for Jan to Sep and added October, with churn and deacts October as source estimates). It no longer comes from
  the HSIA West TCS PLT Charter workbook; the B2B rows still do. The CCAI IVR rate is not in the MCP and is left as is.
- HSIA › HSIA West (`hsiawest`, `HsiaWestPage`, `HSIA_WEST`) is HSIA West on its own, from the TS Calls
  Offered by Product workbook (calls offered and the HSIA West subscriber base), with tickets from the Churn
  Measurement 2026 workbook's "HSIA Recategorization Looker" tab, "HSIA West" block (Look 2186) Grand Total. Repairs come from the "2026
  Redwood Scorecard + Metrics" workbook, "Repair Tracking Detail" tab, HSIA West row (2026 only). 2025 is blank on purpose: the
  "Redwood Reboot - Repairs" tab has a West - HSIA row, but Oct to Dec 2025 there are forecast, and the user asked to remove 2025. The KPI tab reports HSIA West and TQ ILEC together, so the churn card shows
  "n/a" until the source splits it.
- HSIA › TQ ILEC (`hsiatq`, `HsiaTqPage`, `TQ_ILEC`) mirrors the HSIA West page for TQ ILEC high speed: calls
  ("TQ ILEC - HSIA"), normalized call tickets and base from the TS Calls Offered by Product workbook, repairs
  from the 2026 Redwood Scorecard + Metrics "Repair Tracking Detail" tab, "TQ ILEC HS" row (2026 only).
  HSIA West + TQ ILEC base equals the scorecard HSIA base. Churn shows "n/a" (not split in the source).
