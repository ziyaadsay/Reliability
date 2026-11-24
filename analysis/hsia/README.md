# HSIA ticket notes analysis

Scripts that produce the aggregated data behind the HSIA "Notes Analysis",
"Customer Sentiment" and "Cross Analysis" sub-pages in `site/App.jsx`.

- `analyze_hsia_notes.py` reads the weekly HSIA agent/technician notes exports
  (`raw/hsia_notes_<Mon>_W*.xlsx`; columns Ticket Created Date, Trouble Ticket
  ID, Category 1-3, Resolution 1-3, Agent Notes, Resolution Text, Flag
  Dispatch), de-duplicates on ticket ID and writes `hsia_notes_analysis.json`:
  monthly volumes by agent category and closure code, sub-category movers,
  agent-vs-closure categorisation divergence (all closures and field visits
  only), technician determinations and fix themes, agent-comment themes,
  device mentions and fibre vs copper access mentions. The window is the
  `MONTHS` list at the top of the script (Aug-Sep-Oct 2026 at the moment; the
  October export runs to 30 Oct); movers compare the last month of the window
  with the one before it, and `gen_hsa_block.py` labels the output from the
  same list.

Agent symptom domains: Access line & ONT (ONT Not Ranged, No Sync, Losing
Sync, Historical Data), Gateway / dataflow (No Dataflow, No IP), Speed,
Wi-Fi, Equipment compatibility. Closure domains: Access line / fibre / ONT,
Modem / gateway, Wi-Fi / extenders, Provisioning / back office, Outage,
Customer / non-TELUS equipment, Education / no fault, Other product.

- `analyze_hsia_survey.py` reads the monthly combined CF&R Core Products survey exports
  (`raw/cfr_2026-MM.xlsx`, the "CF&R_Core Products_Data_YYYYMM.xlsx" files: one sheet of coded
  responses for every product plus the Variable Labels and Value Labels sheets), keeps the
  TELUS Internet respondents (`ServProduct` = 1) and writes `hsia_survey_analysis.json`:
  respondents, NPS, the reliability rating split, the reasons behind a fair or poor
  reliability rating (V3 verbatim, keyword-classified), the one thing that defined the month
  (Q16T), issue resolution and repeat contacts (Q10, Q10_2), contact behaviour, churn
  intention and switching (P5, Q5a1, Q5a2, P5b), verbatim sentiment and themes,
  issue-description themes, chatbot sentiment and example quotes. The window is the `MONTHS`
  list (Aug-Sep-Oct 2026 at the moment); comparisons are the last month against the one before.

  Things to know about the source. The combined export carries the core questionnaire only:
  the TELUS Internet product module (the Q1C_INT structured reliability drivers, the iqpf1 /
  iqim1 performance and importance batteries and the dd* deep-dive verbatims) is not in it.
  Their last reading (Jun to Aug 2026, from the earlier product export) is kept in
  `HSS_REVIEW_FROZEN` in `site/App.jsx`, which is also the survey snapshot of the archived HSIA
  Review. The July 2026 combined file is a cut-down extract without the verbatims, so the
  window cannot start before August. Counts are unweighted; the export carries a `wt` column
  that is not applied, so figures match the raw base. August from the combined file reproduces
  the August figures of the earlier product export exactly.

  Verbatim themes and polarity are keyword-classified with the lexicons at the top of the
  script, so they indicate direction rather than precise measurement. Quotes exclude comments
  carrying contact details and are each used once.

Raw exports are not committed because they contain customer details: the survey
files carry customer name, email, phone number, address and account identifiers.

- `resolution_flows.py` reads the same notes export rows (Ticket Created Date, Trouble Ticket ID, Agent
  Notes) and writes `resolution_flows.json`, the root cause identified to fix applied counts behind the HSIA
  Notes Analysis "Resolution Analysis" Sankey (`HSIA_RESOLUTION` in `site/App.jsx`). It uses tickets whose
  Agent Notes carry both a "Root cause analysis" line and a "Resolution" line (about 8% of tickets) and
  classifies each line to one HSIA theme, the one mentioned first. Pass the row JSON files on the command line.

## Agent text vs InSight payload

The Agent Notes column is a log of worklog entries (`*** CREATED DATE: ... WORKLOG_TYPE ... WORKLOG_SUMMARY ...
WORKLOG_DETAILS ...`). `analysis/common/notes_parse.py` splits it by entry: "[InSight Case Data]" entries are the InSight
(agent service assurance tool) payload, "[Agent Notes]" entries and dispatch "Customer Comments" are what the agent wrote, and
everything else (WFM, SWT, reassignment, closure, repair templates) is system text. InSight check phrases an agent quotes inside
their own text are removed from it and read as findings. The themes, devices and platform or access mentions use the agent text
only (a negated mention such as "no outage" does not count). `analysis/common/insight_report.py` reads the payload into findings
(outage, ONT state, pending order, copper sync, optical Rx level, xVu STB errors, ...) and cross-checks each agent theme against the
InSight check that would show it (`theme_vs_insight`); `gen_*_block.py` writes that as `insight` in the page constant. The optical Rx
window (`RX_FLOOR`, `RX_CEIL`, `RX_MARGINAL` in `notes_parse.py`) is a working assumption. Before this, devices and access were counted
on the whole note, so the payload inflated ONT, fibre, 4K STB and TV+ mentions several times over.

## Outside plant and ONT health

`osp_health.py` reads the same weekly HSIA notes exports (`raw/hsia_notes_*.xlsx`, three months) and writes `osp_health.json`:
what was reported (ONT Not Ranged, Historical Data, No Sync, Losing Sync), what InSight showed (ONT state, active network events,
optical levels, FDH) and what the technician fixed (GPON, Network Service Wire and Outside Plant closures). Months are compared per
day, and closures on tickets created on days 1 to 25 (`CLOSE_DAYS`), because the last tickets of an export have not closed yet.
`gen_osp_block.py` turns it into the `HSIA_OSP` constant in `site/App.jsx`; the "Worth flagging" read (`HSIA_OSP_FLAGS`) is
hand-written from those figures each window. Aggregates and FDH identifiers only; no customer fields leave the script.
