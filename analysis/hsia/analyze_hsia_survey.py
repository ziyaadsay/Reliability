"""HSIA customer sentiment analysis.

Reads the monthly combined CF&R Core Products survey exports
(raw/cfr_2026-MM.xlsx, "CF&R_Core Products_Data_YYYYMM.xlsx": one sheet of coded
responses for every product plus the Variable Labels and Value Labels sheets),
keeps the TELUS Internet respondents (ServProduct = 1) and writes
hsia_survey_analysis.json: the aggregated figures behind the HSIA "Customer
Sentiment" sub-page. Unweighted respondent counts throughout (the file carries a
`wt` column, which is not applied so the counts match the raw base).

The combined export carries the core questionnaire only. The TELUS Internet
product module (Q1C_INT reliability drivers, the iqpf1 / iqim1 performance and
importance batteries and the dd* deep-dive verbatims) is not in it, so the reasons
behind a fair or poor reliability rating are read from the V3 verbatim instead.

Raw exports carry customer name, email, phone and address and are never committed.
"""
import openpyxl, collections, json, re

MONTHS = ['Aug', 'Sep', 'Oct']
YEAR = 2026
FILES = {'Aug': 'raw/cfr_2026-08.xlsx', 'Sep': 'raw/cfr_2026-09.xlsx', 'Oct': 'raw/cfr_2026-10.xlsx'}
PRODUCT = 1                              # ServProduct: 1 = TELUS Internet, 2 = TELUS Optik TV

# ---- verbatim fields -------------------------------------------------------
GENERAL = ['v1', 'v2', 'v3', 'v6']      # reason-for-rating (customers-first, NPS, reliability, cancel intent)
ISSUE = {                                # issue descriptions
    'conta': 'Issue described (had an issue in the past month)',
    'nq8b': 'Why never contacted',
    'qwfp5': 'Wi-Fi Plus impact',
}
SUPPORT = ['v5b']                        # chatbot / digital support

# ---- structured fields -----------------------------------------------------
RATING = {1: 'Excellent', 2: 'Very good', 3: 'Good', 4: 'Fair', 5: 'Poor', 6: 'Unsure', 7: 'N/A'}
ONE_THING = {1: 'No issues in the past month', 2: 'Service outage(s)', 6: 'Network issues', 5: 'Unresolved product issue(s)',
             4: 'Price increase', 3: 'Billing issues', 7: 'Poor experience with customer service / support rep',
             8: 'Poor My TELUS app experience', 9: 'Poor TELUS Assist / chatbot experience', 95: 'Other'}
RESOLVE = {1: 'Resolved immediately', 2: 'Resolved, but not immediately', 3: 'Not resolved yet, TELUS working on it', 4: 'Not resolved', 5: 'Unsure'}
TIMES = {1: 'Once', 2: '2-3 times', 3: '4-5 times', 4: 'More than 5 times', 5: 'Unsure'}
SWITCH_TO = {11: 'Rogers', 7: 'Bell Internet', 15: 'Novus', 8: 'Videotron', 9: 'Cogeco', 1: 'Eastlink', 14: 'Koodo', 13: 'SaskTel', 95: 'Other', 97: "Don't know"}
SWITCH_COLS = {f'P5b_Intm{c}': c for c in (1, 7, 8, 9, 11, 13, 14, 15, 95, 96, 97)}

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


# The V3 verbatim answers "why did you rate reliability fair or poor", so short connection
# complaints ("bad connection", "drops on and off", "down several times") are read as
# connection problems there. These extra patterns apply to the reasons table only; the
# reason-for-rating themes keep the stricter lexicon above.
REASON_EXTRA = {
    'Connection drops & outages': [r'drop', r'\bdown\b', r'not stable', r'in and out', r'on and off', r'cuts? (in and )?out', r'no service',
                                   r'(bad|poor|weak|spotty|terrible|horrible|lousy|unstable)\s+(internet\s+)?(connection|connectivity|signal|reception)',
                                   r'(connection|connectivity|signal|reception)[^.]{0,30}(not (good|great)|weak|poor|bad|issue|problem|trouble|lost|los[et])',
                                   r'los[et]\w*\s+(my\s+|our\s+)?(connection|internet|reception|signal|service)',
                                   r"(doesn.?t|does not|won.?t|not)\s+(always\s+)?(work|connect)", r'stutter', r'freez', r'glitch', r'wonky', r'spotty', r'crash',
                                   r'd[eé]connect', r'instable'],
}


def classify_reason(text):
    t = text.lower()
    ths = set(classify(text))
    ths.update(th for th, pats in REASON_EXTRA.items() if any(re.search(p, t) for p in pats))
    return [th for th in ths if not th.startswith('Positive')]


# "few outages", "rarely any issues" and similar read as negative to the bag-of-words
# scorer; quotes need a stricter test than the aggregate polarity split.
NOT_A_PROBLEM = re.compile(r'\b(few|no|not many|rarely|hardly any|without any|zero)\s+\w{0,12}?(outage|issue|problem|drop|complaint)|\b(not|never) had (any )?(buffering|drop|issue|problem|outage)', re.I)


# quotes must not carry contact details
PII = re.compile(r'@|\d{3}[\s.-]?\d{3}[\s.-]?\d{4}|\d{6,}')

# profanity, and comments about the mobile network rather than home Internet
UNQUOTABLE = re.compile(r'fuck|shit|\bcalls? (drop|are)|\btowers?\b|out of network', re.I)


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
cnt = {c: [collections.Counter() for _ in MONTHS] for c in ('qnps', 'p1a', 'p2', 'q8', 'q12', 'q15', 'p5', 'q16t', 'q10', 'q10_2', 'q5a1', 'q5a2')}
theme_tbl = {t: z() for t in THEMES}
theme_neg = {t: z() for t in THEMES}
pol_tbl = {p: z() for p in ('positive', 'neutral', 'negative')}
verb_base = z()
issue_tbl = {v: z() for v in ISSUE.values()}
issue_theme = {t: z() for t in THEMES}
sup_pol = {p: z() for p in ('positive', 'neutral', 'negative')}
# why reliability was rated fair or poor: V3 verbatim of the bottom-two-box raters
reason_tbl = {t: z() for t in THEMES if not t.startswith('Positive')}
reason_base = z()
reason_none = z()                      # usable comment, no theme matched
switch_tbl = {v: z() for v in SWITCH_TO.values()}
switch_base = z()
# reliability rating split by whether the respondent had an issue
bad_by_contact = {'contacted': z(), 'issue_no_contact': z(), 'no_issue': z()}
base_by_contact = {'contacted': z(), 'issue_no_contact': z(), 'no_issue': z()}
quotes = collections.defaultdict(list)
quoted = set()
LAST = len(MONTHS) - 1

for mi, m in enumerate(MONTHS):
    wb = openpyxl.load_workbook(FILES[m], read_only=True, data_only=True)
    ws = wb.worksheets[0]
    it = ws.iter_rows(values_only=True)
    hdr = [str(h) if h is not None else '' for h in next(it)]
    idx = {h: i for i, h in enumerate(hdr)}
    g = lambda r, c: r[idx[c]] if c in idx else None

    for r in it:
        if g(r, 'ServProduct') != PRODUCT:
            continue
        resp[mi] += 1

        # ---- structured ----
        for col, tbl in cnt.items():
            v = g(r, col)
            if v is not None:
                tbl[mi][v] += 1

        picked = [code for col, code in SWITCH_COLS.items() if g(r, col) is not None]
        if picked:
            switch_base[mi] += 1
            for code in picked:
                if code in SWITCH_TO:
                    switch_tbl[SWITCH_TO[code]][mi] += 1

        # reliability bottom-2 by contact status
        p1a, q8 = g(r, 'p1a'), g(r, 'q8')
        bucket = 'contacted' if q8 == 1 else 'issue_no_contact' if q8 == 4 else 'no_issue' if q8 == 5 else None
        if bucket and p1a in (1, 2, 3, 4, 5):
            base_by_contact[bucket][mi] += 1
            if p1a in (4, 5):
                bad_by_contact[bucket][mi] += 1

        # reasons behind a fair or poor reliability rating
        v3 = clean(g(r, 'v3'))
        if p1a in (4, 5) and v3:
            reason_base[mi] += 1
            ths = classify_reason(v3)
            if not ths:
                reason_none[mi] += 1
            for th in ths:
                reason_tbl[th][mi] += 1

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
                    if mi == LAST and len(quotes[th]) < 4 and th != 'Positive: satisfied / no issues':
                        cand = [t for t in texts if th in classify(t) and 25 <= len(t) <= 180
                                and clearly_negative(t) and not PII.search(t) and not UNQUOTABLE.search(t)
                                and t not in quoted]
                        # prefer the verbatim that is most specific to this theme
                        cand.sort(key=lambda t: (len(classify(t)), -len(t)))
                        if cand:
                            quotes[th].append(cand[0])
                            quoted.add(cand[0])        # a verbatim is quoted once, under its first theme

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


def nps(c3):
    out = []
    for c in c3:
        tot = sum(c.values())
        pro = sum(v for k, v in c.items() if k in (9, 10))
        det = sum(v for k, v in c.items() if isinstance(k, (int, float)) and k <= 6)
        out.append(round((pro - det) / tot * 100, 1) if tot else 0)
    return out


def share(c3, codes):
    return [round(sum(v for k, v in c.items() if k in codes) / max(1, sum(c.values())) * 100, 1) for c in c3]


def counts(c3, codes):
    return [sum(v for k, v in c.items() if k in codes) for c in c3]


def dist(c3, labels):
    """Rows of {name, v, pct} for a single-choice question, in the order of `labels`."""
    return [{'name': lab, 'v': counts(c3, (code,)), 'pct': share(c3, (code,))} for code, lab in labels.items()]


out = {
    'months': [f'{m} {YEAR}' for m in MONTHS],
    'respondents': resp,
    'nps': {'score': nps(cnt['qnps']),
            'promoters': share(cnt['qnps'], (9, 10)),
            'passives': share(cnt['qnps'], (7, 8)),
            'detractors': share(cnt['qnps'], tuple(range(0, 7)))},
    'reliability': {'top2': share(cnt['p1a'], (1, 2)), 'good': share(cnt['p1a'], (3,)),
                    'bottom2': share(cnt['p1a'], (4, 5)), 'bottom2N': counts(cnt['p1a'], (4, 5)),
                    'dist': {RATING[k]: [c.get(k, 0) for c in cnt['p1a']] for k in (1, 2, 3, 4, 5)}},
    'value': {'top2': share(cnt['p2'], (1, 2)), 'bottom2': share(cnt['p2'], (4, 5))},
    'service': {'top2': share(cnt['q15'], (1, 2)), 'bottom2': share(cnt['q15'], (4, 5))},
    'easy': {'agree': share(cnt['q12'], (1, 2)), 'disagree': share(cnt['q12'], (4, 5)),
             'base': [sum(c.values()) for c in cnt['q12']]},
    'contact': {'contacted': share(cnt['q8'], (1,)), 'issue_no_contact': share(cnt['q8'], (4,)),
                'no_issue': share(cnt['q8'], (5,)),
                'contactedN': counts(cnt['q8'], (1,)), 'issue_no_contactN': counts(cnt['q8'], (4,))},
    'churn': {'at_risk': share(cnt['p5'], (4, 5)), 'downgrade': share(cnt['p5'], (3,)),
              'stay': share(cnt['p5'], (2,)), 'upgrade': share(cnt['p5'], (1,)),
              'at_riskN': counts(cnt['p5'], (4, 5))},
    # Q5a1 / Q5a2: how close to switching, and how TELUS compares with other providers
    'consider': {'wouldnt': share(cnt['q5a1'], (1, 2)), 'easily': share(cnt['q5a1'], (3,)), 'already': share(cnt['q5a1'], (4,)),
                 'better': share(cnt['q5a2'], (1, 2)), 'worse': share(cnt['q5a2'], (4, 5))},
    'switchTo': sorted([{'name': n, 'v': switch_tbl[n], 'pct': pct(switch_tbl[n], switch_base)} for n in switch_tbl if sum(switch_tbl[n])],
                       key=lambda d: -d['v'][LAST]),
    'switchBase': switch_base,
    # Q16T: the one thing that defined the month, single choice, all respondents
    'oneThing': dist(cnt['q16t'], ONE_THING),
    # Q10 / Q10_2: asked of those who contacted TELUS about an issue in the past month
    'resolution': {'rows': dist(cnt['q10'], RESOLVE), 'base': [sum(c.values()) for c in cnt['q10']],
                   'unresolved': share(cnt['q10'], (3, 4)), 'immediate': share(cnt['q10'], (1,))},
    'contacts': {'rows': dist(cnt['q10_2'], TIMES), 'base': [sum(c.values()) for c in cnt['q10_2']],
                 'repeat': share(cnt['q10_2'], (2, 3, 4)), 'four_plus': share(cnt['q10_2'], (3, 4))},
    # V3 verbatims of respondents rating reliability fair or poor, keyword-classified
    'reasons': sorted(
        [{'name': n, 'v': reason_tbl[n], 'pct': pct(reason_tbl[n], reason_base)} for n in reason_tbl if sum(reason_tbl[n])],
        key=lambda d: -d['v'][LAST]),
    'reasonBase': reason_base,
    'reasonNone': reason_none,
    'verbatimBase': verb_base,
    'polarity': {p: pct(pol_tbl[p], verb_base) for p in pol_tbl},
    'polarityN': pol_tbl,
    'themes': sorted(
        [{'name': t, 'v': theme_tbl[t], 'pct': pct(theme_tbl[t], verb_base), 'neg': theme_neg[t]} for t in theme_tbl if sum(theme_tbl[t])],
        key=lambda d: -d['v'][LAST]),
    'issueVerbatims': sorted(
        [{'name': n, 'v': issue_tbl[n]} for n in issue_tbl if sum(issue_tbl[n])], key=lambda d: -d['v'][LAST]),
    'issueThemes': sorted(
        [{'name': t, 'v': issue_theme[t]} for t in issue_theme if sum(issue_theme[t])], key=lambda d: -d['v'][LAST]),
    'chatbot': {p: sup_pol[p] for p in sup_pol},
    'reliabilityByContact': {k: {'bad': bad_by_contact[k], 'base': base_by_contact[k],
                                 'pct': pct(bad_by_contact[k], base_by_contact[k])} for k in bad_by_contact},
    'quotes': {k: v for k, v in quotes.items() if v},
}
json.dump(out, open('hsia_survey_analysis.json', 'w'), indent=1, ensure_ascii=False)

print('respondents', resp)
print('NPS', out['nps'])
print('reliability', out['reliability']['top2'], out['reliability']['good'], out['reliability']['bottom2'], out['reliability']['bottom2N'])
print('value', out['value'], 'service', out['service'], 'easy', out['easy'])
print('reasons base', reason_base, 'no theme', reason_none)
for d in out['reasons']:
    print('  reason', d['name'], d['v'], d['pct'])
print('oneThing')
for d in out['oneThing']:
    print('  ', d['name'], d['v'], d['pct'])
print('resolution', out['resolution'])
print('contacts', out['contacts'])
print('consider', out['consider'], 'switchBase', switch_base)
for d in out['switchTo']:
    print('  switch', d['name'], d['v'], d['pct'])
print('polarity', out['polarity'], out['polarityN'], 'base', verb_base)
for t in out['themes']:
    print('  theme', t['name'], t['v'], t['pct'], t['neg'])
print('churn', out['churn'])
print('contact', out['contact'])
print('reliabilityByContact', out['reliabilityByContact'])
print('chatbot', out['chatbot'])
print('issueVerbatims', out['issueVerbatims'])
for t in out['issueThemes']:
    print('  issueTheme', t['name'], t['v'])
