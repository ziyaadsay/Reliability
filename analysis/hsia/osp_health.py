"""HSIA outside plant to ONT health, from the weekly HSIA notes exports (raw/hsia_notes_*.xlsx).

Scope is everything up to and including the ONT on the fibre path (feeder and distribution fibre, FDH, splitter, drop,
light level, ONT), with the copper plant and the drop wire alongside. Three reads of the same tickets:
  - what was reported: agent categories (ONT Not Ranged, Historical Data, No Sync, Losing Sync),
  - what InSight showed: ONT state, active network events, optical levels (analysis/common/notes_parse.py),
  - what the technician fixed: Resolution 1 to 3 (GPON, Network Service Wire, Outside Plant).
Writes osp_health.json (aggregates only: raw notes hold customer details and are never committed). Network identifiers
(FDH ID) appear in the output; customer fields do not.

Months are compared per day because the export can stop mid-month. Closure counts are compared on days 1 to 25 only:
tickets from the last days of the export have not closed yet, which understates the last month.
"""
import glob, json, os, re, statistics, sys, collections, datetime
import openpyxl
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'common'))
from notes_parse import entries, is_insight, parse_note

MONTHS = ['2026-08', '2026-09', '2026-10']
CLOSE_DAYS = 25          # closure comparisons use tickets created on days 1 to 25
EVENT_MIN = 8            # ONT-down tickets on one FDH on one day that count as an event
CHRONIC_MIN = 12         # ONT-down tickets in every month for a chronic FDH
FILES = sorted(glob.glob('raw/hsia_notes_*.xlsx'))

rows, seen = [], set()
for f in FILES:
    wb = openpyxl.load_workbook(f, read_only=True); ws = wb.worksheets[0]
    it = ws.iter_rows(values_only=True); hdr = [str(h or '') for h in next(it)]
    for i, r in enumerate(it):
        r = tuple(r) + (None,) * (len(hdr) - len(r)); d = {hdr[j]: ('' if v is None else str(v)) for j, v in enumerate(r)}
        if not d.get('Ticket Created Date') or not d.get('Category 1'): continue
        tid = d.get('Trouble Ticket ID') or f'{f}:{i}'
        if tid in seen: continue
        seen.add(tid)
        m = re.match(r'(\d{4})-(\d{2})-(\d{2})', d['Ticket Created Date'])
        if not m or m.group(1) + '-' + m.group(2) not in MONTHS: continue
        p = parse_note(d['Agent Notes'])
        pay = ' '.join(e['details'] for e in entries(d['Agent Notes']) if is_insight(e)).replace('&amp;', '&')
        x = {'date': m.group(0), 'm': m.group(1) + '-' + m.group(2), 'c2': d['Category 2'].strip(), 'c3': d['Category 3'].strip(),
             'r1': d['Resolution 1'].strip(), 'r2': d['Resolution 2'].strip(), 'r3': d['Resolution 3'].strip(),
             'rt': d['Resolution Text'], 'ins': p['insight']}
        def num(pat):
            mm = re.search(pat, pay); return float(mm.group(1)) if mm else None
        x['olt_rx'] = num(r'OLT Rx @ 1310nm \(Up\):\s*(-?\d+(?:\.\d+)?)')
        mm = re.search(r'FDH ID:\s*([A-Za-z0-9\-]+)', pay); x['fdh'] = mm.group(1) if mm else None
        mm = re.search(r'Device Vendor:\s*([A-Za-z]+)', pay); v = mm.group(1) if mm else None
        mm = re.search(r'Device Type:\s*([A-Za-z0-9\-]+)', pay); x['model'] = (v + ' ' + mm.group(1)) if (v and mm) else None
        rows.append(x)
print('files', len(FILES), 'tickets', len(rows), file=sys.stderr)

mi = lambda r: MONTHS.index(r['m'])
dates = {m: sorted({r['date'] for r in rows if r['m'] == m}) for m in MONTHS}
DAYS = [len(dates[m]) for m in MONTHS]
def cnt(f, rs=None):
    v = [0, 0, 0]
    for r in (rows if rs is None else rs):
        if f(r): v[mi(r)] += 1
    return v
early = [r for r in rows if int(r['date'][8:]) <= CLOSE_DAYS]
out = {'months': MONTHS, 'days': DAYS, 'lastDate': max(r['date'] for r in rows), 'closeDays': CLOSE_DAYS, 'tickets': cnt(lambda r: True)}

out['symptoms'] = [{'name': n, 'v': cnt(f)} for n, f in [
    ('ONT Not Ranged', lambda r: r['c2'] == 'ONT Not Ranged'),
    ('ONT Not Ranged › Alarm Light', lambda r: r['c2'] == 'ONT Not Ranged' and r['c3'] == 'Alarm Light'),
    ('ONT Not Ranged › No Power', lambda r: r['c2'] == 'ONT Not Ranged' and r['c3'] == 'No Power'),
    ('ONT Not Ranged › Outage', lambda r: r['c2'] == 'ONT Not Ranged' and r['c3'] == 'Outage'),
    ('Historical Data › Severe Line Issues', lambda r: r['c2'] == 'Historical Data'),
    ('No Sync (copper)', lambda r: r['c2'] == 'No Sync'),
    ('No Sync › No DSL Light', lambda r: r['c2'] == 'No Sync' and r['c3'] == 'No DSL Light'),
    ('Losing Sync', lambda r: r['c2'] == 'Losing Sync'),
    ('No Dataflow (not plant: ONT up on 97%)', lambda r: r['c2'] == 'No Dataflow')]]

fam = [('Fibre outside plant (GPON › Outside Plant)', lambda r: r['r1'] == 'GPON' and r['r2'] == 'Outside Plant'),
       ('  FDH', lambda r: r['r1'] == 'GPON' and r['r2'] == 'Outside Plant' and r['r3'] == 'FDH'),
       ('  Drop', lambda r: r['r1'] == 'GPON' and r['r2'] == 'Outside Plant' and r['r3'] == 'Drop'),
       ('  Splice', lambda r: r['r1'] == 'GPON' and r['r2'] == 'Outside Plant' and r['r3'] == 'Splice'),
       ('ONT and premise fibre (GPON › Inside Premise Equipment)', lambda r: r['r1'] == 'GPON' and r['r2'] == 'Inside Premise Equipment'),
       ('  ONT replaced or repaired', lambda r: r['r1'] == 'GPON' and r['r2'] == 'Inside Premise Equipment' and r['r3'] == 'ONT'),
       ('  ONT power supply', lambda r: r['r1'] == 'GPON' and r['r2'] == 'Inside Premise Equipment' and r['r3'] == 'Power Supply'),
       ('Light level (outside plant and premise)', lambda r: r['r1'] == 'GPON' and r['r3'] == 'Light Level'),
       ('GPON provisioning and registration', lambda r: r['r1'] == 'GPON' and r['r2'] == 'Provisioning'),
       ('Drop wire, NID and protector (Network Service Wire)', lambda r: r['r1'] == 'Network Service Wire'),
       ('Copper outside plant (Outside Plant)', lambda r: r['r1'] == 'Outside Plant'),
       ('Found OK (visit, no fault)', lambda r: r['r1'] == 'Found OK')]
out['closures'] = [{'name': n, 'v': cnt(f, early)} for n, f in fam]
vis = cnt(lambda r: 'Technician Determination' in r['rt'], early)
plant = cnt(lambda r: 'Technician Determination' in r['rt'] and r['r1'] in ('GPON', 'Network Service Wire', 'Outside Plant'), early)
out['visits'] = {'v': vis, 'plant': plant}

# ONT Not Ranged: how the tickets closed
nr = []
for m in MONTHS:
    sub = [r for r in rows if r['m'] == m and r['c2'] == 'ONT Not Ranged']; n = len(sub)
    nr.append({'n': n, 'plantOrOnt': sum(1 for r in sub if r['r1'] in ('GPON', 'Network Service Wire')) / n,
               'education': sum(1 for r in sub if r['r1'] in ('Education', 'Customer')) / n, 'noCode': sum(1 for r in sub if not r['r1']) / n})
out['ontNotRangedClosure'] = nr
hd = []
for m in MONTHS:
    h = [r for r in rows if r['m'] == m and r['c2'] == 'Historical Data']
    chk = [r for r in h if r['ins'] and r['ins'].get('ont_down') is not None]
    hd.append({'n': len(h), 'visit': sum(1 for r in h if 'Technician Determination' in r['rt']) / len(h),
               'plant': sum(1 for r in h if r['r1'] in ('GPON', 'Network Service Wire', 'Outside Plant')) / len(h),
               'ontDown': sum(1 for r in chk if r['ins']['ont_down']) / len(chk)})
out['historicalData'] = hd

# InSight network state
def q(v, p):
    v = sorted(v); return v[int(len(v) * p)] if v else None
net = []
for m in MONTHS:
    sub = [r for r in rows if r['m'] == m]; ins = [r for r in sub if r['ins']]
    chk = [r for r in ins if r['ins'].get('ont_down') is not None]; dn = sum(1 for r in chk if r['ins']['ont_down'])
    ev = [r for r in ins if r['ins'].get('outage') is not None]
    rx = [r['ins']['ont_rx'] for r in ins if 'ont_rx' in r['ins']]; olt = [r['olt_rx'] for r in sub if r['olt_rx'] is not None]
    nd = [r for r in sub if r['c2'] == 'No Dataflow' and r['ins'] and r['ins'].get('ont_down') is not None]
    net.append({'insightShare': len(ins) / len(sub), 'ontChecked': len(chk), 'ontDown': dn, 'ontDownShare': dn / len(chk),
                'outageShare': sum(1 for r in ev if r['ins']['outage']) / len(ev), 'outageTickets': sum(1 for r in ev if r['ins']['outage']),
                'rxN': len(rx), 'rxMedian': statistics.median(rx), 'rxP5': q(rx, .05), 'rxBelow25': sum(x < -25 for x in rx) / len(rx), 'rxOutOfRange': sum(1 for r in ins if r['ins'].get('rx_out_of_range')) / len(rx),
                'oltMedian': statistics.median(olt), 'oltBelow24': sum(x < -24 for x in olt) / len(olt),
                'noDataflowOntDown': sum(1 for r in nd if r['ins']['ont_down']) / len(nd)})
out['network'] = net

# weekly trend
def wk(d): dt = datetime.date.fromisoformat(d); return (dt - datetime.timedelta(days=dt.weekday())).isoformat()
W = collections.defaultdict(lambda: collections.Counter()); WD = collections.defaultdict(set)
for r in rows:
    w = wk(r['date']); WD[w].add(r['date']); W[w]['n'] += 1
    if r['c2'] == 'ONT Not Ranged': W[w]['nr'] += 1
    if r['ins'] and r['ins'].get('ont_down') is not None:
        W[w]['chk'] += 1; W[w]['down'] += 1 if r['ins']['ont_down'] else 0
weeks = []
for w in sorted(W):
    d = len(WD[w])
    if d < 5: continue          # partial weeks at the edges are left out
    weeks.append({'week': w, 'days': d, 'ontNotRangedPerDay': round(W[w]['nr'] / d, 1), 'ontDownShare': round(W[w]['down'] / W[w]['chk'] * 100, 1)})
out['weekly'] = weeks

# events and hotspots (ONT down on InSight, by FDH)
dn = [r for r in rows if r['ins'] and r['ins'].get('ont_down') and r['fdh']]
FD = collections.Counter((r['fdh'], r['date']) for r in dn)
ev = {k for k, v in FD.items() if v >= EVENT_MIN}
out['eventCount'] = [sum(1 for k in ev if k[1][:7] == m) for m in MONTHS]
out['eventTickets'] = [sum(FD[k] for k in ev if k[1][:7] == m) for m in MONTHS]
evs = []
for k in sorted(ev, key=lambda k: -FD[k])[:10]:
    sub = [r for r in dn if r['fdh'] == k[0] and r['date'] == k[1]]
    evs.append({'date': k[1], 'fdh': k[0], 'tickets': FD[k], 'flagged': sum(1 for r in sub if r['ins'].get('outage'))})
out['topEvents'] = sorted(evs, key=lambda e: e['date'])
dd = collections.Counter(r['date'] for r in rows if r['ins'] and r['ins'].get('ont_down'))
out['ontDownPerDay'] = [round(sum(v for k, v in dd.items() if k[:7] == m) / DAYS[i], 1) for i, m in enumerate(MONTHS)]
out['ontDownMedianDay'] = statistics.median(dd.values())
big = max(dd.items(), key=lambda kv: kv[1]); sub = [r for r in dn if r['date'] == big[0]]
out['peakDay'] = {'date': big[0], 'ontDown': big[1], 'flagged': sum(1 for r in sub if r['ins'].get('outage')), 'tickets': sum(1 for r in rows if r['date'] == big[0])}
base = [0, 0, 0]
for r in rows:
    if r['ins'] and r['ins'].get('ont_down') and not (r['fdh'] and (r['fdh'], r['date']) in ev): base[mi(r)] += 1
out['ontDownExEvents'] = base
C = collections.defaultdict(lambda: [0, 0, 0])
for r in dn:
    if (r['fdh'], r['date']) not in ev: C[r['fdh']][mi(r)] += 1
chronic = [(k, v) for k, v in C.items() if min(v) >= CHRONIC_MIN]
tot = sum(sum(v) for v in C.values())
out['chronic'] = {'count': len(chronic), 'share': sum(sum(v) for k, v in chronic) / tot,
                  'top': [{'fdh': k, 'v': v} for k, v in sorted(chronic, key=lambda kv: -sum(kv[1]))[:8]]}
tops = []
for i in range(3):
    s = sorted((sum(1 for _ in [0]) and x[i] for x in C.values()), reverse=True); tops.append(round(sum(s[:50]) / sum(x[i] for x in C.values()), 3))
out['top50Share'] = tops

# ONT model
mod = []
for m in MONTHS:
    c = collections.defaultdict(lambda: [0, 0])
    for r in rows:
        if r['m'] == m and r['model'] and r['ins'] and r['ins'].get('ont_down') is not None:
            c[r['model']][0] += 1; c[r['model']][1] += 1 if r['ins']['ont_down'] else 0
    mod.append(c)
out['models'] = [{'model': k, 'n': mod[2][k][0], 'v': [round(mod[i][k][1] / mod[i][k][0] * 100, 1) if mod[i][k][0] else None for i in range(3)]}
                 for k in sorted(mod[2], key=lambda k: -mod[2][k][0]) if mod[2][k][0] >= 500]
json.dump(out, open('osp_health.json', 'w'), indent=1)
print(json.dumps({k: out[k] for k in ('days', 'eventCount', 'ontDownPerDay', 'chronic')}, default=str)[:600])
