"""TV Resolution Analysis: root cause identified -> fix applied, per ticket.

Reads notes_all.json (same export as analyze_notes.py: Ticket Created Date and Agent Notes) and writes
resolution_flows.json for the TV "Resolution Analysis" Sankey (TV_RESOLUTION in site/App.jsx).

A ticket is in the flow when its Agent Notes carry both a "Root cause analysis" line and a "Resolution"
line (the structured Copilot summary agents paste into the worklog). Each line is keyword-classified to a
single theme: the theme whose pattern appears first in the text. Anything unmatched falls to "Other", and
a fix with no named action but a clear outcome falls to "Resolved remotely (action not named)".
Shares are indicative: free text, keyword matching, English and French terms.
"""
import json, re, collections, sys

MONTHS = ['2026-09', '2026-10']
LABEL = {'2026-08': 'Aug 2026', '2026-09': 'Sep 2026', '2026-10': 'Oct 2026'}

RC = [
    ('Active area outage', r'active (?:area )?outage|area outage|known outage|\bETR\b'),
    ('Customer set-up (TV input, power, HDMI)', r'tv input|wrong input|input was|standby|powered off|power strip|multiprise|hdmi (?:cable|port|input)|switched off|turned off'),
    ('Wi-Fi / wireless STB', r'wi-?fi|wireless|wstb|5 ?ghz|2\.4|interference|dead ?spot|dbm|signal strength|mesh|booster'),
    ('Packet loss / multicast drops', r'packet|discontinu|underrun|multicast|out-of-order|xvu|jitter'),
    ('Extended uptime / cache or buffer', r'uptime|cache|buffer|memory|corrupt|stale|hung'),
    ('STB hardware failure', r'hardware|defective|faulty|failing|power supply|failure|ethernet port|psu|stuck on|no boot|initiali[sz]'),
    ('Cabling / coax / splitter', r'cable|câble|coax|splitter|loose|desserr|connector|physical'),
    ('Bandwidth / congestion', r'bandwidth|congest|speed|throughput|saturat|competing'),
    ('Line / ONT / fibre', r'ont\b|light level|fibre|fiber|line quality|losing sync|vdsl|copper|pon\b|optical'),
    ('Provisioning / subscription / account', r'middleware|provision|profile|sync|subscription|compass|channel|package|unsubscri|account|order|activation|netcracker|fotb|csr|theme pack|google play|authenticat'),
    ('Remote / pairing / batteries', r'remote|battery|batteries|pair'),
    ('Recording / PVR', r'record|pvr|storage|disk'),
]
FX = [
    ('Replaced / shipped a new STB', r'swap|replacement|replaced|self-?repair|new (?:tv )?(?:box|stb|pvr)|order #|order no|shipment|shipped|\bship\b|delivery|ordered|evo boxes'),
    ('Technician dispatch', r'dispatch|technician|tech visit|field'),
    ('Escalated (Tier 2 / outage team)', r'escalat|tier 2|synapse|piws|outage portal|incident|ticket (?:created|raised)'),
    ('Reboot (ONT / modem / STB)', r'reboot|power cycl|restart'),
    ('Refresh / sync / provisioning fix', r'refresh|sync|ipd|stream profile|fix my account|clear ipv|provision|activat|resend|re-?send|fotb|theme pack|sign-in|authenticat'),
    ('Wired / moved / reconnected / Wi-Fi change', r'wired|hardwire|ethernet|moved|relocat|booster|extender|wps|re-?pair|wi-?fi channel|channel change|5 ?ghz|reconnect|hdmi|input|cable'),
    ('Education / how-to', r'educat|advised|explained|understood|walked|guided|instruct'),
]
FX_FALLBACK = ('Resolved remotely (action not named)', r'resolved|working|restored|operational|success|accessible|confirmed')

def month(r):
    d = str(r.get('Ticket Created Date', ''))
    m = re.match(r'(\d{4})-(\d{2})', d)
    return m.group(1) + '-' + m.group(2) if m else '?'

def full(r):
    return re.sub(r'https?://\S+', '', (r.get('Agent Notes') or '').split('WORKLOG_TYPE: Additional information')[0])

def rca(t):
    m = re.search(r'Root cause(?: analysis)?:?\s*(.{0,450}?)(?:¿\s*Troubleshooting|¿\s*Resolution|¿\s*AWA|TS Done|TS DETAILS|$)', t, re.S | re.I)
    return m.group(1).strip() if m else ''

def res(t):
    m = re.search(r'¿\s*Resolution:?\s*(.{0,450}?)(?:¿|$)', t, re.S | re.I)
    return m.group(1).strip() if m else ''

def first(t, defs, fallback=None):
    best = None
    for n, p in defs:
        m = re.search(p, t, re.I)
        if m and (best is None or m.start() < best[1]): best = (n, m.start())
    if best: return best[0]
    if fallback and re.search(fallback[1], t, re.I): return fallback[0]
    return 'Other'

if __name__ == '__main__':
    rows = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'notes_all.json'))
    out = {'months': [LABEL[m] for m in MONTHS]}
    for m in MONTHS:
        rs = [r for r in rows if month(r) == m]
        both = []
        for r in rs:
            t = full(r); a = rca(t); b = res(t)
            if a and b: both.append((first(a, RC), first(b, FX, FX_FALLBACK)))
        link = collections.Counter(both)
        cs = collections.Counter(a for a, _ in both); fs = collections.Counter(b for _, b in both)
        causes = sorted(cs, key=lambda k: (k == 'Other', -cs[k])); fixes = sorted(fs, key=lambda k: (k == 'Other', -fs[k]))
        out[LABEL[m]] = {'tickets': len(rs), 'covered': len(both),
                         'causes': [[k, cs[k]] for k in causes], 'fixes': [[k, fs[k]] for k in fixes],
                         'links': [[causes.index(a), fixes.index(b), v] for (a, b), v in sorted(link.items(), key=lambda kv: -kv[1])]}
    json.dump(out, open('resolution_flows.json', 'w'), separators=(',', ':'))
    for k in out['months']: print(k, out[k]['tickets'], out[k]['covered'])
