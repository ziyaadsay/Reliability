#!/usr/bin/env python3
"""Reliability by Design (RbD) forum: build the RBD constant for site/App.jsx.

Inputs (JSON/text files, paths as arguments):
  1. notes.txt   text of the "RBD Summary Notes - Master" Google Doc (2026 section only is used)
  2. agenda.json rows of the "Weekly Agenda" sheet (get_values 'values')
Output: a JS block `const RBD = {...};` on stdout.

Usage: gen_rbd_block.py notes.txt agenda.json > rbd_block.js
"""
import json, re, sys, datetime as dt

MONTHS = {m: i + 1 for i, m in enumerate("January February March April May June July August September October November December".split())}
HEAD = re.compile(r"^### (?:\w+) (\w+) (\d+)(?:st|nd|rd|th)?, (\d{4})\s*(.*)$")


def clean(s):
    s = re.sub(r"<(https?://[^>\s]+)>", r"\1", s)
    s = re.sub(r"\\([~*&<>\[\]_#()!.+-])", r"\1", s)
    s = s.replace("\\*", "*").replace("\\&", "&").replace("\\<", "<").replace("\\>", ">").replace("\\[", "[").replace("\\]", "]").replace("\\_", "_")
    s = re.sub(r"\[([^\]]*)\]\((https?://[^)]*)\)", r"\1", s)
    s = s.replace("**", "").replace("*", "").strip()
    s = re.sub(r"^[-•]\s*", "", s)
    return re.sub(r"\s+", " ", s).strip()


def link(s):
    s = s.replace("\\_", "_").replace("\\", "")
    m = re.search(r"https?://[^\s)\]]+", s)
    return m.group(0) if m else ""


def parse_notes(text):
    t = text.split("# 2025 RBD Summary Notes")[0]
    meetings, cur, topic = [], None, None
    for raw in t.split("\n"):
        m = HEAD.match(raw)
        if m:
            mo, d, y, rest = m.groups()
            cur = {"d": "%04d-%02d-%02d" % (int(y), MONTHS[mo], int(d)), "x": "CANCEL" in rest.upper(), "t": []}
            meetings.append(cur); topic = None
            continue
        if cur is None or not raw.strip() or raw.strip() == "<!-- end list -->":
            continue
        ind = len(raw) - len(raw.lstrip(" "))
        body = raw.strip()
        tm = re.match(r"^\d+\.\s+(.*)$", body)
        tc = clean(tm.group(1)) if tm else ""
        if tc.startswith("Topic:"):
            topic = {"n": tc.split(":", 1)[1].strip(), "p": "", "j": "", "m": "", "ask": "", "st": "", "notes": [], "ap": [], "acts": []}
            cur["t"].append(topic); sect = "notes"; continue
        if topic is None:
            continue
        c = clean(body)
        if not c:
            continue
        if re.match(r"^Presenter:", c):
            topic["p"] = c.split(":", 1)[1].strip(); continue
        if re.match(r"^JIRA:", c):
            topic["j"] = link(body) or c.split(":", 1)[1].strip(); continue
        if re.match(r"^MVP:", c):
            topic["m"] = link(body); continue
        if re.match(r"^Approvals?:?$", c, re.I):
            sect = "ap"; continue
        am = re.match(r"^\d+\.\s+(.*)$", body)
        if am and re.match(r"^\W*Ask:", clean(am.group(1))):
            topic["ask"] = clean(am.group(1)).split(":", 1)[1].strip(); sect = "notes"; continue
        if am and re.match(r"^\W*(Approvals?|Status)", clean(am.group(1)), re.I):
            h = clean(am.group(1)); sect = "ap"
            if re.match(r"^Status:", h, re.I):
                topic["st"] = h.split(":", 1)[1].strip()
            continue
        dep = max(0, (ind - 2) // 4)
        dep = min(dep, 3)
        if sect == "ap":
            if re.match(r"^(RBD )?Sign-off Status:", c, re.I) or re.match(r"^Status:", c, re.I):
                topic["st"] = c.split(":", 1)[1].strip()
            else:
                topic["ap"].append(c)
        else:
            topic["notes"].append([dep, c, ind])
    return meetings


ACT_HEAD = re.compile(r"^(?:(?:Final )?(?:Action Items?|Actions)(?:\s*(?:&|and)\s*Next Steps)?|Next Steps)\s*(?:\([^)]*\))?\s*:?\s*$", re.I)
ACT_INLINE = re.compile(r"^Actions?(?:\s+Items?)?\s*(?:\(([^)]*)\))?\s*:\s*(.+)$", re.I)
OWN = re.compile(r"^([A-Z][\w.'’-]+(?:\s+[A-Z&][\w.'’-]*){0,3}(?:\s*[/&,]\s*[A-Z][\w.'’-]+(?:\s+[A-Z][\w.'’-]+)?)*)\s*(?::|\s+(?:to|will|should|is to|are to|needs to|confirm|check)\b)")
DUE = re.compile(r"\b(?:by|due|before|on)\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?)", re.I)


FIRST = set("""Rooshil Ansel Kristine Faraz Laura Shantell Vivian Gary Leroy Carter Ryan Rosalinda Jacqueline Roman Sibat Ken Sang
Paolo Shane Alison Ben Vicki James Samson Fabiano Evan Neo Catherine Calvin Dustin Eric Marie Mike Paul Aaron Yelena Rodrigo
Jacqueline Kristine Samso Mari Marie Sibat Cecile Vivian Roman Rosalind Dan Dave David Jason Kam Brian Paulo Axon""".split())
TEAMS = ("Engineering", "Team", "Product", "Support", "CSD", "InSight")


def split_names(label):
    parts = re.split(r"\s*(?:/|&|,|\band\b)\s*", label)
    ok = []
    for p_ in parts:
        w = p_.replace("Team", "").strip().split()
        if p_.strip().endswith("Team") and 2 <= len(p_.split()) <= 3 and p_.split()[0][0].isupper():
            ok.append(p_.strip())
        elif w and w[0] in FIRST and all(re.match(r"^[A-Z][A-Za-z.'\u2019-]*$", x) for x in w) and len(w) <= 3:
            ok.append(" ".join(w))
        else:
            return ""
    return " / ".join(ok)


def owner_of(text, default=""):
    text = re.sub(r"^Actions?(?:\s+Items?)?\s*(?:\(([^)]*)\))?\s*:\s*", lambda m: "[%s] " % m.group(1) if m.group(1) else "", text, flags=re.I)
    m = re.match(r"^\[([^\]]+)\]\s*(.*)$", text)
    if m:
        o = split_names(m.group(1))
        if o:
            return o, m.group(2)
    m = re.match(r"^([^:]{2,60}?)\s*(?:\([^)]*\))?:\s+(.*)$", text)
    if m:
        o = split_names(m.group(1))
        if o:
            return o, m.group(2)
    m = re.search(r"\(([^()]{2,60})\)\.?$", text)
    if m:
        o = split_names(m.group(1))
        if o:
            return o, text[:m.start()].strip()
    m = re.match(r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s*(?:&|/|and)\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)*)\s+(?:to|will|should|is to|needs to|requested|agreed|confirmed|can|may)\b", text)
    if m:
        o = split_names(m.group(1))
        if o:
            return o, text
    m = re.match(r"^(%s)\s+to\b" % "|".join(TEAMS), text)
    if m:
        return m.group(1), text
    return default, text


def extract_actions(topic):
    notes = topic["notes"]
    acts, i = [], 0
    while i < len(notes):
        dep, text, ind = notes[i]
        if ACT_HEAD.match(text):
            j = i + 1
            while j < len(notes) and notes[j][2] > ind:
                if notes[j][0] <= 3 and not ACT_HEAD.match(notes[j][1]):
                    acts.append(notes[j])
                j += 1
            i = j; continue
        m = ACT_INLINE.match(text)
        if m:
            acts.append([dep, text.split(":", 1)[1].strip(), ind, m.group(1) or ""])
        i += 1
    out = []
    for a in acts:
        txt = a[1]
        if txt.startswith("[Update") or len(txt) < 12:
            continue
        own, body = owner_of(txt, split_names(a[3]) if len(a) > 3 and a[3] else "")
        if not own and topic["p"]:
            own = ""
        due = DUE.search(txt)
        out.append({"o": own, "a": body or txt, "due": due.group(1) if due else ""})
    # collapse sub-bullets that are only "Confirmed ..." updates: keep top-level only
    seen, res = set(), []
    for a in out:
        k = a["a"][:80].lower()
        if k in seen: continue
        seen.add(k); res.append(a)
    return res


def sign_off(topic):
    """Status category: ok (approved), cond, no (not approved), na (not required), '' (not recorded)."""
    txt = " ".join([topic["st"]] + topic["ap"][:2])
    if not txt.strip():
        return ""
    if re.search(r"(?i)not required|no sign-?off|not requested|awareness|no approval", txt):
        return "na"
    if re.search(r"(?i)\bnot approved", txt):
        return "no"
    if re.search(r"(?i)condition", txt):
        return "cond"
    if re.search(r"(?i)approv", txt):
        return "ok"
    return ""


def fmt_iso_agenda(s):
    m = re.match(r"^\w+ (\w+) (\d+), (\d{4})$", s.strip())
    return "%04d-%02d-%02d" % (int(m.group(3)), MONTHS[m.group(1)], int(m.group(2))) if m else None


def parse_agenda(rows):
    out, cur = [], None
    for r in rows:
        cell = " ".join(x for x in r if x).strip() if r else ""
        if not cell: continue
        iso = fmt_iso_agenda(cell)
        if iso:
            cur = {"d": iso, "x": False, "note": "", "t": []}; out.append(cur); continue
        if cur is None: continue
        if cell.startswith("Topic:"):
            top = {"n": "", "ask": "", "j": "", "p": "", "ab": "", "bc": ""}
            for ln in cell.split("\n"):
                k, _, v = ln.partition(":")
                k = k.strip().lower(); v = v.strip()
                if k == "topic": top["n"] = v
                elif k == "ask": top["ask"] = v
                elif k == "jira": top["j"] = link(ln)
                elif k == "presenter": top["p"] = v
            cur["t"].append(top)
        elif re.search(r"AB Time", cell) and cur["t"] and not cur["t"][-1]["ab"]:
            cur["t"][-1]["ab"] = re.sub(r"\s*AB Time", "", cell).replace(" -", " - ").replace("  ", " ").strip()
        elif re.search(r"BC Time", cell) and cur["t"] and not cur["t"][-1]["bc"]:
            cur["t"][-1]["bc"] = re.sub(r"\s*BC Time", "", cell).replace(" -", " - ").replace("  ", " ").strip()
        elif cell.lower().startswith("cancel"):
            cur["x"] = True; cur["note"] = cell
        elif "No Items" in cell:
            cur["note"] = cell
    return out


def main():
    notes = open(sys.argv[1]).read()
    agenda = json.load(open(sys.argv[2]))
    meetings = parse_notes(notes)
    res = []
    for m in meetings:
        tops = []
        for t in m["t"]:
            if t["n"].upper().startswith("XXX"):
                continue
            acts = extract_actions(t)
            notes_out = [[d, c] for d, c, _ in t["notes"] if not re.match(r"^(Next Steps|Action Items?)[^a-z]*:?$", c, re.I) or True]
            tops.append({"n": t["n"], "p": t["p"], "j": t["j"], "m": t["m"], "ask": t["ask"], "st": (t["st"] or (t["ap"][0] if t["ap"] else "")), "so": sign_off(t), "ap": t["ap"][1:] if (not t["st"] and t["ap"]) else t["ap"], "notes": notes_out, "acts": acts})
        res.append({"d": m["d"], "x": m["x"] or not tops, "t": tops})
    # agenda.json: list of {d, x, note, t:[{n,ask,j,p,ab,bc}]} from the "Weekly Agenda" sheet (upcoming meetings)
    full = {}
    for m in res:
        for t in m["t"]:
            for a in t["acts"]:
                for nm in a["o"].split(" / "):
                    if " " in nm: full.setdefault(nm.split()[0], nm)
    for m in res:
        for t in m["t"]:
            for a in t["acts"]:
                a["o"] = " / ".join(full.get(nm, nm) for nm in a["o"].split(" / ")) if a["o"] else ""
    up = agenda if isinstance(agenda, list) and agenda and "t" in agenda[0] else parse_agenda(agenda)
    res = [r for r in res if r["d"] <= "2026-11-26"]  # later doc entries are empty placeholders; the sheet is the source
    print("const RBD = " + json.dumps({"meetings": res, "upcoming": up}, ensure_ascii=False, separators=(",", ":")) + ";")


if __name__ == "__main__":
    main()
