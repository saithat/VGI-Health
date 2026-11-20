#!/usr/bin/env python3
"""Print native checker verdicts for retained revisions without changing their records."""
import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads(path.read_bytes())


def check_run(binary, run, scratch):
    recorded = {t["id"]: t for t in read(run / "conformance.json")["targets"]}
    versions = sorted(p for p in (run / "programs").glob("*/v*.json")
                      if re.fullmatch(r"v\d+", p.stem))
    if not versions:
        raise ValueError(f"no retained programs in {run}")
    for path in versions:
        persona = path.parent.name
        case = f"{run.name}/{persona}/{path.stem}"
        program = read(path)
        bound = run / "certifications" / persona / path.stem
        if bound.exists():
            inputs = read(bound / "inputs.json")
            if inputs["program"] != program:
                raise ValueError(f"{case}: frozen program differs")
            spec = bound / "spec.json"
            canonical, prev = scratch / "canonical.json", scratch / "prev.json"
            canonical.write_text(json.dumps(inputs["canonical"]))
            prev.write_text(json.dumps(inputs["prev"]))
        else:
            release = ROOT / "releases" / program["specVersion"]
            spec = release / "spec.json"
            canonical = release / "personas" / f"{persona}.json"
            prev = path.with_name(f'v{max(0, program["version"] - 1)}.json')

        # The suite hashes the original program bytes and compact, ordered spec JSON.
        spec_json = json.dumps(read(spec), ensure_ascii=False, separators=(",", ":")).encode()
        if (hashlib.sha256(spec_json).hexdigest() != recorded[case]["specSha256"] or
                hashlib.sha256(path.read_bytes()).hexdigest() != recorded[case]["programSha256"]):
            raise ValueError(f"{case}: inputs differ from the retained conformance report")
        result = subprocess.run([binary, "check", "--spec", spec, "--canonical", canonical,
                                 "--program", path, "--prev", prev], capture_output=True, text=True)
        verdict = json.loads(result.stdout)
        if result.returncode == 0 and verdict == "ok":
            print(case, "ok", sep="\t")
        elif result.returncode == 1 and isinstance(verdict, dict) and "violation" in verdict:
            finding = verdict["violation"]
            print(case, finding["property"], finding["message"], sep="\t")
        else:
            raise RuntimeError(f"{case}: {result.stderr or result.stdout}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, default=ROOT / "lean/.lake/build/bin/ehr")
    parser.add_argument("runs", type=Path, nargs="+")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory() as directory:
        for path in args.runs:
            check_run(args.binary.resolve(), path, Path(directory))
