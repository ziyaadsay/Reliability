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
- Calls offered rate per 100 subs is calls offered over the subscriber base (`DATA.callsRate`, derived in `deriveAll` for All, HSIA, TV, SHS and SH+; the HSIA West,
  TQ ILEC and PFE pages compute it from their own calls and base). It leads the Health Read metric list, followed by Calls offered, and is on every product tile row.
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
  (Look 2188) Grand Total (equal to the KPI tab PFE column), repairs from the "Looker Repairs (Kam/Jason's new view)" tab (HS PFE row, WOID complete month), and base and
  churn from the PFE column of each month on the "Reliability/Deact KPIs" tab. Refresh it with the monthly KPI update; PFE rates are
  volume over the PFE base per 100.
- TV scope: the TV ticket volume and rate (KPI tab) are Optik TV (Legacy) + TV Evolution + Pik TV, and TV calls
  offered/answered are IPTV West + TV+ (OPUS) + PIK + PFE - IPTV + TQ ILEC - IPTV (TS Calls Offered by Product,
  Actuals tabs). Pik TV (`TV_PIK`) is a minor line: it is in the volumes and rates and shown on By Platform for
  tickets only, but it is excluded from the Looker ticket categories, the TV analysis sections and the Oct Review.
  The archived TV Review keeps its own snapshot of the earlier KPI series (`TV_REVIEW_FROZEN`).
  Platform repairs (`TV_PLATFORMS`): 2026 from the 2026 Redwood Scorecard, Repair Tracking Detail tab; 2025 from the 2025 Redwood
  Scorecard + Metrics workbook, Weekly Repair Projections tab, month-end (ME) columns (Mediaroom = IPTV + QC ILEC IPTV, OPUS = OPUS).
  The Redwood Reboot - Repairs tab has Oct to Dec 2025 as forecast, so do not use it for those months.
- Self-serve (Sweepr, `SWEEPR` in `site/App.jsx`, the Self-serve page and `get_self_serve`) is updated from the Self Assure
  metrics MCP (https://self-assure-metrics-mcp.telus.gizmos.run/mcp; plain curl works through the Gizmos network secret:
  `initialize`, then `tools/call` `get_metric`). Map `resolved_sessions_ivr_web` to `resolved`, `resolution_rate_web_only`
  to `webAppRate`, `cx_easy_to_follow` to `cxEasy`, `cx_comment_sentiment` to `cxSent`, `churn_rate_sweepr_involved` to
  `churn` and `deacts_saved` to `deacts`. Re-read every month (the source restates earlier months; the Nov pull restated churn and deacts for Jan to Sep and added October, with churn and deacts October as source estimates). It no longer comes from
  the HSIA West TCS PLT Charter workbook; the B2B rows still do. The CCAI IVR rate is not in the MCP and is left as is.
- HSIA › HSIA West (`hsiawest`, `HsiaWestPage`, `HSIA_WEST`) is HSIA West on its own, from the TS Calls
  Offered by Product workbook (calls offered and the HSIA West subscriber base), with tickets from the Churn
  Measurement 2026 workbook's "HSIA Recategorization Looker" tab, "HSIA West" block (Look 2186) Grand Total. Repairs (Jan 2025 on) come from the Churn Measurement 2026
  workbook's "Looker Repairs (Kam/Jason's new view)" tab (Look 2190, repair jobs by WOID complete month): HS WEST COPPER
  plus HS WEST FIBRE. The same tab has HS QC ILEC and HS PFE rows for later use. The KPI tab reports HSIA West and TQ ILEC together, so the churn card shows
  "n/a" until the source splits it.
- HSIA › TQ ILEC (`hsiatq`, `HsiaTqPage`, `TQ_ILEC`) mirrors the HSIA West page for TQ ILEC high speed: calls
  ("TQ ILEC - HSIA") and base from the TS Calls Offered by Product workbook, tickets from the "HSIA Recategorization
  Looker" tab's "HSIA TQ ILEC" block Totals row (Churn Measurement 2026 workbook), repairs
  from the "Looker Repairs (Kam/Jason's new view)" tab, HS QC ILEC row (Jan 2025 on).
  HSIA West + TQ ILEC base equals the scorecard HSIA base. Churn shows "n/a" (not split in the source).
- HSIA › Oct Review (`hsiaoctreview`, `HsiaOctReviewPage`, `HSIA_OCT_REVIEW`) mirrors the TV Oct Review, with the same Present
  slide mode (10 slides, with no group-comparison table, PFE or growth-since-October slides; the first is the In short in the purple cover style, titled "HSIA in October and trends", and shows a browser-saved edit if there is one; the old cover statement is a banner on "October at a glance"), and sits below Cross Analysis: HSIA overall and HSIA West, TQ ILEC and PFE separately for calls, tickets, repairs and the deact rate, plus slow speeds.
  The deact rate is the go/national Churn % (the page does not estimate deact volumes). Slow-speed tickets come from the
  "Slow Speeds" rows of the HSIA All / West / TQ ILEC / PFE blocks of the HSIA Recategorization Looker tab. Slow-speed
  calls and repairs are not in the workbook yet; the page says so. Like the TV Oct Review, it is a current review.
- The In short on the HSIA Oct Review is editable (`CommentaryEditor`, the same editor as the Health Read commentary): the
  text generated in `shortItems` is the published version; a viewer's edits are saved in their own browser (localStorage,
  key "HSIA Oct Review: In short" / "Oct 2026") and can be reset to the published text. Edits are not shared between viewers.
- The trend charts on the HSIA Oct Review page (not the slides) are click to enlarge: `zplot` wraps `plot` and opens a modal
  (state `zoomChart` in the main component, closed by Esc, a click outside or the Close button) that redraws the same series large,
  with every month labelled and every point valued.
- The HSIA Oct Review shows the deact rate (HSIA and PFE go/national Churn %, Reliability/Deact KPIs tab, per 100 subs; changes
  are absolute differences) (there is no estimated deact volume). HSIA West and TQ ILEC have no deact rate (not split in the source).
- The slow-speed tickets chart on the HSIA Oct Review has a Nov 2025 stage: "Process change & Ticket Code Introduced for Incompatible
  equipment" (`slowMarks` / `slowNote`; `plot` draws any `marks` as a dashed line with a label). It is on the page, the enlarged view and the slide.
- On the HSIA Oct Review the "HSIA West, TQ ILEC and PFE separately" section is an accordion (`details.hb-sec`), closed until clicked.
- Speed & equipment initiatives follow the "Speed & Equipment compatibility" rows of the HSIA initiatives sheet. "CloudCheck Speed Test
  Server Capacity" is no longer a separate project there: it is merged into "Cloudcheck Server upgrades & Speed Test Improvements".
  "How Speed Works Campaign" is Wi-Fi theme in the sheet but is filed under Speed & equipment on the dashboard, at the user's request.
