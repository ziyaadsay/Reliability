"""HSIA customer sentiment analysis.

Reads the monthly CF&R TELUS Internet survey exports (raw/hsia_survey_2026-0{6,7,8}.xlsx)
and writes hsia_survey_analysis.json: the aggregated figures behind the HSIA
"Customer Sentiment" sub-page. Unweighted respondent counts throughout (the file
carries a `wt` column, which is not applied so the counts match the raw base).

Raw exports carry customer name, email, phone and address and are never committed.
"""
import openpyxl, collections, json, re

MONTHS = ['Jun', 'Jul', 'Aug']
FILES = {'Jun': 'raw/hsia_survey_2026-06.xlsx', 'Jul': 'raw/hsia_survey_2026-07.xlsx', 'Aug': 'raw/hsia_survey_2026-08.xlsx'}

# ---- verbatim fields -------------------------------------------------------
GENERAL = ['v1', 'v2', 'v3', 'v6']      # reason-for-rating (customers-first, NPS, reliability, cancel intent)
ISSUE = {                                # issue descriptions and reliability deep-dives
    'conta': 'Issue described at contact',
    'iddos1': 'Other TELUS service issue',
    'ddw1': 'Home Wi-Fi',
    'ddcp1': 'Connection / speed',
    'ddvs1': 'Video streaming interrupted',
    'iddcs1': 'Customer service / tech support',
    'qwfp5': 'Wi-Fi Plus impact',
    'nq8b': 'Why never contacted',
}
SUPPORT = ['v5b']                        # chatbot / digital support

# ---- structured fields -----------------------------------------------------
RATING = {1: 'Excellent', 2: 'Very good', 3: 'Good', 4: 'Fair', 5: 'Poor', 6: 'Unsure', 7: 'N/A'}
ATTRS = {
    'iqpf1_1': 'Connection stability', 'iqpf1_2': 'Speed consistency', 'iqpf1_3': 'Max download speed',
    'iqpf1_4': 'Max upload speed', 'iqpf1_5': 'Wi-Fi coverage at home', 'iqpf1_6': 'Wi-Fi performance at home',
    'iqpf1_7': 'Online gaming', 'iqpf1_8': 'Customer service / tech support', 'iqpf1_9': 'Data-usage allowance',
}
IMPORT = {k.replace('iqpf1_', 'iqim1_'): v for k, v in ATTRS.items()}
DRIVERS = {
    1: 'Home Wi-Fi', 2: 'TELUS email problems', 3: 'TELUS customer service', 4: 'TELUS technical support',
    5: 'Other TELUS services', 6: 'Frequent loss of connection', 7: 'Slow Internet speeds',
    8: 'Inconsistent Internet speeds', 9: 'Interrupted video streaming', 95: 'Other',
}
DRIVER_COLS = [f'Q1C_INTm{c}' for c in list(DRIVERS) + [96, 97]]

THEMES = {
    # "down" and "drop" are scoped to service words: "bring my fees down" and
    # "dropped the price" are not outages.
    'Connection drops & outages': [r'drop\w*\s+(the\s+)?(connection|internet|service|signal|wi-?fi|network|out)', r'(connection|internet|service|signal|wi-?fi|network)\w*\s+\w{0,12}?drop', r'disconnect', r'outage', r'(internet|service|connection|signal|network|wi-?fi|system)[^.]{0,25}\bdown\b', r'\bdown\b[^.]{0,25}(internet|service|connection|daily|constantly)', r'cut(s|ting)? out', r'lose (the )?(connection|internet|signal|service)', r'lost (the )?(connection|internet|signal|service)', r'unstable', r'intermitt', r'unreliab', r'\bpanne', r'coupure', r'interrupt', r'goes? out\b(?! of (their|his|her|its|the) way)', r'keeps? (dropping|going out)', r'no internet', r'not working'],
    'Slow or inconsistent speeds': [r'\bslow', r'\bspeed', r'\blag', r'buffer', r'latenc', r'\bping\b', r'inconsist', r'lent', r'vitesse', r'not getting.*(speed|mbps)', r'\bmbps\b', r'bandwidth'],
    'Wi-Fi coverage & dead zones': [r'wi-?fi', r'\bwifi', r'dead ?(zone|spot)', r'coverage', r'signal (strength|weak)', r'weak signal', r'upstairs', r'basement', r'extender', r'\bmesh\b', r'\bbooster', r'couverture'],
    'Equipment: modem, router, ONT': [r'\bmodem', r'\brouter', r'\bont\b', r'gateway', r'equipment', r'\bhardware', r'\bbox\b', r'reboot', r'restart', r'reset', r'firmware', r'\bdevice', r'\bcable'],
    'Price, value & contract increases': [r'\bpric', r'\bcost', r'expensive', r'increas', r'contract', r'renew', r'loyalty', r'\bdeal\b', r'promotion', r'discount', r'\bprix\b', r'\bcher', r'augment', r'co[uû]t', r'\bvalue\b', r'overcharg', r'\bfees?\b'],
    'Customer service & support access': [r'customer service', r'\bagent', r'on hold', r'\bhold\b', r'\bwait', r'call(ed|ing)? (in|back|centre|center)', r'transferr?', r'representative', r'\brep\b', r'service [àa] la client', r'attente', r'talk to a (human|person|real)', r'real person', r'run ?around', r'bounced', r'support', r'overseas', r'語|call centre'],
    'Chatbot & digital self-serve': [r'\bchat ?bot', r'\bbot\b', r'\bchat\b', r'\bai\b', r'automated', r'virtual assistant', r'\bapp\b', r'\bwebsite', r'online account', r'my ?telus'],
    'Technician & installation': [r'install', r'technician', r'\btech\b', r'\btechs\b', r'appointment', r'\bvisit', r'installat', r'no ?show', r'service call'],
    'Billing & account': [r'\bbill', r'invoice', r'charg', r'account', r'facture', r'factur', r'credit', r'refund', r'\bplan\b'],
    'Email problems': [r'\bemail', r'\be-mail', r'webmail', r'courriel', r'\binbox'],
    'Competitor / switching': [r'\bshaw\b', r'\brogers\b', r'\bbell\b', r'\bstarlink', r'\bnovus', r'competitor', r'switch(ing)? to', r'\bleave\b', r'\bleaving\b', r'another provider', r'\bcancel'],
    'Positive: satisfied / no issues': [r'no (problems?|issues?|complaints?)', r'\bgood\b', r'\bgreat\b', r'\bhappy\b', r'satisf', r'excellent', r'\blove\b', r'\bbest\b', r'works? (well|fine|great)', r'aucun probl', r'bon service', r'tr[eè]s bien', r'\bsuper\b', r'\bparfait', r'reliable', r'no complaints'],
}
POS = [r'\bgood\b', r'\bgreat\b', r'\bhappy\b', r'satisf', r'excellent', r'\blove\b', r'\bbest\b', r'reliable', r'no (problems?|issues?|complaints?)', r'works? (well|fine|great)', r'\bthank', r'friendly', r'helpful', r'aucun probl', r'bon service', r'tr[eè]s bien', r'\bsuper\b', r'\bparfait', r'\bcontent', r'appreciat', r'\bfast\b', r'\beasy\b', r'\bpleased', r'no issues']
NEG = [r'\bbad\b', r'poor', r'terrible', r'horrible', r'worst', r'frustrat', r'disappoint', r'unreliab', r'expensive', r'\brip.?off', r'dishonest', r'\blie[sd]?\b', r'\bscam', r'\bnever\b', r'useless', r'ridiculous', r'annoy', r'\bslow\b', r'\bfail', r'\bnot (good|happy|satisfied|working|reliable)', r'outage', r'unacceptable', r'\bwaste', r'\bcancel', r'\bswitch(ing)? to', r'\bleaving\b', r'mauvais', r'\bnul\b', r'd[eé]cevant', r'trop cher', r'pire', r'drop', r'keeps? going']

NOISE = {'n/a', 'na', 'none', 'no', 'nil', 'nothing', 'no comment', 'nocomment', 'no comments', 'aucun', 'rien',
         'see above', 'see comments', 'as above', 'see other comments', 'same as above', '.', '-', 'x', 'nope',
         'n.a.', 'no comment.', 'none.', 'nothing.', 'no idea', 'unsure', 'not sure', 'dont know', "don't know",
         'already previously explained', 'resolved', 'no response', 'no answer'}


def clean(v):
    if not isinstance(v, str):
        return None
    s = v.strip()
    if len(s) < 3 or s.lower().strip('. ') in NOISE:
        return None
    return s


def classify(text):
    t = text.lower()
    return [th for th, pats in THEMES.items() if any(re.search(p, t) for p in pats)]


# "few outages", "rarely any issues" and similar read as negative to the bag-of-words
# scorer; quotes need a stricter test than the aggregate polarity split.
NOT_A_PROBLEM = re.compile(r'\b(few|no|not many|rarely|hardly any|without any|zero)\s+\w{0,12}?(outage|issue|problem|drop|complaint)', re.I)


def clearly_negative(text):
    if NOT_A_PROBLEM.search(text):
        return False
    t = text.lower()
    p = sum(1 for x in POS if re.search(x, t))
    n = sum(1 for x in NEG if re.search(x, t))
    return n - p >= 2


def polarity(text):
    t = text.lower()
    p = sum(1 for x in POS if re.search(x, t))
    n = sum(1 for x in NEG if re.search(x, t))
    return 'positive' if p > n else 'negative' if n > p else 'neutral'


def z():
    return [0, 0, 0]


resp = z()
nps_counts = [collections.Counter() for _ in MONTHS]
p1a_counts = [collections.Counter() for _ in MONTHS]
q8_counts = [collections.Counter() for _ in MONTHS]
q12_counts = [collections.Counter() for _ in MONTHS]
q15_counts = [collections.Counter() for _ in MONTHS]
p5_counts = [collections.Counter() for _ in MONTHS]
attr_bad = {k: z() for k in ATTRS}          # Fair/Poor count
attr_base = {k: z() for k in ATTRS}         # answered, excluding Unsure/NA
imp_top = {k: z() for k in IMPORT}          # "very/extremely important" proxy: codes 1-2
imp_base = {k: z() for k in IMPORT}
driver_counts = {v: z() for v in DRIVERS.values()}
driver_base = z()                            # respondents asked the driver question
theme_tbl = {t: z() for t in THEMES}
theme_neg = {t: z() for t in THEMES}
pol_tbl = {p: z() for p in ('positive', 'neutral', 'negative')}
verb_base = z()
issue_tbl = {v: z() for v in ISSUE.values()}
issue_theme = {t: z() for t in THEMES}
sup_pol = {p: z() for p in ('positive', 'neutral', 'negative')}
# reliability rating split by whether the respondent had an issue
bad_by_contact = {'contacted': z(), 'issue_no_contact': z(), 'no_issue': z()}
base_by_contact = {'contacted': z(), 'issue_no_contact': z(), 'no_issue': z()}
quotes = collections.defaultdict(list)

for mi, m in enumerate(MONTHS):
    wb = openpyxl.load_workbook(FILES[m], read_only=True, data_only=True)
    ws = wb.worksheets[0]
    it = ws.iter_rows(values_only=True)
    hdr = [str(h) if h is not None else '' for h in next(it)]
    idx = {h: i for i, h in enumerate(hdr)}
    g = lambda r, c: r[idx[c]] if c in idx else None

    for r in it:
        if not any(v not in (None, '') for v in r):
            continue
        resp[mi] += 1

        # ---- structured ----
        for col, tbl in (('qnps', nps_counts), ('p1a', p1a_counts), ('q8', q8_counts),
                         ('q12', q12_counts), ('q15', q15_counts), ('p5', p5_counts)):
            v = g(r, col)
            if v is not None:
                tbl[mi][v] += 1

        for k in ATTRS:
            v = g(r, k)
            if isinstance(v, (int, float)) and v in (1, 2, 3, 4, 5):
                attr_base[k][mi] += 1
                if v in (4, 5):
                    attr_bad[k][mi] += 1
        for k in IMPORT:
            v = g(r, k)
            if isinstance(v, (int, float)) and 1 <= v <= 5:
                imp_base[k][mi] += 1
                if v in (1, 2):
                    imp_top[k][mi] += 1

        picked = [g(r, c) for c in DRIVER_COLS if c in idx]
        picked = [p for p in picked if p is not None]
        if picked:
            driver_base[mi] += 1
            for code in picked:
                if code in DRIVERS:
                    driver_counts[DRIVERS[code]][mi] += 1

        # reliability bottom-2 by contact status
        p1a, q8 = g(r, 'p1a'), g(r, 'q8')
        bucket = 'contacted' if q8 == 1 else 'issue_no_contact' if q8 == 4 else 'no_issue' if q8 == 5 else None
        if bucket and p1a in (1, 2, 3, 4, 5):
            base_by_contact[bucket][mi] += 1
            if p1a in (4, 5):
                bad_by_contact[bucket][mi] += 1

        # ---- general verbatims: one classification per respondent ----
        texts = [clean(g(r, c)) for c in GENERAL]
        texts = [t for t in texts if t]
        if texts:
            verb_base[mi] += 1
            joined = ' '. join(texts)
            ths = set()
            for t in texts:
                ths.update(classify(t))
            pol = polarity(joined)
            pol_tbl[pol][mi] += 1
            for th in ths:
                theme_tbl[th][mi] += 1
                if pol == 'negative':
                    theme_neg[th][mi] += 1
                    # quote must match THIS theme, not merely come from a respondent
                    # who mentioned it somewhere across their four verbatims
                    if mi == 2 and len(quotes[th]) < 4 and th != 'Positive: satisfied / no issues':
                        cand = [t for t in texts if th in classify(t) and 25 <= len(t) <= 180
                                and clearly_negative(t)]
                        # prefer the verbatim that is most specific to this theme
                        cand.sort(key=lambda t: (len(classify(t)), -len(t)))
                        if cand:
                            quotes[th].append(cand[0])

        # ---- issue verbatims ----
        for col, label in ISSUE.items():
            t = clean(g(r, col))
            if t:
                issue_tbl[label][mi] += 1
                for th in classify(t):
                    issue_theme[th][mi] += 1

        # ---- chatbot ----
        for col in SUPPORT:
            t = clean(g(r, col))
            if t:
                sup_pol[polarity(t)][mi] += 1

pct = lambda num, den: [round(num[i] / den[i] * 100, 1) if den[i] else 0 for i in range(3)]

# rotating modules: find the single month each battery was asked in
_perf_mi = next((i for i in range(3) if sum(attr_base[k][i] for k in ATTRS)), None)
_imp_mi = next((i for i in range(3) if sum(imp_base[k][i] for k in IMPORT)), None)


def nps(cnt):
    out = []
    for c in cnt:
        tot = sum(c.values())
        pro = sum(v for k, v in c.items() if k in (9, 10))
        det = sum(v for k, v in c.items() if isinstance(k, (int, float)) and k <= 6)
        out.append(round((pro - det) / tot * 100, 1) if tot else 0)
    return out


def share(cnt, codes):
    return [round(sum(v for k, v in c.items() if k in codes) / max(1, sum(c.values())) * 100, 1) for c in cnt]


def counts(cnt, codes):
    return [sum(v for k, v in c.items() if k in codes) for c in cnt]


out = {
    'months': [f'{m} 2026' for m in MONTHS],
    'respondents': resp,
    'nps': {'score': nps(nps_counts),
            'promoters': share(nps_counts, (9, 10)),
            'passives': share(nps_counts, (7, 8)),
            'detractors': share(nps_counts, tuple(range(0, 7)))},
    'reliability': {'top2': share(p1a_counts, (1, 2)), 'good': share(p1a_counts, (3,)),
                    'bottom2': share(p1a_counts, (4, 5)), 'bottom2N': counts(p1a_counts, (4, 5)),
                    'dist': {RATING[k]: [c.get(k, 0) for c in p1a_counts] for k in (1, 2, 3, 4, 5)}},
    'service': {'top2': share(q15_counts, (1, 2)), 'bottom2': share(q15_counts, (4, 5))},
    'easy': {'agree': share(q12_counts, (1, 2)), 'disagree': share(q12_counts, (4, 5)),
             'base': [sum(c.values()) for c in q12_counts]},
    'contact': {'contacted': share(q8_counts, (1,)), 'issue_no_contact': share(q8_counts, (4,)),
                'no_issue': share(q8_counts, (5,)),
                'contactedN': counts(q8_counts, (1,)), 'issue_no_contactN': counts(q8_counts, (4,))},
    'churn': {'at_risk': share(p5_counts, (4, 5)), 'downgrade': share(p5_counts, (3,)),
              'stay': share(p5_counts, (2,)), 'upgrade': share(p5_counts, (1,)),
              'at_riskN': counts(p5_counts, (4, 5))},
    'drivers': sorted(
        [{'name': n, 'v': driver_counts[n], 'pct': pct(driver_counts[n], driver_base)} for n in driver_counts if sum(driver_counts[n])],
        key=lambda d: -d['v'][2]),
    'driverBase': driver_base,
    # The performance and importance batteries are rotating modules: performance is
    # asked in Aug only and importance in Jul only, so they are reported as
    # point-in-time readings rather than a three-month trend.
    'attributes': {
        'perfMonth': MONTHS[_perf_mi] + ' 2026' if _perf_mi is not None else None,
        'impMonth': MONTHS[_imp_mi] + ' 2026' if _imp_mi is not None else None,
        'rows': sorted(
            [{'name': ATTRS[k],
              'bad': attr_bad[k][_perf_mi] if _perf_mi is not None else 0,
              'base': attr_base[k][_perf_mi] if _perf_mi is not None else 0,
              'pct': round(attr_bad[k][_perf_mi] / attr_base[k][_perf_mi] * 100, 1) if _perf_mi is not None and attr_base[k][_perf_mi] else 0,
              'imp': round(imp_top['iqim1_' + k.split('_')[1]][_imp_mi] / imp_base['iqim1_' + k.split('_')[1]][_imp_mi] * 100, 1) if _imp_mi is not None and imp_base['iqim1_' + k.split('_')[1]][_imp_mi] else None}
             for k in ATTRS],
            key=lambda d: -d['pct'])},
    'verbatimBase': verb_base,
    'polarity': {p: pct(pol_tbl[p], verb_base) for p in pol_tbl},
    'polarityN': pol_tbl,
    'themes': sorted(
        [{'name': t, 'v': theme_tbl[t], 'pct': pct(theme_tbl[t], verb_base), 'neg': theme_neg[t]} for t in theme_tbl if sum(theme_tbl[t])],
        key=lambda d: -d['v'][2]),
    'issueVerbatims': sorted(
        [{'name': n, 'v': issue_tbl[n]} for n in issue_tbl if sum(issue_tbl[n])], key=lambda d: -d['v'][2]),
    'issueThemes': sorted(
        [{'name': t, 'v': issue_theme[t]} for t in issue_theme if sum(issue_theme[t])], key=lambda d: -d['v'][2]),
    'chatbot': {p: sup_pol[p] for p in sup_pol},
    'reliabilityByContact': {k: {'bad': bad_by_contact[k], 'base': base_by_contact[k],
                                 'pct': pct(bad_by_contact[k], base_by_contact[k])} for k in bad_by_contact},
    'quotes': {k: v for k, v in quotes.items() if v},
}
json.dump(out, open('hsia_survey_analysis.json', 'w'), indent=1)

print('respondents', resp)
print('NPS', out['nps'])
print('reliability', out['reliability']['top2'], out['reliability']['bottom2'])
print('drivers base', driver_base)
for d in out['drivers'][:10]:
    print('  driver', d['name'], d['v'], d['pct'])
print('attributes perf month', out['attributes']['perfMonth'], 'imp month', out['attributes']['impMonth'])
for a in out['attributes']['rows']:
    print(f"  attr {a['name']:34s} fair/poor {a['pct']:5.1f}%  (n={a['base']})  importance {a['imp']}")
print('polarity', out['polarity'], 'base', verb_base)
for t in out['themes'][:8]:
    print('  theme', t['name'], t['pct'])
print('churn', out['churn'])
print('contact', out['contact'])
print('reliabilityByContact', {k: v['pct'] for k, v in out['reliabilityByContact'].items()})
print('chatbot', out['chatbot'])
print('issueVerbatims', out['issueVerbatims'])
