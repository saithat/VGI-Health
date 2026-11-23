# Layout change policy

Layout movement has no separate charge or displacement limit. Daily net saving equals expert gross click-plus-scroll saving and must reach five actions. Completion, the 2% key/time caps, bounded click/scroll holds and bounded-clinician relearning replay remain in force. The alert budget, context requirements, screen rules and R3 copy caps are unchanged.

## Compatibility

`design.stabilityBudget` remains an unused serialized field in Lean, the JSON codec, release specifications and TypeScript validators/types. Removing it would change decode/re-encode bytes for frozen specs, certificate hashes and archived fixtures. Retaining that compatibility surface avoids rewriting historical evidence or changing certified app fixtures. Its equality in `Spec.Extends` preserves legacy metadata; no layout check reads its value. `componentsMoved` and `stabilityOk` remain informational legacy decision fields. The older proposal loop keeps its baseline 5% simulated login-revert probability, with no movement-dependent increment.

New runs bind `hillclimb.objective = "gross-actions-v1"`; session replies use version 3. `net` and `bestNet` keep their JSON names and contain gross daily saving. New-policy resume and replay preserve command comparisons. Historical recordings remain readable, but manifests without this objective require their original revision for execution; the current code refuses to silently apply new scoring to an old run. No historical records or certificates were rewritten.

## Counts and retained evidence

| Measure | Before | After |
|---|---:|---:|
| Executable checker rules | 33 | 31 |
| Distinct checker property names | 23 | 23 |
| Headline screen properties (including popup budget) | 13 | 13 |
| Certification personas accepted | 15 | 15 |
| Certification bad programs rejected | 38 | 38 |
| Canonical conformance scenarios | 202 | 202 |
| Retained revisions accepted | 28 | 28 |
| Retained revisions refused by navigation | 5 | 5 |

The read-only checker audit used all 33 frozen program/spec/canonical/previous-program bindings. Before/after TSV output is identical, including refusal messages. No retained simulation, conformance replay or recertification was performed.

## Changes by file

Deleted-line counts below are `git diff --numstat` against the pre-change revision, including replaced lines and documentation. They are not counts of removed requirements. Entirely deleted files are included.

| File | Deleted lines | Change |
|---|---:|---|
| `README.md` | 2 | Updated user-facing policy overview |
| `agent/src/fake/ehr-fake.ts` | 6 | Fake checker movement-budget refusal |
| `agent/src/harness/night-provider.ts` | 0 | Added objective metadata; no rule removed |
| `agent/src/hillclimb.ts` | 21 | Identity movement cap, switch-cost subtraction and movement reply field; session reply version advanced |
| `agent/src/manual.ts` | 2 | R7 instructions and movement-budget wording |
| `agent/src/modes.ts` | 1 | Movement input to simulated login response |
| `agent/src/night.ts` | 4 | Movement-dependent login-revert probability; flat 5% baseline remains |
| `agent/src/program.ts` | 3 | Obsolete enforcement comments; informational movement count remains |
| `agent/src/prompts.ts` | 2 | Movement budget instructions |
| `agent/src/run.ts` | 0 | Added policy binding and explicit historical resume/replay refusal |
| `agent/src/schema.ts` | 1 | Obsolete enforcement comment; historical decision schema remains readable |
| `agent/src/switch-cost.ts` | 57 | Entire unused movement charge implementation and interfaces |
| `agent/test/hillclimb.test.ts` | 5 | Obsolete prompt hash; added gross-score boundary/rearrangement cases |
| `agent/test/movement-native.test.ts` | 29 | Entire obsolete R7-only retained regression |
| `agent/test/resume.test.ts` | 4 | Old-policy resume assumption; now checks explicit incompatibility |
| `app/src/browser/revision-diff.ts` | 1 | Obsolete movement-budget explanation |
| `docs/design/core-model.md` | 2 | Updated current policy wording or identified historical workflow evidence |
| `docs/design/metric-gaming.md` | 56 | Updated current policy wording or identified historical workflow evidence |
| `docs/design/workflow-calibration.md` | 1 | Updated current policy wording or identified historical workflow evidence |
| `docs/design/workflow-sources/code-assumptions.json` | 2 | Updated current policy wording or identified historical workflow evidence |
| `docs/methods/discovery-and-cadence.md` | 0 | Updated current policy wording or identified historical workflow evidence |
| `docs/methods/hillclimb-night.md` | 5 | Updated current policy wording or identified historical workflow evidence |
| `docs/methods/interaction-validation.md` | 16 | Updated current policy wording or identified historical workflow evidence |
| `docs/methods/learnability-validation.md` | 1 | Updated current policy wording or identified historical workflow evidence |
| `docs/methods/tailoring-sessions.md` | 0 | Updated current policy wording or identified historical workflow evidence |
| `docs/proof-map.md` | 1 | Regenerated property theorem count: 26 to 23; movement-only declarations removed from compiled map |
| `lean/Ehr.lean` | 1 | Import of movement-only regression |
| `lean/Ehr/Check/BudgetSound.lean` | 3 | Movement conjunct from budget proof; popup guarantee preserved |
| `lean/Ehr/Check/Check.lean` | 20 | StabilityBudget and CopyStability executable rules and explanations |
| `lean/Ehr/Check/ContextSound.lean` | 3 | Deleted-rule tuple slots; theorem statements preserved |
| `lean/Ehr/Check/CopySound.lean` | 9 | CopyStability guarantee and axiom print; CopyBudget guarantee preserved |
| `lean/Ehr/Check/CopyTests.lean` | 9 | Tight-budget and added-copy-charge cases; added zero-budget copy/reparent acceptance |
| `lean/Ehr/Check/EnterOnceSound.lean` | 1 | Trailing movement-conjunct projection; statement preserved |
| `lean/Ehr/Check/NavigationSound.lean` | 1 | Deleted-rule tuple slot; statement preserved |
| `lean/Ehr/Check/RejectionObstruction.lean` | 2 | Transport of deleted movement conjunct; unrelated statement preserved |
| `lean/Ehr/Check/RuleSound.lean` | 6 | Movement guarantee and deleted-rule tuple slots; other structural guarantees preserved |
| `lean/Ehr/Core/Types.lean` | 5 | Movement enforcement comments; legacy field retained unused |
| `lean/Ehr/Examples/TwoNightMoveTests.lean` | 56 | Entire movement/displacement regression module |
| `lean/Ehr/Props/Basics.lean` | 29 | placeOf, movedTags and addedCopies definitions |
| `lean/Ehr/Props/Examples.lean` | 10 | two_components_moved and two_moves_within_budget |
| `lean/Ehr/Props/Properties.lean` | 29 | StabilityBudget, CopyStability and instances; copyStability_stability; movement conjunct in WithinBudgets |
| `lean/generated/ehr-types.ts` | 5 | Regenerated obsolete movement comments; same JSON types |
| `scripts/replay-design-rules.mjs` | 2 | Obsolete R7 labels in historical audit helper |

Implementation and existing documentation total: **413 deleted lines**, across 43 changed files (before adding this policy page).

## Verification

All commands use `TMPDIR=/home/saithat/Projects/run-tmp`; Lean commands use `LEAN_NUM_THREADS=4`. Commands are run from the repository root unless shown otherwise.

```sh
(cd lean && lake build && lake build ui-layout)
(cd lean && lake env lean Ehr/Check/ContextTests.lean)
(cd lean && lake env lean "$TMPDIR/drop-movement-axioms.lean")
(cd lean && lake exe gents)
(cd lean && xargs -r lake build < ../scripts/proof-map/extra-modules.txt)
bash scripts/proof-map/build.sh --readme
EHR_CONFORMANCE_TRANSPORT=serve node conformance/index.mjs --canonical --jobs 4 --out "$TMPDIR/drop-movement-conformance.json"
python3 lean/Ehr/Check/certify.py --no-write
python3 scripts/audit-retained-checks.py runs/core-10day > "$TMPDIR/drop-movement-after.tsv"
diff -u "$TMPDIR/drop-movement-before.tsv" "$TMPDIR/drop-movement-after.tsv"
pnpm --filter app --filter agent --filter world --filter @vgi/commit typecheck
pnpm --filter app --filter agent --filter world --filter @vgi/commit lint
pnpm --filter app build
pnpm --filter app test --maxWorkers=2 tests/revision-history.test.ts
CI=true pnpm --filter agent test --maxWorkers=4
CI=true pnpm --filter agent exec vitest run test/resume.test.ts test/parallel.test.ts --maxWorkers=2
CI=true pnpm --filter agent exec vitest run test/modes.test.ts --maxWorkers=1
CI=true pnpm --filter agent test --maxWorkers=4
CI=true pnpm --filter agent exec vitest run test/resume.test.ts test/parallel.test.ts --maxWorkers=2
CI=true pnpm --filter agent exec vitest run test/modes.test.ts --maxWorkers=1
```

Lean default build (695 jobs), layout build (154 jobs), context regressions, generation, additional proof modules and proof-map generation pass. The edited theorem audit printed axioms for `accepted_structural`, `accepted_highAlertNotices`, `accepted_budgets`, `accepted_copyBudget`, `accepted_copyBudget_tag`, `accepted_contextRetained`, `accepted_contextsDeclared`, `accepted_navigationLabels`, `accepted_navigation`, `accepted_capturesAllOnce` and `unusedWorkflow_satisfies`; all use only `propext`, `Classical.choice`, `Quot.sound`. No unrelated theorem statement was weakened.

Canonical conformance: 1,592 passes, zero failures, 1,438 not applicable, across 202 scenarios and 15 targets. Certification: 15/15 personas accepted, 38/38 bad programs rejected with expected properties and valid counterexample navigation. Typecheck, lint and app build pass. Revision-history units: 5/5 pass.

The full agent invocation includes six archive-dependent failures: missing `runs/world/2/schedules/day-01/P1..P5.json` and `runs/world/2-original/schedules/day-07/P1.json`. It also encountered transient missing `ui-layout` executable errors while the layout executable was being relinked; affected resume, parallel and mode suites were rerun after builds completed. All 17 hillclimb tests pass, including the scoring boundary, bounded guard, replay, backstop and search tests. The post-build rechecks pass all 7 resume/parallel tests and all 6 mode tests. Combined with the broad run, 222 tests pass, 14 have their existing prerequisite skips, and 6 remain blocked by the missing schedules. No CI tests were excluded or changed to skip.

No Docker, live stack, browser/WCAG audit, full recording, model call, WASM rebuild, retained recertification, push or other-worktree change was performed. Only `app/src/browser` changed under app source, so the certified app source hash is unaffected. Historical native/WASM certificate bindings remain historical; no fresh runtime certificates were issued.
