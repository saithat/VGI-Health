#!/usr/bin/env python3
"""Check every world-2 task against its exported persona pre-set view."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
release_days = [(1, "v1")] + [(day, release.replace("_", "."))
    for release, day in json.loads((ROOT / "world/releases.json").read_text()).items()]
observed = {}
count = 0
for path in sorted((ROOT / "runs/world/2").glob("day-*-P*.json")):
    schedule = json.loads(path.read_text())
    release = max((day, release) for day, release in release_days if day <= schedule["day"])[1]
    persona = schedule["persona"]
    program = json.loads((ROOT / f"releases/{release}/personas/{persona}.json").read_text())
    workflows = {screen["workflow"] for screen in program["screens"]}
    for task in schedule["tasks"]:
        assert task["persona"] == persona
        assert task["workflow"] in workflows, (path, task["id"], task["workflow"])
        observed.setdefault(persona, set()).add(task["workflow"])
        count += 1
print(json.dumps({"tasks": count, "outsidePreset": 0,
    "taskWorkflows": {p: sorted(w) for p, w in sorted(observed.items())}}, indent=2))
