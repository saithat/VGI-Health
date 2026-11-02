#!/usr/bin/env python3
"""Exercise the compiled native JSON boundary without Medplum or credentials.

Run after `cd lean && lake build`; this script runs one sequential Lake command
to emit the Lean example, then invokes only the compiled ehr binary.
"""

import copy
import json
import os
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]
LEAN = ROOT / "lean"
ENV = {**os.environ, "LEAN_NUM_THREADS": "4"}


def invoke(payload):
    return subprocess.run(
        [str(LEAN / ".lake/build/bin/ehr"), "commit-check"],
        input=payload, text=True, capture_output=True, env=ENV, check=False,
    )


def run_case(name, request, reason=None):
    result = invoke(json.dumps(request))
    assert result.returncode == 0, (name, result.stderr)
    output = json.loads(result.stdout)
    if reason is None:
        assert output["accept"]["preconditions"] == [
            {"url": "Encounter/enc-1", "ifMatch": 'W/"7"'},
            {"url": "Patient/pt-1", "ifMatch": 'W/"3"'},
        ], (name, output)
        assert output["accept"]["state"]["commits"] == ["signOrders"]
    else:
        assert reason in output["reject"]["reason"], (name, output)
    print(f"PASS {name}")
    return output


def main():
    fixture = subprocess.run(
        ["lake", "env", "lean", "--run", "Ehr/Commit/Example.lean"],
        cwd=LEAN, env=ENV, text=True, capture_output=True, check=True,
    )
    request = json.loads(fixture.stdout)
    accepted = run_case("valid current record", request)

    cases = []
    changed = copy.deepcopy(request)
    changed["factsVersions"][0]["version"] = "old"
    cases.append(("stale display", changed, "stale facts versions"))
    changed = copy.deepcopy(request)
    del changed["currentBundle"]["entry"][0]["resource"]["meta"]
    cases.append(("missing version", changed, "missing or invalid version"))
    changed = copy.deepcopy(request)
    changed["currentBundle"]["entry"].append(copy.deepcopy(changed["currentBundle"]["entry"][0]))
    cases.append(("duplicate input", changed, "duplicate resource identity"))
    changed = copy.deepcopy(request)
    changed["patient"] = "other"
    cases.append(("wrong patient", changed, "patient mismatch"))
    changed = copy.deepcopy(request)
    changed["user"]["role"] = "rn"
    cases.append(("wrong role", changed, "role: rn"))
    changed = copy.deepcopy(request)
    changed["event"] = {"click": {"comp": "backButton"}}
    cases.append(("noncommit event", changed, "event must add exactly"))
    changed = copy.deepcopy(request)
    changed["state"] = accepted["accept"]["state"]
    cases.append(("post-commit state", changed, "supply before-state"))
    changed = copy.deepcopy(request)
    changed["currentBundle"]["link"] = [{"relation": "next", "url": "another-page"}]
    cases.append(("incomplete read", changed, "incomplete bundle"))
    changed = copy.deepcopy(request)
    changed["currentBundle"]["entry"][1]["resource"]["subject"]["reference"] = "Patient/other"
    cases.append(("foreign encounter", changed, "encounter subject mismatch"))
    changed = copy.deepcopy(request)
    changed["state"]["patientContext"] = {"patient": "other", "bound": "other", "activity": "", "query": ""}
    cases.append(("foreign session", changed, "state is not bound"))

    allergy = {
        "resourceType": "AllergyIntolerance", "id": "a1", "meta": {"versionId": "1"},
        "patient": {"reference": "Patient/pt-1"},
        "clinicalStatus": {"coding": [{"code": "active"}]},
        "code": {"text": "Penicillin"},
    }
    changed = copy.deepcopy(request)
    changed["currentBundle"]["entry"].append({"resource": allergy})
    cases.append(("new allergy with stale vector", copy.deepcopy(changed), "stale facts versions"))
    changed["factsVersions"].append({"url": "AllergyIntolerance/a1", "version": "1"})
    cases.append(("current allergy guard", changed, "interruptive alert acknowledgment required"))
    for name, changed, reason in cases:
        run_case(name, changed, reason)

    for name, payload in [("malformed JSON", "{"), ("missing fields", "{}")]:
        result = invoke(payload)
        assert result.returncode == 1, (name, result.returncode)
        assert "error" in json.loads(result.stdout), (name, result.stdout)
        print(f"PASS {name}")
    print(f"{len(cases) + 3} native CLI cases passed")


if __name__ == "__main__":
    main()
