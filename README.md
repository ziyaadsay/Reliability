# Reliability Strategy dashboard

Single-file React dashboard (`site/App.jsx`) for TELUS product reliability,
deployed to Gizmos at https://relstrat.telus.gizmos.run/.

## Deploying

`.github/workflows/deploy-gizmos.yml` builds the site with Vite and pushes the
`site/dist` output to the `relstrat` app in the `telus` org using the `gizmos`
CLI. It runs on every push to `main` that touches `site/`, and can be run by
hand from the Actions tab (choose **publish** to go live or **save** to store a
version without publishing; unpublished versions are made live from the app's
Versions tab in the Gizmos hub).

One-time setup: add a repository secret named `GIZMOS_API_KEY` containing a
`gzm_` key generated at https://gizmos.run/settings.

## Local development

```bash
cd site
npm ci
npm run dev      # http://localhost:5173
npm run build    # writes site/dist
```

## Health Read commentary

The Commentary section of each product's Health Read is a rich text editor
(bold, italic, underline, bullets, numbering, undo and redo). The published
text for the latest month is `HEALTH_COMMENTARY` in `site/App.jsx`, and it is
what everyone sees and what the MCP server returns. Edits made in the dashboard
are saved in the editing user's own browser (local storage, per product and
month) and are not shared with other viewers. To publish new commentary for
everyone, update `HEALTH_COMMENTARY` and deploy. "Reset to published" in the
editor drops a user's local edits. All commentary HTML is sanitised before it
is saved or shown.

## MCP server

`mcp/` is a Model Context Protocol server that exposes the dashboard's data to
other agents and tools (`https://relstrat-mcp.telus.gizmos.run/mcp`, Streamable
HTTP, JSON-RPC 2.0). `mcp/build.mjs` slices the data constants straight out of
`site/App.jsx` and appends `mcp/src/server.js`, so the server always carries the
same numbers as the deployed dashboard; it has no dependencies and no bundler.

Tools: `list_products`, `get_kpi_series`, `get_kpi_summary`,
`get_ticket_issues`, `get_initiatives`, `get_tv_platforms`, `get_self_serve`,
`get_health_commentary`, `get_friction_free_program`, `get_sources`.

```bash
node mcp/build.mjs        # writes mcp/dist (gitignored)
```

`.github/workflows/deploy-mcp.yml` builds and pushes `mcp/dist` to the
`relstrat-mcp` app with `gizmos push --mcp` whenever `mcp/` or `site/App.jsx`
changes on `main` (or on demand). The app is visible to everyone in the TELUS
org and runs in Dev Keys mode: keys are issued in the Gizmos hub under the
app's Settings → API keys (binding `MCP`). Share a key over a secure channel,
never in this repo.

Connect from Claude Code:

```bash
claude mcp add --transport http relstrat https://relstrat-mcp.telus.gizmos.run/mcp \
  --header "Authorization: Bearer gzak_..."
```

Connect from Claude Desktop (needs Node.js; add to
`claude_desktop_config.json` and restart the app):

```json
{
  "mcpServers": {
    "relstrat": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://relstrat-mcp.telus.gizmos.run/mcp", "--header", "Authorization:${GZAK_TOKEN}"],
      "env": { "GZAK_TOKEN": "Bearer gzak_..." }
    }
  }
}
```

claude.ai custom connectors require OAuth and cannot use a Dev Keys server.
A colleague can also connect with their own personal `gzm_` platform key from
https://telus.gizmos.run/settings instead of a shared `gzak_` key.

## Analysis scripts

`analysis/` holds the scripts that turn the raw agent/technician notes and
survey exports into the aggregated data blocks embedded in `App.jsx`. Raw
exports are never committed because they contain customer details.
