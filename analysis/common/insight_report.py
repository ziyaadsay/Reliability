"""InSight payload vs what the agent called out: shared by the HSIA and TV notes analyses.

Rows must carry r['_m'] (YYYY-MM) and r['_p'] = notes_parse.parse_note(r['Agent Notes']).
"""
import collections, re

NEG_BEFORE = re.compile(r"(?:\bno\b|\bnot\b|n't|\bwithout\b|\bnone\b|\bnegative\b|rul(?:e|ed|ing) out|\bany\b|\bnor\b)[^.;:]{0,25}$")

def theme_hit(themes, name, seg, negated=()):
    """True when the agent's own text raises the theme. For themes in `negated`, a mention that follows a negation
    ("no outage", "not seeing any red light") is the agent ruling the cause out, so it does not count."""
    for pt in themes[name]:
        for m in re.finditer(pt, seg):
            if name in negated and NEG_BEFORE.search(seg[max(0, m.start() - 30):m.start()]): continue
            return True
    return False

FLAGS = ['ont_down', 'outage', 'pending_order', 'no_sync', 'losing_sync', 'low_train_rate', 'loop_disqualified',
         'stb_errors', 'stb_unregistered', 'rx_out_of_range', 'rx_marginal', 'gw_fw_outdated']

def build_report(rows, months, themes, confirm, negated=(), cat_key=None, cat_flags=('ont_down', 'outage', 'no_sync', 'losing_sync', 'stb_errors', 'pending_order')):
    """confirm: {theme: insight flag that would show the issue}. Months with no rows come out empty (callers null them)."""
    cov = {m: collections.Counter() for m in months}
    find = {m: collections.Counter() for m in months}
    tv = {t: [[0, 0, 0] for _ in months] for t in confirm}
    for r in rows:
        p, m = r['_p'], r['_m']
        if m not in cov: continue
        mi = months.index(m)
        cov[m]['tickets'] += 1
        if p['agent']: cov[m]['agent_text'] += 1
        if p['insight']: cov[m]['insight'] += 1
        if p['insight'] and p['agent']: cov[m]['both'] += 1
        if p['payload_in_agent_text']: cov[m]['insight_quoted_in_agent_text'] += 1
        ins = p['insight'] or {}
        for f in FLAGS:
            v = ins.get(f)
            if v is not None:
                find[m][f + '_checked'] += 1
                if v: find[m][f] += 1
        seg = p['agent'].lower()
        if not seg: continue
        for t, flag in confirm.items():
            if ins.get(flag) is None: continue
            if theme_hit(themes, t, seg, negated):
                tv[t][mi][0] += 1                      # n: agent raised the theme and the payload carries the check
                tv[t][mi][1 if ins[flag] else 2] += 1  # InSight shows the condition / InSight check is clear
    out = {'insight_coverage': {m: dict(cov[m]) for m in months}, 'insight_findings': {m: dict(find[m]) for m in months},
           'theme_vs_insight': {t: {'check': confirm[t], 'v': v} for t, v in tv.items()}}
    if cat_key:
        last = months[-1]; cv = collections.defaultdict(collections.Counter)
        for r in rows:
            if r['_m'] != last: continue
            ins = r['_p']['insight'] or {}; k = cat_key(r)
            cv[k]['n'] += 1
            if ins: cv[k]['insight'] += 1
            for f in cat_flags:
                if ins.get(f) is not None:
                    cv[k][f + '_checked'] += 1
                    if ins[f]: cv[k][f] += 1
        out['cat_vs_insight'] = {k: dict(v) for k, v in sorted(cv.items(), key=lambda kv: -kv[1]['n'])[:12]}
    return out

# Dashboard labels for the InSight findings (flag -> what the check says when it is raised).
FINDING_LABELS = {
    'ont_down': 'ONT is down (ONT operational state)', 'outage': 'Active network event found', 'pending_order': 'Pending service order found',
    'no_sync': 'No sync (copper)', 'losing_sync': 'Losing sync in the last 24 hrs (copper)', 'low_train_rate': 'Train rate acceptable but low (copper)',
    'loop_disqualified': 'Loop disqualified (copper)', 'rx_out_of_range': 'ONT optical Rx level out of range', 'rx_marginal': 'ONT optical Rx level marginal',
    'gw_fw_outdated': 'Gateway firmware out of date', 'stb_errors': 'STB video errors found (xVu)', 'stb_unregistered': 'STB not registered',
}

def to_block(rep, months, flags, theme_order=None):
    """Compact JSON for the dashboard. Months with no rows are None. Rates are per tickets whose payload carries the check."""
    def mrow(m):
        c = rep['insight_coverage'][m]
        return None if not c.get('tickets') else {'tickets': c['tickets'], 'agent': c.get('agent_text', 0), 'insight': c.get('insight', 0),
                                                  'both': c.get('both', 0), 'quoted': c.get('insight_quoted_in_agent_text', 0)}
    fnd = []
    for f in flags:
        v, n = [], []
        for m in months:
            F = rep['insight_findings'][m]; k = F.get(f + '_checked', 0)
            v.append(round(F.get(f, 0) / k * 100, 1) if k else None); n.append(k or None)
        if any(x for x in n): fnd.append({'name': FINDING_LABELS[f], 'v': v, 'n': n})
    tvi = []
    for t, d in rep['theme_vs_insight'].items():
        if not any(x[0] for x in d['v']): continue
        tvi.append({'theme': t, 'check': FINDING_LABELS[d['check']], 'v': [None if not x[0] else x for x in d['v']]})
    return {'coverage': [mrow(m) for m in months], 'findings': fnd, 'themeVs': tvi}
