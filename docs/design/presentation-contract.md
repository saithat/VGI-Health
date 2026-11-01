# Structured clinical presentations

Stable additive contract for the ambulatory, acute, surgical, shell and presentation lanes. Initial version: 2026-11-01. The Lean semantic tree remains the proof target. No specification or clinical guard changes are required to use a presentation.

## Selection and wire

A normal `.panel infoId`, `.table infoId` or `.trend infoId` selects a structured presentation with its component tag: `present.<kind>` (a longer tag ending in `.present.<kind>` is also accepted). Existing tags and kinds continue working. The renderer emits `UiNode.presentation kind [info]`, where `kind` is the closed `UiPresentationKind` enum below. The inner `info` retains its exact component ID, clinical label, info ID, display and **all** original rows. It is an ordinary semantic info node for D2/T11. The wrapper provides layout, never visibility or clinical meaning. Sidebar summaries retain their compact list presentation.

| Kind / tag suffix | Rows and intended use |
| --- | --- |
| `table` | General record table; column order is first appearance of row keys. |
| `schedule` | Time, Patient, Age/sex, Visit type, Status, Chief complaint, Provider, Location. |
| `trackBoard` | Room, Patient, Age/sex, Chief complaint, Acuity, Arrival, LOS, RN, Provider, Labs, Imaging, Disposition, Status. |
| `orSchedule` | Room, Start, Procedure, Patient, Surgeon, Status. |
| `worklist` | Due, Patient, Task, Priority, Status, Owner. |
| `timeGrid` | Medication, Dose, Route, Frequency, then date/time columns. Each time cell contains the supplied status and actual dose/time. |
| `flowsheet` | Measure, Unit, then date/time columns. Empty cells are missing, never normal or zero. |
| `folderList` | Folder, Count, Unread, Status. Count is a supplied value, never a browser calculation. |
| `messages` | Received, Patient, Subject, From, Priority, Status. |
| `results` | Test, Value, Unit, Flag, Range, Recorded, Status. Full trend rows remain visible with their original keys. |
| `trend` | Test/Measure, Value, Unit, Recorded. Separate series for each measure and unit. |
| `growth` | Date, Age (months), Weight (kg), Height (cm); optional reference rows: Series, Percentile, Age (months), Value, Unit, Reference. Never invent percentile curves. |
| `notes` | Date, Type, Author, Encounter, Title, Text, Status, Source date, Shift days; cards preserve every field. |

Rows are the existing ordered `List (List (String × String))`, not a JSON string embedded in a field. All additional keys survive and remain visible. Unknown kinds fall back to the existing info presentation. Labels and keys are case-sensitive; the names above are the recommended shared schema, not a filter. Empty views say `No records on file`.

## Sources and defaults

An explicit info payload from `Facts` supplies work queues, department boards and messages through the existing `InfoPayload.fields`/`rows[].fields` contract. Resource IDs, component IDs, references and artifact keys must never be added as visible columns. Human clinical names belong in display fields. A payload has precedence over a FHIR-derived queue when it is present; never mix another patient's chart into a board row implicitly.

Typed FHIR projections in `Render/Fhir.lean` supply Appointment day-list rows, Encounter board rows, MedicationRequest order detail plus **explicit** dosage timing events, MedicationAdministration actual-dose/status rows, and Observation series for flowsheets. No `active` MedicationRequest becomes a `Given` dose. No administration becomes a scheduled dose. No frequency is expanded into invented administration times. Department data must arrive in the supplied bundle or explicit payload. Missing ESI, RN, LOS or status stays missing. Growth references must identify their published source, population, age and unit.

Existing info IDs keep their meanings. New queue info IDs supported by the presentation renderer: `schedule`, `appointmentSchedule`, `trackBoard`, `orSchedule`, `worklist`, `mar`, `medicationAdministration`, `flowsheet`, `inBasketFolders`, `inBasketMessages`. `labResults`/`resultTrend`, `growthChart`, `encounterNotes`/`priorNotes` use their existing complete projections.

## Actions and status

These presentations are read-only data. Every action must exist as a normal `UiNode.button`, field, tab or navigator event in the Lean tree. Put an ordinary goto button adjacent to the selected work item to open the encounter; an `Open` text column, pointer cursor or decorative filter must not masquerade as a control. Worklist row actions can be added later with an additive semantic contract; do not encode component IDs into clinical rows. The presentation lane will not make read-only grid cells editable.

Status tints map only supplied text: due/pending (blue), overdue/critical (red), given/complete (green), held (amber), refused (violet), future/unknown/stopped (neutral). Always retain the words. Lab flags H/L/HH/LL/A come from Lean's FHIR reading or explicit payload; React never compares a result to a reference range. The painter may calculate coordinates from supplied numeric values solely for drawing, never dosing, percentiles, trends across unlike units, or clinical thresholds.

## Verification and ownership

`presentation` is a transparent semantic container: its children are traversed by the same presence observers as sections/columns/tabs. D1–D6 and T10/T11 retain their existing statements. ARIA expectations include the actual list/table/image and all ordinary child controls. Every row/cell remains available at narrow widths; no truncation or hidden safety records. No new design rule is introduced.

Presentation lane owns `UiPresentationKind`, the wrapper, projection helpers, JSON/TypeScript generation, `app/src/ehr/ui/presentations/**`, and registration in the painter. Workflow lanes own component tags, clinical content, payload creation, click paths and action controls. Shell lane owns banner/navigation/global tokens; presentation CSS uses the existing `--clinical-*` tokens with neutral fallbacks until those tokens arrive.

Research and visual review: [presentation research](ehr-ui-research.md#presentation-lane-structured-clinical-widgets). Add to this contract; do not rename kinds or change existing column meanings.

### Additions after first implementation

MAR time columns use dated hours, with exact recorded administration times retained in the cells. Lean fills empty axis cells between the earliest and latest recorded hour for each date; these are not clinical events. The painter groups the existing Medication/Dose/Route/Frequency/Order status columns into one left-hand detail cell without discarding any field. No existing row key changes meaning.

Long administration cells show their supplied status/time/dose in the grid and their complete original text in the labeled administration-documentation list immediately below it. Route, site, reason and performer remain visible in the same info panel. This is a reading layout, with no new clinical inference or control.

FHIR readers omit entered-in-error appointments, encounters and administrations. Unresolved reference displays say `Not recorded` or remain empty; transport references never substitute for clinician names in new projections or Notes. `growthChart` additionally accepts patient-bound reference rows through its ordinary info payload, appended to the measured points. The fixture references are published CDC 2000 female 2–20 year points; the renderer does not create curves when references are absent.

An ordinary `.group` may also carry `present.<kind>` to apply that presentation to its normal semantic children, including ordinary action controls. A group tagged `layout.columns` (or a longer tag ending in `.layout.columns`) emits the existing `UiNode.columns` container around its expanded children. Collapse behavior is unchanged; the columns themselves add no control. Use a columns group with a `present.folderList` panel and a `present.messages` table for an In Basket folder/list composition. The semantic order is the reading order and narrow layouts retain that order. See `PresentationFixtures.inBasketProgram` for a complete source example.
