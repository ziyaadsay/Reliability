"""Turns osp_health.json (from osp_health.py) into the HSIA_OSP constant for site/App.jsx (osp_block.js)."""
import json
d = json.load(open('osp_health.json'))
def r(x): return round(x, 4) if isinstance(x, float) else x
def walk(o):
    if isinstance(o, dict): return {k: walk(v) for k, v in o.items()}
    if isinstance(o, list): return [walk(v) for v in o]
    return r(o)
js = 'const HSIA_OSP = ' + json.dumps(walk(d), separators=(',', ':'), ensure_ascii=False) + ';\n'
open('osp_block.js', 'w').write(js)
print(len(js), 'chars')
