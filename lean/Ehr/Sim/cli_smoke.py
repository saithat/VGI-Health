#!/usr/bin/env python3
"""Replay committed Synthea schedules through the real simulator CLI.

Build first. Defaults to day 1 for all personas; --days 10 covers the full run.
The report records incomplete tasks instead of hiding or dropping them.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import hashlib
import resource
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[3]
COUNTS = ("clicks", "keystrokes", "scrolls", "popups", "overrides", "searches", "backtracks", "klmDeciSec")


def check_schedule(job, args):
    """One read-only native replay, independent of every other schedule."""
    day, persona = job
    release_days = json.loads((ROOT / "world/releases.json").read_text())
    version = "v1" if day < release_days["v1_1"] else "v1.1" if day < release_days["v2"] else "v2"
    binary = str(args.binary.resolve())
    report = {"schedules": [], "incomplete": [], "floorViolations": [], "interruptionViolations": [], "determinism": True}
    schedule_path = args.world / f"day-{day}-{persona}.json"
    schedule = json.loads(schedule_path.read_text())
    program_path = ROOT / "releases" / version / "personas" / f"{persona}.json"
    program = json.loads(program_path.read_text())
    visible_workflows = {screen["workflow"] for screen in program["screens"]}
    assert all(task["workflow"] in visible_workflows for task in schedule["tasks"]), "task outside persona pre-set view"
    persona_path = args.world / "personas" / f"{persona}.json"
    cmd = [binary, "simulate", "--spec", version, "--program", str(program_path),
           "--persona", str(persona_path), "--schedule", str(schedule_path), "--world", str(args.world), "--seed", str(args.seed)]
    result = subprocess.run(cmd, cwd=ROOT, check=True, capture_output=True, text=True, timeout=args.timeout_seconds)
    output = json.loads(result.stdout)
    if day == 1:
        again = subprocess.run(cmd, cwd=ROOT, check=True, capture_output=True, text=True, timeout=args.timeout_seconds)
        report["determinism"] &= result.stdout == again.stdout
    completed = {t["task"]: t["completed"] for t in output["tasks"]}
    expected = {t["id"]: t["interruptions"] for t in schedule["tasks"]}
    assert len(completed) == len(output["tasks"]) == len(schedule["tasks"]), "missing or duplicate task results"
    assert completed.keys() == expected.keys(), "result task IDs do not match the schedule"
    for floor, actual in zip(output["floor"], output["tasks"], strict=True):
        if not actual["completed"]:
            report["incomplete"].append({"day": day, "persona": persona, "task": actual["task"],
                                          "complaints": [c for c in output["complaints"] if actual["task"] in c],
                                          "choices": next(t["choices"] for t in schedule["tasks"] if t["id"] == actual["task"]),
                                          "lastEvents": [e for e in output["trace"] if e["task"] == actual["task"]][-5:]})
            continue
        for metric in COUNTS:
            if floor[metric] > actual[metric]:
                report["floorViolations"].append({"task": actual["task"], "metric": metric, "floor": floor[metric], "actual": actual[metric]})
    waits = {task: 0 for task in completed}
    for event in output["trace"]:
        enter = event["event"].get("enter", {})
        cosign_wait = int("user" in enter.get("value", {}) and event.get("actor") != "simulated-attending")
        waits[event["task"]] += event["ops"].count("wait") - cosign_wait
    for task, count in waits.items():
        if completed[task] and count != expected[task]:
            report["interruptionViolations"].append({"task": task, "expected": expected[task], "actual": count})
    preop = [t["id"] for t in schedule["tasks"] if t["choices"].get("w6Step") == "preop"]
    row = {"day": day, "persona": persona, "release": version,
           "specSha256": hashlib.sha256((ROOT / "releases" / version / "spec.json").read_bytes()).hexdigest(),
           "personaSha256": hashlib.sha256(persona_path.read_bytes()).hexdigest(),
           "programSha256": hashlib.sha256(program_path.read_bytes()).hexdigest(),
           "scheduleSha256": hashlib.sha256(schedule_path.read_bytes()).hexdigest(),
           "preopTasks": preop, "incomplete": sum(not done for done in completed.values()), "tasks": len(completed), "completed": sum(completed.values()),
           "complaints": output["complaints"]}
    report["schedules"].append(row)
    print(f"day {day:02d} {persona}: {row['completed']}/{row['tasks']} complete", flush=True)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, default=ROOT / "lean/.lake/build/bin/ehr")
    parser.add_argument("--world", type=Path, default=ROOT / "runs/world/2")
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--days", type=int, default=1)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--selected-days", type=int, nargs="+")
    parser.add_argument("--require-complete", action="store_true")
    parser.add_argument("--personas", nargs="+", default=["P1", "P2", "P3", "P4", "P5"])
    parser.add_argument("--jobs", type=int, default=1, help="independent native schedule workers (never Lake workers)")
    parser.add_argument("--timeout-seconds", type=int, default=120, help="wall-clock budget per native process; independent of simulated clinical time")
    args = parser.parse_args()
    if args.jobs < 1 or args.timeout_seconds < 1:
        parser.error("--jobs and --timeout-seconds must be positive")
    # Same virtual-memory limit as ulimit -v 8000000, inherited by each native replay.
    resource.setrlimit(resource.RLIMIT_AS, (8_000_000 * 1024, 8_000_000 * 1024))
    report = {"world": str(args.world.resolve().relative_to(ROOT)) if args.world.resolve().is_relative_to(ROOT) else str(args.world.resolve()), "seed": args.seed,
              "binarySha256": hashlib.sha256(args.binary.read_bytes()).hexdigest(),
              "releaseDays": json.loads((ROOT / "world/releases.json").read_text()),
              "schedules": [], "incomplete": [], "floorViolations": [], "interruptionViolations": [], "determinism": True}
    jobs = [(day, persona) for day in (args.selected_days or range(1, args.days + 1)) for persona in args.personas]
    # Threads only orchestrate independent native subprocesses; no worker runs
    # Lake or writes the report. map retains deterministic day/persona ordering.
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        for part in pool.map(lambda job: check_schedule(job, args), jobs):
            for key in ("schedules", "incomplete", "floorViolations", "interruptionViolations"):
                report[key].extend(part[key])
            report["determinism"] &= part["determinism"]
            if args.report:
                args.report.write_text(json.dumps(report, indent=2) + "\n")
    report["summary"] = {"schedules": len(report["schedules"]),
                         "tasks": sum(s["tasks"] for s in report["schedules"]),
                         "completed": sum(s["completed"] for s in report["schedules"]),
                         "incomplete": len(report["incomplete"])}
    if args.report:
        args.report.write_text(json.dumps(report, indent=2) + "\n")
    assert report["determinism"], "non-deterministic simulation"
    assert not report["floorViolations"], report["floorViolations"]
    assert not report["interruptionViolations"], report["interruptionViolations"]
    print(f"Verified {len(report['schedules'])} schedules; incomplete: {len(report['incomplete'])}", flush=True)
    if args.require_complete and report["incomplete"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
