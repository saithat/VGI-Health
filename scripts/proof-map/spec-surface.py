"""Generate/check the trusted base using VerificationAudit.specSurface, never proofs."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / 'lean/spec-surface.json'


def roots():
    names = set()
    for file in ['comparator.json', 'Ehr/Check/comparator.json', 'Ehr/Check/completion-comparator.json']:
        config = json.loads((ROOT / 'lean' / file).read_text())
        names.update(config['theorem_names'])
        names.update(config.get('definition_names', []))
    audit = (ROOT / 'lean/Audit/SpecSurface.lean').read_text()
    names.update(re.findall(r'^#(?:spec_surface|audit_axioms)\s+(\S+)', audit, re.M))
    # Statements is the canonical challenge; verify the configured names cover it.
    statements = (ROOT / 'lean/Statements.lean').read_text()
    declared = {'Ehr.Proofs.' + n for n in re.findall(r'^theorem\s+(\S+)', statements, re.M)}
    assert declared == set(json.loads((ROOT / 'lean/comparator.json').read_text())['theorem_names'])
    return sorted(names)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    names = roots()
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        (tmp / 'roots.txt').write_text('\n'.join(names) + '\n')
        subprocess.run(['lake', 'env', 'lean', '--run', str(ROOT / 'scripts/proof-map/SpecSurface.lean'),
                        str(tmp / 'surface.json'), str(tmp / 'roots.txt')], cwd=ROOT / 'lean', check=True)
        decls = sorted(json.loads((tmp / 'surface.json').read_text()), key=lambda d: d['name'])
    data = {'schemaVersion': 1, 'roots': names,
            'declarations': [d['name'] for d in decls], 'locations': decls}
    text = json.dumps(data, indent=2, ensure_ascii=False) + '\n'
    if args.check:
        if not DEST.exists() or DEST.read_text() != text:
            raise SystemExit('lean/spec-surface.json is stale; run scripts/proof-map/build.sh --readme')
        print(f'Trusted base is current: {len(decls)} declarations, {len(names)} canonical roots')
    else:
        DEST.write_text(text)
        print(f'Wrote {DEST}: {len(decls)} declarations, {len(names)} canonical roots')


if __name__ == '__main__':
    main()
