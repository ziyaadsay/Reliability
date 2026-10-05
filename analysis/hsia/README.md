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
  device mentions and fibre vs copper access mentions. Movers compare the
  latest month with the prior month (Sep vs Aug 2026). The window is the three
  most recent months (Jul to Sep 2026).

Agent symptom domains: Access line & ONT (ONT Not Ranged, No Sync, Losing
Sync, Historical Data), Gateway / dataflow (No Dataflow, No IP), Speed,
Wi-Fi, Equipment compatibility. Closure domains: Access line / fibre / ONT,
Modem / gateway, Wi-Fi / extenders, Provisioning / back office, Outage,
Customer / non-TELUS equipment, Education / no fault, Other product.

- `analyze_hsia_survey.py` reads the monthly CF&R TELUS Internet survey exports
  (`raw/hsia_survey_2026-0{6,7,8}.xlsx`, one sheet of coded responses plus the
  Variable Labels and Value Labels sheets) and writes
  `hsia_survey_analysis.json`: respondents, NPS, the reliability rating split,
  the reliability drivers (Q1C_INT, asked only of those rating reliability fair
  or poor), the performance and importance batteries, contact behaviour, churn
  intention, verbatim sentiment and themes, issue-description themes, chatbot
  sentiment and example quotes. Comparisons are Aug vs Jul 2026 (the survey window is Jun to Aug 2026 and has not been refreshed for September).

  Two things to know about the source. The performance (iqpf1_*) and importance
  (iqim1_*) batteries are rotating modules: performance is asked in August only
  and importance in July only, so they are reported as point-in-time readings
  rather than a trend. Counts are unweighted; the export carries a `wt` column
  that is not applied, so figures match the raw base.

  Verbatim themes and polarity are keyword-classified with the lexicons at the
  top of the script, so they indicate direction rather than precise measurement.

Raw exports are not committed because they contain customer details: the survey
files carry customer name, email, phone number, address and account identifiers.
