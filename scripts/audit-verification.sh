#!/usr/bin/env bash
# Audit only Audit.SpecSurface's imports, serially; never build Ehr or EhrHeavy.
set -euo pipefail
cd "$(dirname "$0")/../lean"
export LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536
mkdir -p .lake
exec 9>.lake/audit-verification.lock
flock -n 9 || { echo 'Another verification audit is running.' >&2; exit 1; }
lake env python3 - <<'PY'
import hashlib, json, os, pathlib, re, subprocess
p = pathlib.Path
root = p.cwd()
cache = root / '.lake/audit'
lib = cache / 'lib'
lib.mkdir(parents=True, exist_ok=True)
os.environ['LEAN_PATH'] = str(lib) + ':' + os.environ.get('LEAN_PATH', '')
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
def fingerprint():
    files = sorted([*p('Ehr').rglob('*.lean'), *p('Audit').rglob('*.lean'),
                    p('Solution.lean'), p('Statements.lean'), p('CompletionObligations.lean'), p('comparator.json'),
                    p('Ehr/Check/comparator.json'), p('Ehr/Check/completion-comparator.json'),
                    p('lakefile.toml'), p('lean-toolchain'), p('lake-manifest.json')])
    return hashlib.sha256(b''.join(str(f).encode() + b'\0' + f.read_bytes() for f in files)).hexdigest()
before = fingerprint()
toolchain = subprocess.check_output(['lean', '--version'], text=True)
visited, signatures, output = set(), {}, ''
def build(module):
    global output
    if module in visited:
        return
    src = p(module.replace('.', '/') + '.lean')
    if not src.exists():  # Lean / Std come with the pinned toolchain.
        return
    imports = re.findall(r'^import\s+([\w.]+)\s*$', src.read_text(), re.M)
    for dep in imports:
        build(dep)
    signature = hashlib.sha256((toolchain + src.read_text() + ''.join(
        signatures.get(d, '') for d in imports)).encode()).hexdigest()
    dest = lib / src.with_suffix('.olean')
    stamp = dest.with_suffix('.audit-hash')
    if module == 'Audit.SpecSurface' or not dest.exists() or not stamp.exists() or stamp.read_text() != signature:
        dest.parent.mkdir(parents=True, exist_ok=True)
        print('Audit compile: ' + module, flush=True)
        run = subprocess.run(['lean', '-j6', '-o', str(dest), str(src)], text=True,
                             stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        (cache / 'last-module.log').write_text(run.stdout)
        if run.returncode or re.search(r'\bwarning:.*(?:sorry|declaration uses)', run.stdout):
            raise SystemExit(run.stdout or 'Lean failed')
        if module == 'Audit.SpecSurface':
            output = run.stdout
        stamp.write_text(signature)
    visited.add(module)
    signatures[module] = signature
build('Audit.SpecSurface')
records = [json.loads(line.split('AUDIT_JSON ', 1)[1]) for line in output.splitlines() if 'AUDIT_JSON ' in line]
surfaces = {r['name']: r['items'] for r in records if r['kind'] == 'surface'}
axioms = {r['name']: r['items'] for r in records if r['kind'] == 'axioms'}
required = set(json.loads(p('comparator.json').read_text())['theorem_names'])
assert required <= axioms.keys(), 'Comparator theorem missing from audit file'
assert len(axioms) == sum(r['kind'] == 'axioms' for r in records), 'Duplicate theorem audit'
assert all(set(a) <= {'propext', 'Classical.choice', 'Quot.sound'} for a in axioms.values())
assert set(axioms) <= surfaces.keys(), 'Missing statement surface'
assert before == fingerprint(), 'Lean sources changed during audit; rerun'
assert commit == subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(), 'HEAD changed during audit; rerun'
modules = {r['name']: r['module'] for r in records if r['kind'] == 'surface'}
def source(name):
    short = name.rsplit('.', 1)[-1]
    f = p(modules[name].replace('.', '/') + '.lean')
    hits = [i for i, line in enumerate(f.read_text().splitlines(), 1)
            if re.match(r'(?:theorem|def|structure|inductive)\s+' + re.escape(short) + r'\b', line)]
    assert len(hits) == 1, (name, f, hits)
    return f'[lean/{f}:{hits[0]}](../lean/{f}#L{hits[0]})'
groups, group_ids = [], {}
for name, items in surfaces.items():
    key = tuple(items)
    if key not in group_ids:
        group_ids[key] = len(groups) + 1
        groups.append(items)
# Names with identical membership are printed once, in reusable B-groups.
buckets = {}
for item in sorted({item for items in groups for item in items}):
    membership = tuple(i for i, items in enumerate(groups) if item in items)
    buckets.setdefault(membership, []).append(item)
bundles = list(buckets.items())
parts = [[j for j, (members, _) in enumerate(bundles, 1) if i in members] for i in range(len(groups))]
assert all(set(items) == {item for j in parts[i] for item in bundles[j-1][1]}
           for i, items in enumerate(groups)), 'Surface grouping lost a definition'
lines = [f'Generated with Git HEAD `{commit}`. Audited source SHA-256: `{before}`. '
         'The source hash includes uncommitted source changes; HEAD identifies the checkout base.', '',
         f'{len(axioms)} theorems audited; {len(surfaces)} statement surfaces; {len(groups)} distinct lists; '
         f'{sum(len(items) for _, items in bundles)} distinct definitions/types overall; '
         f'{min(map(len, groups))}–{max(map(len, groups))} per statement. '
         f'{len(visited)} project modules compiled or reused, one Lean process at a time. '
         'The two extra surfaces are property definitions, not proved theorems.', '',
         'Counts include named project definitions and types. Compiler helpers, instances, constructors and projections '
         'are omitted from the display after traversal. Library definitions are traversed but not listed. '
         'Proof bodies are followed only for the axiom column. `P` = propext; `C` = Classical.choice; `Q` = Quot.sound; '
         '`none` = no axioms. Each S-list below gives its complete list as shared B-groups; '
         'each definition is printed once. No names are removed by this grouping.', '',
         '| Declaration | Source | Surface / count | Axioms |', '|---|---|---|---|']
for name, items in surfaces.items():
    axs = ', '.join({'propext':'P', 'Classical.choice':'C', 'Quot.sound':'Q'}[a] for a in axioms.get(name, []))
    lines.append(f'| `{name}` | {source(name)} | S{group_ids[tuple(items)]} / {len(items)} | {axs or ("none" if name in axioms else "definition")} |')
for i, items in enumerate(groups, 1):
    lines += ['', (f'**S{i} ({len(items)}):** ' + ', '.join(f'[B{j}](#audit-b{j})' for j in parts[i-1])).rstrip()]
for j, (_, items) in enumerate(bundles, 1):
    lines += ['', f'<a id="audit-b{j}"></a>', '<details>', f'<summary>B{j}: {len(items)} shared definitions and types</summary>', '',
              ', '.join('`' + x + '`' for x in items), '', '</details>']
doc = cache / 'report.md'
doc.write_text('\n'.join(lines) + '\n')
(cache / 'report.json').write_text(json.dumps(records, indent=2) + '\n')
print(f'Wrote {doc}: {len(axioms)} theorems; no unexpected axioms.')
PY
