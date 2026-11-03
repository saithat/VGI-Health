# Urgency follow-through verification — 2026-11-02

Owner approval is recorded in the [sourced policy](alert-urgency.md) and generated
[policy JSON](alert-urgency.json). The [measurement summary](urgency-follow-through.json)
binds this report to the application, Lean source and WASM hashes.

## Changes

- Additive `Specs/CriticalResults` and `Canonical/Urgency` successors supply the
  critical-result kind, W2 inline components and fifteen checker-accepted role
  baselines. Original protected spec definitions remain intact. The dedicated
  exporter rewrites only tracked release files; the general content exporter
  also uses the successor release definitions.
- `Multi/Critical` separates service delivery, clinician receipt, UI acknowledgment,
  covering escalation and documented clinical action. `bounded_follow_through`
  proves status **and recorded timestamps** meet the original deadline for any
  finite actor interleaving in the executable fair minute schedule. Receipt,
  acknowledgment and timeout never create resolution. Source snapshot identity
  prevents corrected observations inheriting an old resolution.
- Minor advisories require explicit minor evidence and exclude severe evidence
  and formulary hazards. Severe evidence also triggers the severe interaction
  path. The original coarse spec definition is preserved; exported successor
  specs select the severity-aware condition.
- The production renderer and native screen exporter supply every active urgent
  rule in a pinned strip independently of navigation and acknowledgment. Urgent
  popup acknowledgment moves to that strip without changing the interpreter's
  guard. Layered semantics allow arbitrary workspace/dialog changes while
  retaining the strip. Structural coverage is derived; viewport fit, legibility
  and non-occlusion remain explicit geometric hypotheses. Existing modal
  obstruction theorems remain unchanged.
- The first P1 result task each simulated day gains an explicit panic potassium
  observation (6.8 mmol/L) with P1/P2 routing and a 30-minute local simulation
  limit. Predecessor task choices, random draws and state history remain exact;
  archive comparisons project out only the added critical observation. Separate
  model, API and browser tests exercise the new workflow.

## Exact checks and results

All commands ran in this worktree with:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=4
```

| Command | Result |
|---|---|
| `(cd lean && lake build)` | Pass, 431 jobs. Includes critical lifecycle/API regressions and all fifteen successor role-baseline acceptance checks. |
| `(cd lean && lake comparator)` | Pass: default kernel accepts the solution. |
| `(cd lean && lake exe gents)` | Pass: 170 types, 42 samples. |
| `(cd lean && lake env lean --run Ehr/Tools/ExportUrgency.lean)` | Pass: tracked successor release/spec/persona exports. |
| `(cd lean && lake env lean --run Ehr/Sem/ExportPolicy.lean) > docs/design/alert-urgency.json` | Pass: 78 approved assignments, including critical results. |
| `JOBS=4 EM_CACHE="$TMPDIR/urgency-emcache" make wasm` | Pass: rebuilt and installed WASM. |
| `make wasm-check` | Pass: source/asset binding current. |
| `node wasm/test/urgency.mjs` | Pass: ten native/WASM comparisons; acknowledgment remains unresolved, clinician action resolves, covering receipt at minute 30 succeeds, corrected source reopens; strip lifecycle assertions pass. |
| `pnpm --filter app build` | Pass. |
| `pnpm --filter app exec tsc --noEmit` | Pass. |
| `EHR_BIN="$PWD/lean/.lake/build/bin/ehr" pnpm --filter app test --maxWorkers=4 --exclude tests/dashboard-performance.test.ts` | Pass: 39 files, 315 tests, including real WASM rendering and native revision checks. |
| `pnpm --filter world lint` | Pass. |
| `pnpm --filter world typecheck` | Pass. |
| `pnpm --filter world test` | Pass: 96 Vitest tests plus five realism tests. |
| `pnpm --filter app exec eslint src/ehr/ui/Screen.tsx src/ehr/ui/UrgentStrip.tsx src/ehr/ui/fidelity.ts src/ehr/ui/types.ts e2e/ui-check.spec.ts` | Pass. |
| `APP_TEST_PREVIEW=1 APP_TEST_PORT=4281 pnpm --filter app exec playwright test ui-check.spec.ts --grep 'urgency gate\|concurrent urgent strip' --workers=2` | Pass: four tests, desktop and narrow. The final audit also reruns these tests. |
| `EHR_SCREEN_WORKERS=4 APP_TEST_PREVIEW=1 APP_TEST_PORT=4282 node scripts/audit-alert-policy.mjs "$TMPDIR/urgency-final-audit" --urgency-only` | **Zero urgency findings**. Overall exit 1 because the selected trees retain other physical-policy findings; details below. |
| `git diff --check` | Pass. |

`#print axioms` is retained for every new theorem and the existing edited-proof
family. The final build reports only `propext`, `Classical.choice`, `Quot.sound`,
or no axioms. No new `sorry`, `admit`, `native_decide` or axioms. The prior
`Specs/AlertUrgency.lean` is an unchanged byte prefix with an approved successor
appended; Props, Statements and comparator files have no changes.

## Audit scope and remaining findings

The focused policy audit exports **4,813 canonical/probe states**, deduplicates
these to **1,826 trees**, and selects **11 representatives**: six distinct
strip/modal/banner presentations (largest body per group) plus all critical
workflow snapshots. This includes a native stress snapshot with **all eight
core urgent kinds simultaneously active**, plus the guarded acknowledgment.
`urgency-selection.json` in the output directory records every grouped member.
This is representative geometry, not whole-version approval.

The final browser run has **50 passed, 14 deliberately skipped, zero failed**
tests. The physical matrix runs once in the desktop project; its duplicate
narrow cases and desktop-only presentation probes account for the skips. There
are **99 measurements** across 768/1280/1440/1600/1920 px, 640/320 px reflow and
1280/768 px at 200% text size, with finite scroll/focus samples. Urgency findings
are **zero**. The overall physical gate remains failed with **3,986 findings**:
2,214 non-text contrast; 1,359 unsupported paint requiring contrast review;
410 resize/reflow; three horizontal-overflow findings. These remain reported;
existing UI CSS belongs to the physical-policy lane and was not changed here.
Only the new strip component has CSS edits.

The complete app test command was also attempted. Its dashboard-performance
suite cannot load `runs/core-10day-live/trajectories/index.json`, absent from
this worktree. The remaining 315 tests pass with that suite excluded. Full app
lint still fails on a pre-existing prohibited cast at
`app/tests/ui-painter.test.tsx:1662`; changed painter/gate files lint cleanly.
No missing data was fabricated or tracked. An initial full physical audit was
stopped after discovering the historical exporter path; the corrected focused
run above is the final urgency evidence, not a claim that all 1,826 trees pass.

## Scope left to integration and the owner

Critical dispatch is the executable model and episode API, not a deployed
notification service. Authentication, a shared durable ledger, real-time fair
timeout scheduling, recipient-directory binding and reporting-timeliness
monitoring must refine it. Clinical action documentation is a clinician's
assertion, not a proof that physical care occurred. Unrouted critical FHIR
observations remain visible with an explicit manual-notification finding and
cannot authorize resolution. Historical W2 simulator goals still measure
`ackResult`, not critical-result resolution.

The application and Lean/WASM hashes changed. Historical certificates were not
rebound, and nothing was pushed. Ignored runs, fixtures, programs and verdicts
were not staged; ignore rules were not changed. No other branch or worktree was
modified. `CLAUDE.md` was absent from this worktree and tracked inventory.

Owner follow-up: choose the production reporting limit and responsible/covering
recipient directory. Thirty model minutes and P1/P2 are explicit simulation
policy, not a duration or identity mapping supplied by the cited authorities.
