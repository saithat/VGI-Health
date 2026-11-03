# Promotion integration with main

Integration: `28d0e14f` merges local `main` (`11354642`) into
`lane/promote` (`1272fe10`). While verification ran, main advanced to `19a569b6`;
that later dashboard/browser-only snapshot is integrated in a second merge.
No fetch was necessary. The owner cleared the two source-index
blockers before this integration; no push is authorized.

## Conflict resolutions

| Conflicted file | Resolution |
|---|---|
| `lean/Ehr.lean` | Union of promotion imports and main's urgency, critical-result and ADT imports; this file contains no theorem declarations. |
| `app/src/ehr/ui/clinical.css` | Retain both board/dated layout rules and the wrapping plain-text editor rules. |
| `app/src/ehr/ui/types.ts` | Preserve promotion constructors/refinements and main's optional screen urgency; add typed pane urgency transport. |
| `app/tests/ui-painter.test.tsx` | Keep the equivalent native-button assertion with main's diagnostic wording; retain all assertions and both sides' tests. |
| `app/public/ehr/ehr-interp.wasm` | Regenerate with the merged Lean sources. |
| `app/public/ehr/manifest.json` | Regenerate with the merged Lean sources. |

The automatically merged `lean/generated/ehr-types.ts` is regenerated with
`lake exe gents`, yielding 176 types and 42 samples.

## Semantic integration

Pane metadata transports the production strip's alerts and acknowledgment
controls. `pane_strip_exact` and `metadata_strip_exact` prove exact transport;
the existing board constructor and theorem statements are unchanged. The strip
sits in the patient-labelled global rail above pane scrolling and dialogs.
Global modal ownership still controls clinical action authority.

Main's separate critical-result handler is included in `runStep`.
`critical_handle_commits` proves that receive/document/resolve steps retain
clinical commits, preserving the original `clinical_commit_guard` statement.
No protected statement is edited during conflict resolution.

`Display` JSON decoding accepts arbitrary `timelineBackings`. Provenance theorems
apply to adapter-built displays only; JSON-supplied backings are trusted input,
whose authenticity the host must establish.

## Verification

The complete template audit passes **1,826 states / 16,434 measurements**;
the persona audit passes **1,296 states / 11,664 measurements**. Both have
**zero physical findings** under the default enforced owner policy. The separate
board/dated/command/spatial matrix passes all **54 measurements**.
Logs and raw evidence remain in disk-backed scratch and ignored
`runs/promote-merge-v5/`. Historical certificates are not rebound.

| Check | Result |
|---|---|
| `lake build` | Pass, 453 jobs |
| `lake build exotic-api` | Pass |
| `lake comparator` | Pass, kernel accepts |
| `#print axioms` | 98 distinct theorems; only `propext`, `Classical.choice`, `Quot.sound` (or none) |
| `lake exe gents` | 176 types, 42 samples |
| WASM rebuild and `make wasm-check` | Pass |
| App build / lint / typecheck | Pass |
| App unit tests | 324 passed, 41 files |
| Agent typecheck / tests | Pass; 118 tests, 24 files |
| Exploration typecheck / tests | Pass; 14 passed, one optional endpoint skip |
| Geometry determinism | Pass; fresh repeat and alternate fontconfig |
| Promotion primitive/view gate | 14 browser records, 44 native/WASM comparisons; pass |
| Native exports | 1,006 composed exports, 751 distinct; 1,502 width checks pass |
| Source-time checks | Four actual lab-tab cases; zero native/WASM mismatches |
| Binding / agreement / geometry | Pass; two patients, unbound commits/index blocked, zero transition mismatches |

The sole conflicted Lean file, `Ehr.lean`, contains imports only and no theorem
declarations. The axiom audit additionally covers every edited/new promotion
proof module, including the new exact strip transport and critical-handler lemmas.
Protected files match incoming main; no manual change weakens their statements.

Bindings: app `78be0fe61fa181a1ce2d43635d4d69061f082ff89d007b050d9857399592f4b7`,
Lean sources `629fa342ded40d2f6aa7a27026601e236461ce65d5ff3663189a4716b4e87db6`,
WASM `19e1a81725ede2111c17749c103e2ebeadf1a2a966dcd84a0f37a13ebd798e07`.
The production app hash changes from the pre-integration build. The final
research-shell correction changes the research renderer source identity but does
not change that production app fingerprint.

Full e2e: 248 passed, 67 skipped, 39 failed. Every failure is classified:
32 known live-auth/setup, 4 known recorded-dashboard stale-binding failures,
and 3 known urgency failures (`p1-alert.json`, missing perceived dose-range alert).
There are no new test failures. An initial collection error (JSON import attribute)
was fixed before this full run; the initial template audit is excluded and retained
as `promote-merge-templates-import-diagnostic`.

The first merged-renderer trial (`runs/promote-merge-v4/`) is excluded: the
research root did not inherit the production CSS variables and scoped WCAG
control rules. An exported allergy-reconfirmation checkbox measured 16px wide
with a 1.1438:1 boundary. The root now uses the production shell class and tokens;
all 751 unchanged native-export compositions passed at both widths (1,502 checks)
before the fresh `runs/promote-merge-v5/` cohort began. No v4 geometry is reused.
The pinned strip is already in flow in this wrapper, so the production fixed-strip
spacer is overridden without altering the strip itself.

The physical collector is moved unchanged from `ui-check.spec.ts` to
`physical-policy.ts` and shared by canonical and promotion gates. Its source and
policy enter cache identities. Promotion capture loads the bundled Noto faces,
uses the shared DPR/locale/timezone/motion settings, and settles hover exit at
snapshot boundaries. The gate retains full ARIA, control hit-test, banner and
physical assertions. The pending-urgent-ack probe checks the exact scoped event.

Commands (disk-backed `TMPDIR`; only one Lake process in this checkout):

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=4
(cd lean && lake build)
(cd lean && lake build exotic-api)
(cd lean && lake exe gents)
(cd lean && lake env lean ../runs/promote-merge-v5/axioms.lean)
(cd lean && lake env lean Ehr/Render/Dated.lean)
(cd lean && COMPARATOR_BWRAP=/home/saithat/Projects/VGI-promote/scripts/lean-bwrap.py lake comparator)
JOBS=4 EM_CACHE="$TMPDIR/promote-emcache" make wasm
make wasm-check
pnpm --filter app build
pnpm --filter app lint
pnpm --filter app exec tsc --noEmit
pnpm --filter app test --maxWorkers=2 --testTimeout=20000
pnpm --filter agent typecheck
pnpm --filter agent test --maxWorkers=2
pnpm --filter agent exec tsc -p ../explore/tsconfig.json --noEmit
node --import ./agent/node_modules/tsx/dist/loader.mjs --test explore/*.test.ts
pnpm --filter app test:geometry-determinism
APP_TEST_PREVIEW=1 APP_TEST_PORT=4263 PLAYWRIGHT_JSON_OUTPUT_NAME="$TMPDIR/promote-merge-e2e-final.json" pnpm --filter app exec playwright test --workers=3 --reporter=line,json
APP_TEST_PREVIEW=1 APP_TEST_PORT=4264 EHR_SCREEN_WORKERS=3 node scripts/audit-alert-policy.mjs "$TMPDIR/promote-merge-templates"
APP_TEST_PREVIEW=1 APP_TEST_PORT=4265 EHR_SCREEN_WORKERS=3 node scripts/audit-alert-policy.mjs "$TMPDIR/promote-merge-personas" --personas
node --import ./agent/node_modules/tsx/dist/loader.mjs app/scripts/promote-gate.mjs runs/promote-merge-gate
node --import ./agent/node_modules/tsx/dist/loader.mjs app/scripts/promote-physical.mjs runs/promote-merge-physical
node explore/prepare-promotion.mjs runs/explore-round2 runs/promote-merge-v5
EHR_SCREEN_WORKERS=3 APP_TEST_PREVIEW=1 APP_TEST_PORT=4282 node --import ./agent/node_modules/tsx/dist/loader.mjs explore/round2.mjs runs/promote-merge-v5 --promote --cache-only
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/promote-source-check.mjs runs/promote-merge-v5
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/promote-exports.mjs runs/promote-merge-v5
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/full-binding-check.mjs runs/promote-merge-v5
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/round2-agreement.mjs runs/promote-merge-v5
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/geometry-check.mjs runs/promote-merge-v5
EHR_ORDINARY_WORKERS=2 node --import ./agent/node_modules/tsx/dist/loader.mjs explore/promote-coverage.mjs runs/promote-merge-v5 --exports-only
EHR_ORDINARY_WORKERS=3 node --import ./agent/node_modules/tsx/dist/loader.mjs explore/promote-coverage.mjs runs/promote-merge-v5
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/promote-coverage-negative.mjs runs/promote-merge-v5
```

## Individual E2E failures (11354642 integration)

Each row is one failed project/test execution. Raw errors and final test statistics
are retained in `runs/promote-merge-v5/e2e-classification.json`.

| Project | File | Test | Classification |
|---|---|---|---|
| desktop | dashboard-performance.spec.ts | trajectory filters, paging, same-task control and bookmarks on the complete run | known recorded-dashboard/stale build binding |
| desktop | dashboard-performance.spec.ts | warm section switches reuse the index; Compare excludes incomplete tasks | known recorded-dashboard/stale build binding |
| narrow | dashboard-performance.spec.ts | trajectory filters, paging, same-task control and bookmarks on the complete run | known recorded-dashboard/stale build binding |
| narrow | dashboard-performance.spec.ts | warm section switches reuse the index; Compare excludes incomplete tasks | known recorded-dashboard/stale build binding |
| desktop | live-login.spec.ts | local P1 personalized login, patient search, real chart and session restoration | known live-auth/setup |
| desktop | live-login.spec.ts | local P1 baseline login, patient search, real chart and session restoration | known live-auth/setup |
| desktop | live-login.spec.ts | baseline entry opens the selected clinician's certified role view | known live-auth/setup |
| narrow | live-login.spec.ts | local P1 personalized login, patient search, real chart and session restoration | known live-auth/setup |
| narrow | live-login.spec.ts | local P1 baseline login, patient search, real chart and session restoration | known live-auth/setup |
| narrow | live-login.spec.ts | baseline entry opens the selected clinician's certified role view | known live-auth/setup |
| desktop | live-search.spec.ts | live chart search: Aaron, first input and restored checkpoint | known live-auth/setup |
| desktop | live-search.spec.ts | live chart search: Terrance, first input and restored checkpoint | known live-auth/setup |
| narrow | live-search.spec.ts | live chart search: Aaron, first input and restored checkpoint | known live-auth/setup |
| narrow | live-search.spec.ts | live chart search: Terrance, first input and restored checkpoint | known live-auth/setup |
| desktop | live-selection.spec.ts | live P1 Schedule opens its patient without clinical writes | known live-auth/setup |
| desktop | live-selection.spec.ts | live P1 In Basket Results opens its patient without clinical writes | known live-auth/setup |
| desktop | live-selection.spec.ts | live P2 Track Board opens its patient without clinical writes | known live-auth/setup |
| desktop | live-selection.spec.ts | live P3 Unit Census opens its patient without clinical writes | known live-auth/setup |
| desktop | live-selection.spec.ts | live P3 MAR opens its patient without clinical writes | known live-auth/setup |
| desktop | live-selection.spec.ts | live P4 Schedule opens its patient without clinical writes | known live-auth/setup |
| desktop | live-selection.spec.ts | live P5 OR Schedule opens its patient without clinical writes | known live-auth/setup |
| desktop | live-selection.spec.ts | live P5 Consults opens its patient without clinical writes | known live-auth/setup |
| desktop | live-selection.spec.ts | live P1 Patient Lookup opens its patient without clinical writes | known live-auth/setup |
| narrow | live-selection.spec.ts | live P1 Schedule opens its patient without clinical writes | known live-auth/setup |
| narrow | live-selection.spec.ts | live P1 In Basket Results opens its patient without clinical writes | known live-auth/setup |
| narrow | live-selection.spec.ts | live P2 Track Board opens its patient without clinical writes | known live-auth/setup |
| narrow | live-selection.spec.ts | live P3 Unit Census opens its patient without clinical writes | known live-auth/setup |
| narrow | live-selection.spec.ts | live P3 MAR opens its patient without clinical writes | known live-auth/setup |
| narrow | live-selection.spec.ts | live P4 Schedule opens its patient without clinical writes | known live-auth/setup |
| narrow | live-selection.spec.ts | live P5 OR Schedule opens its patient without clinical writes | known live-auth/setup |
| narrow | live-selection.spec.ts | live P5 Consults opens its patient without clinical writes | known live-auth/setup |
| narrow | live-selection.spec.ts | live P1 Patient Lookup opens its patient without clinical writes | known live-auth/setup |
| desktop | surgery-live-realism.spec.ts | surgical live review keeps readable receipts and the saved record binding | known live-auth/setup |
| desktop | surgery-live-realism.spec.ts | normal surgical clinic keeps technical save controls out of the patient workspace | known live-auth/setup |
| narrow | surgery-live-realism.spec.ts | surgical live review keeps readable receipts and the saved record binding | known live-auth/setup |
| narrow | surgery-live-realism.spec.ts | normal surgical clinic keeps technical save controls out of the patient workspace | known live-auth/setup |
| desktop | ui-check.spec.ts | semantic UI fidelity: /home/saithat/Projects/VGI-promote/app/src/fixtures/ui/p1-alert.json | known urgency |
| desktop | ui-check.spec.ts | physical policy: /home/saithat/Projects/VGI-promote/app/src/fixtures/ui/p1-alert.json | known urgency |
| narrow | ui-check.spec.ts | semantic UI fidelity: /home/saithat/Projects/VGI-promote/app/src/fixtures/ui/p1-alert.json | known urgency |

## Merged-build cohort

All **144/144** physician-task executions completed (24 search and 24 held-out
per design, including stack). Missing geometry: **0**. The fixed probability
cache supplied **18,767** entries; new model requests and proposal calls: **0**.
No deployment certificate was issued.

| Design | Held-out completion | Effort / task | Mouse px / task | Scroll px / task |
|---|---|---|---|---|
| reference-stack | 24/24 | 55.8 ± 16.2 | 9584.5 ± 5405.5 | 15241.7 ± 1543.7 |
| r2-007 | 24/24 | 90.3 ± 14.9 | 6194.2 ± 3245.0 | 53081.8 ± 5780.0 |
| r2-008 | 24/24 | 86.9 ± 14.7 | 6573.9 ± 3600.2 | 49715.1 ± 4290.9 |

Spreads are mean ± population SD across 12 physicians’ two-task means;
seed 20261103 and the original split are retained. These are simulated
geometry and composite-effort measurements, not human task times.

Compared with this build’s stack reference: r2-007 mouse travel -35.4%, composite effort +61.7%, scrolling 3.48×; r2-008 mouse travel -31.4%, composite effort +55.6%, scrolling 3.26×.

All **4,615 distinct emitted ordinary views** pass at 1440 and 390 px
(**9,230 checks**), with exact file accounting. Both designs retain `proved`
ordinary admission, checker acceptance and passed screen gates; neither receives
a deployment certificate. The three-worker negative fixture places a wrong banner
in the second worker and is rejected (child exit 1); no success report is written.


## Current-main follow-up

`git merge --no-commit main` at `19a569b6` applied without conflicts after
`28d0e14f`. Its twelve changed files are confined to dashboard/browser review
code, `app/e2e/dashboard.spec.ts` and `docs/design/agent-admissions.md`.
All **451** recorded clinical/Lean/capture/experiment source files are byte-identical.
The rebuilt app retains the exact app hash above; the physical audits, source
checks, geometry, complete cohort and view coverage therefore retain their bindings.
Final-tree Lean/Comparator/axiom/type generation, WASM build/check, app
build/lint/typecheck/tests and full E2E are rechecked after this follow-up.


Follow-up verification: Lean build (453 jobs), Comparator, 98-theorem axiom audit,
176-type/42-sample generation, WASM rebuild/check, app build/lint/typecheck,
324 app tests in 41 files, all 9,230 view checks, the 14-record/44-comparison
promotion gate and geometry determinism pass on the `19a569b6` integration.
The unchanged agent source retains its passing typecheck and 118 tests.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=4
(cd lean && lake build)
(cd lean && lake exe gents)
(cd lean && lake env lean ../runs/promote-merge-v5/axioms.lean)
(cd lean && lake env lean Ehr/Render/Dated.lean)
(cd lean && COMPARATOR_BWRAP=/home/saithat/Projects/VGI-promote/scripts/lean-bwrap.py lake comparator)
JOBS=4 EM_CACHE="$TMPDIR/promote-emcache" make wasm
make wasm-check
pnpm --filter app build
pnpm --filter app lint
pnpm --filter app exec tsc --noEmit
pnpm --filter app test --maxWorkers=2 --testTimeout=20000
EHR_ORDINARY_WORKERS=3 node --import ./agent/node_modules/tsx/dist/loader.mjs explore/promote-coverage.mjs runs/promote-merge-v5
node --import ./agent/node_modules/tsx/dist/loader.mjs app/scripts/promote-gate.mjs runs/promote-merge-gate
pnpm --filter app test:geometry-determinism
APP_TEST_PREVIEW=1 APP_TEST_PORT=4263 PLAYWRIGHT_JSON_OUTPUT_NAME="$TMPDIR/promote-latest-e2e.json" pnpm --filter app exec playwright test --workers=3 --reporter=line,json
```


The first follow-up full E2E run reported **245 passed / 67 skipped / 42 failed**.
The original 39 failures retained their classifications; three additional narrow
`trajectories.spec.ts` cases were **NEW**: all-trajectories replay, fixed playback,
and the aliased-run playback fixture. Incoming main's fixed 340px task-browser
column left the replay column at zero width on narrow screens, scaling the
recorded iframe to zero. The dashboard now stacks browser and replay below
1000px, bounds the task-list scroller, and preserves the desktop split and fixed
1440×900 logical recording viewport. No test assertion or certificate is relaxed.
The pre-fix JSON/errors are retained as `e2e-classification-before-responsive-fix.json`.


All **six** unchanged trajectory playback E2E cases pass (desktop and narrow)
after the responsive fix. The app build, lint and typecheck pass; the 451 clinical,
Lean, capture and experiment source bindings and the app hash remain unchanged.

```sh
APP_TEST_PREVIEW=1 APP_TEST_PORT=4266 PLAYWRIGHT_JSON_OUTPUT_NAME="$TMPDIR/promote-latest-trajectories.json" pnpm --filter app exec playwright test trajectories.spec.ts --workers=3 --reporter=line,json
```


The final corrected full E2E run reports **248 passed / 67 skipped / 39 failed /
0 flaky**. Every failed project/test key is identical to the 39-row table above:
**32 known live-auth/setup, 4 known recorded-dashboard/stale binding, 3 known
urgency, 0 NEW**. All three new narrow-playback failures are resolved. The final
classification and complete errors are in `e2e-classification-latest.json`;
pre-fix results remain separate. App unit tests rerun after the fix: **324 passed
in 41 files**. All test assertions are retained.

No push, deployment or historical certificate rebinding was performed; these
are outside the authorized integration. The certified app and Lean/WASM bindings
changed from the pre-integration revision, as recorded above. Ignored runs,
fixtures, programs and verdict data are not staged; protected files and
`.gitignore` match incoming main. No new owner decision is required. The known
live setup, stale recording and legacy urgency fixture failures remain separate
follow-up work.

Raw evidence is rescued under
`/home/saithat/Projects/run-tmp/promote-merge-rescue-20261102/runs/`.
