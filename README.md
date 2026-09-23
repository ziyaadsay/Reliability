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

## Analysis scripts

`analysis/` holds the scripts that turn the raw agent/technician notes and
survey exports into the aggregated data blocks embedded in `App.jsx`. Raw
exports are never committed because they contain customer details.
