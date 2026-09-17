import openpyxl, collections, json, re
MONTHS = ['Jun', 'Jul', 'Aug']
GENERAL = ['v1', 'v2', 'v3', 'v6']            # reason-for-rating verbatims (overall TELUS relationship)
TV_ISSUE = {                                   # TV-specific issue verbatims (asked only when respondent flagged the issue)
    'ddpq1': 'Picture quality', 'ddis1': 'Interruptions / freezing / restarts', 'ddrec1': 'Recording / PVR',
    'ddrc1': 'Remote control', 'ddsq1': 'Sound quality', 'ddcg1': 'Channel guide / navigation',
    'ddvd1': 'On-demand / VOD', 'ddf1': 'TV features', 'ddapp1': 'Apps / streaming', 'ddos1': 'Outages / service loss',
    'ddcs1': 'Customer service experience',
}
TV_OTHER = ['q1c_tv_95_other', 'qtvpa']        # TV "other, specify" verbatims
SUPPORT = ['v5b']                              # chatbot / digital support verbatims

THEMES = {
    'Price, value & contract increases': [r'\bpric', r'\bcost', r'expensive', r'increas', r'contract', r'renew', r'loyalty', r'\bdeal\b', r'promotion', r'discount', r'\bprix\b', r'\bcher', r'augment', r'co[uû]t'],
    'Reliability: freezing, outages & drop-outs': [r'freez', r'glitch', r'unreliab', r'cut(s)? out', r'drop', r'outage', r'offline', r'buffer', r'reboot', r'restart', r'reliab', r'\bpanne', r'\bgel', r'coupure', r'interrup', r'goes? out', r'lose (the )?(signal|connection)', r'no signal'],
    'Picture & sound quality': [r'picture', r'pixel', r'resolution', r'\bhd\b', r'\bsound\b', r'audio', r'volume', r'image', r'qualit[eé] (d.)?image', r'\bson\b'],
    'Recording / PVR': [r'record', r'\bpvr\b', r'enregistr'],
    'Remote, guide & navigation': [r'remote', r'\bguide\b', r'navigat', r'\bmenu', r'interface', r'slow to (react|respond)', r't[eé]l[eé]commande', r'clunky', r'user.?friendly'],
    'Set-top box / equipment': [r'\bbox(es)?\b', r'digital box', r'\bstb\b', r'equipment', r'd[eé]codeur', r'bo[iî]te', r'receiver', r'hardware', r'devices?\b'],
    'Customer service & support access': [r'customer service', r'\bagent', r'on hold', r'\bhold\b', r'\bwait', r'\bchat', r'\bbot\b', r'\bai\b', r'call(ed|ing)? (in|back|centre|center)', r'transferr?', r'\bhours\b', r'representative', r'\brep\b', r'service [àa] la client', r'attente', r'talk to a (human|person|real)', r'real person', r'run ?around', r'bounced'],
    'Channels, packages & content': [r'channel', r'package', r'content', r'programs?\b', r'networks?\b', r'cha[iî]ne', r'canaux', r'sports', r'lineup', r'line-up'],
    'Internet & Wi-Fi': [r'internet', r'wi-?fi', r'speed', r'connection', r'router', r'modem'],
    'Billing & account': [r'\bbill', r'invoice', r'charg', r'account', r'facture', r'factur', r'credit', r'refund'],
    'Apps & streaming': [r'netflix', r'\bapps?\b', r'stream', r'youtube', r'prime', r'disney', r'crave'],
    'Positive: satisfied / no issues': [r'no (problems?|issues?|complaints?)', r'\bgood\b', r'\bgreat\b', r'\bhappy\b', r'satisf', r'excellent', r'\blove\b', r'\bbest\b', r'works? (well|fine|great)', r'aucun probl', r'bon service', r'tr[eè]s bien', r'\bsuper\b', r'\bparfait'],
    'Installation & technicians': [r'install', r'technician', r'\btech\b', r'\btechs\b', r'appointment', r'visit', r'installat'],
}
POS = [r'\bgood\b', r'\bgreat\b', r'\bhappy\b', r'satisf', r'excellent', r'\blove\b', r'\bbest\b', r'reliable', r'no (problems?|issues?)', r'works? (well|fine|great)', r'\bthank', r'friendly', r'helpful', r'aucun probl', r'bon service', r'tr[eè]s bien', r'\bsuper\b', r'\bparfait', r'\bcontent', r'appreciat', r'\bfast\b', r'\beasy\b', r'\bpleased']
NEG = [r'\bbad\b', r'poor', r'terrible', r'horrible', r'worst', r'frustrat', r'disappoint', r'unreliab', r'expensive', r'\brip.?off', r'dishonest', r'\blie[sd]?\b', r'\bscam', r'never', r'useless', r'ridiculous', r'annoy', r'\bslow\b', r'\bfail', r'\bnot (good|happy|satisfied|working|reliable)', r'freez', r'outage', r'unacceptable', r'\bwaste', r'\bcancel', r'\bswitch(ing)? to', r'\bleave\b', r'\bleaving\b', r'mauvais', r'\bnul\b', r'd[eé]cevant', r'trop cher', r'pire']

def classify(text):
    t = text.lower()
    return [th for th, pats in THEMES.items() if any(re.search(p, t) for p in pats)]

def polarity(text):
    t = text.lower()
    p = sum(1 for x in POS if re.search(x, t)); n = sum(1 for x in NEG if re.search(x, t))
    if p > n: return 'positive'
    if n > p: return 'negative'
    return 'neutral'

def clean(v):
    if not isinstance(v, str): return None
    s = v.strip()
    if len(s) < 3 or s.lower() in ('n/a', 'na', 'none', 'no', 'nil', 'nothing', 'no comment', 'aucun', 'rien', 'see above', 'see comments', 'as above', 'see other comments', 'same as above', '.', '-', 'x', 'nope', 'no comments', 'no comments.', 'n.a.'):
        return None
    return s

out = {'months': MONTHS, 'respondents': {}, 'general_theme': {}, 'general_polarity': {}, 'tv_issue_mentions': {}, 'tv_issue_pct': {},
       'tv_issue_themes': {}, 'support_polarity': {}, 'quotes': {}}
theme_tbl = {t: [0, 0, 0] for t in THEMES}
pol_tbl = {p: [0, 0, 0] for p in ('positive', 'neutral', 'negative')}
tv_tbl = {v: [0, 0, 0] for v in TV_ISSUE.values()}
tv_theme_tbl = {t: [0, 0, 0] for t in THEMES}
sup_pol = {p: [0, 0, 0] for p in ('positive', 'neutral', 'negative')}
quotes = collections.defaultdict(list)
tv_quotes = collections.defaultdict(list)
neg_general_by_theme = {t: [0, 0, 0] for t in THEMES}

for mi, m in enumerate(MONTHS):
    wb = openpyxl.load_workbook(f'raw/survey_{m}.xlsx', read_only=True, data_only=True)
    ws = wb.worksheets[0]
    it = ws.iter_rows(values_only=True)
    hdr = [str(h) if h is not None else '' for h in next(it)]
    idx = {h: i for i, h in enumerate(hdr)}
    n = 0
    for r in it:
        if not any(v not in (None, '') for v in r): continue
        n += 1
        # general verbatims: one classification per respondent (union of themes across fields)
        texts = [clean(r[idx[c]]) for c in GENERAL if c in idx]
        texts = [t for t in texts if t]
        if texts:
            joined = ' | '.join(dict.fromkeys(texts))
            ths = classify(joined)
            for th in ths: theme_tbl[th][mi] += 1
            pol = polarity(joined); pol_tbl[pol][mi] += 1
            if pol == 'negative':
                for th in ths: neg_general_by_theme[th][mi] += 1
            if len(quotes['__' + pol]) < 30 and 50 < len(texts[0]) < 240 and 'Reliability: freezing, outages & drop-outs' in ths:
                quotes['__' + pol].append((m, texts[0]))
            for th in ths:
                if len(quotes[th]) < 40 and 40 < len(texts[0]) < 260: quotes[th].append((m, texts[0]))
        # TV-specific issue verbatims
        for col, label in TV_ISSUE.items():
            if col in idx:
                v = clean(r[idx[col]])
                if v:
                    tv_tbl[label][mi] += 1
                    for th in classify(v): tv_theme_tbl[th][mi] += 1
                    if len(tv_quotes[label]) < 30 and 25 < len(v) < 220: tv_quotes[label].append((m, v))
        for col in TV_OTHER:
            if col in idx:
                v = clean(r[idx[col]])
                if v:
                    for th in classify(v): tv_theme_tbl[th][mi] += 1
        for col in SUPPORT:
            if col in idx:
                v = clean(r[idx[col]])
                if v: sup_pol[polarity(v)][mi] += 1
    out['respondents'][m] = n

out['general_theme'] = dict(sorted(theme_tbl.items(), key=lambda kv: -sum(kv[1])))
out['general_theme_pct'] = {t: [round(v[i] / out['respondents'][MONTHS[i]] * 100, 1) for i in range(3)] for t, v in theme_tbl.items()}
out['general_polarity'] = pol_tbl
out['general_polarity_pct'] = {p: [round(v[i] / sum(pol_tbl[q][i] for q in pol_tbl) * 100, 1) for i in range(3)] for p, v in pol_tbl.items()}
out['neg_general_by_theme'] = neg_general_by_theme
out['tv_issue_mentions'] = dict(sorted(tv_tbl.items(), key=lambda kv: -sum(kv[1])))
out['tv_issue_pct'] = {t: [round(v[i] / out['respondents'][MONTHS[i]] * 100, 2) for i in range(3)] for t, v in tv_tbl.items()}
out['tv_issue_themes'] = dict(sorted(tv_theme_tbl.items(), key=lambda kv: -sum(kv[1])))
out['support_polarity'] = sup_pol
out['quotes'] = {k: v[:12] for k, v in quotes.items()}
out['tv_quotes'] = {k: v[:10] for k, v in tv_quotes.items()}
json.dump(out, open('survey_analysis.json', 'w'), indent=1)

print('RESPONDENTS', out['respondents'])
print('\nGENERAL THEMES (respondents mentioning)'); [print(f'  {k:44s} {v}  pct {out["general_theme_pct"][k]}') for k, v in out['general_theme'].items()]
print('\nGENERAL POLARITY', pol_tbl, out['general_polarity_pct'])
print('\nNEGATIVE-ONLY BY THEME'); [print(f'  {k:44s} {v}') for k, v in sorted(neg_general_by_theme.items(), key=lambda kv: -sum(kv[1]))]
print('\nTV ISSUE VERBATIM MENTIONS'); [print(f'  {k:40s} {v}  pct {out["tv_issue_pct"][k]}') for k, v in out['tv_issue_mentions'].items()]
print('\nTV ISSUE THEMES'); [print(f'  {k:44s} {v}') for k, v in out['tv_issue_themes'].items()]
print('\nCHATBOT/SUPPORT POLARITY', sup_pol)
for k, v in list(out['tv_quotes'].items())[:6]:
    print(f'\n[{k}]'); [print('   -', q) for q in v[:4]]
