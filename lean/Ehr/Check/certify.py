#!/usr/bin/env python3
"""Certify every release/persona and permanent bad fixture with the real CLI.

Replays use the public native interpreter with Check.replayFacts/replayUser.
Successful navigation replay does not imply semantic T7 violation evidence.
Exit 1 means the required certification matrix is not yet satisfied.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[3]
BINARY = ROOT / "lean/.lake/build/bin/ehr"


def digest(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def replay(spec, program, events):
    case = {
        "spec": spec, "program": program,
        "facts": {
            "patientId": "pt-replay",
            "identity": {"initials": "AB", "sex": "F", "ageYears": 40},
            "allergyVersion": 1, "allergyClasses": [], "medsVersion": 1,
            "currentMedClasses": [], "weightToday": [700, "kg"],
            "careGaps": [], "abnormalResult": False, "now": 600,
            "receipts": [], "record": [],
        },
        "user": {"id": "replay-user", "role": program["role"]},
        "events": events,
    }
    with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl") as batch:
        batch.write(json.dumps(case) + "\n")
        batch.flush()
        run = subprocess.run([str(BINARY), "run-batch", batch.name],
                             cwd=ROOT, capture_output=True, text=True, timeout=120)
    if run.returncode:
        raise RuntimeError(f"native replay failed: {run.stderr or run.stdout}")
    steps = [json.loads(line) for line in run.stdout.splitlines() if line.strip()]
    if len(steps) != len(events):
        raise RuntimeError("native replay returned an incomplete event sequence")
    # The public contract permits at most one final triggering click, whether
    # that click succeeds, blocks, or is ignored. Every preceding event is ok.
    prefix = steps[:-1] if events and "click" in events[-1] else steps
    valid = all(step["result"] == "ok" for step in prefix)
    return {"valid": valid, "eventCount": len(events),
            "results": [step["result"] for step in steps],
            "scope": "navigation replay; not a semantic violation proof"}


def main():
    cases = [(f"releases/{release}/personas/P{i}.json", "persona")
             for release in ("v1", "v1.1", "v2") for i in range(1, 6)]
    cases += [(f"releases/{release}/canonical.json", "baseline")
              for release in ("v1", "v1.1", "v2")]
    core, deferred = json.loads((ROOT / "lean/Ehr/Check/bad-program-profiles.json").read_text())
    expected = {f"programs/bad/{name}.json": prop for name, prop in core}
    cases += [(path, "bad") for path in expected]
    if "--bad-only" in sys.argv[1:]:
        cases = [(path, "bad") for path in expected]
    results = []
    for path, group in cases:
        program = json.loads((ROOT / path).read_text())
        release = program["specVersion"]
        sp = f"releases/{release}/spec.json"
        canonical = f"releases/{release}/canonical.json"
        args = [str(BINARY), "check", "--spec", sp,
                "--program", path, "--canonical", canonical]
        previous = {"v1.1": "v1", "v2": "v1.1"}.get(release)
        prev = path.replace(f"releases/{release}/", f"releases/{previous}/") if previous else None
        if prev:
            args += ["--prev", prev]
        run = subprocess.run(args,
                             cwd=ROOT, capture_output=True, text=True, timeout=120)
        verdict = json.loads(run.stdout)
        if not ((run.returncode == 0 and verdict == "ok") or
                (run.returncode == 1 and isinstance(verdict, dict) and "violation" in verdict)):
            raise RuntimeError(f"invalid CLI result for {path}: {run.stderr or run.stdout}")
        item = {"program": path, "group": group, "spec": sp,
                "programSha256": digest(path), "specSha256": digest(sp),
                "canonicalSha256": digest(canonical),
                "previous": prev, "exitCode": run.returncode, "verdict": verdict}
        if group == "bad":
            item["expectedProperty"] = expected[path]
            item["expectedPropertyRejected"] = (run.returncode == 1 and
                verdict["violation"]["property"] == expected[path])
            if not item["expectedPropertyRejected"]:
                raise RuntimeError(f"bad fixture did not fail expected property {expected[path]}: {path}: {verdict}")
        if run.returncode == 1:
            item["replay"] = replay(json.loads((ROOT / sp).read_text()), program,
                                    verdict["violation"]["counterexample"])
            if not item["replay"]["valid"]:
                raise RuntimeError(f"counterexample did not replay: {path}")
        results.append(item)
        print(f"{path}: {verdict if verdict == 'ok' else verdict['violation']['property']}", flush=True)
    if "--bad-only" in sys.argv[1:]:
        print(f"Core bad programs: {len(results)}/{len(expected)} rejected with expected properties and valid replays")
        return 0
    personas = [x for x in results if x["group"] == "persona"]
    bad = [x for x in results if x["group"] == "bad"]
    baselines = [x for x in results if x["group"] == "baseline"]
    report = {
        "sourceRevision": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "sourceDirty": bool(subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True).strip()),
        "binarySha256": digest(BINARY),
        "profile": "core",
        "fullProfileOnly": deferred,
        "baselineAccepted": sum(x["exitCode"] == 0 for x in baselines),
        "baselineCount": len(baselines),
        "personaAccepted": sum(x["exitCode"] == 0 for x in personas),
        "personaCount": len(personas),
        "badRejected": sum(x["exitCode"] == 1 for x in bad), "badCount": len(bad),
        "replayValidation": "Native run-batch with the checker's replay context; navigation only, not full T7.",
        "results": results,
    }
    output = ROOT / "lean/Ehr/Check/certification-report.json"
    output.write_text(json.dumps(report, indent=2) + "\n")
    verdicts = {x["program"]: {"status": "computed" if x["exitCode"] == 0 else "rejected",
                "sha256": x["programSha256"], "output": x["verdict"]} for x in results}
    for name in deferred:
        verdicts[f"programs/bad/{name}.json"] = {"status": "full-profile only"}
    artifact = {"checker": "lean ehr check", "profile": "core", "programs": verdicts}
    # The browser serves /verdicts.json from app/public; retain a root copy too.
    for path in [ROOT / "verdicts.json", ROOT / "app/public/verdicts.json"]:
        path.write_text(json.dumps(artifact, indent=2) + "\n")
    print(f"Baselines {report['baselineAccepted']}/{len(baselines)}")
    print(f"Personas {report['personaAccepted']}/{len(personas)}; bad rejected {report['badRejected']}/{len(bad)}")
    return 0 if all(x["exitCode"] == 0 for x in personas + baselines) and all(x["exitCode"] == 1 for x in bad) else 1


if __name__ == "__main__":
    raise SystemExit(main())
