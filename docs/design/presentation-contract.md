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

### Row actions

An ordinary button tagged `present.row|<info component ID>|<zero-based source row>` (optionally namespaced before `.present.row`) emits `UiNode.rowAction target row [originalButton]`. Put the info and button under one group tagged `present.<kind>`. The marker changes placement only: event ID, label, action, enabled state, blocked reason and hotkey remain the original button's. Shell navigator buttons retain their original shell placement.

The painter places these controls in the matching row for tables, schedules, boards, worklists, message lists, results, flowsheets, MARs and folder lists. The first matching info component with that row is used if a malformed program repeats the target ID. All source rows and multiple actions per row are retained in source order. Missing targets, invalid/out-of-range rows, unsupported chart/note layouts and markers outside a presentation retain the original control inline. No action is invented or dropped. Charts and notes continue to use adjacent ordinary controls. `PresentationFixtures.rowActionsProgram` is a complete example with actual goto targets and return controls; a row marker does not switch patients or create a new clinical event.

Row indexes beyond JavaScript's exact integer transport range do not select a row wrapper; Lean emits the original ordinary control. This keeps an oversized source tag from making the entire JSON screen unusable. MAR headers may group the supplied dated-hour columns under their recorded date, while undated columns retain their complete labels. Narrow row labels still include the full supplied date and time.

### Per-observation laboratory data

`Display.labResults : List LabResultRow` adds each recorded result's code, human name, raw value, unit, time, reference text, flag and status. `labs`/`labResults`/`resultTrend` use these complete rows when available; older Display JSON defaults this list to empty and retains the legacy aggregate fallback. Existing clinical Facts extraction and its legacy lab aggregates are unchanged. Components retain their own values/units and the report's time/status. Clinical test codes disambiguate otherwise identical names only when needed; resource IDs and component IDs never become clinical rows.

Quantity comparators and signed, qualitative, integer, boolean, range, ratio, date/time, period and sampled values remain text as appropriate. Source interpretations take precedence. Inferred display flags require an uncensored quantity with a clear normal interval and compatible units; age/population-qualified or ambiguous intervals remain explicit text. The existing demo intervals are used for display only with their known matching unit. React does not calculate flags or convert units. Every report/component survives, including duplicate records; a separate cardinality theorem checks this.

Typed nursing flowsheets show ordinary recorded values compactly and retain nonfinal/corrected status inline. Explicit payload rows are still preserved verbatim. Callers scope observations to the intended flowsheet; the example uses vitals and I&O, while lab history stays in Results. The visual fixtures now use RN, NP, surgeon and physician roles as appropriate and keep the selected ED banner tied to that patient's encounter.

### Overview workspace

A shown component may include the dot-delimited hint `layout.overview` in its tag, for example `layout.overview.present.trackBoard` or `layout.overview.layout.columns`. Lean then omits only its automatic read-only chart-side summaries. Explicit source side panels and controls, the patient banner, clinical alerts and required review supplements remain present under the same D1–D6 statements. This lets department boards, schedules and In Basket use the available workspace without a browser-owned visibility rule. An unshown component cannot activate the hint. Existing programs keep their current layout until they opt in.

Chart tick spacing and coordinate scaling are drawing operations. Numeric axis labels must remain distinct, a single dated result retains its full recorded date/time, and growth age ticks select actual supplied measurement ages. Every original value and published reference point remains in the accompanying tables.

### Nursing observation categories and components

`ObservationRow.categories` adds source category codes; missing categories on older JSON rows default to an empty list, while malformed supplied categories fail decoding. Display retains every valid observation and component. The default nursing `flowsheet` separates laboratory-only observations into the existing Results collection; explicitly vital-sign observations and legacy/uncategorized rows remain included. Explicit info payloads still supply their full rows verbatim. Whole-chart input now exercises this collection choice in the fixture.

Assessment components retain their own names, values and units plus parent time, status and category. Censored quantities and missing-result explanations remain text. A blood-pressure pair requires an unambiguous LOINC-coded systolic and diastolic component with compatible recorded units; array order supplies no meaning. All components also remain explicit rows. Existing clinical Facts extraction is unchanged.

Normal note cards omit absent optional import-metadata fields, rather than adding empty Source date or Unknown Shift days. Every supplied metadata value remains visible. A single untitled plain-text attachment shows its complete body without an invented attachment heading; multiple or titled attachments retain their boundaries and titles. Time-series geometry orders points by their supplied coordinate, while the accompanying tables retain source row order.

### Constrained panels

The painter may reflow dense tables into complete labeled records based on the widget's available width, including when a patient summary shares a desktop window. Wide ED/MAR grids remain grids. All columns, values and original row controls remain present in their original semantic table; no clinical fact or control is hidden. Screenshot review covers 1024, 1280 and 1440px and checks that status words do not split between lines.

Numeric strings outside the browser's finite plotting range remain complete table text, without a fabricated point. Axis geometry also remains finite for large representable source values. The independent ARIA projection expects images only for representable plotted series; source-value coverage remains unchanged.

Growth measurements use the existing tenths-of-kg/cm display precision. Gram weights are converted to kg; the shared ambulatory height reader accepts explicitly recorded cm, m or inches and declines unknown units. The latest timestamp supplies each day's plotted weight/height regardless of FHIR array order. Original Observation values and units remain in their complete display projections. A missing/invalid birth or measurement date produces `Not recorded` for plotted age while retaining the measurement row; a valid newborn age remains zero. Clinical Facts and dosing calculations are unchanged.

### Shared display integration

Structured medication review uses the shared painter's existing explicit-direction grammar, retaining original source values in native tooltips and accessible labels. Captured fields, units and events are unchanged. Note `Text` and `Title` fields stay verbatim; a recognized converter-provenance suffix uses smaller secondary type with every original character retained. Both structured and legacy note cards retain supplied extra metadata.

ISO display timestamps retain the supplied clock, fractional seconds and offset alongside their calendar date. They do not shift through the browser's timezone. Empty info keeps its clinical label and a named notice; original actions remain inline when there is no matching data row.
