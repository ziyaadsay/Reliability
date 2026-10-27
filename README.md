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
`relstrat-mcp` app whenever `mcp/` or `site/App.jsx` changes on `main` (or on
demand). The app is visible to everyone in the TELUS org and runs in
**User Auth** mode: colleagues sign in with TELUS SSO in the browser, and no
API key is issued or shared.

User Auth needs a patched CLI. The stock `gizmos push --mcp` hardcodes
`auth_mode: dev_keys` and the hub has no auth-mode setting, so the workflow
downloads the stock CLI, runs `mcp/patch-cli.mjs` to make it honour
`GIZMOS_AUTH_MODE`, and pushes with `GIZMOS_AUTH_MODE=user_auth`. It then
checks `https://relstrat-mcp.telus.gizmos.run/.well-known/oauth-protected-resource`
names the TELUS authorization server. **Every push of relstrat-mcp must use the
patched CLI**: a stock-CLI push flips the app back to key mode and the
connector loads no tools. Always push the app root (the folder with
`wrangler.toml`), never `src/`, or the platform drops the declared bindings.
The `MCP` API key binding stays declared, so any `gzak_` keys issued earlier
keep working.

Connect from Claude Code (a browser window opens for SSO on first use):

```bash
claude mcp add --transport http relstrat https://relstrat-mcp.telus.gizmos.run/mcp
```

Claude Desktop and claude.ai custom connectors use the same URL and the
built-in OAuth flow.

### App-to-app binding

The same worker exports `class Reliability extends WorkerEntrypoint`
(`[[gizmos_binding]]` in `mcp/wrangler.toml`), one RPC method per MCP tool
with the same name, arguments and reply, so other Gizmos apps can call the
data directly. `mcp/BINDING.md` documents the methods and is served as the
binding's doc. The deploy workflow publishes the binding to the whole TELUS
org (`gizmos binding publish`), so any gizmo in the org can declare the
`gzb_` id shown by `gizmos binding list` for `relstrat-mcp` / `Reliability`
and call it. To restrict it again, set a `BINDING_CALLERS` var in
`mcp/wrangler.toml` to a comma-separated list of app ids and the worker refuses
every other caller.

## Analysis scripts

`analysis/` holds the scripts that turn the raw agent/technician notes and
survey exports into the aggregated data blocks embedded in `App.jsx`. Raw
exports are never committed because they contain customer details.
