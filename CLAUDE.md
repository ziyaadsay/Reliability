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
     mode through the patched CLI (`mcp/patch-cli.mjs`, `GIZMOS_AUTH_MODE=user_auth`) and
     verifies `/.well-known/oauth-protected-resource`. Never push `relstrat-mcp` with the stock
     `gizmos` CLI: it resets the app to Dev Keys mode and the connector loads no tools.
2. Wait for both runs to finish and confirm they succeeded before reporting the update as live.

Changes that touch neither `site/` nor `mcp/` (docs, this file) don't need a deploy.

## Conventions

- Ticket, repair and churn rates are reported per 100 subscribers, not as percentages. Changes in
  those rates are absolute differences in that unit (e.g. 0.05), not basis points. Use `fmtRate` and
  `deltaRate` in `site/App.jsx`. Survey and notes-analysis shares stay as percentages with bps moves.
- HSIA initiatives come from the "Product Technical | Churn & VOC Projects Impact" Google Sheet
  (https://docs.google.com/spreadsheets/d/1hFqUsmWcpEBSlO8GV-zvRfKpj8mp9lTo_5Trm03lUac, current
  month's "Executive Summary" tab, gid 610989644 for Sept 2026), not the Churn Measurement 2026
  workbook's Initiatives tab. TV and SHS initiatives still use the Churn Measurement workbook.
  Re-pull from it into `INITIATIVES` in `site/App.jsx`: map "Launched monitoring" to "Launched",
  and keep the Health Read and HSIA Review initiative lists in step with any new or renamed projects.
