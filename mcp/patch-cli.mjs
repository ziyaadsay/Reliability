// Produces a patched copy of the stock gizmos CLI that honours GIZMOS_AUTH_MODE on
// `push --mcp`. The stock CLI hardcodes auth_mode "dev_keys" on every MCP push and the
// hub has no auth-mode setting, so this is the only way to deploy the server in
// user_auth mode (browser SSO, no API key). Every deploy of relstrat-mcp must go through
// this copy: a push with the stock CLI flips the app back to key mode and the connector
// loads no tools.
//
//   node mcp/patch-cli.mjs <stock gizmos.mjs> <output path>
//
// Exits non-zero if the line it patches is missing or appears more than once, so a CLI
// update cannot silently deploy in the wrong mode.
import { readFileSync, writeFileSync } from "node:fs";

const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error("usage: node mcp/patch-cli.mjs <stock gizmos.mjs> <output path>"); process.exit(2); }

const NEEDLE = 'payload.mcp_config = { auth_mode: "dev_keys" };';
const PATCH = 'payload.mcp_config = { auth_mode: process.env.GIZMOS_AUTH_MODE || "dev_keys" };';

const text = readFileSync(src, "utf8");
const hits = text.split(NEEDLE).length - 1;
if (hits !== 1) {
  console.error(`patch-cli: expected exactly one occurrence of the dev_keys line, found ${hits}. The CLI has changed; inspect it before deploying.`);
  process.exit(1);
}
writeFileSync(out, text.replace(NEEDLE, PATCH));
console.log(`patch-cli: wrote ${out} (auth_mode now follows GIZMOS_AUTH_MODE)`);
