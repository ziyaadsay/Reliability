import json
d = json.load(open('hsia_notes_analysis.json'))
M = d['months']
def v3(tbl, k): return tbl[k]
def pct(v): return None if not v[1] else round((v[2]-v[1])/v[1]*100, 1)  # Aug vs Jul
def rows(tbl, n=None, skip=()):
    out = [{'name': k, 'v': v, 'pct': pct(v)} for k, v in tbl.items() if k not in skip]
    return out[:n] if n else out
def mv(items): return [{'name': i['key'], 'v': [i['jun'], i['jul'], i['aug']], 'delta': i['delta'], 'pct': i['pct']} for i in items]
def divrows(D, field):
    out = []
    for m in M:
        x = D[m]
        r = {'alignment': x['alignment_pct'], 'nofault': x['nofault_pct'], 'nontelus': x['nontelus_pct'], 'reattribution': x['reattribution_pct']}
        r['visits' if field else 'closed'] = x['closed']
        out.append(r)
    return out
pc = d['divergence']['2026-08']['per_cat']
perCat = sorted([{'cat': k, 'n': v['n'], 'alignment': v['alignment_pct'], 'nofault': v['nofault_pct'], 'techTop': [t[0] for t in v['tech_top'][:2]]} for k, v in pc.items()], key=lambda r: -r['n'])
pcf = d['divergence_fieldvisit']['2026-08']['per_cat']
perCatField = sorted([{'cat': k, 'n': v['n'], 'alignment': v['alignment_pct'], 'nofault': v['nofault_pct'], 'nontelus': v['nontelus_pct'], 'techTop': v['tech_top'][0][0]} for k, v in pcf.items()], key=lambda r: -r['n'])
det = [[d['tech_determination'][m].get('TELUS caused', 0), d['tech_determination'][m].get('Non-TELUS caused', 0)] for m in M]
closure = [{'tickets': d['closure_mix'][m]['tickets'], 'field_visit_pct': d['closure_mix'][m]['field_visit_pct'],
            'agent_education_closure_pct': d['closure_mix'][m]['agent_education_closure_pct'], 'no_closure_code_pct': d['closure_mix'][m]['no_closure_code_pct']} for m in M]
mix = d['domain_mix']['2026-08']
AD = ['Gateway / dataflow', 'Access line & ONT', 'Speed', 'Wi-Fi', 'Equipment compatibility']
TD = ['Access line / fibre / ONT', 'Modem / gateway', 'Wi-Fi / extenders', 'Provisioning / back office', 'Outage', 'Customer / non-TELUS equipment', 'Education / no fault', 'Other product']
domainMix = [{'agent': a, 'n': sum(mix.get(a, {}).values()), 'v': [mix.get(a, {}).get(t, 0) for t in TD]} for a in AD]
HSA = {
  'months': ['Jun 2026', 'Jul 2026', 'Aug 2026'],
  'tickets': {
    'total': [d['total'][m] for m in M],
    'c1': rows(d['agent_c1'], skip=('Wi-Fi connection', 'DSL', 'Calling Features')),
    'agentCat': rows(d['agent_c12_top'], skip=('NWH › Not Required',)),
    'rising': mv(d['agent_c123_rising']), 'falling': mv(d['agent_c123_falling']),
    'techR1': rows(d['tech_r1'], 12),
    'techRising': mv(d['tech_r12_rising'][:6]), 'techFalling': mv(d['tech_r12_falling'][:6]),
    'divergence': {'all': divrows(d['divergence'], False), 'field': divrows(d['divergence_fieldvisit'], True), 'perCat': perCat, 'perCatField': perCatField},
    'closure': closure, 'determination': det,
    'fixes': sorted(rows(d['tech_fix_themes']), key=lambda r: -r['v'][2]),
    'commentCoverage': d['comment_coverage'],
    'themes': rows(d['agent_themes']),
    'devices': rows(d['devices']),
    'access': rows(d['access_mentions']),
    'domainMix': domainMix, 'closureDomains': TD,
  }
}
js = 'const HSA = ' + json.dumps(HSA, separators=(',', ':'), ensure_ascii=False) + ';\n'
open('hsa_block.js', 'w').write(js)
print(len(js)); print(json.dumps(HSA['tickets']['divergence']['field'])); print([r['name'] for r in HSA['tickets']['agentCat']])
