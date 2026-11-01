# Handoff: sim lane

Worktree `/home/saithat/Projects/VGI-sim`, branch `lane/sim`.

## Implemented

All implementation items from the previous handoff are present:

- Typed, spec-derived clinical goals; persona SplitMix64/FNV-1a streams;
  shortest-path navigation through the actual interpreter, including shared
  composers across workflow labels; hotkeys, confirmations, reviews, popups,
  scrolling, search, detours, fixed paired interruptions, fuel/retry bounds and
  complaints. W4 medication/assessment and W5 vaccine/note episodes are distinct.
- Pure trace effort metrics and a program-independent ideal floor. Optional
  legal waivers are not mandatory floor items. Final alert expectations use
  actual goal captures, not uncaptured proposed orders. Explicit pain and
  refill dose/reason choices are captured; unsupported values are complaints.
- Exact certificate-checked joint-task minimum clicks and keystrokes with
  separate paths. `full`, the handoff's `goalDirected` (all non-entry choices),
  and faster `navigationDirected` (BFS navigation) remain separate, selectable,
  explicitly reported spaces. Auto preflights large programs to the last space.
  No global optimum is claimed for restricted spaces. Multi-episode tasks are
  searched jointly, preserving receipt effects, with zero-cost resets allowed
  only after the previous episode's goals complete. `exact:true` refers to the
  declared space, with explicit per-episode paths. Day-wide optimization is not
  claimed. See `lean/Ehr/Sim/README.md` for the exact model.
- T9 for the public fallback function (`T9_minimum`) and real interpreter runs
  (`T9_minimum_real`), joint tasks (`T9_jointMinimum`, `T9_taskSearch`), generic lower-bound/replay certificate theorem, history
  equivalence including macros, kernel-decided satisfiable and wrong-answer
  examples. All named simulator theorems are audited in Sim/Audit.lean.
  No unfinished simulator proofs, sorry, admits, new axioms or native_decide.
- Exact agent CLI flags: simulate uses spec/program/persona/schedule/world/seed;
  min-clicks uses spec/program/schedule/world and prints `{tasks:[...]}`.
  Version names resolve to releases/<ver>/spec.json. Legacy --task and --fhir
  aliases also work. Render's FHIR parser handles fixtures after Synthea fullUrl
  IDs are materialized and today's resources are merged without future leakage.
  Precomputed Facts are only a fallback. P1-P5 parameter files are committed.
- Regression guards for determinism, floor inequalities, canonical W1,
  redundant-prompt removal in simulation and search, scan zero weights,
  receipts, waivers, typed choices, shared composers and retained interruptions.
  `cli_smoke.py` exercises committed Synthea schedules and records incomplete
  tasks rather than silently dropping them.

Merged main, lean-core (typed choices and updated alert/prior-auth actions),
content releases/role projections, and the world lane's full typed Synthea run.
Earlier simulator milestones: 83879a1 (policy/metrics), a467aab (certificate/CLI),
9336093 (typed episodes/content), 6d29b3c (world integration).

## Verification in progress

- Full `cd lean && lake build`: passes (157 jobs).
- All named sim theorems audit with only propext, Quot.sound, Classical.choice.
- Exported single/joint T9 proofs pass the independent kernel checker.
- Existing repository Comparator passes its 18 trusted core statements.
- Agent typecheck/lint/tests pass (31 tests); app build/lint/tests pass (90).
- Joint receipt regression: independent episode optima sum to seven clicks,
  joint full/goalDirected need five, navigationDirected needs seven. Resets
  cannot skip goals; satisfiable joint theorem instances use kernel decide.
- Main's prior-auth and app fixture fixes resolve the old owner blockers.
  The obsolete proposed patch is removed; no pending approval is needed.

## Exactly what remains

Finish the fresh ten-day CLI replay and minimum CLI smoke tests, run world
build/lint/tests after the full kernel check finishes, and record final results.
No simulator implementation or theorem remains unfinished. Cross-lane service
versioning and W7 refill prescription-context gaps are in changes-requests.md.
