# Reliability Program Governance data

`gen_governance_block.py` turns the "VP Deacts call Weekly Topics & Takeaways" tab of the Churn Measurement 2026 workbook
into the `GOVERNANCE` constant in `site/App.jsx` (the Reliability Program Governance page, below Friction Free Program in the menu).

    python gen_governance_block.py rows.json governance_block.js

`rows.json` is `{"backlog": "<the Topics Backlog cell>", "rows": [[date, weekly topic, takeaways], ...]}`: the tab's rows from row 4 down
(columns A to C). Raw rows are not committed. The script cleans each meeting's topic, splits out who was out, sets a status
(held, cancelled, no call) and splits the takeaways into items with their owners. Each item gets an area and an action type from
keyword rules; `OVERRIDES` holds the reviewed corrections (meeting date and item number), so after adding a new week check the
printed table and add an override where a rule got it wrong. Paste the block over the existing `const GOVERNANCE = ...` line.

The page lets viewers edit a weekly topic: edits are saved in the viewer's own browser (localStorage key
`relstrat:governance:topics:v1`), are not shared and are not written back to the workbook. The MCP serves the workbook topics.
