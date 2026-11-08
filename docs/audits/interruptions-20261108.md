# Interrupting work and owned resumption — lane verification

Branch: `lane/interruptions`, based on `fbf4491e`. No push or changes to another
branch/worktree. Data, fixtures, programs, recordings and certificates were not
staged or rewritten. `CLAUDE.md` is absent.

Implementation commits: `22fd048f` (typed work, owned frames and revalidation),
`06b842d3` (measurement provenance, scenarios and dashboard). The subsequent
verification commit contains compilation fixes, snapshot refresh integration,
review-only schema routing, generated TypeScript and this report.

## Behavior and rules requiring owner review

- Native simulation defaults to `--interruptions realWork`; `fixedCost` retains
  the previous count/goal-position/wait/think stream. The native adapter exposes
  both modes independently of expert/bounded policy.
- Work has a patient, message, urgency, essential-care flag, original arrival
  timestamp and ordered identify/read/assess/respond-or-escalate/document steps.
  Invalid patient/message inputs cannot complete the protocol. This is external
  synthetic communication, without fabricated clinical UI events or receipts.
  Urgent notifications explicitly hand clinical follow-through to the responsible
  team; neither the communication log nor handover claims clinical resolution.
- Urgent work preempts at an event boundary; time-sensitive work preempts nursing
  and inpatient-pharmacy profiles; other prescribers queue it. Routine work queues.
  Clinical popups take precedence. Unserviceable queued work gets an explicit
  on-call handover at task close.
- A frame belongs to clinician, patient and task. Restoration also checks saved
  source identity, current source identity and any saved workspace binding.
  Position, values and pending confirmations survive. Current receipt rules remove
  stale evidence. Changed chart data clears alert acknowledgments and invalidates
  confirmations; existing guarded events must re-establish authority.
- Reorientation costs 3000 ms + 700 ms per captured entry + 1000 ms per pending
  confirmation. Incomplete clinical tasks explicitly discard unsent drafts with
  a reason, retaining their incomplete outcome. Handover conveys responsibility,
  without transferring sign authority or copying another clinician's draft.
- Fixed exposure windows, minute-bin arrival approximation, triage, kind mix,
  response content and all service/reorientation durations are provisional.
  Service chooses among arrived work at each protocol boundary; it cannot wait
  for future urgent work while routine work is available. Individual communication
  protocols are atomic; their steps do not support nested interruption.
  Named role/setting rates and primary observational citations are in README.
  These heterogeneous studies do not calibrate whole-shift behavior here.
- Arrival identity/timing/type/patient are drawn before UI execution from an
  independent seed/task/minute stream. Metadata records the profile, rate,
  exposure and offered stream. Closure waits for remaining offered work;
  `closureWaitMs` is excluded from active KLM effort and included in wall time.
- `refreshFacts` supplies scenario-time chart updates at episode entry and return;
  current planning and events use the refreshed snapshot. Foreign patient updates
  are rejected and elapsed receipt time retains its episode origin. Stock CLI
  inputs are immutable snapshots. Concurrent chart updates require a timeline
  provider; this lane does not invent source chart mutations.

## Theorems checked

All names below are in `Ehr.Sim.Resumption`.

| Statement | Scope |
|---|---|
| `resume_foreign_patient`, `resume_foreign_owner`, `resume_foreign_task`, `resume_foreign_source` | Any corresponding mismatch returns `none`. |
| `resume_source_identity` | Accepted restoration implies clinician/task/patient identity and matching saved/current source patients. |
| `revalidation_frame` | Preserves screen, history, slot, tabs, commits and each captured entry's element/slot/value/human authorship. |
| `resumed_receipt_current` | Every retained receipt satisfies the current clinician/version/time/role retention predicate. |
| `invalid_receipt_removed` | A receipt failing that predicate cannot survive revalidation. |
| `changed_draft_needs_confirmation` | Every retained entry is unconfirmed after a chart change. |
| `resumed_commit_guarded` | Every new commit from a revalidated interpreter state passes the full current commit guard. |
| `every_suspension_settled` | Finite settlement produces one explicit terminal record per supplied frame, preserving task/owner/patient. |
| `checkpoint_closes_queue` | The actual closing checkpoint leaves no deferred communication queued. |
| `queued_work_accounted` | Each deferred item consumed by the closing hook has an explicit patient-matched handover record. |
| `interrupting_patient_empty` | Opening the interrupting patient's workspace carries no captures or receipts from the saved frame. |

These are finite protocol/ledger guarantees, not unconditional scheduler fairness
or proof that all clinical care eventually finishes. Existing guard and receipt
specifications were not weakened. `emit_blocks_unanswered` now checks information
needs against the effective current snapshot, including scenario refreshes.

## Verification

Commands ran with `TMPDIR=/home/saithat/Projects/run-tmp`, `LEAN_NUM_THREADS=6`,
and `CI=true` for pnpm. Lake commands were sequential in this checkout.
Initial elaboration/test-fixture failures were corrected; results below refer to
passing invocations.

```sh
(cd lean && lake build)
(cd lean && lake build Ehr.Sim.Resumption.Tests)
(cd lean && lake env lean Ehr/Sim/Resumption/Proofs.lean)
(cd lean && lake env lean Ehr/Sim/Policy.lean)
(cd lean && lake exe gents)
(cd lean && lake build $(cat ../scripts/proof-map/extra-modules.txt))
scripts/proof-map/build.sh --readme
pnpm --filter agent typecheck
pnpm --filter app exec tsc -b
pnpm --filter app build
pnpm --filter app exec vitest run tests/interruptions.test.ts tests/workload.test.ts
pnpm --filter agent exec vitest run test/ehr-adapter.test.ts test/lean-types.test.ts
git diff --check
```

Results: full Lean build passed (529 jobs); resumption scenarios passed in that
build, including changed-source receipt rejection through the actual resumed
`emit`, expiry, foreign bindings, explicit abandonment, queue closure and both
policy completion paths. All 14 new theorems and the edited information guard
lemma use only `propext`, `Classical.choice`, `Quot.sound` (subsets thereof).
Type generation wrote 187 types and 42 samples. Extra proof-map targets passed;
the regenerated README map was already current (168 headline claims).
Agent/app TypeScript checks and app production build passed. Dashboard tests:
9/9; adapter/generated-schema tests: 19/19. Diff whitespace check passed.
Existing unrelated Lean linter warnings remain.

Native smoke used the first task of `runs/world/2/day-1-P1.json`, copied to
`$TMPDIR/interruptions-verification/task.json`. Exact native commands:

```sh
lean/.lake/build/bin/ehr simulate --spec releases/v1/spec.json \
  --program runs/core-10day/programs/P1/v0.json \
  --persona runs/world/2/personas/P1.json \
  --task "$TMPDIR/interruptions-verification/task.json" \
  --world runs/world/2 --seed 123 --interruptions fixedCost

# Each combination: SEED=123,885; POLICY=expert,bounded
lean/.lake/build/bin/ehr simulate --spec releases/v1/spec.json \
  --program runs/core-10day/programs/P1/v0.json \
  --persona runs/world/2/personas/P1.json \
  --task "$TMPDIR/interruptions-verification/task.json" \
  --world runs/world/2 --seed "$SEED" --interruptions realWork \
  --interruption-profile surgicalPhysician --policy "$POLICY"
```

The seed-123 fixed-cost output was byte-identical to output captured from the
pre-change native binary before rebuilding. That sample has zero historical
interruptions; the existing three-interruption Lean regression separately checks
all three legacy wait operators and completion. Both real-work arms complete,
execute every offered communication and retain identical offered streams. Seed
885 deliberately supplies an early urgent notification to exercise native
suspension, paid return and explicit clinical follow-through handover. Scratch
JSON, logs and summary remain under `$TMPDIR/interruptions-verification`.

Only dashboard production code and a dashboard test were changed under `app/`.
Shared clinical wire schemas were restored unchanged; metadata validation lives
in the dashboard extension and is reused by native recording readers. Local
Vite builds with the two dashboard integration points temporarily removed and
with final wiring both produced
`5b353f984eb1c9fd6279443290bb103e785bee8dbcbc80849371e28a3c19fb13`.
The final production build contains the restored final wiring. Thus this lane's
dashboard additions do not change the local app fingerprint. That local
fingerprint differs from the retained certified fingerprint documented in
README; this build is not replacement certification evidence.

## Merge regeneration and limits

No full re-certification, live stack, WASM rebuild, browser audit pair or new
recorded experiment ran, per the lane-specific owner instruction. No new
observational estimates were fitted and no entire shift is modeled by the
fixed UI-task exposure windows.

The merge must rebuild source-bound WASM/manifest and native bindings, run its
single sequential audit pair, and establish matching certificates/replay before
publishing changed recordings. Regenerate real-work day/baseline/no-agent task
measurements, staged information-needs timing, geometry-linked traces and
trajectories, train/validation summaries and dashboard aggregates. Keep historical
fixed-cost results as a separately labeled control. Existing world schedules,
FHIR fixtures and UI programs need no lane-specific regeneration. The local app
fingerprint difference from the retained build needs the merge's clean build and
binding checks, rather than an assumed certificate update.

Workload integration should supply actual clinician elapsed time to the
checkpoint and `refreshFacts` from its chart timeline, retaining scheduled task
origins for arrival generation. Absolute suspension/closure milliseconds are
already recorded. No scheduling implementation was copied into this lane.

Owner questions (one line each):

- Approve the documented ownership, reconfirmation, discard and responsibility-handover rules?
- Approve the provisional role/setting profiles, protected-popup triage and fixed-exposure closure policy for the first merged realism run?
- Should the retained recording remain the fixed-cost control while the merge creates separately labeled real-work measurements?
