"""Replay exported failure manifests through the real native JSON API."""
import json
from pathlib import Path
import subprocess
import tempfile
ROOT = Path(__file__).resolve().parents[3]
paths = sorted((ROOT / 'programs/replays').glob('*.json'))
assert len(paths) == 8
manifests = [json.loads(p.read_text()) for p in paths]
with tempfile.TemporaryDirectory(prefix='vgi-content-replays-') as directory:
    batch = Path(directory) / 'cases.jsonl'
    with batch.open('w') as stream:
        for m in manifests:
            case = {'spec': json.loads((ROOT / m['specFile']).read_text()),
                    'program': json.loads((ROOT / m['programFile']).read_text()),
                    'facts': m['facts'], 'user': m['user'], 'events': m['events']}
            stream.write(json.dumps(case, separators=(',', ':')) + '\n')
    process = subprocess.Popen([str(ROOT / 'lean/.lake/build/bin/ehr'), 'run-batch', str(batch)],
                               stdout=subprocess.PIPE, text=True)
    assert process.stdout
    last = {}
    for line in process.stdout:
        step = json.loads(line)
        last[step['case']] = step
    assert process.wait() == 0
    for index, m in enumerate(manifests):
        result = last[index]
        assert result['index'] == len(m['events']) - 1, paths[index]
        assert result['state']['commits'] == [], paths[index]
        reason = result['result'].get('blocked', {}).get('reason', '')
        assert m['expectedReason'] in reason, (paths[index], reason)
        print(paths[index].stem + ': ' + reason)
print('All eight permanent feature failures replay through the native API.')
