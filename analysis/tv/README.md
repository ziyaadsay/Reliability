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
- `analyze_survey.py` reads the monthly Optik TV survey workbooks
  (`raw/survey_{Jun,Jul,Aug}.xlsx`) and writes `survey_analysis.json`:
  verbatim theme classification, text sentiment, TV issue mention rates and
  sample quotes. Score columns are ignored.

Raw exports are not committed because they contain customer details.

The notes-analysis window is the `MONTHS` list at the top of `analyze_notes.py`
(Aug-Sep-Oct 2026 at the moment; the October export runs to 30 Oct). Movers and
month-over-month movements compare the last month of the window with the one
before it, and `gen_tva_block.py` labels the output from the same list. The
survey side (`analyze_survey.py` / `survey_analysis.json`) still covers
Jun-Jul-Aug 2026 and is carried over unchanged when `survey_analysis.json` is
absent (`gen_tva_block.py` then reads the survey block from `tva_prev.json`,
the TVA currently in App.jsx).
