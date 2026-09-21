import json
N = json.load(open('notes_analysis.json')); S = json.load(open('survey_analysis.json'))
M = ['2026-06','2026-07','2026-08']
def pct(a,b): return None if not a else round((b-a)/a*100,1)  # called with (Jul, Aug)
tva = {
 'months': ['Jun 2026','Jul 2026','Aug 2026'],
 'tickets': {'total': [N['total'][m] for m in M],
   'agentCat': [{'name':k,'v':v,'pct':pct(v[1],v[2])} for k,v in N['agent_c1'].items() if k not in ('Abandon','') and sum(v)>=150],
   'rising': [{'name':i['key'],'v':[i['jun'],i['jul'],i['aug']],'delta':i['delta'],'pct':i['pct']} for i in N['agent_c12_rising']],
   'falling': [{'name':i['key'],'v':[i['jun'],i['jul'],i['aug']],'delta':i['delta'],'pct':i['pct']} for i in N['agent_c12_falling']],
   'techR1': [{'name':k,'v':v} for k,v in list(N['tech_r1'].items())[:9]],
   'techRising': [{'name':i['key'],'v':[i['jun'],i['jul'],i['aug']],'delta':i['delta'],'pct':i['pct']} for i in N['tech_r12_rising'][:5]],
   'techFalling': [{'name':i['key'],'v':[i['jun'],i['jul'],i['aug']],'delta':i['delta'],'pct':i['pct']} for i in N['tech_r12_falling'][:5]],
   'divergence': {'all': [{'alignment':N['divergence'][m]['alignment_pct'],'nofault':N['divergence'][m]['nofault_pct'],'reattribution':N['divergence'][m]['reattribution_pct'],'closed':N['divergence'][m]['closed']} for m in M],
      'field': [{'alignment':N['divergence_fieldvisit'][m]['alignment_pct'],'nofault':N['divergence_fieldvisit'][m]['nofault_pct'],'nontelus':N['divergence_fieldvisit'][m]['nontelus_pct'],'reattribution':N['divergence_fieldvisit'][m]['reattribution_pct'],'visits':N['divergence_fieldvisit'][m]['visits']} for m in M],
      'perCat': [{'cat':k,'n':v['n'],'alignment':v['alignment_pct'],'nofault':v['nofault_pct'],'techTop':[t[0] for t in v['tech_top'][:2]]} for k,v in sorted(N['divergence']['2026-08']['per_cat'].items(), key=lambda kv:-kv[1]['n']) if v['n']>=500],
      'perCatField': [{'cat':k,'n':v['n'],'alignment':v['alignment_pct'],'nofault':v['nofault_pct'],'nontelus':v['nontelus_pct'],'techTop':v['tech_top'][0][0]} for k,v in sorted(N['divergence_fieldvisit']['2026-08']['per_cat'].items(), key=lambda kv:-kv[1]['n'])]},
   'closure': [N['closure_mix'][m] for m in M],
   'determination': [[N['tech_determination'][m].get('TELUS caused',0), N['tech_determination'][m].get('Non-TELUS caused',0)] for m in M],
   'fixes': [{'name':k,'v':v,'pct':pct(v[1],v[2])} for k,v in sorted(N['tech_fix_themes'].items(), key=lambda kv:-sum(kv[1]))],
   'commentCoverage': N['comment_coverage'],
   'themes': [{'name':k,'v':v,'pct':pct(v[1],v[2])} for k,v in N['agent_themes'].items()],
   'devices': [{'name':k,'v':v,'pct':pct(v[1],v[2])} for k,v in N['devices'].items() if sum(v)>0],
   'platform': [{'name':k,'v':v,'pct':pct(v[1],v[2])} for k,v in N['platform_mentions'].items()],
 },
 'survey': {'respondents': [S['respondents'][m] for m in ['Jun','Jul','Aug']],
   'polarity': {k: S['general_polarity_pct'][k] for k in ['positive','neutral','negative']},
   'polarityN': {k: S['general_polarity'][k] for k in ['positive','neutral','negative']},
   'themes': [{'name':k,'v':v,'pct':S['general_theme_pct'][k],'neg':S['neg_general_by_theme'][k]} for k,v in S['general_theme'].items()],
   'tvIssues': [{'name':k,'v':v,'pct':S['tv_issue_pct'][k]} for k,v in S['tv_issue_mentions'].items()],
   'support': {k: S['support_polarity'][k] for k in ['positive','neutral','negative']},
   'quotes': {k: [q[1] for q in v[:4]] for k,v in S['tv_quotes'].items() if k in ('Interruptions / freezing / restarts','Recording / PVR','Customer service experience','Picture quality','Remote control')},
 }
}
js = "const TVA = " + json.dumps(tva, separators=(',',':')) + ";\n"
open('tva_block.js','w').write(js)
print(len(js), 'chars')
print(json.dumps(tva['tickets']['divergence']['perCatField'], indent=0)[:600])