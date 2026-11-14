# Interaction validation and retained decisions

[Overview](../../README.md) · [Design rules](../design/metric-gaming.md) · [Discovery and cadence](discovery-and-cadence.md)

R1 is a release-policy change. Validation requires equal nonzero task counts and complete task completion, no click or scroll-count regression, and at most 2% growth in keystrokes and modeled time (`klmDeciSec`). Scroll pixels and mouse travel retain their 2% plus 1px allowance. Missing or nonfinite metrics refuse validation. A nightly improvement still requires a strict improvement in clicks, scrolls, scroll pixels or mouse travel. Typing/time improvements alone do not qualify. The release score stays daily click-plus-scroll savings minus switch cost.

Full completion was already enforced by `completionOk`, by `interactionAcceptable`, and again before deployment. Tests exercise lost completions, missing/substituted task counts, zero tasks, the exact 2% boundary, zero baselines, nonfinite or absent costs, and typing/time-only improvements.

## Frozen-metric replay

`agent/src/replay-interaction-gate.ts` reads each recorded decision and calls the current gate on its retained validation metrics. It makes no model calls, resimulates no tasks, writes no recording files and does not propagate a hypothetical refusal into later baselines. This is a gate replay, not a new outcome experiment or recording recertification. The sorted decision paths and original bytes have SHA-256 `f1a78f4c4437f650090c3e8b278186c3ea0674f7cd4d4d33e6454f6950b0e8d8`.

All **45 decisions** were inspected. All **18 shipped nightly changes** still pass R1; **zero** would newly be refused. The **10 mandatory vendor deployments** also retain full completion. Optional vendor surfacing uses the full-cost tolerance gate; recertification and migration require completion and are not discretionary optimization.

Each entry below names the actual shipped revision and its result under the release path in force. “—” means no deployment. `N` is a nightly optimization; `V` is mandatory vendor recertification/migration. Every shown revision passes; there are no shipped-release refusal reasons.

| Night | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|
| 1 | N v1: pass | N v1: pass | N v1: pass | N v1: pass | N v1: pass |
| 2 | N v2: pass | N v2: pass | — | N v2: pass | — |
| 3 | V v3: pass | V v3: pass | V v2: pass | V v3: pass | V v2: pass |
| 4 | N v4: pass | N v4: pass | — | — | — |
| 5 | — | N v5: pass | — | N v4: pass | — |
| 6 | V v5: pass | V v6: pass | V v3: pass | V v5: pass | V v3: pass |
| 7 | — | — | — | N v6: pass | — |
| 8 | — | — | — | N v7: pass | N v4: pass |
| 9 | — | N v7: pass | N v4: pass | N v8: pass | — |

P4 night 3 is a mandatory recertification after optional surfacing was declined. Its canonical comparison has 262 → 264 clicks, which would fail the discretionary count gate even before R1. It is not a newly refused release: full completion permits that mandatory update. Reporting it separately prevents applying a discretionary gate to the wrong release path.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true
pnpm --filter agent exec tsx src/replay-interaction-gate.ts ../runs/core-10day > "$TMPDIR/rules-gate-retained.json"
```

## Two-night movement regression

`agent/test/cadence.test.ts` adds a copy on one night and deletes the original on the next. Two observed original-control uses cost two click-equivalents after deletion, whether the survivor retains `copyOf` or is promoted by clearing it. Adding the copy alone costs zero.

`Ehr.Examples.TwoNightMoveTests` checks both promotion and a survivor retaining a dangling `copyOf`: `movedTags` includes the control tag, a zero `StabilityBudget` rejects it and a one-move budget accepts it. Before the fix, the dangling-copy variant returned `[]` and passed a zero budget. **New specification:** `placeOf` prefers the original component of a tag, then falls back to the first surviving copy; `movedTags` includes retained copy tags. Adding copies beside an original remains free. The `StabilityBudget` statement is unchanged. A narrow edit to `Props/Basics.lean` was necessary under the instruction to fix an uncharged R7 case; no R3/R5 file or definition changed.

The native regression checks **all 33 retained revisions** against their frozen
`certifications/<persona>/<version>/{inputs,spec}.json` inputs, including the
recorded previous and canonical programs. All pass; R7 retroactively refuses
none. Current release specs are not substituted for those historical inputs.
This check writes no new certificates or build bindings.

## Verification scope

The native Lean build includes the expiry and movement guards. The verification audit checks the protected theorem surfaces and permitted axioms. The service integration test uses isolated Postgres and tests exact-deadline expiry after readmission while retaining the discarded-order provenance. Browser iteration uses `scripts/audit-alert-policy.mjs --urgency-only`; the full template/persona audits and full conformance are reserved for integration, as requested for this task.

Verified with disk-backed scratch and at most four test/browser workers:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=4
export EHR_BIN="$PWD/lean/.lake/build/bin/ehr" EHR_SCREEN_WORKERS=4
(cd lean && lake build)
bash scripts/audit-verification.sh
pnpm --filter agent typecheck
pnpm --filter agent lint
# Run without EHR_BIN to retain the suite's ordinary native prerequisite skips:
env -u EHR_BIN pnpm --filter agent test --maxWorkers=4 --exclude test/workload-capabilities.test.ts
pnpm --filter agent exec vitest run test/quality-golden.test.ts test/night.test.ts test/interaction-gate.test.ts test/replay-interaction-gate.test.ts --maxWorkers=4
pnpm --filter agent exec vitest run test/movement-native.test.ts --maxWorkers=1
pnpm --filter app build
pnpm --filter @vgi/commit typecheck
pnpm --filter @vgi/commit lint
pnpm --filter @vgi/commit test
COMMIT_PG_PORT=55448 docker compose -p vgi-rules-gate-tests -f services/commit/compose.yml up -d --wait postgres
DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55448/vgi_commit node --experimental-strip-types --test --test-concurrency=1 services/commit/test/deficiencies.integration.test.ts
COMMIT_PG_PORT=55448 docker compose -p vgi-rules-gate-tests -f services/commit/compose.yml down -v
node scripts/audit-alert-policy.mjs "$TMPDIR/rules-gate-audit-urgency" --urgency-only
(cd lean && xargs -r lake build < ../scripts/proof-map/extra-modules.txt)
scripts/proof-map/build.sh --readme
```

Results: default Lean build **631 jobs**; verification audit **84 theorems**,
no unexpected axioms; available agent suite **296 passed, 17 skipped**; final
gate/prompt subset **24 passed**; native retained regression **33/33 revisions**;
service units **10/10** and deficiencies integration **2/2**; app build passes;
targeted browser audit **11 states, 99 measurements, zero findings** (23 control
tests passed, 3 existing skips). Agent/service typecheck and lint pass.
Only `discard_listed` changes its theorem signature, adding the deadline bound;
its axiom print remains `propext`, `Classical.choice`, `Quot.sound`.

An initial unfiltered agent suite also found six tests in
`workload-capabilities.test.ts` blocked by absent `runs/world/2` and
`runs/world/2-original` schedules. They were not filled with synthetic stand-ins.
The initial missing app bundle and prompt-policy hash prerequisites were
resolved by building the app and refreshing both 35-context prompt golden sets
for the documented R1/R7 policy. Recording files remain unchanged. No certified
app source or lockfile changed; packaged WASM and recorded certificates were
not rebuilt or rebound here.
