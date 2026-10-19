# Reliability Strategy dashboard

## Deploying changes

Always make updates live unless the user says not to. After committing and pushing a change to the
dashboard (`site/`) or MCP server (`mcp/`):

1. Trigger both workflows from the working branch with `workflow_dispatch` (they only run
   automatically on pushes to `main`, and this repo has no `main`):
   - "Deploy to Gizmos" (`deploy-gizmos.yml`), with input `publish=publish`. Goes live at
     https://relstrat.telus.gizmos.run/.
   - "Deploy MCP server to Gizmos" (`deploy-mcp.yml`). Updates `relstrat-mcp`.
2. Wait for both runs to finish and confirm they succeeded before reporting the update as live.

Changes that touch neither `site/` nor `mcp/` (docs, this file) don't need a deploy.

## Conventions

- Ticket, repair and churn rates are reported per 100 subscribers, not as percentages. Changes in
  those rates are absolute differences in that unit (e.g. 0.05), not basis points. Use `fmtRate` and
  `deltaRate` in `site/App.jsx`. Survey and notes-analysis shares stay as percentages with bps moves.
