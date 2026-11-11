"""HSIA Resolution Analysis: root cause identified -> fix applied, per ticket.

Reads the HSIA notes export rows (same files as analyze_hsia_notes.py, JSON list with Ticket Created Date,
Trouble Ticket ID and Agent Notes) and writes resolution_flows.json for the HSIA "Resolution Analysis" Sankey
(HSIA_RESOLUTION in site/App.jsx). Same method as analysis/tv/resolution_flows.py, with HSIA themes.

A ticket is in the flow when its Agent Notes carry both a "Root cause analysis" line and a "Resolution" line
(the structured Copilot summary agents paste into the worklog). Each line is keyword-classified to one theme,
the one mentioned first. Unmatched lines fall to "Other"; an unresolved or pending fix falls to "Pending /
unresolved", and a fix with only a clear outcome to "Resolved remotely (action not named)".
"""
import json, re, collections, sys

MONTHS = ['2026-09', '2026-10']
LABEL = {'2026-08': 'Aug 2026', '2026-09': 'Sep 2026', '2026-10': 'Oct 2026'}

RC = [
    ('Outage / network repair', r'outage|network repair|event id|cable damage|fibre cut|fiber cut'),
    ('ONT hardware limit or fault', r'ont hardware|hardware limit|equipment limit|incompatib|i-240g|g-240|ont (?:fault|failure|defect|swap|replacement)|mid-tier|not gigabit|gigabit-capable'),
    ('Fibre degraded / light level', r'fibre|fiber|light level|gpon|splice|optical|bit error|severely degraded|pon\b|olt'),
    ('Copper / DSL line quality', r'copper|\bdsl|vdsl|adsl|attenuation|\bsnr\b|line quality|bonded'),
    ('Provisioning / order / backend', r'provision|backend|netcracker|rfs|activation|profile|order|billing|suspend|cease|account|port assignment'),
    ('Wi-Fi coverage / interference', r'wi-?fi|wireless|dead spot|interference|coverage|2\.4|5 ?ghz|mesh|extender|boost'),
    ('Speed / plan mismatch', r'speed|mbps|plan|bandwidth|throttl|\bcap\b'),
    ('Gateway / modem fault or uptime', r'gateway|modem|\bnah\b|nh20|t3200|router|uptime|memory leak|nat table|firmware|reboot|power loss'),
    ('Dataflow / sync loss (cause not isolated)', r'dataflow|no sync|losing sync|sync fail|no ip|packet loss'),
    ('Cabling / inside wiring', r'cable|cat ?5|ethernet|wiring|jack|splitter|coax|connector|loose'),
    ('Customer device / software', r'customer (?:device|equipment|pc|laptop)|laptop|\bpc\b|vpn|dns|software|antivirus|device'),
]
FX = [
    ('Technician dispatch', r'dispatch|technician|\boos\b|out-of-service|field visit|truck|repair appointment'),
    ('Escalated (Tier 2 / CORE / PIWS)', r'escalat|\bcore\b|piws|tier 2|netcracker|synapse|backend support'),
    ('Equipment replaced / shipped', r'replac|swap|new (?:modem|gateway|ont|router)|ship'),
    ('Reboot / reset', r'reboot|power cycl|restart|reset|factory'),
    ('Refresh / re-provisioning', r'refresh|re-?provision|resync|provision|activat|profile|sync'),
    ('Wi-Fi optimisation (placement, channel, booster)', r'wi-?fi|channel|booster|extender|placement|boost|wired|ethernet|mesh|relocat'),
    ('Education / advice', r'educat|advised|explained|recommend|walked|guided'),
    ('Network repair completed', r'repair complete|network repair|outage (?:cleared|resolved)|restored'),
]
FX_FALLBACKS = [
    ('Pending / unresolved', r'pending|unresolved|not yet|no remote fix|waiting'),
    ('Resolved remotely (action not named)', r'resolved|working|operational|success|confirmed'),
]

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

def first(t, defs, fallbacks=()):
    best = None
    for n, p in defs:
        m = re.search(p, t, re.I)
        if m and (best is None or m.start() < best[1]): best = (n, m.start())
    if best: return best[0]
    for n, p in fallbacks:
        if re.search(p, t, re.I): return n
    return 'Other'

if __name__ == '__main__':
    rows = []
    for f in sys.argv[1:] or ['hsia_rows.json']: rows += json.load(open(f))
    seen = set(); uniq = []
    for r in rows:
        k = r.get('id')
        if k is not None and k in seen: continue
        seen.add(k); uniq.append(r)
    out = {'months': [LABEL[m] for m in MONTHS]}
    for m in MONTHS:
        rs = [r for r in uniq if month(r) == m]
        both = []
        for r in rs:
            t = full(r); a = rca(t); b = res(t)
            if a and b: both.append((first(a, RC), first(b, FX, FX_FALLBACKS)))
        link = collections.Counter(both)
        cs = collections.Counter(a for a, _ in both); fs = collections.Counter(b for _, b in both)
        causes = sorted(cs, key=lambda k: (k == 'Other', -cs[k])); fixes = sorted(fs, key=lambda k: (k == 'Other', -fs[k]))
        out[LABEL[m]] = {'tickets': len(rs), 'covered': len(both),
                         'causes': [[k, cs[k]] for k in causes], 'fixes': [[k, fs[k]] for k in fixes],
                         'links': [[causes.index(a), fixes.index(b), v] for (a, b), v in sorted(link.items(), key=lambda kv: -kv[1])]}
    json.dump(out, open('resolution_flows.json', 'w'), separators=(',', ':'))
    for k in out['months']: print(k, out[k]['tickets'], out[k]['covered'])
