#!/usr/bin/env python3
"""Export native semantic screen variants for every certified persona/release.

Use one real world task per role and merge only that task's supplied FHIR
resources into its patient bundle. The native renderer owns all projections,
visibility, prefills, tab variants and alert probes. No program is rewritten.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
BINARY = ROOT / 'lean/.lake/build/bin/ehr'


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=Path('/tmp/vgi-present-persona-matrix'))
    parser.add_argument('--world', type=Path, default=ROOT / 'runs/world/2')
    parser.add_argument('--day', type=int, default=1)
    parser.add_argument('--check', action='store_true', help='Run the unchanged browser gate for all distinct trees, then receipt all files.')
    args = parser.parse_args()
    world = args.world.resolve()
    out = args.out.resolve()
    manifest = json.loads((world / 'manifest.json').read_text())
    index_path = ROOT / manifest['fixtures']['index']
    index = json.loads(index_path.read_text())
    patients = {patient['id']: index_path.parent / patient['file'] for patient in index['patients']}
    date = json.loads((world / f'state-day-{args.day}.json').read_text())['date']
    cases = []
    for persona, workflow in [('P1', 'W1'), ('P2', 'W3'), ('P3', 'W4'), ('P4', 'W5'), ('P5', 'W6')]:
        schedule = json.loads((world / f'day-{args.day}-{persona}.json').read_text())
        task = next(task for task in schedule['tasks'] if task['workflow'] == workflow)
        source = patients[task['patientId']]
        bundle = json.loads(source.read_text())
        resources = [entry['resource'] for entry in bundle['entry'] if 'resource' in entry]
        for resource in task['todayResources']:
            key = (resource['resourceType'], resource.get('id'))
            # Only identified resources replace an identified version of the same resource.
            if key[1]:
                resources = [old for old in resources if (old['resourceType'], old.get('id')) != key]
            resources.append(resource)
        bundle_path = out / 'inputs' / f'{persona}.bundle.json'
        user_path = out / 'inputs' / f'{persona}.user.json'
        context_path = out / 'inputs' / f'{persona}.context.json'
        role = json.loads((ROOT / f'programs/personas/{persona}.json').read_text())['role']
        write(bundle_path, {'resourceType': 'Bundle', 'entry': [{'resource': r} for r in resources]})
        write(user_path, {'id': f'presentation-review-{persona}', 'role': role})
        write(context_path, {'today': date, 'now': task['startMin'], 'receipts': [], 'record': []})
        for release in ['v1', 'v2', 'v3']:
            directory = out / 'ui' / release / persona
            directory.mkdir(parents=True, exist_ok=True)
            # Avoid retaining obsolete screen files when rerunning against a changed program.
            for old in directory.glob('*.json'):
                old.unlink()
            program = ROOT / f'releases/{release}/personas/{persona}.json'
            subprocess.run([str(BINARY), 'render-screens', '--ui', '--spec',
                str(ROOT / f'releases/{release}/spec.json'), '--program', str(program),
                '--fhir', str(bundle_path), '--user', str(user_path), '--context', str(context_path),
                '--out', str(directory)], cwd=ROOT, check=True, timeout=180)
            files = sorted(str(path) for path in directory.glob('*.json'))
            assert files, (release, persona)
            cases.append({'release': release, 'persona': persona, 'role': role,
                'sourceBundle': str(source.relative_to(ROOT)), 'task': task['id'],
                'programSha256': hashlib.sha256(program.read_bytes()).hexdigest(), 'files': files})
    write(out / 'manifest.json', {'world': str(world), 'day': args.day, 'date': date,
        'binarySha256': hashlib.sha256(BINARY.read_bytes()).hexdigest(), 'cases': cases})
    print(f'Exported {sum(len(case["files"]) for case in cases)} semantic variants across {len(cases)} persona/release cases.', flush=True)
    if args.check:
        files = [file for case in cases for file in case['files']]
        distinct = {}
        for file in files:
            distinct.setdefault(hashlib.sha256(Path(file).read_bytes()).hexdigest(), file)
        print(f'Checking {len(distinct)} byte-distinct trees, then all {len(files)} files under the identical browser context.', flush=True)
        env = {**os.environ, 'EHR_SCREEN_WORKERS': '1'}
        env.setdefault('EHR_SCREEN_CACHE_DIR', '/tmp/vgi-present-screen-cache')
        command = ['node', str(ROOT / 'app/scripts/screen-check.mjs'), '--ui']
        subprocess.run(command + list(distinct.values()), cwd=ROOT, env=env, check=True)
        # The existing gate verifies context + exact tree hashes before reusing a receipt.
        # Known-bad controls always run on both calls. No gate assertion is skipped.
        subprocess.run(command + files, cwd=ROOT, env=env, check=True)


if __name__ == '__main__':
    main()
