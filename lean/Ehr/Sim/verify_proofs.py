#!/usr/bin/env python3
"""Compare T9 proofs against explicit contracts using Lean's Comparator.

Reference proof holes exist only in a temporary challenge, never the solution.
Run after building; this script runs Lake commands sequentially.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile

LEAN = Path(__file__).resolve().parents[2]
HEADER = "import Ehr.Sim.TaskMinimum\nnamespace Ehr.Sim.Comparator\nopen Ehr Ehr.Sim\n"
# Comparator expects these standard primitive declarations in both exports.
PRIMITIVES = """Quot Quot.mk Quot.lift Quot.ind propext Quot.sound Classical.choice
Nat.add Nat.sub Nat.mul Nat.pow Nat.gcd Nat.div Nat.mod Nat.beq Nat.ble Nat.land
Nat.lor Nat.xor Nat.shiftLeft Nat.shiftRight String.ofList Char.ofNat List
eagerReduce Nat String String.mk Char optParam autoParam semiOutParam outParam""".split()
SINGLE = """theorem single (ctx : Context) (obj : Objective) (start : State)
    (bound : Nat) (space : Option SearchSpace) (r : Minimum)
    (h : minimum ctx obj start bound space = some r) :
    ctx.done (runAll ctx.sp ctx.prog ctx.facts ctx.user .human start r.path) = true ∧
    (∃ t, Certificate.Run (realGraph ctx r.space obj) start r.path t r.cost) ∧
    (∀ es t n, Certificate.Run (realGraph ctx r.space obj) start es t n →
      ctx.done t = true → r.cost ≤ n) := """
JOINT = """theorem joint (contexts : List Context) (obj : Objective)
    (bound : Nat) (space : Option SearchSpace) (r : JointMinimum)
    (h : jointMinimum contexts obj bound space = some r) :
    (∃ t, Certificate.Run (realTaskGraph contexts r.space obj) (taskInitial contexts)
      r.path t r.cost ∧ taskDone contexts t = true) ∧
    (∀ es t n, Certificate.Run (realTaskGraph contexts r.space obj)
      (taskInitial contexts) es t n → taskDone contexts t = true → r.cost ≤ n) := """


def run(*args, **kwargs):
    return subprocess.run(args, cwd=LEAN, check=True, **kwargs)


def main():
    run("lake", "build", "Ehr.Sim.TaskMinimum")
    with tempfile.TemporaryDirectory(prefix="vgi-sim-comparator-") as directory:
        tmp = Path(directory)
        env = dict(os.environ)
        env["LEAN_PATH"] = str(tmp) + (":" + env["LEAN_PATH"] if env.get("LEAN_PATH") else "")
        for module, single, joint in [
            ("SimChallenge", "by sorry", "by sorry"),
            ("SimSolution", "by exact T9_minimum ctx obj start bound space r h",
             "by exact T9_jointMinimum contexts obj bound space r h"),
        ]:
            source = tmp / f"{module}.lean"
            source.write_text(HEADER + SINGLE + single + "\n" + JOINT + joint + "\nend Ehr.Sim.Comparator\n")
            run("lake", "env", "lean", f"--root={tmp}", "-o", str(source.with_suffix(".olean")), str(source), env=env)
            with (tmp / f"{module}.ndjson").open("w") as output:
                run("lake", "env", "leanexport", module, "--", "Ehr.Sim.Comparator.single", "Ehr.Sim.Comparator.joint", *PRIMITIVES, stdout=output, env=env)
        config = tmp / "comparator.json"
        config.write_text(json.dumps({
            "challenge_module": "SimChallenge", "solution_module": "SimSolution",
            "theorem_names": ["Ehr.Sim.Comparator.single", "Ehr.Sim.Comparator.joint"],
            "definition_names": [], "permitted_axioms": ["propext", "Quot.sound", "Classical.choice"],
        }))
        run("lake", "comparator", "--config", str(config),
            "--challenge-from-export", str(tmp / "SimChallenge.ndjson"),
            "--solution-from-export", str(tmp / "SimSolution.ndjson"))


if __name__ == "__main__":
    main()
