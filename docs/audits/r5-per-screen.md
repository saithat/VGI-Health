# Per-screen deployed R5 limits

**New specification.** Each existing screen is bounded by the maximum active-target count in its persona’s vendor reference on identical sample/workspace data. Lean fixed-shell G10 stays at **15**. An absent/new/merged screen id uses **57**. These measurements do not estimate clinical scanning effort.

## Vendor v0 limits on sample bundles

Entries are maxima over the first viewport and every scroll window in every exported active/background state at 1440×900. A dash means the screen id is absent (fallback 57 for a candidate using that id). The five vendor v0 programs come from the immutable initial `core-10day` bindings. The adult-allergic, pediatric and surgical bundle names, source hashes, first/scroll maxima and complete release/no-agent/retained counts are in [the derived JSON](r5-per-screen.json).

| Screen id | P1 | P2 | P3 | P4 | P5 |
|---|---:|---:|---:|---:|---:|
| `chartHistory` | 14 | 14 | 14 | 14 | 14 |
| `chartSummary` | 5 | 3 | 3 | 5 | 6 |
| `home` | 6 | 4 | 4 | 6 | 8 |
| `w1Close` | 23 | — | — | — | 25 |
| `w1Exam` | 23 | — | — | — | 25 |
| `w1Hpi` | 26 | — | — | — | 27 |
| `w1Labs` | 24 | — | — | — | 26 |
| `w1MedRec` | 25 | — | — | — | 27 |
| `w1Orders` | 55 | — | — | — | 57 |
| `w1Rooming` | 35 | — | — | — | 37 |
| `w1Sign` | 21 | — | — | — | 23 |
| `w1Verify` | 21 | — | — | — | 23 |
| `w2Inbox` | 14 | — | — | 14 | 13 |
| `w2Message` | 17 | — | — | 17 | 16 |
| `w2Result` | 11 | — | — | 11 | 11 |
| `w3Disposition` | — | 25 | — | — | — |
| `w3OrderSets` | — | 55 | — | — | — |
| `w3Orders` | — | 50 | — | — | — |
| `w3Provider` | — | 16 | — | — | — |
| `w3Sign` | — | 26 | — | — | — |
| `w3TrackBoard` | — | 19 | — | — | — |
| `w3Triage` | — | 32 | — | — | — |
| `w4Admin` | — | — | 26 | — | — |
| `w4Flowsheet` | — | — | 26 | — | — |
| `w4Handoff` | — | — | 22 | — | — |
| `w4Mar` | — | — | 20 | — | — |
| `w4Worklist` | — | — | 20 | — | — |
| `w5Close` | — | — | — | 23 | — |
| `w5Growth` | — | — | — | 18 | — |
| `w5Immunizations` | — | — | — | 25 | — |
| `w5Note` | — | — | — | 28 | — |
| `w5Orders` | — | — | — | 51 | — |
| `w5Rooming` | — | — | — | 29 | — |
| `w5Sign` | — | — | — | 21 | — |
| `w6Consult` | — | — | — | — | 22 |
| `w6ConsultClose` | — | — | — | — | 30 |
| `w6Consults` | — | — | — | — | 28 |
| `w6Discharge` | — | — | — | — | 36 |
| `w6OpNote` | — | — | — | — | 38 |
| `w6Orders` | — | — | — | — | 57 |
| `w6PostOp` | — | — | — | — | 52 |
| `w6PreOp` | — | — | — | — | 29 |
| `w6Rounding` | — | — | — | — | 27 |
| `w6Schedule` | — | — | — | — | 29 |
| `w6Sign` | — | — | — | — | 33 |
| `w7Decision` | 16 | — | — | 16 | — |
| `w7Queue` | 13 | — | — | 13 | — |
| `w7Review` | 20 | — | — | 20 | — |

## Retained revisions

**17/33 revisions exceed their release-matched no-agent per-screen limits** on these sample bundles: 11 of the 18 discretionary nightly deployments and six vendor-release deployments. This includes initial/vendor-migration revisions as well as discretionary agent deployments; none of the five initial v0 programs exceeds its reference. The frozen recording and certificates were not modified. These are counterfactual refusals under a new specification, not new outcome runs.

The gate now takes each screen's limit as the larger of the no-agent layout and
the release's persona layout (the certified migration fallback). Recomputed from
`r5-per-screen.json`, the same 17 revisions exceed with the same screens.

| Revision | Reference release | Screen: measured / limit |
|---|---|---|
| P1/v4 | P1/v2 | `w2Result`: 12 / 11 |
| P1/v5 | P1/v3 | `w1Orders`: 56 / 49; `w2Result`: 12 / 11 |
| P2/v1 | P2/v1 | `w3Provider`: 19 / 16 |
| P2/v2 | P2/v1 | `w3Provider`: 19 / 16 |
| P2/v3 | P2/v2 | `w3Provider`: 19 / 16 |
| P2/v4 | P2/v2 | `w3Provider`: 20 / 16; `w3Sign`: 27 / 26 |
| P2/v5 | P2/v2 | `w3Provider`: 20 / 16; `w3Sign`: 27 / 26 |
| P2/v6 | P2/v3 | `w3Provider`: 20 / 16; `w3Sign`: 27 / 26 |
| P2/v7 | P2/v3 | `w3Provider`: 20 / 16; `w3Sign`: 27 / 26 |
| P3/v1 | P3/v1 | `w4Worklist`: 21 / 20 |
| P3/v2 | P3/v2 | `w4Worklist`: 21 / 20 |
| P3/v3 | P3/v3 | `w4Worklist`: 21 / 20 |
| P3/v4 | P3/v3 | `w4Admin`: 28 / 26; `w4Handoff`: 23 / 22; `w4Worklist`: 21 / 20 |
| P4/v5 | P4/v3 | `w5Orders`: 52 / 46 |
| P4/v6 | P4/v3 | `w5Orders`: 52 / 46 |
| P4/v7 | P4/v3 | `w5Orders`: 52 / 46 |
| P4/v8 | P4/v3 | `w5Orders`: 51 / 46 |

The matrix covers 71 programs: 18 current release templates/personas, five vendor v0 programs, 33 retained revisions and 15 actual no-agent references. All **23 vendor v0/current release programs** and all 15 references pass their own R5 limits by construction; their global maximum on sample bundles remains **57**, so the absent-screen fallback remains 57. The collector measured **7,795 distinct trees / 8,191 active/background samples**, including every exported state through exact-tree deduplication.

## Workspace regression and timing

`scripts/check-r5-p2.mts` runs the real `CliScreenChecker` on unchanged P2 v0,
the default three bundles and `runs/world/2/schedules/day-01/P2.json`. This is the
original failing workspace binding whose old-world schedule key begins `2958e58c`.
It exports **542 states / 419 distinct trees** (347 admission trees plus synthetic
popup geometry probes). `w3OrderSets` now passes at **61 / 61**, including order rows
10–11; no threshold or renderer was raised globally.

| Check | Whole-version wall time | Reference preparation | Reference collection/cache lookup | New reference trees | Candidate tree cache |
|---|---:|---:|---:|---:|---|
| First | 425.512 s | 0.104 s | 10.438 s | 347 | 0 hits / 419 misses |
| Repeat | 28.633 s | 0.107 s | 0.491 s | 0 (347 reused) | 419 hits / 0 misses |

Measured reference overhead is **10.542 s (2.5% of the first check)** and **0.598 s**
on repeat. Self-reference reuses the candidate's already exported trees; a different
reference also needs native export, whose preparation time is recorded separately.
Only density runs for the reference; it never repeats the full physical/fidelity
matrix. Both whole-version results pass, with no density failures; the first physical
matrix has **3,393 measurements and zero findings**. The repeat still runs known-bad
controls. These timings are local observations, not a performance guarantee.

Workspace reference limits are: `home` 10, `chartHistory` 20, `chartSummary` 9,
`w3Disposition` 31, `w3OrderSets` 61, `w3Orders` 56, `w3Provider` 17,
`w3Sign` 30, `w3TrackBoard` 24 and `w3Triage` 37. Their difference from the sample-only
table is intentional: the workspace adds active order/queue targets.

## Verification

Commands use this common environment (all browser work is serialized by the shared lock):

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=4
export pnpm_config_verify_deps_before_run=false EHR_SCREEN_WORKERS=4
pnpm --filter app build
pnpm --filter app typecheck
pnpm --filter agent typecheck
pnpm --filter app lint
pnpm --filter agent lint
pnpm --filter app test --maxWorkers=4
pnpm --filter agent test --maxWorkers=4
node --test scripts/density-reference.test.mjs
node --import ./agent/node_modules/tsx/dist/loader.mjs --test scripts/recertify-runs.test.mjs
APP_TEST_PREVIEW=1 pnpm --filter app exec playwright test action-density.spec.ts --project desktop --workers 4
node scripts/audit-action-density.mjs "$TMPDIR/r5-per-screen-density"
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/check-r5-p2.mts --out "$TMPDIR/r5-p2-final"
node --test scripts/density-cache-browser.test.mjs
node scripts/audit-alert-policy.mjs "$TMPDIR/r5-per-screen-templates"
node scripts/audit-alert-policy.mjs "$TMPDIR/r5-per-screen-personas" --personas
```

Build, typechecks and lint pass. App unit tests: **343 passed, 15 skipped**. Policy
unit tests: **3 passed**; batch recertification regression: **1 passed**; focused
DOM density tests: **2 passed**. The policy tests cover sparse screens, new-id
fallback, active/background maxima, reference equality and cached verdict changes.
Reference-selection tests cover custom clinician ids, release-night boundaries,
long runs, corrupt snapshots and detailed next-prompt feedback. Frozen prompt-byte
goldens remain unchanged when no screen refusal is present.

Agent unit tests: **342 passed, 2 skipped**.

The full template audit passes: **1,956 trees / 18,774 physical measurements / zero findings**, zero density failures, four workers (1,695.208 s in the screen gate).
The full persona audit also passes: **1,394 trees / 13,428 physical measurements / zero findings**, zero density failures, four workers.
The two complete audits ran once each and sequentially; all **18 current vendor/release programs pass**.

The cache browser regression passes under three consecutive reference choices: sparse reference refuses, own reference accepts the same cached candidate, and returning to the sparse reference refuses again, with no new reference DOM measurement on the final run. The [derived JSON](r5-per-screen.json) retains both audit receipt hashes, coverage, timings and all result summaries.

The full pair contains vendor sources only; its R5 reference manifest is each
audit's vendor-tree union. The separate 71-program matrix supplies per-persona
thresholds, and the P2/cache regressions exercise candidate admission end to end.

The rebuilt app hash remains `7a6caf9be56a30668ea27dbdbebd17f35d02f8b29321997f96c0ecca9ae5b299`: changes under `app/` affect
screen assertions/tests and the gate, without changing emitted painter modules.
The screen cache context changed, so older assertion receipts miss. Native checker
SHA-256: `7a3d57e3ecaa10bedfaf948397d5b06140b41ddf0dbe9fdfebe84f1ea5f94fd0`. No Lean definitions/proofs were edited; G10 and its axiom audit
are unchanged. No recorded certificates, run inputs or outcomes were rebound.
