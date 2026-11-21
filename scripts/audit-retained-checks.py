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


def verdict(binary, program, spec, canonical, prev=None):
    args = [binary, "check", "--spec", spec, "--canonical", canonical, "--program", program]
    if prev is not None:
        args.extend(["--prev", prev])
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode in (0, 1):
        value = json.loads(result.stdout)
        if result.returncode == 0 and value == "ok":
            return ("ok",)
        if result.returncode == 1 and isinstance(value, dict) and "violation" in value:
            finding = value["violation"]
            return finding["property"], finding["message"]
    raise RuntimeError(f"{program}: {result.stderr or result.stdout}")


def check_vendors(binary, run, scratch):
    # Baselines have no previous revision. Use the persona and spec that
    # the recording actually bound, including when a release name was reused.
    bindings = {}
    for inputs_path in sorted((run / "certifications").glob("*/v*/inputs.json")):
        inputs = read(inputs_path)
        persona = inputs_path.parent.parent.name
        key = persona, inputs["specVersion"]
        spec = inputs_path.with_name("spec.json")
        if key in bindings:
            old_spec, old_canonical = bindings[key]
            if read(old_spec) != read(spec) or read(old_canonical) != inputs["canonical"]:
                raise ValueError(f"{run}/{persona}: conflicting vendor bindings for {key[1]}")
        else:
            canonical = scratch / f"canonical-{len(bindings)}.json"
            canonical.write_text(json.dumps(inputs["canonical"]))
            bindings[key] = spec, canonical

    cache = {}
    baselines = sorted((run / "baselines").glob("day-*/*.program.json"))
    if not baselines:
        raise ValueError(f"no vendor baselines in {run}")
    for path in baselines:
        key = path.name.removesuffix(".program.json"), read(path)["specVersion"]
        if key not in bindings:
            raise ValueError(f"{path}: missing frozen vendor binding for {key}")
        spec, canonical = bindings[key]
        digest = key, hashlib.sha256(path.read_bytes()).digest()
        if digest not in cache:
            cache[digest] = verdict(binary, path, spec, canonical)
        print(f"{run.name}/{path.relative_to(run)}", *cache[digest], sep="\t")


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
        print(case, *verdict(binary, path, spec, canonical, prev), sep="\t")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, default=ROOT / "lean/.lake/build/bin/ehr")
    parser.add_argument("--vendors", action="store_true", help="check daily vendor baselines against frozen bindings")
    parser.add_argument("runs", type=Path, nargs="+")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory() as directory:
        for path in args.runs:
            audit = check_vendors if args.vendors else check_run
            audit(args.binary.resolve(), path, Path(directory))
