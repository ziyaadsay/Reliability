"""TV customer sentiment (verbatim) analysis.

Reads the monthly combined CF&R Core Products survey exports (raw/cfr_2026-MM.xlsx,
"CF&R_Core Products_Data_YYYYMM.xlsx": one sheet of coded responses for every product),
keeps the TELUS Optik TV respondents (ServProduct = 2) and writes survey_analysis.json:
verbatim theme classification, text sentiment, TV issue mention rates and sample quotes.
Score columns are ignored.

The combined export carries the core questionnaire only: the Optik TV product module
(the dd* issue deep-dive verbatims) is not in it. TV issues are therefore read from the
issue description (CONTA, asked of respondents who had an issue in the past month) and
the reliability reason (V3) of respondents who rated TV reliability fair or poor.

Raw exports carry customer name, email, phone and address and are never committed.
"""
import openpyxl, collections, json, re
MONTHS = ['Aug', 'Sep', 'Oct']
FILES = {'Aug': 'raw/cfr_2026-08.xlsx', 'Sep': 'raw/cfr_2026-09.xlsx', 'Oct': 'raw/cfr_2026-10.xlsx'}
PRODUCT = 2                                    # ServProduct: 1 = TELUS Internet, 2 = TELUS Optik TV
GENERAL = ['v1', 'v2', 'v3', 'v6']            # reason-for-rating verbatims (overall TELUS relationship)
SUPPORT = ['v5b']                              # chatbot / digital support verbatims

# TV issue described: keyword classes over CONTA and the fair-or-poor V3 reason.
TV_ISSUE = {
    'Interruptions / freezing / restarts': [r'freez', r'frozen', r'buffer', r'glitch', r'cut(s|ting)? out', r'restart', r'reboot', r'reset', r'unplug', r'stutter', r'\blag', r'crash', r'interrup', r'\bgel', r'\bfige', r'keeps? (stopping|dropping)', r'drops?\b', r'spinning', r'loading', r'initializ'],
    'Picture quality': [r'(?<!profit )picture', r'pixel', r'(low|poor|bad|high|screen|picture) resolution', r'blurr', r'\bimage', r'black screen', r'blank screen', r'screen goes', r'fuzzy', r'grainy'],
    'Recording / PVR': [r'record', r'\bpvr\b', r'\bdvr\b', r'enregistr'],
    'Remote control': [r'remote', r't[eé]l[eé]commande', r'voice (command|control|search)'],
    'Sound quality': [r'\bsound', r'audio', r'volume', r'(pas|perte|sans) de son\b', r'out of sync', r'lip.?sync'],
    'Channel guide / navigation': [r'\bguide\b', r'\bmenu', r'navigat', r'interface', r'\bsearch', r'user.?friendly', r'clunky', r'hard to (find|use)'],
    'On-demand / VOD': [r'\bon.?demand\b', r'\bvod\b', r'rental', r'pay.?per.?view'],
    'Apps / streaming': [r'netflix', r'\bapps?\b', r'stream', r'youtube', r'prime', r'disney', r'crave', r'apple ?tv'],
    'Outages / service loss': [r'outage', r'no signal', r'no service', r'\bdown\b', r'not working', r"(doesn.?t|does not|won.?t|stopped|not) work", r'offline', r'\bpanne', r'los[et]\w*\s+(the\s+|my\s+|our\s+)?(signal|service|connection|tv)', r'no tv'],
    'Set-top box / equipment': [r'\bbox(es)?\b', r'\bstb\b', r'receiver', r'equipment', r'd[eé]codeur', r'bo[iî]tier', r'hardware'],
    'Channels & content': [r'channel', r'package', r'content', r'programs?\b', r'cha[iî]ne', r'canaux', r'sports', r'line-?up'],
    'Internet & Wi-Fi': [r'internet', r'wi-?fi', r'\bspeed', r'router', r'modem'],
    'Customer service experience': [r'customer service', r'\bagent', r'on hold', r'\bhold\b', r'\bwait', r'call(ed|ing)? (in|back|centre|center)', r'transferr?', r'representative', r'\brep\b', r'technician', r'\btech\b', r'appointment', r'support', r'no ?one (help|care|know)', r'unresolved', r'never (resolved|fixed)'],
    'Billing & price': [r'\bbill', r'\bpric', r'charg', r'\bcost', r'expensive', r'increas', r'credit', r'refund', r'\bcher'],
}

THEMES = {
    'Price, value & contract increases': [r'\bpric', r'\bcost', r'expensive', r'increas', r'contract', r'renew', r'loyalty', r'\bdeal\b', r'promotion', r'discount', r'\bprix\b', r'\bcher', r'augment', r'co[uû]t'],
    'Reliability: freezing, outages & drop-outs': [r'freez', r'glitch', r'unreliab', r'cut(s)? out', r'drop', r'outage', r'offline', r'buffer', r'reboot', r'restart', r'reliab', r'\bpanne', r'\bgel', r'coupure', r'interrup', r'goes? out', r'lose (the )?(signal|connection)', r'no signal'],
    'Picture & sound quality': [r'(?<!profit )picture', r'pixel', r'(low|poor|bad|high|screen|picture) resolution', r'\bhd\b', r'\bsound\b', r'audio', r'volume', r'image', r'qualit[eé] (d.)?image', r'\bson\b'],
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


# quotes must not carry contact details
PII = re.compile(r'@|\d{3}[\s.-]?\d{3}[\s.-]?\d{4}|\d{6,}')


PRAISE = re.compile(r'exceptional|excellent|amazing|wonderful', re.I)


def tv_issues(text):
    t = text.lower()
    return [k for k, pats in TV_ISSUE.items() if any(re.search(p, t) for p in pats)]


out = {'months': MONTHS, 'respondents': {}}
theme_tbl = {t: [0, 0, 0] for t in THEMES}
pol_tbl = {p: [0, 0, 0] for p in ('positive', 'neutral', 'negative')}
tv_tbl = {k: [0, 0, 0] for k in TV_ISSUE}
tv_desc = [0, 0, 0]                            # respondents with a usable issue description
tv_none = [0, 0, 0]                            # ...whose description matched no TV issue class
sup_pol = {p: [0, 0, 0] for p in ('positive', 'neutral', 'negative')}
tv_quotes = collections.defaultdict(list)
neg_general_by_theme = {t: [0, 0, 0] for t in THEMES}
LAST = len(MONTHS) - 1

for mi, m in enumerate(MONTHS):
    wb = openpyxl.load_workbook(FILES[m], read_only=True, data_only=True)
    ws = wb.worksheets[0]
    it = ws.iter_rows(values_only=True)
    hdr = [str(h) if h is not None else '' for h in next(it)]
    idx = {h: i for i, h in enumerate(hdr)}
    n = 0
    for r in it:
        if r[idx['ServProduct']] != PRODUCT: continue
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
        # TV issue descriptions: CONTA, plus the V3 reason of those rating reliability fair or poor
        desc = [clean(r[idx['conta']])]
        if r[idx['p1a']] in (4, 5): desc.append(clean(r[idx['v3']]))
        desc = [d for d in desc if d]
        if desc:
            tv_desc[mi] += 1
            found = set()
            for d in desc: found.update(tv_issues(d))
            if not found: tv_none[mi] += 1
            for k in found: tv_tbl[k][mi] += 1
            if mi == LAST:
                for d in desc:
                    ks = tv_issues(d)
                    if len(ks) == 1 and 35 < len(d) < 200 and not PII.search(d) and polarity(d) != 'positive' and not PRAISE.search(d) and len(tv_quotes[ks[0]]) < 12:
                        tv_quotes[ks[0]].append((m, d))
        for col in SUPPORT:
            if col in idx:
                v = clean(r[idx[col]])
                if v: sup_pol[polarity(v)][mi] += 1
    out['respondents'][m] = n

R = [out['respondents'][m] for m in MONTHS]
out['general_theme'] = dict(sorted(theme_tbl.items(), key=lambda kv: -sum(kv[1])))
out['general_theme_pct'] = {t: [round(v[i] / R[i] * 100, 1) for i in range(3)] for t, v in theme_tbl.items()}
out['general_polarity'] = pol_tbl
out['general_polarity_pct'] = {p: [round(v[i] / sum(pol_tbl[q][i] for q in pol_tbl) * 100, 1) for i in range(3)] for p, v in pol_tbl.items()}
out['neg_general_by_theme'] = neg_general_by_theme
out['tv_issue_mentions'] = dict(sorted(tv_tbl.items(), key=lambda kv: -kv[1][LAST]))
out['tv_issue_pct'] = {t: [round(v[i] / R[i] * 100, 2) for i in range(3)] for t, v in tv_tbl.items()}
out['tv_issue_base'] = tv_desc
out['tv_issue_none'] = tv_none
out['support_polarity'] = sup_pol
out['tv_quotes'] = {k: v[:10] for k, v in tv_quotes.items()}
json.dump(out, open('survey_analysis.json', 'w'), indent=1, ensure_ascii=False)

print('RESPONDENTS', out['respondents'])
print('\nGENERAL THEMES (respondents mentioning)'); [print(f'  {k:44s} {v}  pct {out["general_theme_pct"][k]}') for k, v in out['general_theme'].items()]
print('\nGENERAL POLARITY', pol_tbl, out['general_polarity_pct'])
print('\nNEGATIVE-ONLY BY THEME'); [print(f'  {k:44s} {v}') for k, v in sorted(neg_general_by_theme.items(), key=lambda kv: -sum(kv[1]))]
print('\nTV ISSUE DESCRIPTIONS base', tv_desc, 'no class', tv_none); [print(f'  {k:40s} {v}  pct {out["tv_issue_pct"][k]}') for k, v in out['tv_issue_mentions'].items()]
print('\nCHATBOT/SUPPORT POLARITY', sup_pol)
for k, v in out['tv_quotes'].items():
    print(f'\n[{k}]'); [print('   -', q[1]) for q in v[:8]]
