"""Compact the extractor's full.json into the proof map's data.json.

usage: shape.py <full.json> <repo root> <out dir>
Fails if any theorem depends on an axiom outside the allowed three
(this also catches `sorryAx`, e.g. from a shadowing challenge module)."""
import collections, json, os, pathlib, re, subprocess, sys

full, repo, out_dir = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
ALLOWED = {'propext', 'Classical.choice', 'Quot.sound'}
raw = json.load(open(full))
decls = [r for r in raw['decls'] if r['line'] and r['kind'] != 'instance']
if len(decls) < 1000:
    sys.exit(f'only {len(decls)} declarations extracted; is the Lean build missing?')
bad = [(r['name'], sorted(set(r['axioms']) - ALLOWED)) for r in decls if set(r['axioms']) - ALLOWED]
if bad:
    for n, a in bad[:20]: print(f'disallowed axiom in {n}: {", ".join(a)}', file=sys.stderr)
    sys.exit(f'{len(bad)} theorems depend on disallowed axioms')
byname = {r['name']: r for r in decls}
comp = set()
for f in ['lean/comparator.json', 'lean/Ehr/Check/comparator.json', 'lean/Ehr/Check/completion-comparator.json']:
    p = repo / f
    if p.exists(): comp |= set(json.load(open(p)).get('theorem_names', []))
audit = set(re.findall(r'^#audit_axioms\s+(\S+)', (repo / 'lean/Audit/SpecSurface.lean').read_text(), re.M))
# R marks headline claims documented in the overview or its topic pages.
# Exclude the generated map itself: its output must not select its own inputs.
# Existing audit/design records remain separate evidence rather than headlines.
pages = [repo / 'README.md', repo / 'docs/architecture.md',
         repo / 'docs/assurance.md', repo / 'docs/reproduction.md',
         *sorted((repo / 'docs/methods').glob('*.md'))]
ticks = set(re.findall(r"`([A-Za-z_][\w.'₀-₉]*)`", '\n'.join(p.read_text() for p in pages)))
short = collections.defaultdict(list)
for r in decls:
    if r['kind'] == 'theorem': short[r['name'].split('.')[-1]].append(r['name'])
readme = set()
for t in ticks:
    if t in byname and byname[t]['kind'] == 'theorem': readme.add(t)
    elif len(short.get(t, [])) == 1: readme.add(short[t][0])
    else: readme |= {f for f in short.get(t, []) if f.endswith('.' + t) and len(t) > 6}
idx = {r['name']: i for i, r in enumerate(decls)}
mods = sorted({r['module'] for r in decls}); midx = {m: i for i, m in enumerate(mods)}
KIND = {'theorem': 't', 'def': 'd', 'structure': 's', 'inductive': 'i', 'opaque': 'o'}
out = []
for r in decls:
    tags = ('C' if r['name'] in comp else '') + ('A' if r['name'] in audit else '') + ('R' if r['name'] in readme else '')
    kind = KIND[r['kind']]
    sig = r['sig'] if kind != 'd' or len(r['sig']) <= 1200 else r['sig'][:1200] + ' …'
    out.append([r['name'], kind, midx[r['module']], r['line'], sig, r['doc'] or '',
                [idx[x] for x in r['stmt'] if x in idx], [idx[x] for x in r['body'] if x in idx],
                tags, 1 if r['private'] else 0])
mi = {m['module']: m['imports'] for m in raw['modules']}
commit = os.environ.get('GITHUB_SHA') or subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip()
layers = json.load(open(pathlib.Path(__file__).with_name('layers.json')))
data = {'commit': commit, 'layers': layers, 'modules': [[m, [midx[x] for x in mi.get(m, []) if x in midx]] for m in mods], 'decls': out}
out_dir.mkdir(parents=True, exist_ok=True)
(out_dir / 'data.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
print(f'{len(out)} declarations, {sum(1 for r in out if r[8])} headline, commit {commit[:8]}')
