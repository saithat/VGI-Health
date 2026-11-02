#!/usr/bin/env python3
"""Replay all world-2 tasks using the public native simulator, one process at a time."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
BINARY = ROOT / 'lean/.lake/build/bin/ehr'
WORLD = ROOT / 'runs/world/2'
release_days = [(1, 'v1')] + [(day, release.replace('_', '.')) for release, day in json.loads((ROOT / 'world/releases.json').read_text()).items()]
schedules = sorted(WORLD.glob('day-*-P*.json'), key=lambda p: (int(p.name.split('-')[1]), p.name.split('-')[2]))
results = []
for path in schedules:
    schedule = json.loads(path.read_text())
    persona, day = schedule['persona'], schedule['day']
    release = max((start, release) for start, release in release_days if start <= day)[1]
    result = subprocess.run([str(BINARY), 'simulate', '--spec', str(ROOT / f'releases/{release}/spec.json'), '--program', str(ROOT / f'releases/{release}/personas/{persona}.json'), '--persona', str(ROOT / f'programs/personas/{persona}.json'), '--schedule', str(path), '--world', str(WORLD), '--seed', '7'], cwd=ROOT, capture_output=True, text=True, check=True, timeout=180)
    data = json.loads(result.stdout)
    assert sorted(t['task'] for t in data['tasks']) == sorted(t['id'] for t in schedule['tasks']), path
    incomplete = [t['task'] for t in data['tasks'] if not t['completed']]
    row = dict(day=day, persona=persona, release=release, tasks=len(data['tasks']), completed=len(data['tasks'])-len(incomplete), incomplete=incomplete)
    results.append(row)
    print(f"Day {day} {persona} ({release}): {row['completed']}/{row['tasks']}", flush=True)
summary = dict(schedules=len(results), tasks=sum(r['tasks'] for r in results), completed=sum(r['completed'] for r in results), binarySha256=hashlib.sha256(BINARY.read_bytes()).hexdigest(), results=results)
Path(os.environ.get('EHR_WORLD_REPORT', '/tmp/vgi-present-world.json')).write_text(json.dumps(summary, indent=2)+'\n')
assert summary['schedules'] == 50 and summary['tasks'] == 1284 and summary['completed'] == 1284, summary
print('World 2: 1,284/1,284 tasks complete across all 50 schedules.')
