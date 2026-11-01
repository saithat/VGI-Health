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
  (`T9_minimum_real`), joint tasks (`T9_jointMinimum`, `T9_taskSearch`), generic
  lower-bound/replay certificate theorem, history
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

## Verified

Tested integration snapshot: merge `5383fc4`, including main `cccd64e` and
lean-core's typed choices/allowed-value contracts. No owner files were edited
locally to bypass a rule; prior-auth and app fixes came from their owners.

- `cd lean && lake build`: passes (157 jobs).
- Full `lake check`: passes, only propext, Quot.sound, Classical.choice.
- `lake comparator`: passes all 18 existing trusted core statements.
- `python3 lean/Ehr/Sim/verify_proofs.py`: passes Comparator for explicit single
  and joint T9 contracts. Challenge proof holes are temporary reference-only;
  the solution uses the finished T9 proofs and only the three standard axioms.
- All named simulator theorems have `#print axioms` audits. The joint receipt
  regression has independent episode optima totaling seven clicks, joint
  full/goalDirected five, navigationDirected seven. Unchecked resets cannot
  skip goals. Satisfiable/wrong-answer examples use kernel decide.
- World build/lint/tests: pass, 92 tests. Agent typecheck/lint/tests: pass,
  31 tests. App build/lint/tests: pass, 90 tests.
- Fresh native ten-day Synthea sweep: 50 schedules, 1284 tasks, 1271 complete,
  13 explicitly incomplete. Zero floor violations (all eight metrics for every
  completed task); zero interruption-retention violations. All five day-one
  persona replays are byte-identical at seed 123. Compact results are committed
  in `lean/Ehr/Sim/validation.json`; reproduce with `cli_smoke.py --days 10`.
- Real CLI minimum smoke: day-one P1 W1-001 has 39 clicks / 203 keystrokes;
  P3 W4-001 has 25 / 39 over two receipt-carry episodes. Both use the explicitly
  reported `navigationDirected` space, not a global optimum. Explicit original
  `goalDirected` on the large W1 task exceeded a 45-second smoke budget and was
  stopped; this is a timeout, not evidence of no completion. Both original
  directed and full searches pass the smaller kernel/native regressions.
- Single Bundle, array-of-Bundles and world manifest inputs produce identical
  DayResult for the same fixture task. Unrelated patient IDs are rejected.
  Fixture UUID and stable Synthea wristband tokens validate against the same
  first Patient selected by the renderer. No patient identity is overwritten.

## Exactly what remains

**Original sim handoff implementation and proofs: nothing left.**

Cross-lane issues are preserved in `docs/design/changes-requests.md`:

- The 13 P1/P5 service-order tasks on days 1–3 request fields absent from the
  validated v1 release. They remain incomplete; world/content must align the
  scenario timing or support those fields in the intended baseline release.
- The validated W7 UI has no explicit prescription-drug context for interaction
  alerts. Sim does not fabricate an administration or uncaptured drug.

Upstream advanced during this run: shared refs now name main `f3dd0c2`
(the expanded catalog) and lean-core `7e527f6` (clinical/payload/validation APIs).
Those later changes need a separate integration and renewed compatibility/replay
checks; they are not included in the tested `5383fc4` snapshot. The catalog's W7
drug capture may address the preceding request once integrated. Do not attribute
this handoff's green results to those newer sources.
