# Handoff: world generator lane (`lane/world`)

Worktree: `/home/saithat/Projects/VGI-world`, branch `lane/world` (pushed to `origin/lane/world`).
Package: `world/` (pnpm workspace member, strict TS, zod, vitest).

## How to build and test
```
pnpm install                                   # from the repo root
pnpm --filter world typecheck                  # tsc --noEmit (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
pnpm --filter world lint                       # eslint: bans any, !, `as` casts (as const allowed), ts-ignore
pnpm --filter world test                       # vitest: 52 tests, < 1 s
pnpm --filter world gen --seed 1 --days 10     # writes runs/world/1/ and prints the day-1 summary
#   options: --fixtures <index.json>  --out <dir>  --quiet
```
The CLI uses `fixtures/synthea/index.json` if it exists, else `world/test/fixtures/index.json`.
Output per seed: `state-day-0.json` (initial world) … `state-day-<d>.json`, `day-<d>-<P1..P5>.json`
(DaySchedule, validated with zod before writing), `manifest.json`.

## Done (commits on lane/world)
- `519791f` Generator skeleton, all flows, CLI, controlled substances, 10-patient fixture.
- `21f2535` vitest suites plus fixes (late-morning surgical discharge, strep dosing, no type assertions).
- (this commit) `world/STATUS.md`, this handoff.

What exists, by brief item:
1. **Input.** `src/patients.ts` reads index.json leniently (array or `{patients|entries|items}`; entry
   `id`/`patientId`/`medplumId` + `file`/`bundle`/`path`/`bundlePath`/`filename`) plus FHIR bundles
   (collection or transaction, `urn:uuid:` refs, multi-patient bundles). It extracts age, sex, condition
   tags, home meds mapped to the formulary, allergy classes, latest weight, labs, and immunizations.
   Test fixture: `world/test/fixtures/` (10 patients: HTN/DM adults, 2 pediatric, PCN-allergic, warfarin,
   apixaban, appendicitis candidate, chronic oxycodone + alprazolam). It was generated once by a script
   kept outside the repo; the JSON is now hand-maintained.
2. **World state** (`src/state.ts`, `src/world.ts`). ED arrivals and census; admissions (census for P3,
   with time-sliced regimens: scheduled passes, PRNs, insulin, heparin); discharges that create P1
   follow-ups and pending labs for P1's in-basket; refill requests; the carried-over in-basket backlog
   (fixed capacity per burst, so it does not depend on the UI); pediatric growth (weight per child per
   day); the surgical flow (P2 consult → P5 consult + admit → OR next day → P3 meds → P5 rounds →
   discharge → P5 post-op visit + P1 follow-up). Elective cases are booked from P5 clinic.
3. **Schedules** (`src/flows/*.ts`). P1 `clinic.ts`: 16-20 W1 visits, W2 and W7 bursts before clinic, at
   lunch, and after clinic; day 5 is urgent care. P2 `ed.ts`: W3 with lb triage weights in
   `todayResources`, order sets, dispositions. P3 `ward.ts`: W4 passes at 07:30/09:00/12:00/14:00/17:00/
   18:00, PRNs with pain score and reassessment, holds and refusals, handoff. P4 `peds.ts`: W5 with kg
   weights, mg/kg doses, CVX immunizations, rechecks. P5 `surgery.ts`: odd days clinic (W1 post-op
   variant), even days OR (W6 consult, pre-op, op note + post-op order set, rounding, discharge), plus
   a light W2 in-basket.
4. **Clinical choices** fixed per scenario: formulary in `src/formulary.ts` (25 drugs: the original 20
   plus oxycodone, hydrocodone-acetaminophen, tramadol, lorazepam, alprazolam), helpers in
   `src/clinical.ts`. PCN allergy: amoxicillin → azithromycin, cefazolin → vancomycin 15 mg/kg.
5. **Variability** (`src/context.ts`). Monday surge, one quiet weekday per week, a flu week chosen by the
   seed, noise, allergy share, lb share, interruptions, no-shows, add-ons, new vs established patients.
   The day seed is `hash(seed | day | hash(previous state))`; each subsystem uses its own RNG stream.
6. **CLI** (`src/cli.ts`, `src/summary.ts`).
7. **Tests** (`world/test/`): determinism (identical output; day d independent of `--days`), cross-persona
   consistency (admissions on the next day's P3 census with tasks; every discharge has follow-ups that are
   kept; discharge labs reach P1; the scripted surgical flow end to end), and zod shape checks against
   core-model section 7, plus clinical and controlled-substance checks and a Synthea-style loader test.
8. **Controlled substances** (coordinator message, owner-approved; `src/controlled.ts`). All four
   requested scenario groups exist:
   - P2 ED discharge opioids: renal colic (oxycodone), fracture (hydrocodone-APAP), back pain (tramadol),
     panic attack (lorazepam), chronic-pain flare. Supplies are mostly ≤ 7 days (CURES-exempt), some 10-14.
   - P5 post-op discharge opioids: oxycodone (hydromorphone for some), 3/5/7-day supplies, higher dose if
     opioid-tolerant.
   - P1 chronic opioid patients: from the record (fixture p10) or world-assigned to reach 5% of adults
     (minimum 2). Some have a concurrent benzodiazepine. Monthly W7 refill requests (approve, taper, or
     deny for early refill or multiple CURES prescribers) and chronic-pain W1 visits. World-assigned meds
     are emitted as FHIR MedicationRequests in `todayResources`.
   - P3 inpatient PRN opioids (oxycodone PO, morphine/hydromorphone IV); home opioids and benzodiazepines
     are continued; some patients get a lorazepam PRN.
   Facts go in note sections: `supplyDays:<drug>:<n>`, and `naloxoneOffer:accepted|declined` only when the
   world's own check applies (MME ≥ 90 by CDC factors, or opioid with a benzodiazepine).

Sample output (seed 1, test fixture, day 1): P1 29 tasks (19 W1, 4 W2, 6 W7), P2 21 W3 (3 lb weights),
P3 8 W4, P4 21 W5, P5 18 (15 W1, 3 W6); 97 tasks total. 62 files, about 2.2 MB for 10 days.

## In progress
Nothing is half-written. All tests pass and typecheck and lint are clean at this commit.

## Remaining tasks (from the original brief and the controlled-substance message; none dropped)
1. **Merge `origin/lane/infra`** (`git fetch origin && git merge origin/lane/infra`). Synthea fixtures now
   exist: `fixtures/synthea/index.json` (174 patients: 124 adults, 50 pediatric), entries with `id` and
   `file`. The loader should read them as is; verify it. Then run `gen` on the real population and check:
   P1 W1 in 16-20 on clinic days; P3 census about 6-10 (cap is `maxCensus` in `flows/common.ts`, 30% of
   adults, max 16); P2 about 12-22 arrivals; P4 12-22 visits; P5 OR days have 2-4 cases. Check Synthea med
   displays map (`MED_RULES` in `patients.ts`; for example "Hydrocodone Bitartrate 10 MG / Acetaminophen
   325 MG", insulin brand names, Synthea's opioid module drugs) and allergy displays (penicillin variants).
   Run the tests against Synthea too (they currently use the fixture via `test/helpers.ts`); add a
   Synthea-population test if fast enough.
2. **Commit generated runs?** Decide with the orchestrator whether `runs/world/<seed>/` is committed (the
   demo replays from `/runs/`). If yes, regenerate from Synthea and commit with the manifest.
3. **Lean alignment** (needs lane A): replace `src/schema.ts` with, or check it against, the generated
   TS/zod; align `src/formulary.ts` with `Ehr/Formulary.lean`; confirm `OrderChoice.drug` is a generic
   name, not RxNorm.
4. **Agree conventions or add fields** (lane A + simulator): supply days, hold/refusal reasons, pain and
   sedation scores, W6 sub-kind, refill deny/modify reasons, the naloxone response. They are note-section
   strings now (see `world/STATUS.md`). If fields are added to `TaskChoices`/`OrderChoice`, update
   `schema.ts`, the flows, and the tests.
5. **Optional, not in the world brief:** emit `PersonaParams` (schema exists) if the simulator wants the
   world to own them.

## Known pitfalls
- **Determinism:** never use `Math.random`, `Date.now`, or iteration over unsorted sets/maps for
  decisions. Use `b.rng(label)` or `rng.fork(label)`. Adding draws to one stream shifts only that
  subsystem. Changing the order of draws changes outputs; the determinism tests still pass, but any
  committed runs must then be regenerated.
- **Lean JSON:** derived `FromJson` does not fill defaults, so every defaulted field (`orders`,
  `administer`, `ackResult`, `immunizations`, `noteSections`, `prn`, `todayResources`, `interruptions`)
  is always emitted. `Option` fields are omitted when `none`. Keep using `choices()` in `build.ts`.
- **Tiny populations:** the fixture has 8 adults, so patients repeat within a day. The census cap and the
  elective cap scale with population size. Inpatients are never picked for clinic or ED (picker blocks).
  A test asserts this.
- **Pediatric dose caps:** heavy teens hit absolute caps (`PEDS_DOSE_CAPS`), so mg/kg can fall below the
  range minimum. That is correct dosing, but Lean's `DrugInfo` has no absolute cap, so its
  `doseOutOfRange` alert would fire falsely. Raise this with lane A.
- **No hospitalist persona:** the world discharges medical inpatients (`dischargeMedicine`) at a planned
  day and clock. Surgical inpatients are discharged by P5's W6 discharge task.
- **"Every discharge creates a follow-up"** covers hospital and same-day-surgery discharges. ED discharges
  create P1 follow-ups only for P1-panel patients, with a per-scenario probability.
- **Prior auth (release v1.1, day 4):** `OrderChoice` cannot express imaging or specialty orders, so the
  world has no prior-auth-relevant orders beyond drugs. Flag this if lane A/agent needs them.
- **Shared files touched:** root `pnpm-workspace.yaml` (added `allowBuilds: esbuild: true`, which pnpm 11
  requires) and root `pnpm-lock.yaml`. Expect lockfile merge conflicts with other lanes; resolve by
  re-running `pnpm install`.
- `structuredClone(prev)` in `advanceDay` keeps `prev` immutable; flows mutate only the cloned `state`.
