# HSIA ticket notes analysis

Script that produces the aggregated data behind the HSIA "Notes Analysis" and
"Cross Analysis" sub-pages in `site/App.jsx`. There is no HSIA customer
sentiment page yet because no HSIA survey verbatim files have been supplied.

- `analyze_hsia_notes.py` reads the weekly HSIA agent/technician notes exports
  (`raw/hsia_notes_<Mon>_W*.xlsx`; columns Ticket Created Date, Trouble Ticket
  ID, Category 1-3, Resolution 1-3, Agent Notes, Resolution Text, Flag
  Dispatch), de-duplicates on ticket ID and writes `hsia_notes_analysis.json`:
  monthly volumes by agent category and closure code, sub-category movers,
  agent-vs-closure categorisation divergence (all closures and field visits
  only), technician determinations and fix themes, agent-comment themes,
  device mentions and fibre vs copper access mentions. Movers compare the
  latest month with the prior month (Aug vs Jul 2026).

Agent symptom domains: Access line & ONT (ONT Not Ranged, No Sync, Losing
Sync, Historical Data), Gateway / dataflow (No Dataflow, No IP), Speed,
Wi-Fi, Equipment compatibility. Closure domains: Access line / fibre / ONT,
Modem / gateway, Wi-Fi / extenders, Provisioning / back office, Outage,
Customer / non-TELUS equipment, Education / no fault, Other product.

Raw exports are not committed because they contain customer details.
