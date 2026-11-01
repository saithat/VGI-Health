# Handoff: sim lane

Worktree `/home/saithat/Projects/VGI-sim`, branch `lane/sim`.

## Integrated snapshot

Merged `origin/main` at `f3dd0c2` as `3b7f786`, including the expanded legal
catalog and current interpreter/API. Simulator implementation is committed and
pushed in `c5eb99b` and `e7714df`. Every new commit has the requested co-author
trailer. No owner files were changed to bypass a rule.

The earlier implementation and finished T9 proofs remain; their contracts,
search spaces, persona model, CLI examples and trusted base are documented in
`lean/Ehr/Sim/README.md`. Exactness is within the reported full, goalDirected or
navigationDirected space, per joint task, never a global/day-wide optimum claim.

## Changes in this continuation

- Updated the obsolete refill regression: v1 now requires the requested `drug`
  and human `refillScheduleEligibility = notScheduleII` on approval. The popup
  floor uses that actual goal capture, including interactionRefill.
- Added `Sim/TaskContext.lean`: unchanged renewals resolve the current task's
  focused contained MedicationRequest from todayResources. Both patient
  references must match. Missing/ambiguous context cannot complete approval.
  No unrelated home medication or administration context is substituted.
- Denials use denyRefill and retain the typed denial reason. Modifications and
  Schedule II renewals use ordinary signOrders, preserving full prescription,
  controlled-drug, zero-refill and human-entry gates. Modification reasons are
  captured in refillNote. A known Schedule II drug never receives a false
  notScheduleII attestation.
- Earlier medication slots also capture the cross-artifact per-line fields
  required by Core.currentLineComplete before advancing, including the series
  earliest-fill field. An ordinary final line gets no unnecessary series goal.
- An undeclared goal element stops navigation early with an incomplete result.
  The known service case previously exceeded 30 seconds exploring the expanded
  catalog; it now reports the missing declarations in about four seconds.
  Successful-task action/navigation enumeration is unchanged.

## Verification

- `cd lean && lake build`: passes, 177 jobs.
- Full `lake check`: passes; only propext, Quot.sound, Classical.choice.
- `lake comparator`: passes all 18 trusted core statements.
- `python3 lean/Ehr/Sim/verify_proofs.py`: passes the explicit single/joint T9
  Comparator contracts. Only the temporary reference challenge has proof holes;
  finished simulator proofs have no sorry/admit/new axioms/native_decide.
- All named simulator theorems retain their #print axioms audits. Existing
  kernel-decided satisfiable/wrong-answer and joint-receipt examples pass.
- World build/lint/tests pass, 92 tests. Agent typecheck/lint/tests pass, 31 tests.
- App build and lint pass. Tests: 89 pass, one upstream inventory assertion
  fails because it expects 16 bad programs while content now supplies 24.
- Real day-one renewal, modification and denial fixture tasks complete, using
  approveRefill, signOrders and denyRefill respectively. The modification keeps
  its chosen metformin dose and reason. New Lean regressions cover captured-drug
  interaction acknowledgments, exact reasons, missing/ambiguous request context,
  Schedule II routing and line-advance requirements.
- Native minimum smoke: day-one P1 W1-001 is 44 clicks / 223 keystrokes;
  P3 W4-001 is 38 / 104 over two receipt-carry episodes. Both are certified exact
  in the explicitly reported navigationDirected space, not global optima.
- Fresh native ten-day sweep: 50 schedules, all 1284 tasks retained, 1271
  complete, exactly the same 13 service tasks incomplete. Zero floor violations
  across all eight metrics for completed tasks; zero interruption-retention
  violations. All five day-one persona replays are byte-identical at seed 123.
  Compact results and minimum examples are in `lean/Ehr/Sim/validation.json`.
  Reproduce with `python3 lean/Ehr/Sim/cli_smoke.py --days 10 --report /tmp/sim.json`.
  `--require-complete` intentionally still fails on the 13 baseline scenarios.

## Exactly what remains

1. **The original 13 early service scenarios remain incomplete.** Baseline
   `releases/v1/spec.json` still lacks orderKind/orderCode, and its composers
   cannot capture the requested imaging/procedure orders. v1.1/v2 support them.
   Content must add the two optional service declarations/composers to baseline
   v1 and regenerate releases, or world/content must align scenario timing
   without dropping requested work. All task IDs are retained in validation.json.
2. **CLI owner integration:** in `lean/Ehr/Cli/Sim.lean:minSchedule`, replace
   `let eps := episodes facts task.workflow task.choices` with
   `let eps := taskEpisodes facts task`. It is already imported through Policy.
   Persona simulation uses the new context; minimum search still needs this
   one-line adoption for unchanged renewals whose choices.orders is empty.
   Missing context cannot produce a false successful minimum.
3. **App owner inventory test:** update `app/tests/app.test.tsx:25` for the
   24 bad programs now supplied by content; retain the rendering assertions.

These are concrete requests in `docs/design/changes-requests.md` under
"Sim follow-up on merged catalog (2026-10-31)". The user explicitly restricted
edits to sim ownership plus requests; a narrow exception was requested but has
not been granted. No content, CLI or app owner files were edited locally.

No unfinished simulator proofs remain. Do not describe this snapshot as an
all-green project or claim all 1284 tasks complete while the three items above
remain.
