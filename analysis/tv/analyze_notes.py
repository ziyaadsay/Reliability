import json, collections, re, statistics
rows = json.load(open('notes_all.json'))
MONTHS = ['2026-06', '2026-07', '2026-08']

def month(r):
    d = r['Ticket Created Date']
    m = re.match(r'(\d{4})-(\d{2})', d)
    if m: return m.group(1) + '-' + m.group(2)
    m = re.match(r'(\d{1,2})/(\d{1,2})/(\d{2,4})', d)
    if m: return '2026-' + m.group(1).zfill(2)
    return '?'

def norm_cat(c):
    c = c.replace('&amp;', '&').strip()
    if c.lower() == 'recording issues': return 'Recording Issues'
    return c

for r in rows:
    r['_m'] = month(r)
    r['c1'] = norm_cat(r['Category 1']); r['c2'] = norm_cat(r['Category 2']); r['c3'] = norm_cat(r['Category 3'])
    r['r1'] = r['Resolution 1'].strip(); r['r2'] = r['Resolution 2'].strip(); r['r3'] = r['Resolution 3'].strip()
rows = [r for r in rows if r['_m'] in MONTHS and r['c1']]

out = {'months': MONTHS, 'total': {m: sum(1 for r in rows if r['_m'] == m) for m in MONTHS}}

def monthly(keyfn, min_total=0):
    c = collections.defaultdict(lambda: [0, 0, 0])
    for r in rows:
        k = keyfn(r)
        if k is None: continue
        c[k][MONTHS.index(r['_m'])] += 1
    return {k: v for k, v in c.items() if sum(v) >= min_total}

def movers(tbl, floor=150):
    items = []
    for k, v in tbl.items():
        if v[0] >= floor or v[2] >= floor:
            d = v[2] - v[0]
            pct = (d / v[0] * 100) if v[0] else None
            items.append({'key': k, 'jun': v[0], 'jul': v[1], 'aug': v[2], 'delta': d, 'pct': None if pct is None else round(pct, 1)})
    rising = sorted([i for i in items if i['delta'] > 0], key=lambda i: -i['delta'])[:8]
    falling = sorted([i for i in items if i['delta'] < 0], key=lambda i: i['delta'])[:8]
    return rising, falling

# ---------------- agent taxonomy ----------------
agent_c1 = monthly(lambda r: r['c1'])
agent_c12 = monthly(lambda r: f"{r['c1']} › {r['c2']}" if r['c2'] else r['c1'], min_total=60)
out['agent_c1'] = dict(sorted(agent_c1.items(), key=lambda kv: -sum(kv[1])))
out['agent_c12_top'] = dict(sorted(agent_c12.items(), key=lambda kv: -sum(kv[1]))[:20])
out['agent_c12_rising'], out['agent_c12_falling'] = movers(agent_c12, floor=150)

# ---------------- tech taxonomy ----------------
tech_r1 = monthly(lambda r: r['r1'] if r['r1'] else '(no technician closure)')
tech_r12 = monthly(lambda r: f"{r['r1']} › {r['r2']}" if r['r1'] and r['r2'] else None, min_total=60)
out['tech_r1'] = dict(sorted(tech_r1.items(), key=lambda kv: -sum(kv[1])))
out['tech_r12_top'] = dict(sorted(tech_r12.items(), key=lambda kv: -sum(kv[1]))[:20])
out['tech_r12_rising'], out['tech_r12_falling'] = movers(tech_r12, floor=150)

# ---------------- domain mapping for agent vs tech divergence ----------------
AGENT_DOMAIN = {
    'STB No Boot': 'STB hardware', 'Digital Box': 'STB hardware',
    'Video Issues': 'Video / picture', 'Audio Issues': 'Audio',
    'Recording Issues': 'Recording / PVR', 'Recordings': 'Recording / PVR',
    'Channel Issues': 'Channels / content', 'VOD': 'Channels / content', 'PPV': 'Channels / content',
    'PPV/VOD': 'Channels / content', 'Guide Issues': 'Channels / content', 'TV Features': 'Channels / content',
    'Remote': 'Remote control', 'Apps': 'Apps / streaming', 'Mobile App': 'Apps / streaming',
    'HS & TV Affected': 'Network / connectivity', 'Abandon': 'Abandon',
}
# expected technician cause domains for each agent symptom domain (alignment)
EXPECTED = {
    'STB hardware': {'STB hardware', 'Network / connectivity'},
    'Video / picture': {'STB hardware', 'Network / connectivity', 'Video / picture'},
    'Audio': {'STB hardware', 'Video / picture'},
    'Recording / PVR': {'Recording / PVR', 'STB hardware'},
    'Channels / content': {'Channels / content'},
    'Remote control': {'Remote control', 'STB hardware'},
    'Apps / streaming': {'Apps / streaming', 'Network / connectivity'},
    'Network / connectivity': {'Network / connectivity'},
}
def tech_domain(r):
    r1, r2 = r['r1'], r['r2']
    if not r1: return None
    if r1 in ('Education', 'Customer', 'Found OK', 'Cancel Ticket') or r2 in (
        'Customer Training/Education/Inquiry Only', 'DIY Support', 'Not Required', 'Customer Equipment',
        'Cancelled by User', 'Customer Cancelled'):
        return 'Education / no fault'
    if r1 in ('Connectivity', 'HSIA', 'GPON', 'Outside Plant', 'Network Service Wire', 'ADSL', 'HSIA Self-Install') or r2 in (
        'Modem/Gateway', 'ONT', 'Physical Connections', 'Inside Premise Equipment', 'Cable', 'Audio/Video Cables',
        'Wifi Network Extender', 'Boost Wi-Fi 6', 'HSIA', 'Setup'):
        return 'Network / connectivity'
    if r2 in ('Recording Issues - PVR STB', "Recording Issues - Non-PVR STB's", 'Recordings'):
        return 'Recording / PVR'
    if r2 == 'Remote Control': return 'Remote control'
    if r2 in ('Channel Issues', 'Provisioning', 'Account Discrepancy', 'Billing') or r1 in ('Optik TV PPV Live', 'Optik TV PPV Replay', 'NetCracker'):
        return 'Channels / content'
    if r2 in ('PPV Video Degradation',): return 'Video / picture'
    if r2 in ('Self-Serve Portal', 'TVX') or r1 in ('CSR Desktop',): return 'Apps / streaming'
    if r2 in ('STB/PVR', 'Set Top Box', 'Digital Box', 'Wireless Set Top Box', 'Hardware Issue', 'Equipment',
              'MediaRoom', 'Stuck', 'IPTV') or r1 in ('Legacy Equipment', 'IPTV', 'Optik Evolution', 'Pik TV', 'Optik TV Self-Install'):
        return 'STB hardware'
    return 'Other'

div = {}
for m in MONTHS:
    closed = align = nofault = 0
    per_cat = collections.defaultdict(lambda: {'n': 0, 'closed': 0, 'aligned': 0, 'nofault': 0, 'tech': collections.Counter()})
    for r in rows:
        if r['_m'] != m: continue
        ad = AGENT_DOMAIN.get(r['c1'])
        if not ad or ad == 'Abandon': continue
        pc = per_cat[r['c1']]; pc['n'] += 1
        td = tech_domain(r)
        if td is None: continue
        closed += 1; pc['closed'] += 1; pc['tech'][td] += 1
        if td == 'Education / no fault': nofault += 1; pc['nofault'] += 1
        elif td in EXPECTED[ad] or td == 'Other': align += 1; pc['aligned'] += 1
    div[m] = {
        'closed': closed,
        'alignment_pct': round(align / closed * 100, 1),
        'nofault_pct': round(nofault / closed * 100, 1),
        'reattribution_pct': round(100 - align / closed * 100, 1),
        'per_cat': {k: {'n': v['n'], 'closed': v['closed'],
                        'alignment_pct': round(v['aligned'] / v['closed'] * 100, 1) if v['closed'] else None,
                        'nofault_pct': round(v['nofault'] / v['closed'] * 100, 1) if v['closed'] else None,
                        'tech_top': v['tech'].most_common(4)} for k, v in per_cat.items() if v['n'] >= 200}
    }
out['divergence'] = div

# TELUS-caused vs non-TELUS from technician determination; dispatch proxy = structured tech text present
det = {m: collections.Counter() for m in MONTHS}
fixes = {m: collections.Counter() for m in MONTHS}
FIX_THEMES = {
    'Replaced STB / PVR / OPUS box': [r'replac\w* (the )?(stb|pvr|box|set top|opus|digital box|receiver)', r'swap\w* (the )?(stb|pvr|box|opus)', r'new (stb|pvr|box)'],
    'Power supply / power cable': [r'power (supply|cable|cord|adapter|brick)', r'\bpsu\b'],
    'Re-terminated / replaced cabling': [r're-?terminat', r'replac\w* (the )?(coax|ethernet|cable|hdmi|cat ?5|cat ?6|jumper|drop)', r'new (coax|ethernet|hdmi|cable)'],
    'Wi-Fi / WAP / wireless STB placement': [r'\bwap\b', r'wi-?fi', r'wireless', r'\brssi\b', r'booster', r'extender'],
    'ONT / light level / fibre': [r'\bont\b', r'light level', r'optical', r'fib(re|er)', r'\bolt\b', r'splitter'],
    'Modem / gateway replaced or reset': [r'(replac|swap|reset|factory)\w* (the )?(modem|gateway|router|t3200|nh20)', r'new (modem|gateway|router)'],
    'Firmware / software / reboot fix': [r'firmware', r'software', r'reboot', r'power ?cycle', r'refresh'],
    'Education / no fault found / working on arrival': [r'educat', r'no (trouble|fault|issue) found', r'\bntf\b', r'found (working|ok)', r'working on arrival', r'customer error', r'user error'],
    'Remote control': [r'remote'],
    'Recording / PVR settings': [r'record', r'whole home'],
}
for r in rows:
    t = r['Resolution Text']
    if 'Technician Determination' not in t: continue
    m = r['_m']
    tl = t.lower()
    if 'non-telus caused' in tl or 'non telus caused' in tl: det[m]['Non-TELUS caused'] += 1
    elif 'telus caused' in tl: det[m]['TELUS caused'] += 1
    else: det[m]['Undetermined'] += 1
    fx = tl.split('fixes:')[1].split('technician determination')[0] if 'fixes:' in tl else tl
    for theme, pats in FIX_THEMES.items():
        if any(re.search(p, fx) for p in pats): fixes[m][theme] += 1
out['tech_determination'] = {m: dict(det[m]) for m in MONTHS}
out['tech_fix_themes'] = {t: [fixes[m][t] for m in MONTHS] for t in FIX_THEMES}
out['structured_tech_notes'] = {m: sum(det[m].values()) for m in MONTHS}

# ---------------- agent notes text mining ----------------
def agent_comment(t):
    # Only the human-written agent comment; system blocks (InSight case data, WFM, SWT) are excluded.
    i = t.find('Agent Comments:')
    if i < 0:
        i = t.find('Issue Reported')
    if i < 0:
        i = t.find('Customer Comments - WORKLOG_DETAILS:')
    if i < 0:
        return ''
    seg = t[i:i + 1500]
    for stop in ['InSight Processes:', 'InSight Case:', 'Chat URL', 'Copilot', '***', 'INSIGHT CHECKS', 'TELUS Products:',
                 'Fuel IEx', 'Route this', 'WORKLOG_TYPE: Additional', 'SWT API', 'Created WFM']:
        j = seg.find(stop)
        if j > 0: seg = seg[:j]
    return seg.lower()

THEMES = {
    'Freezing / pixelation / glitching': [r'freez', r'pixel', r'stutter', r'glitch', r'tiling', r'skipping'],
    'No signal / black screen': [r'no signal', r'black screen', r'blank screen', r'no picture', r'no video', r'no display'],
    'Stuck initializing / reboot loop': [r'initializ', r'boot ?loop', r'reboot(ing)? loop', r'keeps? reboot', r'stuck on', r'no boot'],
    'Power / power supply': [r'power (cable|supply|cord|adapter|brick)', r'no power', r"won'?t (turn|power) on", r'not turning on', r'\bpsu\b'],
    'Wi-Fi / wireless STB signal': [r'wi-?fi', r'wireless', r'\brssi\b', r'\bwap\b', r'signal strength', r'booster', r'extender'],
    'Ethernet / HDMI / cabling': [r'ethernet', r'cat ?5', r'cat ?6', r'coax', r'hdmi', r'cabl(e|ing)'],
    'Recording / PVR': [r'record', r'\bpvr\b', r'whole home'],
    'Remote control': [r'remote', r'pairing', r'batteries'],
    'Channel missing / not authorized': [r'channel', r'subscri', r'package', r'entitle', r'not authori[sz]ed', r'unsubscribed'],
    'Audio / sound': [r'audio', r'\bsound\b', r'volume', r'no sound'],
    'Streaming apps (Netflix, Prime, YouTube, TV+ app)': [r'netflix', r'prime video', r'youtube', r'disney', r'crave', r'tv\+ app', r'telus tv\+ app', r'streaming app'],
    'Outage / active network event': [r'outage', r'active event', r'area event', r'network event'],
    'Firmware / software update': [r'firmware', r'software', r'\bupdate'],
    'Swap / replacement shipped': [r'\bswap', r'replac', r'ship(ped|ping)? (a )?new', r'send(ing)? (a )?new'],
    'Dispatch / technician booked': [r'dispatch', r'tech(nician)? (visit|appointment|booked)', r'work order', r'\bwfm\b', r'truck'],
    'Fibre / ONT / light level': [r'light level', r'\bont\b', r'optical', r'fib(re|er)', r'\bolt\b'],
    'Modem / gateway': [r'modem', r'gateway', r't3200', r'nh20', r'router'],
    'Repeat / recurring issue': [r'same issue', r'\bagain\b', r'repeat', r'recurr', r'still not', r'ongoing', r'multiple times', r'keeps happening'],
    'Customer wants tech / refuses troubleshooting': [r'want(s)? (a )?tech', r'refus', r'unable to (do )?troubleshoot', r'insist'],
}
DEVICES = {
    'VIP5662W (Mediaroom PVR)': r'vip5662', 'VIP5602W (Mediaroom wSTB)': r'vip5602', 'VIP2262 / legacy PVR': r'vip2262',
    'OPUS / TV+ box (TV Evolution)': r'\bopus\b|tv\+|tv plus|evolution', 'Pik TV': r'pik ?tv', '4K STB': r'4k ?stb|4kstb',
    'T3200M gateway': r't3200', 'NH20T gateway': r'nh20',
}
theme_m = {t: [0, 0, 0] for t in THEMES}
dev_m = {d: [0, 0, 0] for d in DEVICES}
theme_by_cat = collections.defaultdict(collections.Counter)
platform_m = {'Mediaroom (legacy)': [0, 0, 0], 'OPUS / TV Evolution': [0, 0, 0]}
comment_cov = [0, 0, 0]
for r in rows:
    seg = agent_comment(r['Agent Notes'])
    full = r['Agent Notes'].lower()
    mi = MONTHS.index(r['_m'])
    if seg:
        comment_cov[mi] += 1
        for t, pats in THEMES.items():
            if any(re.search(p, seg) for p in pats):
                theme_m[t][mi] += 1; theme_by_cat[r['c1']][t] += 1
    for d, p in DEVICES.items():
        if re.search(p, full): dev_m[d][mi] += 1
    if '[mediaroom]' in full or 'mediaroom' in full: platform_m['Mediaroom (legacy)'][mi] += 1
    if re.search(r'\bopus\b|optik evolution|tv\+', full) or r['r1'] == 'Optik Evolution': platform_m['OPUS / TV Evolution'][mi] += 1
out['comment_coverage'] = comment_cov
out['agent_themes'] = dict(sorted(theme_m.items(), key=lambda kv: -sum(kv[1])))

# ---- field-visit-only divergence (true technician closure) ----
fv = {}
for m in MONTHS:
    tot = align = nofault = nontelus = 0
    per = collections.defaultdict(lambda: {'n': 0, 'aligned': 0, 'nofault': 0, 'nontelus': 0, 'tech': collections.Counter()})
    for r in rows:
        if r['_m'] != m or 'Technician Determination' not in r['Resolution Text']: continue
        ad = AGENT_DOMAIN.get(r['c1'])
        if not ad or ad == 'Abandon': continue
        td = tech_domain(r) or 'Other'
        tl = r['Resolution Text'].lower()
        nt = ('non-telus caused' in tl or 'non telus caused' in tl)
        tot += 1; p = per[r['c1']]; p['n'] += 1; p['tech'][td] += 1
        if nt: nontelus += 1; p['nontelus'] += 1
        if td == 'Education / no fault': nofault += 1; p['nofault'] += 1
        elif td in EXPECTED[ad] or td == 'Other': align += 1; p['aligned'] += 1
    fv[m] = {'visits': tot, 'alignment_pct': round(align / tot * 100, 1), 'nofault_pct': round(nofault / tot * 100, 1),
             'nontelus_pct': round(nontelus / tot * 100, 1), 'reattribution_pct': round(100 - align / tot * 100, 1),
             'per_cat': {k: {'n': v['n'], 'alignment_pct': round(v['aligned'] / v['n'] * 100, 1), 'nofault_pct': round(v['nofault'] / v['n'] * 100, 1),
                             'nontelus_pct': round(v['nontelus'] / v['n'] * 100, 1), 'tech_top': v['tech'].most_common(3)}
                         for k, v in per.items() if v['n'] >= 40}}
out['divergence_fieldvisit'] = fv
out['agent_theme_movers'] = movers({k: v for k, v in theme_m.items()}, floor=300)
out['devices'] = dict(sorted(dev_m.items(), key=lambda kv: -sum(kv[1])))
out['platform_mentions'] = platform_m
out['theme_by_cat'] = {c: dict(cnt.most_common(5)) for c, cnt in theme_by_cat.items() if sum(agent_c1.get(c, [0])) > 1000}

# Dispatch proxy: any Resolution 1 present & structured tech text => field visit; agent-resolved = Education/Customer with no tech text
disp = {}
for m in MONTHS:
    n = out['total'][m]
    tech_visit = sum(1 for r in rows if r['_m'] == m and 'Technician Determination' in r['Resolution Text'])
    agent_res = sum(1 for r in rows if r['_m'] == m and r['r1'] in ('Education', 'Customer') and 'Technician Determination' not in r['Resolution Text'])
    disp[m] = {'tickets': n, 'field_visit_pct': round(tech_visit / n * 100, 1), 'agent_education_closure_pct': round(agent_res / n * 100, 1)}
out['closure_mix'] = disp

json.dump(out, open('notes_analysis.json', 'w'), indent=1, default=str)

# ---- print summary ----
print('TOTALS', out['total'])
print('\nAGENT C1'); [print(f'  {k:22s} {v}') for k, v in out['agent_c1'].items()]
print('\nAGENT C1›C2 rising'); [print('  ', i) for i in out['agent_c12_rising']]
print('AGENT C1›C2 falling'); [print('  ', i) for i in out['agent_c12_falling']]
print('\nTECH R1'); [print(f'  {k:32s} {v}') for k, v in list(out['tech_r1'].items())[:12]]
print('\nTECH R1›R2 rising'); [print('  ', i) for i in out['tech_r12_rising']]
print('TECH R1›R2 falling'); [print('  ', i) for i in out['tech_r12_falling']]
print('\nDIVERGENCE')
for m in MONTHS:
    d = div[m]; print(f"  {m}: closed={d['closed']} alignment={d['alignment_pct']}% nofault={d['nofault_pct']}% reattribution={d['reattribution_pct']}%")
print('  per-cat (Aug):')
for k, v in div['2026-08']['per_cat'].items(): print(f"    {k:20s} n={v['n']} closed={v['closed']} align={v['alignment_pct']} nofault={v['nofault_pct']} tech={v['tech_top']}")
print('\nDETERMINATION', out['tech_determination'])
print('STRUCTURED TECH NOTES', out['structured_tech_notes'])
print('\nFIX THEMES'); [print(f'  {k:48s} {v}') for k, v in out['tech_fix_themes'].items()]
print('\nCOMMENT COVERAGE', comment_cov)
print('\nAGENT THEMES'); [print(f'  {k:52s} {v}') for k, v in out['agent_themes'].items()]
print('\nFIELD-VISIT DIVERGENCE')
for m in MONTHS:
    d = fv[m]; print(f"  {m}: visits={d['visits']} alignment={d['alignment_pct']}% nofault={d['nofault_pct']}% nonTELUS={d['nontelus_pct']}% reattribution={d['reattribution_pct']}%")
for k, v in fv['2026-08']['per_cat'].items(): print(f"    {k:20s} {v}")
print('\nDEVICES'); [print(f'  {k:32s} {v}') for k, v in out['devices'].items()]
print('PLATFORM', platform_m)
print('\nCLOSURE MIX', disp)
