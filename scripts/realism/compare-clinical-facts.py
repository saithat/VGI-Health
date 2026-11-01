#!/usr/bin/env python3
"""Compare primitive clinical facts while separately allowing supporting-view data.

Both interpreters receive the same committed cohort and explicit as-of date.
Only supporting payloads, their bindings and record version aliases are omitted.
Direct allergy/medication versions and every other clinical value stay compared.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def project(binary, bundle, today):
    request = {"bundle": bundle, "context": {
        "today": today, "now": 0, "record": [], "receipts": []}}
    result = subprocess.run([str(binary), "facts"], input=json.dumps(request),
                            capture_output=True, text=True, check=True,
                            env={**os.environ, "LEAN_NUM_THREADS": "4"})
    return json.loads(result.stdout)["facts"]


def clinical(facts):
    result = {key: value for key, value in facts.items()
              if key not in ["infoPayloads", "artifactBindings", "record"]}
    result["record"] = sorted([key, value] for key, value in facts["record"]
                              if not key.endswith("Version"))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--before-binary", type=Path, required=True)
    parser.add_argument("--after-binary", type=Path,
                        default=ROOT / "lean/.lake/build/bin/ehr")
    parser.add_argument("--today", default="2026-11-02")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    cohort = []
    for folder in ["synthea", "synthetic-hospital"]:
        index = json.loads((ROOT / "fixtures" / folder / "index.json").read_text())
        cohort.extend((folder, patient) for patient in index["patients"])
    mismatches = []
    for folder, patient in cohort:
        bundle = json.loads((ROOT / "fixtures" / folder / patient["file"]).read_text())
        before = clinical(project(args.before_binary, bundle, args.today))
        after = clinical(project(args.after_binary, bundle, args.today))
        if before != after:
            mismatches.append({"cohort": folder, "file": patient["file"], "fields": [
                key for key in sorted(before.keys() | after.keys())
                if before.get(key) != after.get(key)]})
    report = {
        "today": args.today, "patients": len(cohort),
        "beforeBinarySha256": digest(args.before_binary),
        "afterBinarySha256": digest(args.after_binary),
        "scope": "Primitive clinical facts, including direct data versions; "
                 "supporting payloads/bindings and record version aliases excluded.",
        "mismatches": mismatches,
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n")
    print(f"Primitive clinical facts: {report['patients']} patients; {len(mismatches)} mismatches")
    if mismatches:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
