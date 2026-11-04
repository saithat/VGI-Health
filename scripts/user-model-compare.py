#!/usr/bin/env python3
"""Matched-workload bounded-user evidence; emits JSON to scratch, never edits data.

Each workload selects the first task of every represented workflow. Historical
comparisons use real adjacent deployed programs, after five training blocks on
before. First k days carry memory and age it; steady starts from a separate
copy trained on after (eight blocks), then replays the same dated workloads.
Thus steady is an operational warm reference, not an asymptotic fitted estimate.
Only tasks completed in every first/steady/expert replay enter cost differences.
"""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
COUNTS = ('clicks', 'scrolls', 'keystrokes', 'klmDeciSec')


def load(p):
    return json.loads(Path(p).read_text())


def fingerprint(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def workload(world, day, persona, all_tasks=False):
    schedule = load(world / f'day-{day}-{persona}.json')
    if all_tasks:
        return schedule
    seen = set()
    tasks = []
    for task in schedule['tasks']:
        if task['workflow'] not in seen:
            tasks.append(task)
            seen.add(task['workflow'])
    return {**schedule, 'tasks': tasks}


def dated(schedule, day):
    out = copy.deepcopy(schedule)
    out['day'] = day
    for task in out['tasks']:
        task['day'] = day
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--world', type=Path, default=ROOT / 'runs/world/2')
    parser.add_argument('--run', type=Path, default=ROOT / 'runs/core-10day-live')
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--seed', type=int, default=7)
    parser.add_argument('--k', type=int, default=2)
    parser.add_argument('--all-tasks', action='store_true', help='audit entire cold-start persona workdays')
    parser.add_argument('--templates-only', action='store_true', help='omit historical deploy comparison')
    args = parser.parse_args()
    if not 1 <= args.k <= 3:
        parser.error('--k must be 1..3 for the ten-day dated fixtures')
    if not os.environ.get('TMPDIR'):
        parser.error('set TMPDIR to disk-backed scratch')
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / 'summary.json').unlink(missing_ok=True)
    cases = []
    calls = 0
    binary = ROOT / 'lean/.lake/build/bin/ehr'
    binary_hash = fingerprint(binary)
    with tempfile.TemporaryDirectory(prefix='user-model-', dir=os.environ['TMPDIR']) as scratch:
        scratch = Path(scratch)

        def run(program_path, persona, schedule, memory=None, policy='bounded'):
            nonlocal calls
            calls += 1
            sp = load(program_path)['specVersion']
            schedule_file = scratch / 'schedule.json'
            schedule_file.write_text(json.dumps(schedule))
            cmd = [str(ROOT / 'lean/.lake/build/bin/ehr'), 'simulate', '--spec', sp,
                   '--program', str(program_path), '--persona', str(args.world / 'personas' / f'{persona}.json'),
                   '--schedule', str(schedule_file), '--world', str(args.world), '--seed', str(args.seed)]
            if policy:
                cmd += ['--policy', policy]
            if memory:
                (scratch / 'memory.json').write_text(json.dumps(memory))
                cmd += ['--memory-in', str(scratch / 'memory.json')]
            result = subprocess.run(cmd, cwd=ROOT, check=True, capture_output=True, text=True, timeout=240)
            output = json.loads(result.stdout)
            (args.out / f'call-{calls:03}.json').write_text(result.stdout)
            return output, result.stdout

        # Cold-discovery comparison across all existing persona templates.
        for release, day in [('v1', 1), ('v3', 7)]:
            for persona in ['P1', 'P2', 'P3', 'P4', 'P5']:
                prog = ROOT / 'releases' / release / 'personas' / f'{persona}.json'
                schedule = workload(args.world, day, persona, args.all_tasks)
                bounded, raw = run(prog, persona, schedule)
                if release == 'v1' and persona == 'P1':
                    again, repeated = run(prog, persona, schedule)
                    assert raw == repeated, 'same seed/input must reproduce exact bytes'
                    _, legacy = run(prog, persona, schedule, policy=None)
                    _, explicit = run(prog, persona, schedule, policy='expert')
                    assert legacy == explicit, 'default policy changed'
                cases.append(summarize(f'{release}/{persona}', bounded))
                print(json.dumps(cases[-1]), flush=True)

        deploys = []
        # Same-release nightly changes, using the actual next-day task sample.
        for before_v, after_v, day in ([] if args.templates_only else [(0, 1, 2), (1, 2, 3), (3, 4, 5)]):
            persona = 'P1'
            before = args.run / 'programs' / persona / f'v{before_v}.json'
            after = args.run / 'programs' / persona / f'v{after_v}.json'
            schedule = workload(args.world, day, persona)
            memory = None
            for _ in range(5):
                result, _ = run(before, persona, schedule, memory)
                memory = result['memory']
            snapshot = copy.deepcopy(memory)
            first = []
            for offset in range(args.k):
                result, _ = run(after, persona, dated(schedule, day + offset), memory)
                memory = result['memory']
                first.append(result)
            warm = copy.deepcopy(snapshot)
            for _ in range(8):
                result, _ = run(after, persona, schedule, warm)
                warm = result['memory']
            steady = []
            for offset in range(args.k):
                result, _ = run(after, persona, dated(schedule, day + offset), warm)
                warm = result['memory']
                steady.append(result)
            common = set(t['task'] for t in first[0]['tasks'])
            for result in first + steady:
                for arm in [result, result['expert']]:
                    common &= {t['task'] for t in arm['tasks'] if t['completed']}
            def total(results, arm=None):
                return sum(t['klmDeciSec'] * 100 for r in results
                           for t in (r[arm] if arm else r)['tasks'] if t['task'] in common)
            row = {'deploy': f'P1/v{before_v}->v{after_v}', 'day': day, 'k': args.k,
                   'matchedTasksPerDay': len(common), 'sampleTasksPerDay': len(schedule['tasks']),
                   'firstMs': total(first), 'steadyMs': total(steady),
                   'expertMs': total(first, 'expert'),
                   'relearningMs': total(first) - total(steady),
                   'misses': sum(e['misses'] for r in first for e in r['effort']),
                   'firstCompleted': [sum(t['completed'] for t in r['tasks']) for r in first],
                   'steadyCompleted': [sum(t['completed'] for t in r['tasks']) for r in steady]}
            deploys.append(row)
            print(json.dumps(row), flush=True)
        if fingerprint(binary) != binary_hash:
            raise SystemExit('native binary changed during comparison; discard mixed evidence')
        report = {'binarySha256': binary_hash, 'seed': args.seed, 'k': args.k, 'calls': calls,
                  'protocol': __doc__, 'comparisons': cases, 'deploys': deploys,
                  'byteDeterminism': True, 'defaultUnchanged': True,
                  'allTasks': args.all_tasks,
                  'completionParity': all(not r['completionRegressions'] for r in cases)}
        (args.out / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')
        if not report['completionParity']:
            raise SystemExit('bounded completion regressed; see named tasks in summary.json')


def summarize(name, result):
    common = {t['task'] for t in result['tasks'] if t['completed']} & {
        t['task'] for t in result['expert']['tasks'] if t['completed']}
    def costs(arm):
        return {key: sum(t[key] for t in arm['tasks'] if t['task'] in common) for key in COUNTS}
    return {'case': name, 'sampleTasks': len(result['tasks']), 'matchedTasks': len(common),
            'boundedCompleted': sum(t['completed'] for t in result['tasks']),
            'expertCompleted': sum(t['completed'] for t in result['expert']['tasks']),
            'bounded': costs(result), 'expert': costs(result['expert']),
            'effort': {key: sum(t[key] for t in result['effort'] if t['task'] in common)
                       for key in ['misses', 'searches', 'scannedItems', 'backtracks', 'mouseTravelUnits']},
            'expertTravelUnits': sum(n for task, n in result['expertTravelUnits'] if task in common),
            'completionRegressions': [t['task'] for t in result['expert']['tasks']
                                      if t['completed'] and t['task'] not in common],
            'ratio': (costs(result)['klmDeciSec'] / costs(result['expert'])['klmDeciSec'])
                     if costs(result['expert'])['klmDeciSec'] else None,
            'cognitiveMs': sum(t['cognitiveMs'] for t in result['effort'] if t['task'] in common),
            'helpRequests': sum(t.get('helpRequests', 0) for t in result['effort'] if t['task'] in common),
            'helpMs': sum(o['ms'] for o in result.get('observations', []) if o['task'] in common and o['kind'] == 'help'),
            'visualSearchMs': sum(o['ms'] for o in result.get('observations', []) if o['task'] in common and o['kind'] == 'search'),
            'assistance': result.get('assistance', []),
            'zeroLabelMatches': [h for h in result.get('assistance', []) if h['targetControl'] and not h['labelMatch']]}


if __name__ == '__main__':
    main()
