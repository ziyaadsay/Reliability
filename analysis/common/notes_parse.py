"""Splits a ticket's Agent Notes export into what the agent wrote and what InSight pasted.

The Agent Notes column is a log of worklog entries joined by "*** ":
    CREATED DATE: d - SUBMITTER: s - WORKLOG_TYPE: t - WORKLOG_SUMMARY: m - WORKLOG_DETAILS: text
Entries with WORKLOG_SUMMARY "[InSight Case Data] ID: ..." are the InSight (service assurance tool) payload:
service checks, provisioning and optical levels for the customer. They are not written by the agent, so
they must not feed the "what agents are writing" themes, device or access mentions. Entries written by the
agent are "[Agent Notes] <call flow>" (Inbound client call) and DISPATCH "Customer Comments".
Everything else (SWT API, WFM work orders, reassignments, Resolved, repair templates) is system text.

Payload pasted inside an agent entry (INSIGHT CHECKS ... ONT Tx) is cut out of the narrative and parsed as
payload too. Only aggregates should leave the analysis scripts: raw notes contain customer details.
"""
import re

ENTRY_SPLIT = re.compile(r'\s*\*\*\*\s*(?=CREATED DATE:)')
ENTRY_HDR = re.compile(r'CREATED DATE:\s*(\S+)\s*-\s*SUBMITTER:\s*(.*?)\s*-\s*WORKLOG_TYPE:\s*(.*?)\s*-\s*WORKLOG_SUMMARY:\s*(.*?)\s*-\s*WORKLOG_DETAILS:\s*(.*)', re.S)

# Optical power window for the ONT Rx level (dBm, 1490 nm down). ASSUMPTION: GPON class B+ style limits.
# Adjust to the team's own thresholds; the dashboard states the values used.
RX_FLOOR, RX_CEIL, RX_MARGINAL = -27.0, -8.0, -25.0

PAYLOAD_START = re.compile(r'INSIGHT CHECKS|TELUS Products:\s*ACTIVE|ASSIGNMENT INFORMATION|PROVISIONING\s+S(?:&amp;|&)E Code|ONT Rx @ 1490nm')
BOILER = [
    re.compile(r'(?:MDU:\s*\w+\s*)?Created By:\s*x?\d+\s*_*'),
    re.compile(r'InSight (?:Case|Processes):\s*[\w-]*'),
    re.compile(r'https?://\S+'),
    re.compile(r'_{3,}'),
    re.compile(r'Agent Comments:'),
    re.compile(r'Fuel ?IEx used:?|co ?pilot link:?|#CopilotNotes', re.I),
]

# InSight check phrases agents quote or paraphrase inside their own narrative. They are removed from the agent
# text (they are tool output, not the agent's description of the issue) and read as InSight findings instead.
QUOTED_CHECK = re.compile(
    r'(?:INSIGHT (?:FINDINGS|ASSESSMENT)|Insight Assessment)\s*[:\-]?|'
    r'ONT Operational State:\s*ONT Is (?:Up|Down)|\bONT Is (?:Up|Down)\b|'
    r'(?:Outage(?: test| check)?:\s*)?(?:No )?Active Events Found(?: In Issue Tool)?|'
    r'(?:No pending service order\(s\) detected|Pending Service Order\(s\) found)|'
    r'[\w.()\-]+ - (?:Has Newest Firmware(?: Version)?|Firmware Version Is Out-Of-Date)|'
    r'All STBs Registered|No Duplicate Found|No Errors On Any STBs Found|'
    r'(?:ONT|OLT) (?:Rx|Tx) @ \d+nm[^:]*:\s*-?\d+(?:\.\d+)?', re.I)

def entries(raw):
    for e in ENTRY_SPLIT.split(raw or ''):
        m = ENTRY_HDR.match(e.strip())
        if m:
            _, sub, typ, summ, det = m.groups()
            yield {'submitter': sub, 'type': typ, 'summary': summ, 'details': det}

def is_insight(e):
    return '[InSight Case Data]' in e['summary']

def is_agent_text(e):
    s = e['summary']
    return s.startswith('[Agent Notes]') or (e['type'] == 'DISPATCH' and s == 'Customer Comments')

def _grab(d, label, stop):
    m = re.search(label + r':\s*(.*?)\s*(?=(?:' + stop + r')|$)', d, re.S)
    return m.group(1) if m else None

# A value ends at the next label (label followed by a colon) or at the PROVISIONING / INSIGHT CHECKS headings.
_LABELS = ['TELUS Products', 'Outage', 'Orders', 'Gateway Firmware', 'ONT Operational State', 'Last Reported Speed', 'xVu Error Status',
           'STB Registration', 'STB Duplicated', 'STB Types', 'STB Firmware', 'Sync or No Sync', r'Losing Sync \(24 Hrs\)', r'Bnd Losing Sync \(24 Hrs\)',
           'Train Rate', 'Bnd Train Rate', 'Combined Train Rate', 'IPD Suspension', 'Loop Qualification', 'Attenuation', 'Bnd Attenuation',
           'Bonded Circuit Path', 'Primary Circuit Path', r'ONT Rx @', r'OLT Rx @', r'ONT Tx @']
_STOP = '(?:' + '|'.join(_LABELS) + r'):|PROVISIONING|INSIGHT CHECKS'

def parse_insight(text):
    """Structured findings from one InSight payload. Missing checks are None (the check was not in the payload)."""
    d = text.replace('&amp;', '&')
    f = {}
    v = _grab(d, 'Outage', _STOP)
    if v is not None: f['outage'] = not v.lower().startswith('no active')
    v = _grab(d, 'Orders', _STOP)
    if v is not None: f['pending_order'] = not v.lower().startswith('no pending')
    v = _grab(d, 'Gateway Firmware', _STOP)
    if v is not None:
        f['gw_fw_outdated'] = bool(re.search(r'out-of-date|not (?:the )?newest', v, re.I))
    v = _grab(d, 'ONT Operational State', _STOP)
    if v is not None:
        f['ont_down'] = bool(re.search(r'\bdown\b', v, re.I)) if re.search(r'\b(?:up|down)\b', v, re.I) else None
        f['ont_error'] = bool(re.match(r'error', v, re.I))
    v = _grab(d, 'STB Registration', _STOP)
    if v is not None: f['stb_unregistered'] = not v.lower().startswith('all stbs registered')
    v = _grab(d, 'xVu Error Status', _STOP)
    if v is not None: f['stb_errors'] = not v.lower().startswith('no errors')
    v = _grab(d, 'Sync or No Sync', _STOP)
    if v is not None: f['no_sync'] = v.lower().startswith('no sync')
    v = _grab(d, r'Losing Sync \(24 Hrs\)', _STOP)
    if v is not None: f['losing_sync'] = not v.lower().startswith('not losing')
    v = _grab(d, r'(?<!Bnd )(?<!Combined )Train Rate', _STOP)
    if v is not None: f['low_train_rate'] = 'low' in v.lower()
    v = _grab(d, 'Loop Qualification', _STOP)
    if v is not None: f['loop_disqualified'] = 'disqualified' in v.lower()
    v = _grab(d, 'IPD Suspension', _STOP)
    if v is not None: f['ipd_suspended'] = not v.lower().startswith('no')
    m = re.search(r'ONT Rx @ 1490nm \(Down\):\s*(-?\d+(?:\.\d+)?)', d)
    if m:
        rx = float(m.group(1)); f['ont_rx'] = rx
        f['rx_out_of_range'] = rx < RX_FLOOR or rx > RX_CEIL
        f['rx_marginal'] = (RX_FLOOR <= rx < RX_MARGINAL)
    m = re.search(r'Last Reported Speed:\s*(\d+(?:\.\d+)?)\s*Mbps', d)
    if m: f['last_speed'] = float(m.group(1))
    return f

def clean_narrative(text):
    """Agent-written text only: pasted payload cut out, templates and links stripped."""
    m = PAYLOAD_START.search(text)
    payload = ''
    if m:
        payload = text[m.start():]; text = text[:m.start()]
    quoted = ' '.join(m.group(0) for m in QUOTED_CHECK.finditer(text))
    text = QUOTED_CHECK.sub(' ', text)
    for rx in BOILER:
        text = rx.sub(' ', text)
    return re.sub(r'\s+', ' ', text).strip(), payload or quoted

def parse_note(raw):
    """-> {'agent': str, 'insight': merged findings dict or None, 'payload_in_agent_text': bool (payload or InSight check phrases found in the agent's own entry), 'n_insight': int}"""
    agent, ins, pasted, n = [], {}, False, 0
    for e in entries(raw):
        if is_insight(e):
            n += 1
            for k, v in parse_insight(e['details']).items():
                ins.setdefault(k, v) if k not in ('outage', 'ont_down') else ins.__setitem__(k, bool(ins.get(k)) or bool(v))
        elif is_agent_text(e):
            txt, payload = clean_narrative(e['details'])
            if payload:
                pasted = True
                for k, v in parse_insight(payload).items(): ins.setdefault(k, v)
            if txt: agent.append(txt)
    return {'agent': ' '.join(agent), 'insight': ins or None, 'payload_in_agent_text': pasted, 'n_insight': n}
