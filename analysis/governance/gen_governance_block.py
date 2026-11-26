"""Turns the "VP Deacts call Weekly Topics & Takeaways" tab (Churn Measurement 2026 workbook) into the GOVERNANCE
constant for site/App.jsx.

  python gen_governance_block.py <rows.json> [out.js] [decks.json]

rows.json is {"backlog": "<B1 text>", "rows": [[date, weekly topic, takeaways], ...]}: the tab's values from row 4 down
(columns A to C) plus the Topics Backlog cell. Writes governance_block.js (or out.js).

decks.json (optional) is [{"title", "id"}, ...]: the weekly presentation decks in the Drive folder, titled "<Month D, YYYY> ... VP ...".
A deck is linked to the meeting on its date, or failing that to the meeting one day either side that has no deck of its own
(some weeks are held a day early or late). Only 2026 meetings are matched; weeks without a deck get no link.

Each meeting gets a clean topic, who was out (OOO lines), a status (held / cancelled / no call / open) and its takeaways
split into items. Items are classified by keyword into an area (what it is about) and an action type (what has to happen),
and the owners are read from the text. Rules are ordered and the first match wins; review the printed table after a run.
"""
import json, re, sys, datetime, collections

src = json.load(open(sys.argv[1]))
OUT = sys.argv[2] if len(sys.argv) > 2 else 'governance_block.js'
DECKS = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else []

AREAS = [  # (area, keywords) first match on the item text wins, then the meeting topic
    ('Sweepr and self-serve', r'sweepr|ivr|jarvis|\bsdk\b|plume|self-serve|gemini'),
    ('TV', r'mediaroom|\btv\b|set.top|\bstb\b|stream\+|rssi|unicast|multicast|packet loss'),
    ('Smart home (SH+ and SHS)', r'sh\+|\bshs\b|smart home|multi-sensor|jci|battery|batteries|imei|camera|sh vok|sh voc|smartenergy|automation|homeview|onesource|\bsh1|iq5'),
    ('Wi-Fi', r'wi-?fi|route ?this|rava|repair tool|coupon'),
    ('Outage and network', r'outage|olt\b|weather|cpr\b|\bport\b|power cycle|hardware|firmware|tnah|truck roll|fibre|fiber|copper'),
    ('HSIA', r'hsia|\btq\b|vulcan|netcracker|defect|provisioning|3gbps|slow speed|telemetry'),
    ('Churn and reporting', r'churn|deact|scorecard|dashboard|mbr|report|slide|chart|tenure|ticket rate|normalized|trouble ticket|model|data'),
    ('Tooling, AI and architecture', r'ai\b|copilot|tool|architecture|ecosystem|orchestration|platform|hrai|assurance|middleware|interfaces'),
]
TYPES = [  # (type, keywords)
    ('Pilot, test or campaign', r'pilot|campaign|experiment|launch|trial|\btest\b|proactive'),
    ('Decision or policy', r'finali[sz]e|execute|policy|decision|business case|billing strategy|strategy|prioriti[sz]e|propose'),
    ('Reporting and data', r'dashboard|reporting|data|scorecard|slides|chart|normalized|trending|view|share the churn|visuali[sz]e|log defect|log a defect|compare|break down'),
    ('Investigate or analyse', r'analy[sz]e|investigate|deep dive|evaluate|quantify|assess|measure|determine|explore|understand|look at|look into|review|map|identify|clarify'),
    ('Coordinate or follow up', r'meet|schedule|coordinate|reach out|socialis|socializ|engage|send|invite|plan|partner|add |bring|arrange|update|follow'),
]
def classify(rules, text, fallback):
    t = text.lower()
    for name, pat in rules:
        if re.search(pat, t): return name
    return fallback


# Reviewed corrections to the keyword rules: (meeting date, item number from 0) -> fields to replace
# (a = area, y = action type, o = owners, t = title).
AR, TA, WF, SH, HS, CH, SW, OU, TV_ = ('Tooling, AI and architecture', 'Pilot, test or campaign', 'Wi-Fi', 'Smart home (SH+ and SHS)', 'HSIA', 'Churn and reporting', 'Sweepr and self-serve', 'Outage and network', 'TV')
INV, DEC, REP, COO, PIL, NOTE = 'Investigate or analyse', 'Decision or policy', 'Reporting and data', 'Coordinate or follow up', 'Pilot, test or campaign', 'Note'
OVERRIDES = {
    ('2026-02-13', 2): {'a': AR},
    ('2026-02-20', 1): {'o': ['Products & Services']}, ('2026-02-20', 2): {'y': COO},
    ('2026-02-27', 0): {'y': DEC}, ('2026-02-27', 1): {'y': INV}, ('2026-02-27', 2): {'y': INV},
    ('2026-03-13', 0): {'a': CH}, ('2026-03-13', 2): {'y': INV},
    ('2026-03-27', 0): {'a': CH, 'y': DEC}, ('2026-03-27', 1): {'y': COO}, ('2026-03-27', 2): {'y': INV}, ('2026-03-27', 3): {'y': COO}, ('2026-03-27', 4): {'y': INV}, ('2026-03-27', 5): {'a': CH, 'y': INV},
    ('2026-04-02', 1): {'o': ['Products & Services', 'Proactive']}, ('2026-04-02', 3): {'o': ['Products & Services', 'Reliability'], 'y': INV},
    ('2026-04-10', 0): {'y': INV}, ('2026-04-10', 1): {'y': DEC}, ('2026-04-10', 2): {'a': SH}, ('2026-04-10', 4): {'o': ['Ansel Schmidt', 'Carter B'], 'a': SH, 'y': INV},
    ('2026-05-01', 0): {'y': COO}, ('2026-05-01', 1): {'y': INV},
    ('2026-05-22', 0): {'t': '3Gbps Repair Driver', 'o': ['Alison'], 'a': HS, 'y': INV}, ('2026-05-22', 3): {'a': 'General', 'y': COO}, ('2026-05-22', 6): {'y': COO},
    ('2026-10-09', 5): {'a': TV_},
    ('2026-11-06', 0): {'a': AR, 'y': COO}, ('2026-11-06', 1): {'a': AR, 'y': INV}, ('2026-11-06', 2): {'a': AR, 'y': COO}, ('2026-11-06', 3): {'a': AR, 'y': COO},
    ('2026-11-13', 0): {'a': HS}, ('2026-11-13', 6): {'y': INV},
    ('2026-11-20', 1): {'y': COO}, ('2026-11-20', 4): {'a': OU, 'y': INV}, ('2026-11-20', 5): {'a': SW},
}

def month_name(s):
    return datetime.datetime.strptime(s.strip(), '%B %d, %Y').date().isoformat()

OOO = re.compile(r'\b(OOO|Away|away|OOO\))\b|travelling', re.I)
def topic_parts(raw):
    lines = [l.strip() for l in raw.replace('\r', '').split('\n')]
    keep, ooo = [], []
    for l in lines:
        if not l: continue
        if re.search(r'\bOOO\b|^\w+ Away\b', l) and len(l) < 60 and not re.search(r'cancel', l, re.I) and not l.lower().startswith('aaron ooo (call'): ooo.append(l)
        else: keep.append(l)
    return keep, ooo

FULL = {'Faraz': 'Faraz Ahmed', 'Alison': 'Alison Broten', 'Aaron': 'Aaron Harburn'}   # first names used in the takeaways
def owners_of(s):
    s = s.strip()
    if not s: return []
    parts = re.split(r'\s*(?:/|,|\band\b|&)\s*', s)
    return [FULL.get(p.strip(), p.strip()) for p in parts if p.strip()]

ITEM_BRACKET = re.compile(r'^\[(?P<own>[^\]]+)\]\s*(?P<title>[^:]{2,60}):\s*(?P<text>.*)$')
ITEM_NUM = re.compile(r'^\d+\.\s*(?P<rest>.*)$')
ITEM_TITLE = re.compile(r'^(?P<title>[A-Z][A-Za-z0-9 \-\+&/\']{2,40}):\s*(?P<rest>.*)$')
OWN_TO = re.compile(r'^(?P<own>(?:[A-Z][A-Za-z\-\.&\']*(?: [A-Z][A-Za-z\-\.&\']*){0,3})(?:(?: and |, | / )[A-Z][A-Za-z\-\.&\']*(?: [A-Z][A-Za-z\-\.&\']*){0,3})*|Reliability Strategy|Hardware Engineering|The team|Products & Services|P&S and Reliability|P&S and Proactive|Product and Reliability|SH\+ Product and Reliability)\s+(?:to|will)\s+(?P<rest>.*)$')

def split_items(raw):
    items, header = [], None
    for line in [l.rstrip() for l in raw.replace('\r', '').split('\n')]:
        l = line.strip()
        if not l: continue
        m = re.match(r'^Slide \d+\s+(.*)$', l)
        if m: header = m.group(1).strip(); continue
        if l.startswith('- ') and header is not None:
            items.append({'owner': [], 'title': header, 'text': l[2:].strip()}); continue
        m = ITEM_BRACKET.match(l)
        if m:
            items.append({'owner': owners_of(m.group('own')), 'title': m.group('title').strip(), 'text': m.group('text').strip()}); continue
        m = ITEM_NUM.match(l)
        if m: l = m.group('rest').strip()
        title = ''
        m = ITEM_TITLE.match(l)
        if m and not re.match(r'^(Slide|Data Escalation)$', m.group('title')) and (len(m.group('title')) < 38):
            title, l = m.group('title').strip(), m.group('rest').strip()
        elif m: title, l = m.group('title').strip(), m.group('rest').strip()
        own = []
        m = OWN_TO.match(l)
        if m: own = owners_of(m.group('own'))
        elif re.match(r'^(Alison|Faraz|Aaron|Adam|Ziyaad)\s+to\b', l): own = [l.split()[0]]
        items.append({'owner': own, 'title': title, 'text': l})
    return items

topics_seen = collections.Counter()
meetings = []
for date, topic, take in src['rows']:
    d = month_name(date)
    keep, ooo = topic_parts(topic)
    clean = '\n'.join(keep)
    its = split_items(take)
    if re.search(r'cancel|no meeting', topic, re.I): status = 'cancelled'
    elif not clean and not its: status = 'none'
    elif not clean and its: status = 'held'
    else: status = 'held'
    # Aaron Away with nothing else: no call
    if not clean and not its and ooo and status != 'cancelled': status = 'none'
    out_items = []
    for k, it in enumerate(its):
        text = (it['title'] + ': ' if it['title'] else '') + it['text']
        area = classify(AREAS, it['text'] + ' ' + it['title'], None) or classify(AREAS, clean, 'General')
        typ = classify(TYPES, it['title'] + ' ' + it['text'], 'Coordinate or follow up') if it['owner'] or it['title'] else 'Note'
        if it['title'] and not it['owner'] and re.match(r'^(Churn|Ticket|Normalized|Tenure|Compare|Break|Base|Product Technical|Sh1)', it['text']): typ = 'Reporting and data'
        if not it['owner'] and not it['title'] and re.match(r'^(offline|SH VOC)', it['text']): typ = 'Note'
        row = {'o': it['owner'], 't': it['title'], 'x': it['text'], 'a': area, 'y': typ}
        row.update(OVERRIDES.get((d, k), {}))
        row['o'] = [FULL.get(x, x) for x in row['o']]
        out_items.append(row)
    meetings.append({'d': d, 'topic': clean, 'raw': topic.replace('\r', ''), 'ooo': ooo, 's': status, 'i': out_items})

# link the weekly decks to the 2026 meetings
by_date = {m['d']: m for m in meetings}
def deck_date(t):
    try: return datetime.datetime.strptime(re.match(r'^([A-Z][a-z]+ \d{1,2}, \d{4})', t).group(1), '%B %d, %Y').date()
    except Exception: return None
pending = []
for dk in DECKS:
    dd = deck_date(dk['title'])
    if not dd or dd.year != 2026: continue
    m = by_date.get(dd.isoformat())
    if m is not None and 'k' not in m: m['k'] = {'t': dk['title'], 'u': 'https://docs.google.com/presentation/d/' + dk['id'] + '/edit'}
    elif m is None: pending.append((dd, dk))
for dd, dk in pending:
    for off in (-1, 1):
        m = by_date.get((dd + datetime.timedelta(days=off)).isoformat())
        if m is not None and 'k' not in m and m['d'].startswith('2026'):
            m['k'] = {'t': dk['title'], 'u': 'https://docs.google.com/presentation/d/' + dk['id'] + '/edit'}; print('deck matched a day off:', dk['title'], '->', m['d']); break

backlog = [l.strip() for l in src['backlog'].split('\n') if l.strip()]
G = {'source': 'VP Deacts call Weekly Topics & Takeaways, Churn Measurement 2026 workbook', 'snapshot': datetime.date.today().isoformat(), 'backlog': backlog,
     'areas': [a for a, _ in AREAS] + ['General'], 'types': [t for t, _ in TYPES] + ['Note'], 'meetings': meetings}
open(OUT, 'w').write('const GOVERNANCE = ' + json.dumps(G, separators=(',', ':'), ensure_ascii=False) + ';\n')
n = sum(len(m['i']) for m in meetings)
print(len(meetings), 'meetings', n, 'takeaways', collections.Counter(m['s'] for m in meetings), sum(1 for m in meetings if 'k' in m), 'decks linked')
print('2026 meetings without a deck:', [m['d'] for m in meetings if m['d'].startswith('2026') and 'k' not in m])
for m in meetings:
    for it in m['i']:
        print(f"{m['d']} | {it['a'][:14]:14s} | {it['y'][:12]:12s} | {','.join(it['o'])[:26]:26s} | {(it['t']+': ' if it['t'] else '')+it['x']:.78}")
