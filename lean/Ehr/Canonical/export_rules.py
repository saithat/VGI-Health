"""Audit the generated Lean exports, then regenerate catalog statistics/source mapping.

Run `cd lean && lake exe export-content`, then from the repo root:
`python lean/Ehr/Canonical/export_rules.py`. Never edit generated JSON or stats.
"""
from collections import Counter
import json
from pathlib import Path
import sys

SOURCE = Path(__file__).resolve().parents[3]
ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else SOURCE
rules = json.loads((SOURCE / 'docs/rules/catalog.json').read_text())
sp = json.loads((ROOT / 'releases/v1/spec.json').read_text())
p = json.loads((ROOT / 'programs/canonical/v1.json').read_text())
selected = [r for r in rules if r['fit'] == 'spec-data']
assert len(selected) == 124
feature_fits = {'core-feature:' + name for name in ('event-time-window', 'patient-predicate', 'value-validation', 'order-expiry-clock', 'structured-display')}
feature_rows = [r for r in rules if r['fit'] in feature_fits]
encoded_features = [r for r in feature_rows if r.get('encodedIn')]
assert len(feature_rows) == 181
assert len(encoded_features) == 155
for r in feature_rows:
    if not r.get('encodedIn'):
        assert r.get('encodingSkippedReason') and len(r['encodingSkippedReason']) > 80, r['id']
        continue
    assert r['featureEncoding'] and not r.get('encodingSkippedReason'), r['id']
    for obj in r['featureEncoding']:
        kind = obj['type']
        if kind in ('TemporalReq', 'ExpiryReq'):
            commit = next(c for c in sp['commits'] if c['id'] == obj['commit'])
            key = 'temporal' if kind == 'TemporalReq' else 'expiry'
            assert any(v['id'] == obj['id'] for v in commit[key]), (r['id'], obj)
        elif kind == 'Validation':
            assert next(e for e in sp['elements'] if e['id'] == obj['element']).get('validation'), (r['id'], obj)
        elif kind == 'EntryReq':
            assert any(e['commit'] == obj['commit'] and e['element'] == obj['element'] for e in sp['entries']), (r['id'], obj)
        elif kind == 'DisplayReq':
            assert any(d['info'] == obj['info'] and d['pinned'] for d in sp['displays']), (r['id'], obj)
# Every commit-bound payload is a top-level, always-visible readable component
# before its action. Actual payload values remain trusted adapter inputs.
for screen in p['screens']:
    for index, component in enumerate(screen['components']):
        kind = component['kind']
        if not isinstance(kind, dict) or 'button' not in kind or not isinstance(kind['button']['action'], dict):
            continue
        action = kind['button']['action']
        if 'commit' not in action:
            continue
        commit = action['commit']['commit']
        contract = next(c for c in sp['commits'] if c['id'] == commit)
        if contract.get('actionLabel'):
            assert component['label'] == contract['actionLabel'], (screen['id'], commit)
        for d in sp['displays']:
            if d['scope'] != {'commit': {'id': commit}}:
                continue
            assert any(i < index and c.get('parent') is None and c['visibility'] == 'always' and c['size'] != 'tiny'
                       and c['kind'] == {'panel': {'info': d['info']}}
                       for i, c in enumerate(screen['components'])), (screen['id'], d)


def when(s):
    return s if ' ' not in s else {s.split(' ', 1)[0]: {'cls': s.split(' ', 1)[1]}}

# Every proposed rule is present as actual exported data, with exact scope,
# allowed values, no receipt substitution and no new waiver.
for r in selected:
    assert r['encodedIn'] and not r.get('encodingSkippedReason'), r['id']
    data = r['proposedEncoding']
    for kind in ('elements', 'infos', 'commits', 'alerts'):
        for obj in data[kind]:
            assert any(x['id'] == obj['id'] for x in sp[kind]), (r['id'], kind, obj['id'])
    for entry in data['entries']:
        assert any(x['commit'] == entry['commit'] and x['element'] == entry['element']
                   and x['when'] == when(entry['when'])
                   and x['perOrderLine'] == entry['perOrderLine']
                   and x.get('allowed') == entry['allowed'] for x in sp['entries']), (r['id'], entry)
    for review in data['reviews']:
        assert any(x['commit'] == review['commit'] and x['info'] == review['info']
                   and x['when'] == when(review['when']) and x['mode'] == 'shownOnCommit'
                   and 'waivedBy' not in x for x in sp['reviews']), (r['id'], review)
for r in rules:
    assert r.get('encodedIn') or r.get('encodingSkippedReason'), r['id']
for version in ('v1.1', 'v2'):
    release = json.loads((ROOT / f'releases/{version}/spec.json').read_text())
    assert release['displays'] == sp['displays'], version
    for key in ('elements', 'infos', 'entries', 'reviews', 'alerts', 'commits'):
        assert release[key][:len(sp[key])] == sp[key], (version, key)

# The corpus counts rules/citations, not fields or a claim of full compliance.
sources = ['cms', 'ca-title22', 'ca-statutes', 'federal-rx', 'entrenched']
source_of = lambda r: Path(r['sourceLocations'][0]['file']).stem
source_table = '| Source | Existing | Added spec data | Law added | Entrenched added | Feature encoded | Core gap | Out of scope |\n|---|---:|---:|---:|---:|---:|---:|---:|\n'
for src in sources:
    rs = [r for r in rules if source_of(r) == src]
    n = lambda pred: sum(pred(r) for r in rs)
    source_table += f'| {src} | {n(lambda r: r["fit"] == "existing")} | {n(lambda r: r["fit"] == "spec-data")} | {n(lambda r: r["fit"] == "spec-data" and r["basis"] == "law")} | {n(lambda r: r["fit"] == "spec-data" and r["basis"] == "entrenched")} | {n(lambda r: r["fit"].startswith("core-feature") and bool(r.get("encodedIn")))} | {n(lambda r: r["fit"].startswith("core-feature") and not r.get("encodedIn"))} | {n(lambda r: r["fit"] == "out-of-scope")} |\n'
components = [c for s in p['screens'] for c in s['components']]
fields = [c for c in components if isinstance(c['kind'], dict) and 'field' in c['kind']]
by_id = {e['id']: e for e in sp['elements']}
friction = Counter(by_id[c['kind']['field']['element']]['friction'] for c in fields)
# Default derived Lean JSON uses `element`, verified above and through the parser.
actions = [c for c in components if isinstance(c['kind'], dict) and any(k in c['kind'] for k in ('button', 'macro'))]
seed_count = len(list((ROOT / 'programs/bad').glob('*.json')))
assert seed_count == 32
replay_count = len(list((ROOT / "programs/replays").glob("*.json")))
assert replay_count == 8
stats = '# Canonical v1 statistics\n\nGenerated by `lake exe export-content` followed by `python lean/Ehr/Canonical/export_rules.py`.\n\n'
stats += '| Measure | Actual |\n|---|---:|\n'
for label, value in [('Screens', len(p['screens'])), ('Field prompts', len(fields)), ('Actions', len(actions)),
                     ('All components', len(components)), ('Macros', len(p['macros'])),
                     ('Spec elements', len(sp['elements'])), ('Spec infos', len(sp['infos'])),
                     ('Commits', len(sp['commits'])), ('Entry requirements', len(sp['entries'])),
                     ('Review requirements', len(sp['reviews'])), ('Alert declarations', len(sp['alerts'])),
                     ('Temporal requirements', sum(len(c.get('temporal', [])) for c in sp['commits'])),
                     ('Durable expiry requirements', sum(len(c.get('expiry', [])) for c in sp['commits'])),
                     ('Structured display requirements', len(sp['displays'])),
                     ('Validated elements', sum(bool(e.get('validation')) for e in sp['elements'])),
                     ('Permanent bad programs', seed_count), ('Native feature replay inputs', replay_count)]:
    stats += f'| {label} | {value} |\n'
stats += '\nThe canonical blueprint has 45 screens: home plus W1–W7 groups of 9, 3, 7, 5, 6, 9 and 5 steps. All 87 former artifact-only screens are clinical sections; every original field/action binding and W1–W7 path remains. Counts include hidden optional fields, all fixed order-set rows, and repeated bindings across workflows.\n\n'
stats += '| Prompt friction | Instances |\n|---|---:|\n' + ''.join(f'| {k} | {friction[k]} |\n' for k in ('safety', 'compliance', 'accidental'))
stats += '\n| Alert tier | Spec declarations | UI instances |\n|---|---:|---:|\n'
alerts = {a['id']: a for a in sp['alerts']}
for tier in ('interruptive', 'passive', 'removable'):
    instances = sum(isinstance(c['kind'], dict) and 'alert' in c['kind'] and alerts[c['kind']['alert']['alert']]['tier'] == tier for c in components)
    stats += f'| {tier} | {sum(a["tier"] == tier for a in sp["alerts"])} | {instances} |\n'
stats += '\n## Catalog rule counts\n\n' + source_table
stats += '\n| Basis | Existing | Added data + features | Encoded total | Catalog total |\n|---|---:|---:|---:|---:|\n'
for basis in ('law', 'entrenched'):
    existing = sum(r['basis'] == basis and r['fit'] == 'existing' for r in rules)
    added = sum(r['basis'] == basis and bool(r.get('encodedIn')) and r['fit'] != 'existing' for r in rules)
    stats += f'| {basis} | {existing} | {added} | {existing + added} | {sum(r["basis"] == basis for r in rules)} |\n'
stats += f'\n{sum(bool(r.get("encodedIn")) for r in rules)} catalog rules have spec representations: 29 existing, all 124 spec-data rows and {len(encoded_features)} of the 181 newly qualifying feature rows. These count catalog citations, not fields or legal compliance certificates. The remaining {len(feature_rows) - len(encoded_features)} feature rows have precise AST/integration gaps, the 83 L-group core rows retain their individual reasons, and 139 rows remain outside the UI-checker boundary. No catalog row is silently skipped.\n\n'
stats += 'The new rules use current-version trusted event evidence, clinical observations, terminology tables, durable clocks and structured payloads. A human checkbox cannot substitute for external evidence. Numeric local policies for qualitative source deadlines are explicitly labeled. Required review/payload contracts are pinned before commit controls. Separate decline/release/stop/expired-prescription decision routes remain available.\n\n'
stats += 'Renderer/backend/source-row completeness, unsupported formulary tags and checker certification remain owning-lane dependencies (CR-15/CR-16). Existing naloxone education and every original safety step remain. Content walkthroughs use explicit synthetic record witnesses and human events; they do not certify external physical care or adapters.\n'
(ROOT / 'programs/canonical/STATS.md').write_text(stats)

mapping = '\n\n<!-- BEGIN GENERATED CATALOG ENCODINGS -->\n## Full catalog encoding map\n\nGenerated by `python lean/Ehr/Canonical/export_rules.py`; source-separated Lean definitions are under `lean/Ehr/Specs/Rules/`. Every added item’s docstring lists its catalog ids and Law/Entrenched label.\n\n'
mapping += source_table + '\n| Rule | Basis and citation | Element / info ids | Commit ids |\n|---|---|---|---|\n'
for r in selected:
    data = r['proposedEncoding']
    ids = sorted(set(x['id'] for k in ('elements', 'infos') for x in data[k]))
    commits = sorted(set(x['id'] for x in data['commits']))
    basis = 'Law: ' + r['citation'] if r['basis'] == 'law' else 'Entrenched: ' + r['entrenchedBecause'] + ' (' + r['citation'] + ')'
    mapping += f'| `{r["id"]}` | {basis.replace("|", "/")} | ' + ', '.join('`' + x + '`' for x in ids) + ' | ' + ', '.join('`' + x + '`' for x in commits) + ' |\n'
mapping += '\n### Five-feature pass\n\n| Rule | Representation or precise remaining gap |\n|---|---|\n'
for r in feature_rows:
    result = ', '.join('`' + x + '`' for x in r.get('encodedIn', [])) or r['encodingSkippedReason']
    mapping += f'| `{r["id"]}` | {result.replace("|", "/")} |\n'
mapping += '\nEncoding covers abstract content/visibility for one artifact. It does not prove all statutory applicability, physical care, authorization, external evidence truth, transmission, retention, or authentic payloads. CR-15/CR-16 name the remaining renderer/backend/formulary/checker dependencies. The old required naloxoneEducation flag is retained as stricter hospital policy; the new outcome enum does not remove it. Reused postOpDiet/adminSite/arrivalMode preserve their original policies and kinds.\n<!-- END GENERATED CATALOG ENCODINGS -->\n'
regulations = ROOT / 'docs/regulations.md'
if regulations.exists():
    text = regulations.read_text()
    if '<!-- BEGIN GENERATED CATALOG ENCODINGS -->' in text:
        text = text.split('<!-- BEGIN GENERATED CATALOG ENCODINGS -->')[0].rstrip()
    regulations.write_text(text.rstrip() + mapping)
print(f'Audited all {len(selected) + len(encoded_features)} added catalog encodings, release inheritance, {seed_count} seeds; regenerated statistics and source map.')
