# Data lane: Synthetic Hospital

Phase 1 imports historical charts. Phase 2 is implemented; see the completion
record below. Phase 1 did not modify Lean or WASM; Phase 2 rebuilds both.
Build with `LEAN_NUM_THREADS=6`, one Lake invocation at a time. No world files
were changed.

## Phase 1 artifacts and operating commands

- Immutable source manifest: `scripts/synthetic-hospital/source.json`, upstream
  commit `911f34c4ac65a508543c4b3b90c373a0cd16534d`, SHA256 for both downloads.
- `make synthetic-hospital`: fetch cached upstream files and convert with Node
  and Python3 only. Tests: `make test-synthetic-hospital`.
- 150 committed FHIR transaction bundles plus index in
  `fixtures/synthetic-hospital/`, under 10 MB uncompressed. The complete source
  has 1,268 patients, including 248 under 18. Primary selections are 30 each
  for P1–P5; overlapping fit counts are P1 95, P2 120, P3 51, P4 34, P5 90.
- `make load-synthetic-hospital` loads that exact committed cohort using the
  existing infra credentials. `make seed SYNTHETIC_HOSPITAL=1` and
  `make install SYNTHETIC_HOSPITAL=1` opt in; ordinary seed/install retain the
  existing default. No download is needed to load committed fixtures.
- `node infra/scripts/load-synthetic-hospital.mjs --verify-only` checks tagged
  resource counts and unique upstream identifiers. A full rerun exercises
  conditional creates; no resets, deletes, or clinical writes are needed.
- Medplum 5.2.13 permits at most eight entries in a transaction with conditional
  creates. `infra/scripts/synthetic-hospital-batches.mjs` chunks in dependency
  order and rewrites cross-chunk references using response locations. Each
  chunk is atomic; the whole patient import is resumable, not one atomic write.
  Provenance is last, after all of its referenced resources. Patient identifier
  is exactly `urn:vgi:synthetic-hospital|<patient_id>`. Condition search keys are
  hashed: punctuation in diagnosis names must never become FHIR token operators.
- The live app already searches all Medplum Patients and retrieves notes,
  MedicationStatements, procedures and social observations. It now also loads
  FamilyMemberHistory in the patient bundle. Imported historical encounters
  stay finished; use patient search from any persona to open their charts.
  Active work queues remain generated from world schedules, not invented from
  historical notes. Phase 1 adds no fake admissions, orders or administrations.
- Offline catalog entries carry `source` and a validated `bundlePath` for both
  cohorts. `/browse` has a Synthetic Hospital source filter; production copies
  both fixture directories. Existing Synthea defaults remain first in the list.
- Live smoke: start `pnpm --filter app exec vite --port 5195 --strictPort`, then
  `node scripts/synthetic-hospital/verify-live.mjs`. It uses one Chromium browser,
  sequentially signs in with P1–P5 persona buttons, searches for a primary-fit
  patient, opens the real chart, verifies the offline source filter and replay,
  and saves `app/shots/synthetic-hospital-chart.png`. It does no clinical writes.

Source/code caveats, timestamp handling, mapping rules, commands and citation:
`scripts/synthetic-hospital/README.md`. Integer source ages are approximate at
our reference date; candidate timelines before approximate DOB are excluded.
Original note text is verbatim, including unshifted source dates. Structured
Encounter/DocumentReference dates are shifted; each note discloses that shift.
Codes are upstream assertions, not independently clinically validated codes.

## Phase 2: Notes and imported history in the certified chart

Current seam: `loadPatientBundle` includes DocumentReference and history records;
`Ehr.Render.Fhir.displayOf` currently ignores DocumentReference,
MedicationStatement, FamilyMemberHistory and social observations. The existing
`priorNotes` info and Notes tab exist in V1/canonicals, but have no note rows.
`currentMeds` currently projects MedicationRequest only. Do not fabricate orders
from home medications to make them visible. The semantic renderer is
`Ehr.Render.renderUi`; `Page.render` also remains a supported HTML output.
The plan must update both and rebuild WASM before UI validation.

1. **Display schema** (`lean/Ehr/Specs/ClinicalTables.lean`, namespace
   `Ehr.Specs.ClinicalTables`): add exactly these optional `InfoSpec` definitions,
   then include them once in `infos`:

   ```lean
   def encounterNotes : InfoSpec :=
     { id := "encounterNotes", label := "Notes", version := "notesVersion"
       payload? := some { rowFields := ["date", "type", "author", "encounter",
         "title", "text", "status", "sourceDate", "shiftDays"] } }
   def importedHistory : InfoSpec :=
     { id := "importedHistory", label := "History", version := "historyVersion"
       payload? := some { rowFields := ["kind", "item", "detail", "status", "source"]
         groupBy? := some "kind" } }
   ```

   Preserve `priorNotes`, `noteSummary` and all mandatory review contracts.
   Do not add a second `InfoSpec` with the existing `priorNotes` ID. Supply its
   missing row schema through `columns`/`withSchema` and render it as an alias of
   `encounterNotes`; new optional schema metadata must not manufacture receipts.

2. **Typed display rows** (`lean/Ehr/Render/Types.lean`, namespace `Ehr.Render`):
   add `structure NoteRow` with String fields `id`, `date`, `noteType`, `author`,
   `encounter`, `title`, `text`, `status`, `sourceDate`, `shiftDays`, `versionId`.
   Add `structure HistoryRow` with String fields `id`, `kind`, `item`, `detail`,
   `status`, `source`, `versionId`. Add `Display.notes : List NoteRow` and
   `Display.history : List HistoryRow` and initialize both to `[]` in
   `Display.empty`. Extend derived JSON instances in `Render/Json.lean` and every
   explicit Display literal; regenerate TS types/validators using the existing
   exporter, never hand-edit generated contracts. These are display records,
   not new clinical evidence or new Facts guards.

3. **Total FHIR projection** (`lean/Ehr/Render/Fhir.lean`, namespace
   `Ehr.Render.Fhir`): add the following exact definitions:

   - `isDocumentReference (r : Json) : Bool`
   - `documentVisible (r : Json) : Bool` (exclude entered-in-error; retain
     superseded/amended notes and display their status)
   - `decodeBase64Utf8 (s : String) : Option String` (pure, total, computable;
     use the existing Lean library implementation if available; otherwise add
     bounded structural byte decoding and strict UTF-8 validation)
   - `noteAttachmentText (a : Json) : String` (inline text/plain data only;
     decode failures, missing data and URL-only attachments get explicit text
     such as “Note body unavailable”; never fetch a URL or interpret HTML)
   - `noteRow (r : Json) : NoteRow` (all attachments retained in source order;
     concatenate their labeled text, join author displays and encounter refs;
     date = DocumentReference.date, else context.period.start, else creation;
     read original-date/shift extensions when supplied, without inferring them)
   - `noteRows (rs : List Json) : List NoteRow` (one row for every visible
     DocumentReference, newest date first; missing dates sort last)
   - `medicationStatementHistoryRow (r : Json) : HistoryRow`
   - `familyHistoryRows (r : Json) : List HistoryRow` (one row per condition;
     retain a row even when conditions are absent)
   - `socialHistoryRow (r : Json) : HistoryRow` (social-history category,
     generic CodeableConcept label and value; no source-specific patient logic)
   - `procedureHistoryRow (r : Json) : HistoryRow`
   - `historyRows (rs : List Json) : List HistoryRow` (reported home medications,
     family, social and surgical history; include unknown/text-only values;
     explicitly label MedicationStatement as reported history, not an order)
   - `notesVersionOf (rs : List Json) : Nat` and
     `historyVersionOf (rs : List Json) : Nat`, using the existing sorted
     `id@versionId` digest convention. Add default-zero `notesVersion : Nat`
     and `historyVersion : Nat` fields to `Ehr.Facts` in `Core/Types.lean`;
     extend `Ehr.factVersion` in `Core/Basics.lean` with those two named cases.
     Update `factsOf` to populate them and `displayOf`'s two new fields.
     This is a future core/data-format change; coordinate it with the core lane
     and regenerate Core JSON/TS defaults and round-trip fixtures. Do not let display versions create review
     receipts or trusted clinical facts.

   Also render the already-imported Conditions through existing problem rows
   and Coverage through the banner; keep absent dates visibly unknown.

4. **Rendering** (`lean/Ehr/Render/Ui.lean`, namespace `Ehr.Render`): add
   `noteCells (r : NoteRow) : List (String × String)` and
   `historyCells (r : HistoryRow) : List (String × String)`; extend `uiRows` for
   `"encounterNotes" | "priorNotes"` and `"importedHistory"`. Extend existing
   familyHistory/socialHistory/surgicalHistory views from the generic history
   projection, so W1/W5 history tabs also show imported data. In `Page.lean`
   extend `infoContent` with matching read-only tables. Retain this existing definition and do not introduce a second rendering path.
   Text must remain escaped through existing `.text` nodes. Preserve paragraphs
   with existing allowed text/row elements, without HTML injection or content
   clipping. No React clinical adapters or custom note renderer.

5. **Chart review navigation**: update `Ehr.Canonical.home` in
   `lean/Ehr/Canonical/Program.lean`: bind the existing Notes tab to
   `encounterNotes`, and add a History tab bound to `importedHistory` using the
   existing `tabStrip`. Keep workflow-local `priorNotes` routes as aliases.
   Verify D5 group limits and re-project P1–P5. Update corresponding blueprint
   placements only where the blueprint supplies this chart-review shell.
   Do not rewrite historical recorded programs/certificates; aliases let those
   programs show the new data on their existing note/history components.

6. **Proofs and tests**: add `noteRows_complete` and `T11_note` beside the
   existing FHIR row-coverage proofs; add `uiNotes_complete` in UiProofs and
   `T11_notes_rendered` in PanelProofs, with hypotheses for a shown Notes info
   component. Cover UTF-8/base64, missing attachment data, URL-only and wrong
   MIME types, all statuses, multiple authors/attachments, equal/missing dates,
   shifted source dates, text-only codes and every history resource kind.
   Re-run native/WASM equivalence, painter/tree and ARIA fidelity, and render
   one imported P1 and one P4 chart with notes/history. Assert count equality
   with the bundle and that text-only drugs remain visible as reported history.
   Keep all clinical guards, seeded-bad rejections and axiom audits intact.

7. **Build/deploy only after the heavy lanes finish**: coordinate the build
   slot, build Lean with the documented memory/thread limits, export releases
   and generated types, rebuild/install WASM, regenerate its asset manifest,
   re-certify affected current programs, run app build/lint/test and screen
   checks, then repeat the single-browser live smoke and save a Notes screenshot.

## A later simulation world

Leave world 2 to the sim lane. A future world generator can take the committed
index as an optional second population source, using `sourceId`, `identifier`,
`bundlePath` (or directory + file), age, flags and overlapping persona fits.
First extend the world's loader to consume these FHIR types, approximate DOB
metadata, shifted encounter dates and text-only terminology honestly. Generate
new schedules/clinical choices independently: historical narrative text is not
an order, a current admission, a verified dose, or a measured vital sign. Preserve
source tags/provenance and keep this cohort separate from held-out evaluation.
No existing world manifest, schedule or state should be modified implicitly.

## Orchestrator addition
- Imported home medications are MedicationStatement resources, but the chart's "Active medications" reads MedicationRequest, so imported patients show "No records on file". Phase 2 must surface MedicationStatement as home medications (Render/Fhir facts), labeled as home/reported meds.

## Phase 2 completion record

- Implemented `encounterNotes` / `importedHistory`, typed `NoteRow` /
  `HistoryRow`, total FHIR projection, and both certified renderers. Inline
  plain-text notes retain attachment order, author/encounter information,
  paragraphs, status, and explicitly supplied original-date/shift extensions.
  Malformed base64/UTF-8, missing data, external URLs, and other MIME types
  produce explicit unavailable-body text. Entered-in-error notes are excluded;
  superseded/amended notes remain visible. Unknown dates stay visibly unknown.
- Home medications remain MedicationStatement history. They appear under
  **Home medications (reported)** and in History; `currentMeds`, active-order
  rows, and medication guard evidence still come from MedicationRequest.
  Family, social, and procedure history use generic FHIR readers. Conditions
  and Coverage use the existing problems/banner projections.
- Core edits are exactly the two default-zero Facts fields and the two
  `factVersion` cases. `Ehr/JsonCompat.lean` supplies missing JSON version fields
  outside Core, since Lean's derived readers do not honor structure defaults.
  Malformed supplied versions still fail. Old display JSON defaults only the
  two absent row lists. No review receipts or clinical facts are manufactured.
- Added and audited note row/UI/Page completeness proofs; extended the existing
  renderer Comparator audit. Edge tests cover decoding, statuses, attachments,
  authors, dates, source extensions, text-only drugs, and all history kinds.
- Regenerated contracts with `gents`, current release canonicals and all fifteen
  persona projections, and certification/verdict artifacts. The sample exporter
  now skips full-profile fields absent from the default core profile; its three
  generated P1 UI fixtures were refreshed from the current release.
- `git fetch origin && git merge origin/main` ran before the final build;
  origin/main was already included. Lean default build, `lake check`, repository
  Comparator, `make wasm`, `make wasm-check`, all 15 persona checks and all 17
  seeded-bad rejections passed. App build/lint and all 153 tests passed; all 12
  Synthetic Hospital import tests passed.
- `verify-projection.mjs` checks imported P1/P4 chart counts, full note bodies,
  separate reported medications, and native/WASM equality for both Page and
  semantic UI. P1: 8 notes, 2 home medications, 8 history rows. P4: 3 notes,
  0 home medications, 6 history rows. Desktop/narrow imported-chart UI visibility
  and ARIA checks passed (17 tests; 3 standard duplicate-project skips), as did
  all 8 Page visibility checks.
- The live script passed P1–P5 using Vite on 5195, with no browser errors or
  clinical writes. Screenshot: `app/shots/synthetic-hospital-notes.png`.
- `pnpm trajectories --run run1-P3 --verify-only`: 424 tasks / 14,658 events,
  plus 3 baselines / 137 events, **0 mismatches**. Only the verification report's
  WASM provenance hash changed. Historical programs, certificates, contexts,
  traces, and world data were not rewritten. Existing `priorNotes`,
  `socialHistory`, and `surgicalHistory` components now display their FHIR rows;
  the reported-medication group appears only when MedicationStatements exist.
  Screen IDs, selected tabs, transitions, and interpreter results are unchanged.
- Full renderer differential suite passed: 324 Synthea + Synthetic Hospital
  bundles and all 652 canonical HTML/semantic UI variants, including actual RN
  wristband acceptance/rejection and error envelopes. Both the repository
  Comparator and the extended renderer Comparator accepted the implementation
  using only `propext`, `Quot.sound`, and `Classical.choice`.
- Final WASM SHA256:
  `ca6e5a828edc038c54f583ef9f47e7b723368307d157269d470730b288027720`.
  Its rebuilt source manifest is current, and its hash matches the fresh
  trajectory verification report. Generated TypeScript samples typecheck.
- World 2 remains deferred to the simulation lane, as requested.
