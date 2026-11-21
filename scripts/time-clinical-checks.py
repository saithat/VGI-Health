#!/usr/bin/env python3
"""Compare native check wall time on release controls without writing run data."""
import argparse
import statistics
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def measure(binary, spec, program, prev, expected):
    args = [binary, "check", "--spec", spec, "--canonical", program, "--program", program]
    if prev:
        args += ["--prev", prev]
    start = time.perf_counter()
    run = subprocess.run(args, cwd=ROOT, capture_output=True, timeout=120)
    elapsed = 1000 * (time.perf_counter() - start)
    if run.returncode != expected:
        raise RuntimeError(f"{program}: {run.stdout!r} {run.stderr!r}")
    return elapsed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("before", type=Path)
    parser.add_argument("after", type=Path)
    args = parser.parse_args()
    binaries = [args.before.resolve(), args.after.resolve()]
    print("release\tprogram\tbefore_ms\tafter_ms\tchange_pct", flush=True)
    for version in range(1, 4):
        release = ROOT / "releases" / f"v{version}"
        for label in ["canonical", *(f"personas/P{i}" for i in range(1, 6))]:
            program = release / (label + ".json")
            mixed = label == "canonical"
            previous = None if mixed else release.parent / f"v{max(1, version - 1)}" / program.relative_to(release)
            samples = [[], []]
            # Discard one warm-up per executable, alternate order for seven pairs.
            for pair in range(8):
                for index in ([0, 1] if pair % 2 == 0 else [1, 0]):
                    elapsed = measure(binaries[index], release / "spec.json", program, previous, int(mixed))
                    if pair:
                        samples[index].append(elapsed)
            before, after = map(statistics.median, samples)
            print(f"v{version}\t{label}\t{before:.1f}\t{after:.1f}\t{100 * (after / before - 1):+.1f}", flush=True)


if __name__ == "__main__":
    main()
