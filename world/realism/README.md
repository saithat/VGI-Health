# Deterministic clinical data

The imported Synthea and Synthetic Hospital bundles remain immutable scenario
inputs. Generation emits reconciled chart overlays in fixtures/clinical and
shared FHIR day graphs in runs/world/2/context. The precise consumer contract
is in docs/design/presentation-contract.md under World data.

Run from the repository root:

    pnpm --filter world gen --seed 1 --days 10
    pnpm --filter world test
    pnpm --filter world typecheck
    pnpm --filter world lint
    node world/realism/task-diff.mjs
    LEAN_NUM_THREADS=4 python3 lean/Ehr/Sim/cli_smoke.py --days 10 --jobs 2 --seed 7 --require-complete --report runs/world/2/validation-realism.json

If needed, build the native binary with LEAN_NUM_THREADS=4 lake build ehr from
lean/. No Lean source changes are required.

Seed all 324 reconciled charts and one selected demonstration day's collections:

    node world/realism/seed.mjs --day 1 --dry-run --report runs/world/2/live-reseed-plan.json
    node world/realism/seed.mjs --day 1 --report runs/world/2/live-reseed.json
    node world/realism/seed.mjs --day 1 --report runs/world/2/live-reseed-repeat.json

The shared stack must already contain the imported cohorts and setup personas.
This loader binds immutable source identifiers, timestamps and clinical codes;
missing or ambiguous imports must be resolved before seeding. It creates new
resources conditionally in topological batches of eight, updates only source
reconciliation fields and owned context using version checks, and retains the
original extracted refill prescription focus. Superseded owned synthetic
plans/requests are revoked. It never resets the stack or deletes a resource.
Repeated seeding of the same data must report zero creates and zero updates.

The live demo is seeded for day 1; all ten days are available as dated Bundles.
Select collections by their List and day/persona tags, rather than combining
all seeded days into one census. Source clinical changes are shared across days.
The fixed original simulator episodes remain single-patient tasks. The overlay
is an authored synthetic chart review, not inferred treatment recommendations.
