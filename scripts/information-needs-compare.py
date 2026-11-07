#!/usr/bin/env python3
"""Small matched seeded information-needs comparison; writes scratch only.

Select the first task of each workflow per persona/day, plus the first task
containing insulin, warfarin, an antibiotic or an antihypertensive administration. The schedule
is fixed across arms. Report completion for every task; deltas use only tasks
completed in both arms. Browser pixel enrichment is a separate optional step.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PERSONAS = ('P1', 'P2', 'P3', 'P4', 'P5')


def load(path):
    return json.loads(Path(path).read_text())


def write(path, value):
    Path(path).write_text(json.dumps(value, indent=2) + '\n')


def workload(schedule):
    selected = []
    seen = set()
    for task in schedule['tasks']:
        ch = task['choices']
        drugs = [o['drug'] for o in ch['orders'] + ch['administer']]
        keys = {task['workflow']}
        keys.update(d for d in drugs if d.startswith('insulin ') or d == 'warfarin')
        keys.update('antibiotic' for d in drugs if d in ('amoxicillin', 'cephalexin', 'ceftriaxone', 'azithromycin', 'vancomycin'))
        keys.update('antihypertensive-admin' for o in ch['administer'] if o['drug'] in ('lisinopril', 'amlodipine'))
        if keys - seen:
            selected.append(task)
            seen.update(keys)
    return {**schedule, 'tasks': selected}


def summarize(cases):
    rows = []
    for persona in PERSONAS:
        group = [c for c in cases if c['persona'] == persona]
        sums = defaultdict(int)
        screens = Counter()
        patterns = Counter()
        incomplete = []
        for case in group:
            off, on = load(case['off']), load(case['on'])
            before = {t['task']: t for t in off['tasks']}
            after = {t['task']: t for t in on['tasks']}
            paired = {t for t in before if before[t]['completed'] and after[t]['completed']}
            sums['tasks'] += len(before)
            sums['pairedCompleted'] += len(paired)
            sums['offCompleted'] += sum(t['completed'] for t in before.values())
            sums['onCompleted'] += sum(t['completed'] for t in after.values())
            for task in before:
                if task not in paired:
                    incomplete.append({'day': case['day'], 'task': task, 'off': before[task]['completed'], 'on': after[task]['completed']})
            for key in ('clicks', 'scrolls'):
                sums[key] += sum(after[t][key] - before[t][key] for t in paired)
            # Ordinal travel is always explicitly distinct from browser pixels.
            if on.get('policy') == 'bounded':
                sums['travelUnits'] += sum(e['mouseTravelUnits'] for e in on['effort'] if e['task'] in paired) - sum(e['mouseTravelUnits'] for e in off['effort'] if e['task'] in paired)
            for lookup in on.get('information', []):
                if lookup['task'] in paired:
                    sums['memoryCarry'] += lookup['memoryCarry']
                    screens[lookup['screen']] += 1
                    trace = on['trace'][lookup['traceIndex']:]
                    destination = lookup.get('actionScreen') or next((t['screen'] for t in trace if t['task'] == lookup['task'] and t['screen'] != lookup['screen']), lookup['screen'])
                    patterns[f"{lookup['need']}: {lookup['screen']} -> {destination}"] += 1
        rows.append({'persona': persona, **sums, 'lookupScreens': dict(screens), 'patterns': dict(patterns), 'incomplete': incomplete,
                     'scrollPx': None, 'mouseTravelPx': None})
    return rows


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--world', required=True, type=Path)
    p.add_argument('--out', required=True, type=Path)
    p.add_argument('--seed', type=int, default=7)
    p.add_argument('--days', type=int, default=2)
    args = p.parse_args()
    if not 1 <= args.days <= 10 or args.seed < 0:
        p.error('--days must be 1..10 and --seed nonnegative')
    if not os.environ.get('TMPDIR'):
        p.error('set disk-backed TMPDIR')
    args.out.mkdir(parents=True, exist_ok=True)
    binary = ROOT / 'lean/.lake/build/bin/ehr'
    cases = []
    for day in range(1, args.days + 1):
        for persona in PERSONAS:
            schedule = workload(load(args.world / f'day-{day}-{persona}.json'))
            target = args.out / f'd{day}-{persona}'
            target.mkdir(exist_ok=True)
            write(target / 'schedule.json', schedule)
            program = ROOT / f'releases/v1/personas/{persona}.json'
            for arm in ('off', 'v1'):
                cmd = [str(binary), 'simulate', '--spec', 'v1', '--program', str(program),
                       '--persona', str(args.world / 'personas' / f'{persona}.json'),
                       '--schedule', str(target / 'schedule.json'), '--world', str(args.world),
                       '--seed', str(args.seed), '--policy', 'bounded', '--information-needs', arm]
                result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=180, check=True)
                (target / f'{arm}.json').write_text(result.stdout)
            # Explicit-off and omission must remain byte-identical.
            omitted = subprocess.run(cmd[:-2], cwd=ROOT, capture_output=True, text=True, timeout=180, check=True)
            if omitted.stdout != (target / 'off.json').read_text():
                raise RuntimeError(f'historical default changed: {day}/{persona}')
            cases.append({'day': day, 'persona': persona, 'world': str(args.world.resolve()),
                          'schedule': str(target / 'schedule.json'), 'program': str(program),
                          'off': str(target / 'off.json'), 'on': str(target / 'v1.json')})
            print(f'{day}/{persona}', flush=True)
    report = {'protocol': 'information-needs-v1', 'seed': args.seed, 'selection': __doc__,
              'binarySha256': hashlib.sha256(binary.read_bytes()).hexdigest(), 'cases': cases,
              'rows': summarize(cases), 'pixelStatus': 'not measured'}
    write(args.out / 'summary.json', report)
    print(json.dumps(report['rows'], indent=2))


if __name__ == '__main__':
    main()
