#!/usr/bin/env python3
"""Read-only R4/R6 audit of all release programs and retained revision bindings.

Uses the native Lean predicates independently, then the ordinary checker for
persona/retained deployment inputs. Frozen inputs and recordings are never
rewritten; historical missing policy fields use the documented hospital policy.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BINARY = ROOT / "lean/.lake/build/bin/ehr"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def invoke(args):
    run = subprocess.run([str(BINARY), *args], cwd=ROOT, text=True,
                         capture_output=True, timeout=120)
    if run.returncode not in (0, 1):
        raise RuntimeError(run.stderr or run.stdout)
    return json.loads(run.stdout)


def main():
    if not os.environ.get("TMPDIR"):
        raise RuntimeError("Set disk-backed TMPDIR")
    records = []
    with tempfile.TemporaryDirectory(prefix="context-navigation-") as scratch:
        scratch = Path(scratch)
        for version in ("v1", "v2", "v3"):
            spec = ROOT / f"releases/{version}/spec.json"
            for program in [ROOT / f"releases/{version}/canonical.json",
                            *sorted((ROOT / f"releases/{version}/personas").glob("P*.json"))]:
                records.append({"group": "release", "program": str(program.relative_to(ROOT)),
                                "spec": str(spec.relative_to(ROOT)),
                                "programSha256": digest(program), "specSha256": digest(spec),
                                "rules": invoke(["design-audit", "--spec", str(spec), "--program", str(program)])})
        for persona in ("P1", "P2", "P3", "P4", "P5"):
            folder = ROOT / f"runs/core-10day/certifications/{persona}"
            for revision in sorted(folder.glob("v*")):
                spec = revision / "spec.json"
                inputs = revision / "inputs.json"
                program = ROOT / f"runs/core-10day/programs/{persona}/{revision.name}.json"
                frozen = json.loads(inputs.read_text())
                if json.loads(program.read_text()) != frozen["program"]:
                    raise RuntimeError(f"{program}: differs from frozen inputs")
                canonical = scratch / "canonical.json"
                canonical.write_text(json.dumps(frozen["canonical"]))
                args = ["check", "--spec", str(spec), "--program", str(program), "--canonical", str(canonical)]
                if frozen.get("prev"):
                    previous = scratch / "previous.json"
                    previous.write_text(json.dumps(frozen["prev"]))
                    args += ["--prev", str(previous)]
                records.append({"group": "retained", "persona": persona, "revision": revision.name,
                                "program": str(program.relative_to(ROOT)), "spec": str(spec.relative_to(ROOT)),
                                "programSha256": digest(program), "specSha256": digest(spec),
                                "inputsSha256": digest(inputs),
                                "rules": invoke(["design-audit", "--spec", str(spec), "--program", str(program)]),
                                "combinedVerdict": invoke(args)})
        release = [r for r in records if r["group"] == "release"]
        retained = [r for r in records if r["group"] == "retained"]
        if len(release) != 18 or len(retained) != 33:
            raise RuntimeError(f"Incomplete matrix: {len(release)} releases, {len(retained)} retained")
        refused = [r for r in records if not all(r["rules"][k] for k in
                    ("contextRetained", "navigationLabelsHonest")) or r.get("combinedVerdict", "ok") != "ok"]
        print(json.dumps({"scope": "New specifications R4/R6, offline native audit; no certificates or recording writes",
                          "binarySha256": digest(BINARY), "summary": {"releasePrograms": len(release),
                          "retainedRevisions": len(retained), "refused": len(refused)},
                          "results": records}, indent=2))
        return 1 if refused else 0


if __name__ == "__main__":
    sys.exit(main())
