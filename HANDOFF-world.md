# Handoff: world generator (`lane/world`)

Worktree: `/home/saithat/Projects/VGI-world`.

## Exactly what's left

**Requested world work: nothing left.** The full Synthea population, typed
clinical choices, P1/P5 imaging/procedure orders, persona exports, Lean contract
checks, and the committed seed-1 ten-day run are complete and pushed.

**External follow-up (lean-core):** add `maxDoseMgTenths := 50` for albuterol.
The precise request is in `docs/design/changes-requests.md`. World correctly
caps pediatric nebulizer doses at 5 mg; core's generic cap is still 0, so three
adolescent prescriptions in the seed-1 run can cause a false low-dose alert.
World's `DrugDef.maxDoseMg` currently mirrors core's 0 exactly. Once the core
entry lands, merge it, update that local reference value to 5, and rerun the
formulary contract check. Do not raise doses or weaken a safety rule to avoid
this alert. The other six generic pediatric caps are integrated.

## Completed in this continuation

- Merged main 1f43d67 (including all Synthea fixtures); infra is already included.
  Merged lean-core through f88c623 (including fb1ed8c typed decisions, service
  orders/dose caps, boundary exports and human alert clicks),
  preserving checker/content/core requests when resolving the shared request
  document's add/add conflict. World did not directly edit other lanes.
- c207c90: align all 25 formulary entries with Lean: generic keys, RxNorm,
  classes, high-alert flags, dose ranges, interactions, MME factors and the
  controlled-II-IV class/DEA schedule correspondence. Fix Synthea combination
  strengths, insulin brand names, extended-release oxycodone, and cefdinir
  allergy class. Preserve unsupported ingredients in `otherMedDisplays`.
- d2cd527: export the agent loader's native layout and persona behavior;
  test using the actual agent loader, with deterministic regeneration and
  stale-day removal. Expand cross-persona checks to real Synthea.
- d5303af: clinical/controlled-substance and determinism checks on real Synthea;
  fix weight-based albuterol to honor Lean's mg/kg range before absolute caps.
- b6d3bf7: commit the complete seed-1 replay, initially under the old contract.
- ab800c2: migrate to the typed core fields, emit service orders and structured
  clinical FHIR observations, and refresh the replay. Clone same-day discharge
  prescriptions so supply metadata does not leak into the earlier post-op set.

## Run and consumer layout

`runs/world/1/` is generated from `fixtures/synthea/index.json`: 174 patients,
124 adults, 50 pediatric, 17 penicillin-allergic; seed 1, ten workdays starting
2026-11-02. It contains 1,284 tasks in 118 files, 5,476,411 bytes (< 15 MB):

- `world.json`: `{seed, days, personas}` for `agent/src/world.ts`.
- `personas/P1.json` … `P5.json`: PersonaParams matching the agent defaults
  and BRIEF section 6. Behavior parameters do not change clinical choices.
- `schedules/day-01/P1.json` … `day-10/P5.json`: agent-compatible DaySchedule.
- `day-1-P1.json` … `day-10-P5.json`: identical flat schedule aliases.
- `state-day-0.json` … `state-day-10.json`: world-owned carry-over state.
- `manifest.json`: fixtures/source, patient counts, per-day loads and all files.

Fixture paths in the manifest are relative to the repository root. No patient
bundles are copied into the run (the committed source fixtures are reused).
Every committed state and both schedule layouts are checked against fresh
output, and every schedule round-trips through the actual Lean JSON decoder
and encoder. TS enum values come from generated Lean TS. No Lean proof or
mirrored executable safety logic was added by world.

Volumes: P1 clinic days 17–20 W1 visits; ED 12–22 arrivals; P4 12–22 visits,
including flu shots; OR days 2–4 cases. P3 shift census averages 9.1 (7–11,
with one urgent surgical surge above the routine cap of 10). Excess pediatric
rechecks roll forward explicitly; flu-shot visits reserve capacity.

After the day-4 v1.1 release, the replay has 8 P1 imaging + 8 P1 procedure
orders, and 7 P5 imaging + 5 P5 procedure orders. Service codes are internal
demo catalog slugs (not claimed to be CPT codes). P1 covers MRI/therapy and
screening referrals; P5 covers surgical imaging and booked procedures.

## Typed conventions

- Medication `drug` is the lowercase generic formulary name. `doseTenths` is
  in `unit`; hydrocodone–acetaminophen uses the hydrocodone component's dose.
- Imaging/procedures use `kind`, a nonempty `code` and an indication, with
  empty `drug`, zero dose, unit `none`, empty route/frequency, and `prn=false`.
  Services never appear in `administer` or active ward regimens.
- `OrderChoice.supplyDays` and `curesExemptReason` carry outpatient controlled
  Rx facts. Short ED/postoperative supplies (<=7 days) have setting-specific
  exemption slugs. Chronic prescriptions do not receive that exemption.
- `holdReason` applies per order. `patient-refused` distinguishes refusal;
  other slugs describe holds. Held admission orders are emitted in the task,
  excluded from the active regimen; held/refused ward doses stay in the task's
  `administer` decisions with their reason, not as actual given doses.
- `TaskChoices.painScore` carries pre-dose and reassessment scores; the latter
  also has the genuine note-section ID `painReassessment`. `w6Step` is
  consult/preop/postop/rounding/discharge. `refillReason` carries deny/modify
  reasons. Approval renews the contained FHIR prescription (with 30-day supply
  for controlled refills); modification supplies a replacement typed order.
- Clinical metadata with no dedicated core field uses `Observation` resources
  in `todayResources`, coding system `urn:vgi:world:clinical`:
  `naloxoneOffer` (coded accepted/declined), `prnReason` (coded nausea/anxiety),
  `sedationScore` (integer). IDs are task-derived and timestamps use task time.
  No clinical facts remain encoded in colon-delimited note-section strings.
- Defaulted JSON fields are always emitted; absent Option fields are omitted.
  The strict world schemas reject mixed drug/service representations.

## Validation and commands

Run Lean first, then world tests: the contract suite starts exactly one lake
process. Never run it alongside another Lean build.

```sh
cd lean && lake build
# return to repository root
pnpm --filter world build
pnpm --filter world lint
pnpm --filter world test
pnpm --filter world gen --seed 1 --days 10
```

Last checks: Lean build passes (81 jobs, its existing axiom audit reports only
propext/Classical.choice/Quot.sound); world build/lint and all 92 tests pass.
The actual agent world loader is exercised by the CLI integration test.
Agent typecheck/lint and all 31 tests pass with the typed core contract.

Sandbox pnpm note: its default store is outside writable roots. Installed with
`CI=true pnpm install --frozen-lockfile --store-dir /tmp/vgi-world-pnpm-store`;
used `pnpm --config.verify-deps-before-run=false --filter ...` for scripts to
avoid an automatic reinstall into the inaccessible default store. No root
pnpm files were directly modified.

Determinism: each day hashes seed/day/previous state. Use independent RNG
streams, never Math.random or wall-clock dates. Regenerate the committed run
whenever generator output changes. Existing tests also cover admissions to
P3, discharge follow-ups, pending results, surgical flow and pediatric growth.
