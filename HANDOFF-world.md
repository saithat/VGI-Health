# Handoff: world generator (`lane/world`)

Worktree: `/home/saithat/Projects/VGI-world`. Edit world-owned files only.

## Completed in this continuation

- Read the prior handoff, brief, core model, changes, and Lean guidance.
- Merged `origin/main` (1f43d67); `origin/lane/infra` is already included.
  Merged lean-core CR-1 at 2637308 (merge 5cc4870), then its alert-click
  update 5457421 (merge a3e9860) and record-source/encounter-condition
  update 52206f9 (merge fba1122).
- c207c90: align all 25 drugs with Lean (classes, RxNorm, high-alert flags,
  mg/kg ranges, interactions, and MME factors); verify using Lean itself.
  Fix Synthea combination strengths, insulin brand names, extended-release
  oxycodone frequency, and cefdinir allergy class. Preserve unsupported drugs
  in `otherMedDisplays` instead of substituting different ingredients.
- d2cd527: export the agent loader's `world.json`, `personas/P*.json`, and
  `schedules/day-NN/P*.json` alongside the existing flat day schedules/states.
  Persona behavior matches the agent fixture defaults and BRIEF section 6.
- d5303af: run clinical, controlled-substance, cross-persona consistency and
  determinism checks on the actual 174-patient population (124 adult, 50
  pediatric, 17 penicillin-allergic). Correct weight-based albuterol to stay
  within Lean's range, with a 5 mg absolute cap.
- b6d3bf7: committed `runs/world/1/`: seed 1, ten days, 118 files,
  5,396,737 bytes. A regression check compares every committed state and both
  schedule layouts to fresh generation. The real agent loader reads this
  layout; both manifests enumerate/reference the expected inputs.
- TS enum values come from `lean/generated/ehr-types.ts`; every full-population
  schedule round-trips through the actual Lean FromJson/ToJson implementation
  (`world/test/lean/Contract.lean`). No mirrored executable safety logic or
  Lean proofs were added.

## Validation

Run Lean first, then world tests: the contract test starts one lake process.
Never run it alongside a separate Lean build.

```sh
cd lean && lake build
# return to repository root
pnpm --filter world build
pnpm --filter world lint
pnpm --filter world test
pnpm --filter world gen --seed 1 --days 10
```

Last checks: Lean build passes (81 jobs, existing axiom audit clean); world
build/lint and 81 tests pass. Agent typecheck/lint and all 31 tests pass too.
In this sandbox, pnpm's default store is outside writable roots. Installed
with `CI=true pnpm install --frozen-lockfile --store-dir /tmp/vgi-world-pnpm-store`;
used `pnpm --config.verify-deps-before-run=false --filter ...` for scripts to
avoid pnpm attempting to reinstall into its inaccessible default store.
No root pnpm files were modified.

Seed-1 volume check: P1 clinic days 17–20 W1; ED 12–22 arrivals; P4 12–22
visits including flu shots; OR days 2–4 cases. P3 shift census averages 9.1
(range 7–11; one urgent surgical overflow beyond the routine cap of 10).
Flu shots reserve slots; excess pediatric rechecks roll forward explicitly.

## Exactly what's left

1. **Typed-choice migration, waiting for lean-core's authoritative fields.**
   At the latest inspected `origin/lane/lean-core`, 52206f9, `OrderChoice` and
   `TaskChoices` still lack `supplyDays`, `curesExemptReason`, `holdReason`,
   `painScore`, `w6Step`, `refillReason`, and an imaging/procedure order kind.
   Merge the core commit once published, then migrate `world/src/schema.ts`,
   `build.ts`, `controlled.ts`, `clinical.ts`, the flows and their tests.
   Replace the existing clinical note-string conventions with typed fields,
   including refusal, reassessment, sedation, PRN reason and naloxone response
   wherever the core contract provides them. Keep genuine note-section IDs.
2. **Prior-auth work and replay refresh after item 1.** Emit actual typed
   imaging/procedure orders from P1/P5 (including after day-4 v1.1 release),
   test their kinds/codes and separation from medication administrations,
   regenerate `runs/world/1/`, run all checks, commit and push.

No other world tasks remain. `docs/design/changes-requests.md` records the
missing core contract plus the pediatric absolute-cap alert mismatch and
unsupported Synthea medication classes for the responsible lanes. Do not
weaken Lean's safety rule or edit another lane to resolve them.

## Current conventions until typed migration

`OrderChoice.drug` is the lowercase generic formulary name, not RxNorm.
`doseTenths` is in `unit`; the combination product's dose is hydrocodone mg.
Only antibiotic medication orders carry indication slugs. Defaulted fields
are always emitted, absent Option values are omitted, and schedules are
validated before writing. The current clinical metadata remains in
`noteSections`: `hold:<drug>:<reason>`, `refused:<drug>:<reason>`, `painScore`,
`painReassessment`, `sedationScore`, `prnReason`, `supplyDays:<drug>:<days>`,
`naloxoneOffer`, `denyReason`, and `modifyReason`.
W6 still uses the first section (`consultNote`, `hAndPUpdate`, `briefOpNote`,
`progressNote`, `medRec`) to identify its step. These conventions are exactly
the unfinished migration above, not a completed typed interface.

The world is deterministic: each day hashes seed/day/previous state; use
independent RNG streams, never Math.random or wall-clock dates. Regenerate
the committed run whenever generator output changes.
