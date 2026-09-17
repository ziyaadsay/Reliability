"""HSIA agent vs technician ticket-notes analysis (Jun - Aug 2026).

Reads the weekly HSIA notes exports (raw/hsia_notes_<Mon>_W*.xlsx), aggregates
agent categorisation (Category 1-3, Agent Notes) against closure categorisation
(Resolution 1-3, Resolution Text) and writes hsia_notes_analysis.json.
Only aggregates leave this script; the raw exports contain customer details and
are never committed.
"""
import glob, json, collections, re, sys
import openpyxl

MONTHS = ['2026-06', '2026-07', '2026-08']
FILES = sorted(glob.glob('raw/hsia_notes_*.xlsx'))

rows = []
for f in FILES:
    wb = openpyxl.load_workbook(f, read_only=True)
    ws = wb.worksheets[0]
    it = ws.iter_rows(values_only=True)
    hdr = [str(h or '') for h in next(it)]
    has_id = 'Trouble Ticket ID' in hdr
    for i, r in enumerate(it):
        r = tuple(r) + (None,) * (len(hdr) - len(r))
        d = {hdr[j]: ('' if v is None else str(v)) for j, v in enumerate(r)}
        if not d.get('Ticket Created Date') or not d.get('Category 1'):
            continue
        # some weekly exports omit the ticket ID column; fall back to a per-file row key
        if not has_id or not d.get('Trouble Ticket ID'):
            d['Trouble Ticket ID'] = f'{f}:{i}'
        d.setdefault('Flag Dispatch', '')
        rows.append(d)
print('files', len(FILES), 'rows', len(rows), file=sys.stderr)

def month(r):
    d = r['Ticket Created Date']
    m = re.match(r'(\d{4})-(\d{2})', d)
    if m: return m.group(1) + '-' + m.group(2)
    m = re.match(r'(\d{1,2})/(\d{1,2})/(\d{2,4})', d)
    if m: return '2026-' + m.group(1).zfill(2)
    return '?'

seen = set()
dedup = []
for r in rows:
    k = r['Trouble Ticket ID']
    if k in seen: continue
    seen.add(k)
    r['_m'] = month(r)
    r['c1'], r['c2'], r['c3'] = r['Category 1'].strip(), r['Category 2'].strip(), r['Category 3'].strip()
    r['r1'], r['r2'], r['r3'] = r['Resolution 1'].strip(), r['Resolution 2'].strip(), r['Resolution 3'].strip()
    r['r1'] = '' if r['r1'] == 'None' else r['r1']
    dedup.append(r)
rows = [r for r in dedup if r['_m'] in MONTHS and r['c1']]
print('deduped in-scope rows', len(rows), file=sys.stderr)

out = {'months': MONTHS, 'total': {m: sum(1 for r in rows if r['_m'] == m) for m in MONTHS}}

def monthly(keyfn, min_total=0):
    c = collections.defaultdict(lambda: [0, 0, 0])
    for r in rows:
        k = keyfn(r)
        if k is None: continue
        c[k][MONTHS.index(r['_m'])] += 1
    return {k: v for k, v in c.items() if sum(v) >= min_total}

def movers(tbl, floor=150, n=8):
    items = []
    for k, v in tbl.items():
        if v[0] >= floor or v[2] >= floor:
            d = v[2] - v[0]
            pct = (d / v[0] * 100) if v[0] else None
            items.append({'key': k, 'jun': v[0], 'jul': v[1], 'aug': v[2], 'delta': d, 'pct': None if pct is None else round(pct, 1)})
    rising = sorted([i for i in items if i['delta'] > 0], key=lambda i: -i['delta'])[:n]
    falling = sorted([i for i in items if i['delta'] < 0], key=lambda i: i['delta'])[:n]
    return rising, falling

# ---------------- agent taxonomy ----------------
agent_c1 = monthly(lambda r: r['c1'])
agent_c12 = monthly(lambda r: f"{r['c1']} › {r['c2']}" if r['c2'] else r['c1'], min_total=60)
agent_c123 = monthly(lambda r: f"{r['c1']} › {r['c2']} › {r['c3']}" if r['c3'] else None, min_total=60)
out['agent_c1'] = dict(sorted(agent_c1.items(), key=lambda kv: -sum(kv[1])))
out['agent_c12_top'] = dict(sorted(agent_c12.items(), key=lambda kv: -sum(kv[1]))[:20])
out['agent_c123_top'] = dict(sorted(agent_c123.items(), key=lambda kv: -sum(kv[1]))[:20])
out['agent_c12_rising'], out['agent_c12_falling'] = movers(agent_c12, floor=150)
out['agent_c123_rising'], out['agent_c123_falling'] = movers(agent_c123, floor=150)

# ---------------- closure taxonomy ----------------
tech_r1 = monthly(lambda r: r['r1'] if r['r1'] else '(no closure code)')
tech_r12 = monthly(lambda r: f"{r['r1']} › {r['r2']}" if r['r1'] and r['r2'] else None, min_total=60)
tech_r123 = monthly(lambda r: f"{r['r1']} › {r['r2']} › {r['r3']}" if r['r1'] and r['r2'] and r['r3'] else None, min_total=60)
out['tech_r1'] = dict(sorted(tech_r1.items(), key=lambda kv: -sum(kv[1])))
out['tech_r12_top'] = dict(sorted(tech_r12.items(), key=lambda kv: -sum(kv[1]))[:20])
out['tech_r123_top'] = dict(sorted(tech_r123.items(), key=lambda kv: -sum(kv[1]))[:20])
out['tech_r12_rising'], out['tech_r12_falling'] = movers(tech_r12, floor=150)
out['tech_r123_rising'], out['tech_r123_falling'] = movers(tech_r123, floor=150)

# ---------------- domain mapping: agent symptom vs closure cause ----------------
def agent_domain(r):
    c1, c2 = r['c1'], r['c2']
    if c1 in ('Abandon', 'NWH'): return None
    if c1 in ('Wireless', 'Wi-Fi connection'): return 'Wi-Fi'
    if c1 == 'Incompatible Equipment' or c2 == 'Incompatible Equipment': return 'Equipment compatibility'
    if c1 == 'Connectivity':
        if c2 == 'Slow Speeds': return 'Speed'
        if c2 in ('ONT Not Ranged', 'No Sync', 'Losing Sync', 'Historical Data'): return 'Access line & ONT'
        if c2 in ('No Dataflow', 'No IP'): return 'Gateway / dataflow'
        return 'Gateway / dataflow'
    return None

# expected closure domains for each agent symptom domain (counts as aligned)
EXPECTED = {
    'Access line & ONT': {'Access line / fibre / ONT', 'Modem / gateway', 'Provisioning / back office', 'Outage'},
    'Gateway / dataflow': {'Modem / gateway', 'Access line / fibre / ONT', 'Provisioning / back office', 'Outage', 'Customer / non-TELUS equipment'},
    'Speed': {'Modem / gateway', 'Wi-Fi / extenders', 'Access line / fibre / ONT', 'Provisioning / back office'},
    'Wi-Fi': {'Wi-Fi / extenders', 'Modem / gateway', 'Customer / non-TELUS equipment'},
    # plan/equipment mismatches are typically closed by installing the right ONT/gateway
    'Equipment compatibility': {'Modem / gateway', 'Provisioning / back office', 'Wi-Fi / extenders', 'Access line / fibre / ONT'},
}
NOFAULT_R1 = ('Education', 'Customer', 'Found OK', 'Cancel Ticket', 'Cancel SD-WAN Ticket', 'Cancel NaaS Ticket', 'Feedback', 'Referred Out')
NOFAULT_R2 = ('Customer Training/Education/Inquiry Only', 'DIY Support', 'Not Required', 'Cancelled by User', 'Customer Cancelled',
              'Opened in Error', 'Working On Arrival', 'Avoidable Dispatch', 'Disconnect Power', 'Customer Owned Equipment')
def tech_domain(r):
    r1, r2 = r['r1'], r['r2']
    if not r1: return None
    if r2 in ('Customer Owned Equipment', 'Ethernet Card/Switch/Router/Hub', 'Damaged', 'Customer Equipment') or r1 == 'CPE / COAM':
        return 'Customer / non-TELUS equipment'
    if r1 in NOFAULT_R1 or r2 in NOFAULT_R2:
        return 'Education / no fault'
    if r1 == 'Outage/Degradation': return 'Outage'
    if r2 in ('Wifi Network Extender', 'Boost Wireless Extender', 'Boost Wi-Fi 6', 'Boost Wi-Fi 7', 'Wireless Extender', 'Wi-Fi Hub'):
        return 'Wi-Fi / extenders'
    if r2 in ('Modem/Gateway', 'Modem', 'Gateway', 'Physical Connections', 'Internet backup') or r1 == 'Internet backup':
        return 'Modem / gateway'
    if r1 in ('GPON', 'Outside Plant', 'Network Service Wire', 'Central Office', 'ADSL', 'Complete Locate') or r2 in (
        'ONT', 'Inside Premise Equipment', 'Cable', 'Inside Wire/Pots Splitter/Microfilter', 'Inside Wire', 'Outside Plant',
        'Drop/Serv Wire (Incl Bonding)', 'Prot/NID/CCB (Incl Ground)', 'Light Level'):
        return 'Access line / fibre / ONT'
    if r2 in ('Provisioning', 'Stuck', 'Assignment/Facilities', 'Profile Incorrect') or r1 in (
        'NetCracker', 'Fulfillment', 'Assignment', 'Address Qualification', 'TELUS BI', 'CRM/Sales Force', 'Remedy', 'CSR Desktop',
        'Naas CSR Desktop', 'Profiles/Roles', 'SPLTR Posting corrected', 'Port Profile Provisioning - NP, OLT & CSL', 'HSIA Self-Install'):
        return 'Provisioning / back office'
    if r1 == 'HSIA': return 'Modem / gateway'
    if r1 == 'Connectivity': return 'Modem / gateway'
    if r1 in ('IPTV', 'Optik Evolution', 'Pik TV', 'Voice', 'Smart Home Security', 'Custom Home Security', 'SmartHome+', 'Home Pro',
              'LivingWell Companion Home - Base Unit', 'LivingWell Connect', 'LivingWell Companion Home - Pendant', 'Home Health', 'LWC GO',
              'Legacy Equipment', 'WHSIA', 'Email', 'Norton', 'Norton VPN', 'Optik TV Self-Install', 'MPaaS - Customer site/MPaaS - Site client') or r2 in ('STB/PVR',):
        return 'Other product'
    return 'Other'

def divergence(filter_fn, min_cat):
    res = {}
    for m in MONTHS:
        closed = align = nofault = nontelus = 0
        per = collections.defaultdict(lambda: {'n': 0, 'closed': 0, 'aligned': 0, 'nofault': 0, 'nontelus': 0, 'tech': collections.Counter()})
        for r in rows:
            if r['_m'] != m or not filter_fn(r): continue
            ad = agent_domain(r)
            if not ad: continue
            key = f"{r['c1']} › {r['c2']}"
            pc = per[key]; pc['n'] += 1
            td = tech_domain(r)
            if td is None: continue
            closed += 1; pc['closed'] += 1; pc['tech'][td] += 1
            tl = r['Resolution Text'].lower()
            if 'non-telus caused' in tl or 'non telus caused' in tl: nontelus += 1; pc['nontelus'] += 1
            if td == 'Education / no fault': nofault += 1; pc['nofault'] += 1
            elif td in EXPECTED[ad] or td == 'Other': align += 1; pc['aligned'] += 1
        if not closed:
            res[m] = {'closed': 0}; continue
        res[m] = {
            'closed': closed,
            'alignment_pct': round(align / closed * 100, 1),
            'nofault_pct': round(nofault / closed * 100, 1),
            'nontelus_pct': round(nontelus / closed * 100, 1),
            'reattribution_pct': round(100 - align / closed * 100, 1),
            'per_cat': {k: {'n': v['n'], 'closed': v['closed'],
                            'alignment_pct': round(v['aligned'] / v['closed'] * 100, 1) if v['closed'] else None,
                            'nofault_pct': round(v['nofault'] / v['closed'] * 100, 1) if v['closed'] else None,
                            'nontelus_pct': round(v['nontelus'] / v['closed'] * 100, 1) if v['closed'] else None,
                            'tech_top': v['tech'].most_common(4)} for k, v in per.items() if v['n'] >= min_cat}
        }
    return res

is_visit = lambda r: 'Technician Determination' in r['Resolution Text']
out['divergence'] = divergence(lambda r: True, 200)
out['divergence_fieldvisit'] = divergence(is_visit, 40)

# closure-domain mix per agent domain (for the cross matrix)
mix = {}
for m in MONTHS:
    mm = collections.defaultdict(collections.Counter)
    for r in rows:
        if r['_m'] != m: continue
        ad = agent_domain(r); td = tech_domain(r)
        if ad and td: mm[ad][td] += 1
    mix[m] = {k: dict(v) for k, v in mm.items()}
out['domain_mix'] = mix

# ---------------- technician determination and fix themes ----------------
det = {m: collections.Counter() for m in MONTHS}
fixes = {m: collections.Counter() for m in MONTHS}
FIX_THEMES = {
    'Modem / gateway replaced': [r'(replac|swap)\w* (the |a |cx )?(modem|gateway|router|t3200|nh20|nah|hub)', r'new (modem|gateway|router|nah|hub)'],
    'ONT replaced / light level / fibre splice': [r'\bont\b', r'light level', r'optical', r'fib(re|er)', r'splic', r'\bolt\b', r'\bfdh\b', r'\bsplitter\b', r'\bgpon\b'],
    'Drop / service wire / outside plant': [r'\bdrop\b', r'service wire', r'serv wire', r'outside plant', r'change(d)? pair', r'\bpair\b', r'pedestal', r'cross ?box', r'\bterminal\b', r'\bnid\b', r'jumper', r'\bbonding\b'],
    'Inside wiring / jack / ethernet': [r'inside wir', r'\bjack\b', r'cat ?5', r'cat ?6', r'ethernet', r're-?terminat', r'coax', r'phone line', r'microfilter', r'\bsplitter\b'],
    'Wi-Fi / Boost extender placement or replaced': [r'boost', r'extender', r'wi-?fi', r'wireless', r'\bwap\b', r'\bssid\b', r'channel', r'placement', r'relocat'],
    'Power supply / power': [r'power (supply|cable|cord|adapter|brick)', r'\bpsu\b', r'no power', r'outlet'],
    'Provisioning / profile / port fix': [r'provision', r'profile', r'\bport\b', r'netcracker', r'\bvlan\b', r'\bqos\b', r'speed profile', r'reprovision'],
    'Power cycle / factory reset / firmware': [r'power ?cycle', r'factory reset', r'reboot', r'firmware', r'software', r'\breset\b'],
    'Education / no fault found / working on arrival': [r'educat', r'no (trouble|fault|issue) found', r'\bntf\b', r'found (working|ok)', r'working on arrival', r'customer error', r'user error', r'no issue'],
    'Customer-owned equipment / third-party router': [r'customer.?owned', r'own router', r'third.?party', r'mesh', r'eero', r'google (wifi|nest)', r'\bcoam\b', r'non-?telus (router|equipment|modem)'],
}
for r in rows:
    t = r['Resolution Text']
    if 'Technician Determination' not in t: continue
    m = r['_m']; tl = t.lower()
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
    i = t.find('Agent Comments:')
    if i < 0: i = t.find('Issue Reported')
    if i < 0: i = t.find('Customer Comments - WORKLOG_DETAILS:')
    if i < 0: i = t.find('#CopilotNotes')
    if i < 0: i = t.find('ISSUE:')
    if i < 0: return ''
    seg = t[i:i + 1500]
    for stop in ['InSight Processes:', 'InSight Case:', 'Chat URL', 'INSIGHT CHECKS', 'TELUS Products:', 'Fuel IEx',
                 'Route this', 'WORKLOG_TYPE: Additional', 'SWT API', 'Created WFM', '*** CREATED DATE']:
        j = seg.find(stop)
        if j > 0: seg = seg[:j]
    return seg.lower()

THEMES = {
    'No internet / all devices down': [r'no internet', r'no connection', r'internet (is )?(down|not working|out)', r'all devices', r'no service', r'nothing (is )?working'],
    'Intermittent drops / disconnects': [r'intermittent', r'drop(s|ping|ped)?\b', r'disconnect', r'cuts? out', r'keeps? (going|cutting)', r'randomly', r'on and off', r'unstable'],
    'Slow speed / buffering': [r'slow', r'speed', r'buffer', r'lag', r'\bmbps\b', r'\bgbps\b', r'speed ?test'],
    'Wi-Fi: cannot connect / single device': [r"can'?t connect", r'cannot connect', r'unable to connect', r"won'?t connect", r'not connecting', r'ssid', r'wi-?fi password', r'single device', r'one device', r'(wifi|wi-fi|network) (is )?not (showing|visible|broadcast)'],
    'Red / alarm light / LOS on ONT or modem': [r'red light', r'alarm', r'\blos\b', r'red (led|led\'s|lights?)', r'blinking', r'flashing', r'orange light', r'amber'],
    'No power / dead equipment': [r'no power', r"won'?t (turn|power) on", r'not turning on', r'dead', r'no lights?'],
    'Outage / active network event': [r'outage', r'active event', r'area event', r'network event', r'known issue', r'wildfire', r'flood', r'storm'],
    'Modem / gateway swap shipped': [r'\bswap', r'replac\w* (the )?(modem|gateway|router|nah|hub)', r'ship(ped|ping)? (a )?(new|replacement)', r'send(ing)? (a )?(new|replacement)', r'self.?install'],
    'Dispatch / technician booked': [r'dispatch', r'tech(nician)? (visit|appointment|booked|required)', r'work order', r'\bwfm\b', r'truck', r'appointment'],
    'Boost / Wi-Fi extender': [r'boost', r'extender', r'booster', r'\bbv3\b', r'\bblite\b', r'mesh'],
    'ONT / fibre / light level': [r'\bont\b', r'light level', r'optical', r'fib(re|er)', r'\bgpon\b', r'\bpon\b', r'purefibre', r'pure fibre'],
    'DSL / copper line': [r'\bdsl\b', r'\bvdsl\b', r'\badsl\b', r'copper', r'bonded', r'bonding', r'line test', r'\bmlt\b', r'pair'],
    'Repeat / recurring issue': [r'same issue', r'\bagain\b', r'repeat', r'recurr', r'still not', r'ongoing', r'multiple times', r'keeps happening', r'second time', r'third time'],
    'Customer wants tech / refuses troubleshooting': [r'want(s)? (a )?tech', r'refus', r'unable to (do )?troubleshoot', r'insist', r'unwilling'],
    'Work from home / streaming / gaming impact': [r'work(ing)? from home', r'\bwfh\b', r'gaming', r'\bzoom\b', r'\bteams\b', r'streaming', r'netflix', r'\btv\b'],
    'Firmware / settings / factory reset': [r'firmware', r'factory reset', r'settings?', r'bridge mode', r'\bdhcp\b', r'\bdns\b', r'port forward'],
    'Third-party / customer-owned router': [r'own router', r'third.?party', r'eero', r'google (wifi|nest)', r'\borbi\b', r'\basus\b', r'\btp-?link\b', r'customer.?owned', r'\bcoam\b'],
}
DEVICES = {
    'T3200M gateway': r't3200', 'NH20 / NAH (Network Access Hub)': r'nh20|\bnah\b|network access hub', 'Boost Wi-Fi 6': r'boost wi-?fi 6|\bbwf6\b|boost 6',
    'Boost Wi-Fi 7 (BV3)': r'boost wi-?fi 7|\bbv3\b', 'Boost Lite (BLite)': r'\bblite\b|boost lite', 'Wi-Fi Hub / WFH': r'wi-?fi hub|\bwfh\b',
    'ONT (Nokia / Huawei / Calix)': r'\bont\b', 'Actiontec / legacy modem': r'actiontec|t1200|t2200|v1000',
}
theme_m = {t: [0, 0, 0] for t in THEMES}
dev_m = {d: [0, 0, 0] for d in DEVICES}
theme_by_cat = collections.defaultdict(collections.Counter)
access_m = {'Fibre (PureFibre / ONT)': [0, 0, 0], 'Copper (DSL / bonded)': [0, 0, 0]}
comment_cov = [0, 0, 0]
for r in rows:
    seg = agent_comment(r['Agent Notes'])
    full = r['Agent Notes'].lower()
    mi = MONTHS.index(r['_m'])
    if seg:
        comment_cov[mi] += 1
        for t, pats in THEMES.items():
            if any(re.search(p, seg) for p in pats):
                theme_m[t][mi] += 1; theme_by_cat[f"{r['c1']} › {r['c2']}"][t] += 1
    for d, p in DEVICES.items():
        if re.search(p, full): dev_m[d][mi] += 1
    fib = re.search(r'\bont\b|purefibre|pure fibre|\bgpon\b|fib(re|er)', full) or r['c2'] == 'ONT Not Ranged' or r['r1'] == 'GPON'
    cop = re.search(r'\bdsl\b|\bvdsl\b|\badsl\b|copper|bonded|bonding|no dsl light', full) or r['c3'] == 'No DSL Light' or r['r1'] == 'ADSL'
    if fib: access_m['Fibre (PureFibre / ONT)'][mi] += 1
    if cop: access_m['Copper (DSL / bonded)'][mi] += 1
out['comment_coverage'] = comment_cov
out['agent_themes'] = dict(sorted(theme_m.items(), key=lambda kv: -sum(kv[1])))
out['agent_theme_movers'] = movers(theme_m, floor=300)
out['devices'] = dict(sorted(dev_m.items(), key=lambda kv: -sum(kv[1])))
out['access_mentions'] = access_m
out['theme_by_cat'] = {c: dict(cnt.most_common(5)) for c, cnt in theme_by_cat.items() if sum(agent_c12.get(c, [0])) > 1000}

# closure mix: field visit vs agent education closure vs no closure code
disp = {}
for m in MONTHS:
    n = out['total'][m] or 1
    tech_visit = sum(1 for r in rows if r['_m'] == m and is_visit(r))
    agent_res = sum(1 for r in rows if r['_m'] == m and r['r1'] in ('Education', 'Customer') and not is_visit(r))
    nocode = sum(1 for r in rows if r['_m'] == m and not r['r1'])
    flag = sum(1 for r in rows if r['_m'] == m and r['Flag Dispatch'] in ('1', '1.0'))
    disp[m] = {'tickets': out['total'][m], 'field_visit_pct': round(tech_visit / n * 100, 1), 'agent_education_closure_pct': round(agent_res / n * 100, 1),
               'no_closure_code_pct': round(nocode / n * 100, 1), 'flag_dispatch_pct': round(flag / n * 100, 1)}
out['closure_mix'] = disp

json.dump(out, open('hsia_notes_analysis.json', 'w'), indent=1, default=str)

# ---- print summary ----
print('TOTALS', out['total'])
print('\nAGENT C1'); [print(f'  {k:26s} {v}') for k, v in out['agent_c1'].items()]
print('\nAGENT C1›C2 top'); [print(f'  {k:52s} {v}') for k, v in out['agent_c12_top'].items()]
print('\nAGENT C1›C2 rising'); [print('  ', i) for i in out['agent_c12_rising']]
print('AGENT C1›C2 falling'); [print('  ', i) for i in out['agent_c12_falling']]
print('\nAGENT C1›C2›C3 rising'); [print('  ', i) for i in out['agent_c123_rising']]
print('AGENT C1›C2›C3 falling'); [print('  ', i) for i in out['agent_c123_falling']]
print('\nTECH R1'); [print(f'  {k:32s} {v}') for k, v in list(out['tech_r1'].items())[:14]]
print('\nTECH R1›R2 top'); [print(f'  {k:60s} {v}') for k, v in out['tech_r12_top'].items()]
print('\nTECH R1›R2 rising'); [print('  ', i) for i in out['tech_r12_rising']]
print('TECH R1›R2 falling'); [print('  ', i) for i in out['tech_r12_falling']]
print('\nDIVERGENCE (all closures)')
for m in MONTHS:
    d = out['divergence'][m]
    if d['closed']: print(f"  {m}: closed={d['closed']} alignment={d['alignment_pct']}% nofault={d['nofault_pct']}% nonTELUS={d['nontelus_pct']}% reattribution={d['reattribution_pct']}%")
for k, v in out['divergence']['2026-08'].get('per_cat', {}).items(): print(f"    {k:36s} n={v['n']} closed={v['closed']} align={v['alignment_pct']} nofault={v['nofault_pct']} tech={v['tech_top']}")
print('\nDIVERGENCE (field visits)')
for m in MONTHS:
    d = out['divergence_fieldvisit'][m]
    if d['closed']: print(f"  {m}: visits={d['closed']} alignment={d['alignment_pct']}% nofault={d['nofault_pct']}% nonTELUS={d['nontelus_pct']}% reattribution={d['reattribution_pct']}%")
for k, v in out['divergence_fieldvisit']['2026-08'].get('per_cat', {}).items(): print(f"    {k:36s} {v}")
print('\nDOMAIN MIX Aug', json.dumps(out['domain_mix']['2026-08'], indent=1))
print('\nDETERMINATION', out['tech_determination'])
print('\nFIX THEMES'); [print(f'  {k:52s} {v}') for k, v in out['tech_fix_themes'].items()]
print('\nCOMMENT COVERAGE', comment_cov)
print('\nAGENT THEMES'); [print(f'  {k:52s} {v}') for k, v in out['agent_themes'].items()]
print('\nDEVICES'); [print(f'  {k:36s} {v}') for k, v in out['devices'].items()]
print('ACCESS', access_m)
print('\nCLOSURE MIX', disp)
