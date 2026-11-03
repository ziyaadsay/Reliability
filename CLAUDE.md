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
  month's "Executive Summary" tab, gid 610989644 for Sept 2026), not the Churn Measurement 2026
  workbook's Initiatives tab. TV and SHS initiatives still use the Churn Measurement workbook.
  Re-pull from it into `INITIATIVES` in `site/App.jsx`: map "Launched monitoring" to "Launched",
  and keep the Health Read and HSIA Review initiative lists in step with any new or renamed projects.
