#!/usr/bin/env python3
"""Check JSONL isolation/correlation and parity with one-shot native operations.
Fixture generation is separate: no Lake subprocess runs in this test.
"""
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
BINARY = str(ROOT / 'lean/.lake/build/bin/ehr')
fixture = json.loads(Path(sys.argv[1]).read_text())
request = fixture['tiny']
frames = [
    {'id': 'accepted', 'op': 'commit-check', 'input': request},
    {'id': 'bad-codec', 'op': 'commit-check', 'input': {}},
    {'id': 'facts', 'op': 'facts', 'input': {'bundle': request['currentBundle'], 'context': request['context']}},
    {'id': 'unsupported', 'op': 'write', 'input': {}},
]
shared = {'administrations': [], 'placements': []}
dose = {'administer': {'actor': 1, 'dose': {'patient': 7, 'order': 9, 'occurrence': 600}}}
frames.append({'id': 'dose', 'op': 'multi-step', 'input': {'state': shared, 'action': dose}})
lines = ['{', *[json.dumps(f) for f in frames], json.dumps(frames[0])]
proc = subprocess.run([BINARY, 'serve'], input='\n'.join(lines) + '\n', text=True, capture_output=True, check=True)
outputs = [json.loads(line) for line in proc.stdout.splitlines()]
assert len(outputs) == len(lines)
assert outputs[0]['id'] is None and 'error' in outputs[0]
for frame, output in zip(frames, outputs[1:]):
    assert output['id'] == frame['id']
assert 'error' in outputs[2] and 'error' in outputs[4]
assert outputs[5]['result']['changed'] is True
assert outputs[-1] == outputs[1]
for i in (0, 2):
    f = frames[i]
    once = subprocess.run([BINARY, f['op']], input=json.dumps(f['input']), text=True, capture_output=True, check=True)
    assert json.loads(once.stdout) == outputs[i + 1]['result']
facts = outputs[3]['result']['facts']
base = {'spec': request['spec'], 'program': request['program'], 'user': request['user'], 'facts': facts}
init = subprocess.run([BINARY, 'init'], input=json.dumps(base), text=True, capture_output=True, check=True)
state = json.loads(init.stdout)
steps = [{'id': i, 'op': 'step', 'input': {**base, 'state': state, 'event': e}}
         for i, e in enumerate(fixture['tinyEvents'])]
# Send dependent steps interactively to verify flushing before EOF.
with subprocess.Popen([BINARY, 'serve'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True) as child:
    for f in steps:
        f['input']['state'] = state
        child.stdin.write(json.dumps(f) + '\n')
        child.stdin.flush()
        output = json.loads(child.stdout.readline())
        assert output['id'] == f['id']
        once = subprocess.run([BINARY, 'step'], input=json.dumps(f['input']), text=True, capture_output=True, check=True)
        assert json.loads(once.stdout) == output['result']
        state = output['result']['state']
    child.stdin.close()
    assert child.wait(timeout=10) == 0
assert state == request['state']
print('PASS serve: malformed-line recovery, IDs, live flush, EOF, facts/commit/init/step parity, shared transition')
