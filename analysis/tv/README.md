# TV ticket notes and survey verbatim analysis

Scripts that produce the aggregated data behind the TV "Notes Analysis",
"Customer Sentiment Analysis" and "Cross Analysis" sub-pages in `site/App.jsx`
(the `TVA` constant).

- `analyze_notes.py` reads `notes_all.json` (the weekly TV agent/technician
  notes exports combined, Jul to Sep 2026; columns Ticket Created Date, Category 1-3,
  Resolution 1-3, Agent Notes, Resolution Text) and writes `notes_analysis.json`:
  monthly volumes by agent category and closure code, sub-category movers,
  agent-vs-technician categorisation divergence (all closures and field visits),
  technician determinations and fix themes, and agent-comment themes.
- `analyze_survey.py` reads the monthly Optik TV survey workbooks
  (`raw/survey_{Jun,Jul,Aug}.xlsx`) and writes `survey_analysis.json`:
  verbatim theme classification, text sentiment, TV issue mention rates and
  sample quotes. Score columns are ignored.

Raw exports are not committed because they contain customer details.

The notes window is Jul to Sep 2026 and notes movers compare Sep 2026 with Aug 2026; the survey window is Jun to Aug 2026 and its movements compare Aug 2026 with Jul 2026.

`gen_tva_block.py` writes the `TVA` block. If `survey_analysis.json` is not present
(the survey window has not moved on) it writes `survey: null`; in that case copy the
`months` and `tickets` keys into the existing `TVA` constant in `App.jsx` and keep
its `survey` key as it is.
