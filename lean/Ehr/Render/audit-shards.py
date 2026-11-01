#!/usr/bin/env python3
"""Audit every original corpus index, four disjoint shards and one tested build."""
import hashlib
import json
import os
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[3]
directory = Path(sys.argv[1])
reports = [json.loads(Path(path).read_text()) for path in sys.argv[2:]]
with (directory / 'states.json').open() as source:
    total = len(json.load(source))
assert len(reports) == 4
assert {report['shardIndex'] for report in reports} == set(range(4))
indexes = []
for report in reports:
    assert report['shardCount'] == 4 and report['total'] == total
    assert report['stateIndices'] == list(range(report['shardIndex'], total, 4))
    indexes.extend(report['stateIndices'])
assert len(indexes) == total and sorted(indexes) == list(range(total))

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

wasm = digest(root / 'app/public/ehr/ehr-interp.wasm')
native = digest(os.environ.get('EHR_RENDER_NATIVE', root / 'lean/.lake/build/bin/ehr'))
bundles = len([p for p in (root / 'fixtures/synthea').glob('*.json') if p.name != 'index.json'])
assert {report['wasmSha256'] for report in reports} == {wasm}
assert {report['nativeSha256'] for report in reports} == {native}
assert {report['bundleCount'] for report in reports} == {bundles}
program = json.loads((directory / 'program.json').read_text())
print(json.dumps(dict(states=total, screens=len(program['screens']), shards=4,
                     syntheaBundles=bundles, completeDisjointCoverage=True,
                     wasmSha256=wasm, nativeSha256=native,
                     programSha256=digest(directory / 'program.json'),
                     specSha256=digest(directory / 'spec.json')), indent=2))
