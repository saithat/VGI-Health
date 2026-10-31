# world/ status

Full handoff: [`../HANDOFF-world.md`](../HANDOFF-world.md). This file lists what is unfinished and the
conventions other lanes must know.

## Unfinished (nothing dropped; all still in scope)
1. Merge `origin/lane/infra` (Synthea fixtures now exist: 174 patients, `fixtures/synthea/index.json`
   with `id` + `file` per entry) and run on the real population. Check P1 stays at 16-20 W1 visits,
   the P3 census is realistic (about 6-10), and P4/P5 volumes. Tune if needed.
2. Decide with the orchestrator whether to commit `runs/world/1/` (about 2.2 MB on the fixture).
   Regenerate it from the Synthea population first.
3. Replace the hand-written zod mirror (`src/schema.ts`) with, or check it against, the TS/zod that lane A
   generates from Lean. Align `src/formulary.ts` with `lean/Ehr/Formulary.lean` (drug key, weight ranges,
   high-alert flags, DEA schedules, MME factors).
4. Agree the note-section conventions below with lane A and the simulator, or get fields added to
   `OrderChoice`/`TaskChoices` (supply days, hold reasons, W6 sub-kind).
5. `PersonaParams` has a schema but is not emitted (not in the world brief; the simulator may want it).

## Conventions (pending Lean agreement)
- `OrderChoice.drug` is the lowercase generic name (as briefed). The core-model comment says "RxNorm code";
  `FORMULARY[drug].rxnorm` has the code if Lean keys by RxNorm.
- Doses: `doseTenths` in `unit`; hydrocodone-acetaminophen dose = hydrocodone mg. Pediatric doses are
  absolute mg computed from today's kg weight (mg/kg dosing), capped at `PEDS_DOSE_CAPS`.
- Routes: PO, IV, IM, SC, INH. Frequencies: once, daily, BID, TID, QID, q3h, q4h, q6h, q8h, q12h, q24h,
  nightly, TIDAC.
- Antibiotic indications are slugs (`community-acquired-pneumonia`, `surgical-prophylaxis`, ...); only
  antibiotic orders carry `indication`.
- `noteSections` entries are section ids, some with facts after colons: `hold:<drug>:<reason>`,
  `refused:<drug>:<reason>`, `painScore:<n>`, `painReassessment:<n>`, `sedationScore:<n>`,
  `prnReason:<reason>`, `supplyDays:<drug>:<days>`, `naloxoneOffer:accepted|declined`,
  `denyReason:<slug>`, `modifyReason:<slug>`.
- W6 sub-kind = first note section: `consultNote`, `hAndPUpdate` (pre-op), `briefOpNote` (op note +
  post-op order set), `progressNote` (rounding), `medRec` (discharge).
- W7: `refill` decision; `orders` only for `modify` (per core-model). The refill Task (FHIR) is in
  `todayResources`.
