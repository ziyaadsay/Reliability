# TV ticket notes and survey verbatim analysis

Scripts that produce the aggregated data behind the TV "Notes Analysis",
"Customer Sentiment Analysis" and "Cross Analysis" sub-pages in `site/App.jsx`
(the `TVA` constant).

- `analyze_notes.py` reads `notes_all.json` (the weekly TV agent/technician
  notes exports combined; columns Ticket Created Date, Category 1-3,
  Resolution 1-3, Agent Notes, Resolution Text) and writes `notes_analysis.json`:
  monthly volumes by agent category and closure code, sub-category movers,
  agent-vs-technician categorisation divergence (all closures and field visits),
  technician determinations and fix themes, and agent-comment themes.
- `analyze_survey.py` reads the monthly combined CF&R Core Products survey exports
  (`raw/cfr_2026-MM.xlsx`, the "CF&R_Core Products_Data_YYYYMM.xlsx" files), keeps the
  TELUS Optik TV respondents (`ServProduct` = 2) and writes `survey_analysis.json`:
  verbatim theme classification, text sentiment, TV issue mention rates and
  sample quotes. Score columns are ignored. The Optik TV product module (the dd*
  issue deep-dive verbatims) is not in the combined export, so TV issues are
  keyword-classified from the issue description (CONTA) and the reliability reason
  (V3) of respondents rating TV reliability fair or poor, as respondents per 100.

Raw exports are not committed because they contain customer details.

The notes-analysis window is the `MONTHS` list at the top of `analyze_notes.py`
(Aug-Sep-Oct 2026 at the moment; the October export runs to 30 Oct). Movers and
month-over-month movements compare the last month of the window with the one
before it, and `gen_tva_block.py` labels the output from the same list. The
survey side (`analyze_survey.py` / `survey_analysis.json`) has its own `MONTHS`
list (also Aug-Sep-Oct 2026 at the moment). `gen_tva_block.py` carries over
whichever of the two analysis files is absent from `tva_prev.json` (the TVA
currently in App.jsx), so the ticket and survey sides can be rolled separately.

- `resolution_flows.py` reads the same `notes_all.json` and writes `resolution_flows.json`, the
  root cause identified to fix applied counts behind the TV Notes Analysis "Resolution Analysis"
  Sankey (`TV_RESOLUTION` in `site/App.jsx`). It uses tickets whose Agent Notes carry both a
  "Root cause analysis" line and a "Resolution" line (about one in ten tickets) and classifies each
  line to one theme, the one mentioned first. Set `MONTHS` at the top for the months to show.
  HSIA has the same script with HSIA themes in `analysis/hsia/resolution_flows.py`.

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
