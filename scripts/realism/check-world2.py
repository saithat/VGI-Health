#!/usr/bin/env python3
"""Replay the canonical persona views against every unchanged world-2 task."""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--out', default='/tmp/amb-world2.json')
parser.add_argument('--personas', default='P1,P2,P3,P4,P5')
args = parser.parse_args()
binary = ROOT / 'lean/.lake/build/bin/ehr'
rows = []
failures = []
for persona in args.personas.split(','):
    for day in range(1, 11):
        release = 'v1' if day < 4 else 'v2' if day < 7 else 'v3'
        schedule = ROOT / f'runs/world/2/day-{day}-{persona}.json'
        expected = len(json.loads(schedule.read_text())['tasks'])
        with tempfile.TemporaryFile(mode='w+') as stream:
            subprocess.run([str(binary), 'simulate', '--spec', release, '--program',
                f'releases/{release}/personas/{persona}.json', '--persona',
                f'runs/world/2/personas/{persona}.json', '--schedule', str(schedule),
                '--world', 'runs/world/2', '--seed', str(7000 + day)],
                cwd=ROOT, stdout=stream, stderr=subprocess.PIPE, check=True, timeout=180,
                env={**__import__('os').environ, 'LEAN_NUM_THREADS': '8'})
            stream.seek(0)
            result = json.load(stream)
        completed = sum(task['completed'] for task in result['tasks'])
        row = {'persona': persona, 'day': day, 'release': release, 'completed': completed, 'tasks': expected,
            'clicks': sum(task['clicks'] for task in result['tasks']),
            'klmDeciSec': sum(task['klmDeciSec'] for task in result['tasks'])}
        rows.append(row)
        if len(result['tasks']) != expected or completed != expected:
            failures.append({**row, 'failed': [task for task in result['tasks'] if not task['completed']],
                'complaints': result['complaints']})
        print(f'{persona} day {day}: {completed}/{expected}', flush=True)
summary = {'world': 'runs/world/2', 'release': 'v1 days 1-3; v2 days 4-6; v3 days 7-10',
    'completed': sum(row['completed'] for row in rows), 'tasks': sum(row['tasks'] for row in rows),
    'days': rows, 'failures': failures}
Path(args.out).write_text(json.dumps(summary, indent=2) + '\n')
print(f"Total: {summary['completed']}/{summary['tasks']}", flush=True)
raise SystemExit(1 if failures else 0)
