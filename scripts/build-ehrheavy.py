#!/usr/bin/env python3
"""Build the full-profile EhrHeavy closure sequentially in disk-backed scratch.

The release profile and its Lake outputs are untouched. A persistent --build-dir
under TMPDIR may be cached between runs; every source is refreshed before Lake
checks its traces. No generated clinical data or app assets are copied.
"""
import argparse
import fcntl
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time


def module_order(lean: Path, root: str) -> list[str]:
    order: list[str] = []
    seen: set[str] = set()

    def visit(module: str) -> None:
        if module in seen:
            return
        seen.add(module)
        source = lean.joinpath(*module.split('.')).with_suffix('.lean')
        if not source.is_file():
            return  # Toolchain imports are supplied by the pinned Lean installation.
        for dep in re.findall(r'^import\s+(\S+)', source.read_text(), re.MULTILINE):
            visit(dep)
        order.append(module)

    visit(root)
    return order


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build-dir', type=Path, help='Persistent scratch directory under TMPDIR')
    parser.add_argument('--target', default='EhrHeavy', help='One module to validate (default: EhrHeavy)')
    parser.add_argument('--memory-mb', type=int, default=10000,
                        help='Lean memory ceiling per process (default: 10000 MB, maximum: 10000)')
    args = parser.parse_args()
    if not 256 <= args.memory_mb <= 10000:
        parser.error('--memory-mb must be between 256 and 10000')
    tmp = Path(os.environ['TMPDIR']).resolve()
    repo = Path(__file__).resolve().parent.parent
    scratch = (args.build_dir or tmp / 'vgi-ehrheavy').resolve()
    if not scratch.is_relative_to(tmp) or scratch == tmp or scratch.is_relative_to(repo):
        parser.error('--build-dir must be a separate directory below TMPDIR')
    scratch.mkdir(parents=True, exist_ok=True)
    lock = (scratch / '.build.lock').open('a')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        parser.error('Another EhrHeavy build is using this scratch directory')
    lean = scratch / 'lean'
    lean.mkdir(parents=True, exist_ok=True)
    # Synchronize sources without importing a core-profile cache or stale removed modules.
    source_files = {p.relative_to(repo / 'lean') for p in (repo / 'lean').rglob('*.lean')
                    if '.lake' not in p.parts}
    for old in lean.rglob('*.lean'):
        if '.lake' not in old.parts and old.relative_to(lean) not in source_files:
            old.unlink()
    for relative in sorted(source_files):
        dest = lean / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        content = (repo / 'lean' / relative).read_bytes()
        if relative == Path('Ehr/Specs/Profile.lean'):
            content, count = re.subn(
                rb'def ruleProfile : RuleProfile := \.(?:core|full)',
                b'def ruleProfile : RuleProfile := .full', content)
            if count != 1:
                raise RuntimeError('Release profile changed; review the full-profile build setup')
        if not dest.exists() or dest.read_bytes() != content:
            dest.write_bytes(content)
    for name in ('lakefile.toml', 'lake-manifest.json', 'lean-toolchain'):
        shutil.copyfile(repo / 'lean' / name, lean / name)
    # Only scratch receives the ceiling. weakLeanArgs does not invalidate proof
    # artifacts when only this resource limit changes; source traces still do.
    lakefile = lean / 'lakefile.toml'
    configuration = lakefile.read_text()
    if re.search(r'^weakLeanArgs\s*=', configuration, re.MULTILINE):
        raise RuntimeError('Lake already configures weakLeanArgs; review the memory ceiling')
    lakefile.write_text(f'weakLeanArgs = ["-M{args.memory_mb}"]\n' + configuration)
    env = dict(os.environ, LEAN_NUM_THREADS='1')
    start = time.monotonic()
    modules = module_order(lean, args.target)
    if not modules or modules[-1] != args.target:
        parser.error(f'Unknown local module: {args.target}')
    print(f'Full profile: {lean}; {len(modules)} modules, sequential builds', flush=True)
    with (scratch / 'build.log').open('w') as log, (scratch / 'metrics.tsv').open('w') as metrics:
        metrics.write('module\tseconds\tpeak_rss_kib\texit_code\n')
        for module in modules:
            print(f'Building {module}', flush=True)
            measurement = scratch / 'module-time.txt'
            result = subprocess.run(['/usr/bin/time', '-f', '%e\t%M', '-o', str(measurement),
                                     'lake', 'build', module], cwd=lean, env=env,
                                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            elapsed, peak = measurement.read_text().strip().splitlines()[-1].split('\t')
            metrics.write(f'{module}\t{elapsed}\t{peak}\t{result.returncode}\n')
            metrics.flush()
            log.write(result.stdout)
            log.flush()
            for axioms in re.findall(r'depends on axioms:\s*\[([^]]*)\]', result.stdout):
                unexpected = set(re.findall(r'[A-Za-z_.][A-Za-z_0-9.]*', axioms)) - {
                    'propext', 'Classical.choice', 'Quot.sound'}
                if unexpected:
                    print(result.stdout, end='', flush=True)
                    raise RuntimeError(f'{module}: disallowed axioms {sorted(unexpected)}')
            # Keep replayed axiom evidence in the log, but keep the console concise.
            if result.returncode or re.search(r'warning:.*(sorry|declaration uses)', result.stdout):
                print(result.stdout, end='', flush=True)
                sys.exit(result.returncode or 1)
        evidence = (scratch / 'build.log').read_text()
        expected = set()
        for module in modules:
            source = lean.joinpath(*module.split('.')).with_suffix('.lean').read_text()
            expected.update(re.findall(r'^theorem\s+(bad\d{2}_\w+)', source, re.MULTILINE))
        if args.target == 'EhrHeavy':
            seeds = {f'bad{n:02}_not_satisfies' for n in [*range(1, 13), *range(14, 25)]}
            seeds.add('bad13_preop_not_satisfies')
            if not seeds <= expected:
                raise RuntimeError(f'Missing seed theorems: {sorted(seeds - expected)}')
        printed = set(re.findall(r"'Ehr\.Check\.(bad\w+)' (?:depends on axioms|does not depend)", evidence))
        if expected - printed:
            raise RuntimeError(f'Missing seed axiom evidence: {sorted(expected - printed)}')
    print(f'{args.target} passed ({len(modules)} modules, {time.monotonic() - start:.1f}s); '
          f'log: {scratch / "build.log"}', flush=True)


if __name__ == '__main__':
    main()
