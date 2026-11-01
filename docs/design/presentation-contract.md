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
| `timeGrid` | Medication, Dose, Route, Frequency or Instructions, optional PRN indication, then date/time columns. Each time cell contains the supplied status and actual dose/time. |
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

Clinical cells are read-only data. Every action must exist as a normal `UiNode.button`, field, tab or navigator event in the Lean tree. An ordinary goto button may be adjacent to the selected work item or placed in its row through the additive row-action contract below; an `Open` text column, pointer cursor or decorative filter must not masquerade as a control. Do not encode component IDs into clinical rows. The presentation lane will not make read-only grid cells editable.

Status tints map only supplied text through the shared shell palette: due/in-progress/booked (blue), pending/held/arrived/roomed (amber), overdue/critical (red), given/complete (green), refused (violet), future/scheduled/unknown/stopped (neutral). Always retain the words. Lab flags H/L/HH/LL/A come from Lean's FHIR reading or explicit payload; React never compares a result to a reference range. The painter may calculate coordinates from supplied numeric values solely for drawing, never dosing, percentiles, trends across unlike units, or clinical thresholds.

## Verification and ownership

`presentation` is a transparent semantic container: its children are traversed by the same presence observers as sections/columns/tabs. D1–D6 and T10/T11 retain their existing statements. ARIA expectations include the actual list/table/image and all ordinary child controls. Every row/cell remains available at narrow widths; no truncation or hidden safety records. No new design rule is introduced.

Presentation lane owns `UiPresentationKind`, the wrapper, projection helpers, JSON/TypeScript generation, `app/src/ehr/ui/presentations/**`, and registration in the painter. Workflow lanes own component tags, clinical content, payload creation, click paths and action controls. Shell lane owns banner/navigation/global tokens; presentation CSS uses the existing `--clinical-*` tokens with neutral fallbacks until those tokens arrive.

Research and visual review: [presentation research](ehr-ui-research.md#presentation-lane-structured-clinical-widgets). Add to this contract; do not rename kinds or change existing column meanings.

### Additions after first implementation

SURG supplies optional `UiScreen.fieldChoices` for an existing visible coded
field. Each entry pairs its component ID with `options` (code/label pairs),
`showCode` and `allowOther`. These are department favorites, never defaults or
validators. The painter may filter the supplied code/label text. Selecting an
option emits the field's ordinary raw-code entry event; filtering alone emits
no clinical event. `showCode` retains a clinical code in the input and presents
its supplied description beside it. Other choices show their supplied readable
label while retaining the original code value. Manual entry remains available
when `allowOther` is true. This metadata adds no clinical action or UI node kind.

SURG's OR requests also supply `Indication`, read from the same ServiceRequest's
reason codes. It remains source request evidence, independent of an order's
diagnosis association or a postoperative diagnosis. Compact case/consult summaries
retain the original field labels instead of joining unlabeled values.

MAR time columns use dated hours, with exact recorded administration times retained in the cells. Lean fills empty axis cells between the earliest and latest recorded hour for each date; these are not clinical events. The painter groups the existing Medication/Dose/Route/Frequency/Order status columns into one left-hand detail cell without discarding any field. No existing row key changes meaning.

Long administration cells show their supplied status/time/dose in the grid and their complete original text in the labeled administration-documentation list immediately below it. Route, site, reason and performer remain visible in the same info panel. This is a reading layout, with no new clinical inference or control.

FHIR readers omit entered-in-error appointments, encounters and administrations. Unresolved reference displays say `Not recorded` or remain empty; transport references never substitute for clinician names in new projections or Notes. `growthChart` additionally accepts patient-bound reference rows through its ordinary info payload, appended to the measured points. The fixture references are published CDC 2000 female 2–20 year points; the renderer does not create curves when references are absent.

An ordinary `.group` may also carry `present.<kind>` to apply that presentation to its normal semantic children, including ordinary action controls. A group tagged `layout.columns` (or a longer tag ending in `.layout.columns`) emits the existing `UiNode.columns` container around its expanded children. Collapse behavior is unchanged; the columns themselves add no control. Use a columns group with a `present.folderList` panel and a `present.messages` table for an In Basket folder/list composition. The semantic order is the reading order and narrow layouts retain that order. See `PresentationFixtures.inBasketProgram` for a complete source example.

### Row actions

An ordinary button tagged `present.row|<info component ID>|<zero-based source row>` (optionally namespaced before `.present.row`) emits `UiNode.rowAction target row [originalButton]`. Put the info and button under one group tagged `present.<kind>`. The marker changes placement only: event ID, label, action, enabled state, blocked reason and hotkey remain the original button's. Shell navigator buttons retain their original shell placement.

The painter places these controls in the matching row for tables, schedules, boards, worklists, message lists, results, flowsheets, MARs and folder lists. The first matching info component with that row is used if a malformed program repeats the target ID. All source rows and multiple actions per row are retained in source order. Missing targets, invalid/out-of-range rows, unsupported chart/note layouts and markers outside a presentation retain the original control inline. No action is invented or dropped. Charts and notes continue to use adjacent ordinary controls. `PresentationFixtures.rowActionsProgram` is a complete example with actual goto targets and return controls; a row marker does not switch patients or create a new clinical event.

Row indexes beyond JavaScript's exact integer transport range do not select a row wrapper; Lean emits the original ordinary control. This keeps an oversized source tag from making the entire JSON screen unusable. MAR headers may group the supplied dated-hour columns under their recorded date, while undated columns retain their complete labels. Narrow row labels still include the full supplied date and time.

SURG's existing optional `UiScreen.viewer` can include the signed-in clinician's
source name beside the role. Lean requires a unique `Display.clinicians` identity
match to its permission-bearing user; absent/ambiguous profiles retain the role
alone. The painter displays that supplied string and never selects a clinician,
infers permission or pre-enters patient identity from it.

SURG's typed FHIR lab reader supplies short captions for four verified standard
LOINC labels. Exact system/code and standard-label matching preserves custom
qualified labels. Recorded codes, values, units, dates, ranges, flags and trends
are unchanged. The existing results presentation paints those supplied captions;
explicit info payloads retain their own labels.
### Ambulatory metadata

`UiNode.valueSet options allowCustom children` supplies typed `{code, label}`
choices around an ordinary field. It does not change that field's Value,
validation, permissions, human-only flag, provenance or confirmation. The
browser displays labels and dispatches the selected code. If custom codes are
allowed, typing shows an explicit `Use code` option; typing alone is not an
entry. Existing closed formulary and dose-unit controls retain their semantics.

`UiNode.chartReferences references children` supplies published reference samples
around an ordinary growth info/presentation. Each reference carries measure,
unit, percentile, source, population and points in tenths of a month/hundredths
of the stated unit. Patient rows remain complete and separate. WHO 2006 covers
0–24 months; CDC 2000 covers 24–240 months. Lean selects an explicit US Core
birth-sex code, known measurement units and applicable ages. Unknown or
conflicting population data supplies no curve. Curves do not cross population,
source or unit boundaries; the browser calculates geometry only.

Both wrappers are transparent to semantic presence and preserve every ordinary
child control/info node. Row-placement, button-audit and ARIA traversals recurse
through them. No D-rule, clinical requirement or theorem statement is changed.
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

The constrained MAR can be tall because each supplied hour remains explicit. A department board or primary MAR can use the existing `layout.overview` hint to devote the workspace to its grid; this still retains explicit panels, required review supplements, alerts and the patient banner.

Numeric strings outside the browser's finite plotting range remain complete table text, without a fabricated point. Axis geometry also remains finite for large representable source values. The independent ARIA projection expects images only for representable plotted series; source-value coverage remains unchanged.

Growth measurements use the existing tenths-of-kg/cm display precision. Gram weights are converted to kg; the shared ambulatory height reader accepts explicitly recorded cm, m or inches and declines unknown units. The latest timestamp supplies each day's plotted weight/height regardless of FHIR array order. Original Observation values and units remain in their complete display projections. A missing/invalid birth or measurement date produces `Not recorded` for plotted age while retaining the measurement row; a valid newborn age remains zero. Clinical Facts and dosing calculations are unchanged.

### Acute MAR directions and coded PRN conditions

`timeGrid` additionally accepts `Instructions` and `PRN indication` as left-hand order-detail keys. `Frequency` retains its existing meaning and rendering for older sources. The acute reader supplies full Dosage.text/SIG under Instructions, rather than relabeling it as a frequency; supplied coded as-needed conditions retain their reason and source-linked administration history. These metadata keys never become time-axis columns or administration-detail records. No new control or calculation is added to the painter.

### Shared display integration

Structured medication review uses the shared painter's existing explicit-direction grammar, retaining original source values in native tooltips and accessible labels. Captured fields, units and events are unchanged. Note `Text` and `Title` fields stay verbatim; a recognized converter-provenance suffix uses smaller secondary type with every original character retained. Both structured and legacy note cards retain supplied extra metadata.

ISO display timestamps retain the supplied clock, fractional seconds and offset alongside their calendar date. They do not shift through the browser's timezone. Empty info keeps its clinical label and a named notice; original actions remain inline when there is no matching data row.

The row-action extension above is implemented; the original adjacent-button pattern remains supported. Empty-state wording may use the shared painter's contextual message for that info ID instead of the generic `No records on file`. Neither refinement introduces a browser-owned action or changes the payload schema.

Known clinical info IDs also select default presentations without an explicit tag: queue IDs select their corresponding kind; `labs`/`labResults` select results, `resultTrend` selects trend, `growthChart` selects growth, and `encounterNotes`/`priorNotes` select notes. Recognized explicit tags take precedence. An unrecognized tag keeps the info ID's default when one exists, otherwise the ordinary info layout. The complete selector is `presentationKind?` in `Render/Presentations.lean`; automatic side summaries remain compact.
### Current visit documentation

A source info component tagged `layout.document` selects the semantic info display `document` outside the side rail. Its rows retain `Section`, exact `Text`, and source-computed `Entry status` cells; any additional supplied cells remain visible. The painter uses one read-only document region with a keyboard-scrollable body. It never edits, confirms or signs the note. Document/status info does not claim tabular row-action slots; controls targeting those layouts retain their ordinary inline fallback. W1/W5 use this for the current captured visit documentation, separately from historical Chart Review notes. Missing documentation and pending confirmation stay explicit in Lean.

### Public prefill source captions

`UiScreen.fieldSources` is an optional list of `[component ID, public caption]` pairs supplied by Lean. It accompanies sourced, shown fields without replacing their exact `UiNode.field.provenance`, pending-confirmation flag, human-only flag, value, unit or control ID. The stock painter uses the supplied caption as visible source text and the field's accessible description. It does not interpret `record:` or `linked:` keys. Linked captions read the source element's public spec label; record captions identify the declared source and the chart snapshot date. An unknown record key stays a generic chart-record source rather than acquiring an invented clinical meaning.

Older semantic JSON without this optional metadata retains its original raw provenance caption. The legacy native HTML renderer and its exact provenance contract are unchanged. This metadata adds no control, receipt, capture or confirmation.

### Integrated ambulatory and perioperative metadata

The shared painter uses one code-picker path for `valueSet` wrappers and the
compatible `UiScreen.fieldChoices` department favorites. A field-specific
favorite list takes precedence when present; the ordinary wrapper remains the
fallback. Both keep raw entry codes, manual selection, filtering without entry,
explicit confirmation and the existing field event. Surgical display-code hints
remain available. Public per-field `fieldSources` captions take precedence over
older provenance-key `sourceLabels`; exact field provenance is retained.

FHIR supporting views share one `scheduleTasks` ID. An explicit pre-op context
uses the surgical case rows; an ambulatory context uses the appointment view.
When no encounter setting is available, a real dated surgical request can supply
the case queue. Other supporting payloads and their version bindings coexist.
Per-observation laboratory rows use the same conservative source-label aliases
as aggregate summaries, retaining their complete values, units and metadata.

## World data

World revision 2 preserves every original DaySchedule byte for byte: all 1,284
task IDs, patients, personas, days, times, choices, interruptions and
todayResources. See world/realism/task-diff.mjs and the committed proof in
runs/world/2/task-diff.json (baseline 81691fbbeeb08d906bf4b2d43e8e8e152af9a735).
List context creates no simulator tasks or clinical decisions.

The generator also emits runs/world/2/context/day-{DD}.json: a FHIR R4
collection Bundle shared by all five personas that day. Each entry has
fullUrl "ResourceType/id" and resource. SHA256 IDs and an independent patient
ordering use the seed/day/semantic slot without consuming scenario random
draws. Both Synthea and Synthetic Hospital supply real imported identities.
An extra patient cannot occupy two extra roles that day.

fixtures/clinical/overrides.json has this exact envelope:

    { "schemaVersion": 1, "referenceDate": "2026-11-02", "description": "...",
      "entry": [{ "source": "fixtures/synthea/example.json",
        "sourceFullUrl": "urn:uuid:...", "key": "MedicationRequest/...",
        "action": "replace", "resource": { ...FHIR R4 resource... } }] }

Action is replace, create or withdraw. Source identifies the imported bundle;
key is ResourceType/id (Synthea IDs derive from entry fullUrl). Replace by
identity before chart projection; a withdrawal is excluded from the active
chart. Live withdrawal uses entered-in-error and preserves history. The
overlay must not become a second active medication/allergy list. Raw imports
remain immutable scenario inputs. fixtures/clinical/index.json lists all 324
patients; audit.json records source SHA256s and change counts. Historical
narrative alone never creates a current admission/order.

### Collection shapes and scope

All context resources carry meta.tag with system urn:vgi:world:realism.
Codes include day-N, persona P1…P5 where applicable, and list-context
(co-scheduled/read-only context) or patient-context (patient facts/standing
orders). Tags confer no action permission. Filter chart facts by subject,
patient, for or beneficiary and by selected encounter. Other rows' facts must
never enter the single-patient task episode.

Each List has the following fields:

    { "resourceType": "List", "id": "wr-...", "status": "current",
      "mode": "snapshot", "title": "...",
      "code": { "coding": [{ "system": "urn:vgi:world:realism",
        "code": "clinic-schedule", "display": "..." }], "text": "..." },
      "date": "2026-11-02T07:00:00-08:00",
      "source": { "reference": "Practitioner/wr-..." },
      "entry": [{ "item": { "reference": "Appointment/wr-..." } }] }

| Persona | List code | Exact row collection |
|---|---|---|
| P1/P4 | clinic-schedule | 16–18 Appointments; scheduled, completed, arrived, checked-in, no-show |
| P2 | ed-census | 16–20 Encounters from the day's ED arrivals |
| P3 | my-patients | 5 assigned inpatients |
| P3 | unit-census | 12 inpatients including those five and other RN assignments |
| P5 | or-schedule | 10 ServiceRequests: 5 cases per room, 2 rooms |
| P5 | consults | 3 consultation ServiceRequests |
| All | inbasket | Existing results/Rx tasks plus 2 results, 2 Rx requests and 2 messages |

Use List membership to bound each view. The Bundle can contain additional
source encounters outside a board snapshot. A task outside that snapshot
retains its own patient. P5's second OR has another surgeon. Other unit
patients have the second RN; scenario tasks beyond the five assigned patients
are cross-coverage work.

### Resource fields to project

- Appointment: status, start, end, minutesDuration, appointmentType (coded
  visit name), serviceType:[{text:department}], description and participant
  [{actor:Reference(Patient|Practitioner|Location),status:"accepted"}].
  Resolve actors for patient, provider and location.
- Encounter: class {system:"http://terminology.hl7.org/CodeSystem/v3-ActCode",
  code:"EMER"|"IMP"|"SS",display}; type:[{text:humanName}];
  serviceType:{text:department}; subject; period.start; serviceProvider;
  reasonCode:[{text:chiefComplaintOrDiagnosis}]; location:[{location:Reference,
  status:"active"}]; participant:[{type:[CodeableConcept],individual:Reference}].
  Participant codes ATND/PPRF use
  http://terminology.hl7.org/CodeSystem/v3-ParticipationType.
  ED priority uses urn:vgi:world:realism/esi, codes 1…5, display ESI N.
  Extensions below https://vgi-health.example/fhir/StructureDefinition/:
  disposition, pending-labs, pending-imaging, each valueString;
  unit nursing-assignment also uses valueString. Beds have a Location.partOf
  unit reference. OR requests reference individual room Locations.
- Standing ServiceRequest: status:"active", intent:"order", subject,
  encounter, requester, authoredOn, code with system urn:vgi:world:realism.
  Codes full-code / dnr display Full Code / Do Not Resuscitate (DNR).
  DNR has a synthetic goals-of-care note, limited to a few deterministic
  patients aged 80+ outside surgery. Isolation codes no-isolation /
  contact-precautions / droplet-precautions display No isolation / Contact
  precautions / Droplet precautions (suspected influenza/respiratory virus).
  Isolation is also stated for nonadmitted ED encounters; code-status orders
  remain limited to admitted ED, inpatient and surgical encounters. Read orders
  for the selected encounter.
  [CDC influenza precautions](https://www.cdc.gov/flu/hcp/infection-control/healthcare-settings.html)
  inform the synthetic influenza examples.
- Surgical ServiceRequest: code.text procedure, occurrencePeriod times,
  locationReference room, performer surgeon, active/completed status,
  note[].text case progress. Linked Procedure has R4 status preparation,
  in-progress or completed; basedOn, encounter, location, performedPeriod
  when started. Consults use SNOMED CT 11429006, reason, priority, requester,
  performer, location and authoredOn.
- CarePlan titled Perioperative antiplatelet plan: subject, encounter,
  status:"active", intent:"plan", description and activity[].detail
  {status:"scheduled",code:{text:drugReview},description:holdOrContinuePlan}.
  Plans require prescriber/surgery/anesthesia review; urgent cases cannot
  assume elective washout. Synthetic timing is based on the
  [AHA/ACC perioperative guidance](https://professional.heart.org/en/-/media/PHD-Files-2/Science-News/2/2024/2024-Guideline-for-Perioperative-Cardiovascular-Management-slide-set.pdf).
- Result Task: requested/order status/intent, result-review code, for, owner,
  requester:Reference(Organization) (Central Laboratory), focus:
  Reference(DiagnosticReport|Observation), authoredOn and complete description,
  e.g. CBC: Hemoglobin: 8.4 g/dL (L). DiagnosticReport carries performer,
  resultsInterpreter, result references and the summary in conclusion.
  Resolve Organization name for the sender.
- Refill Task: for, owner, requester pharmacy, focus {reference:"#current-rx"},
  contained MedicationRequest id current-rx and MedicationDispense id last-fill.
  Request dispenseRequest is {performer:Reference(Organization),
  quantity:{value,unit},expectedSupplyDuration:{value,unit:"days",
  system:"http://unitsofmeasure.org",code:"d"}}.
  Dispense has authorizingPrescription:[{reference:"#current-rx"}],
  performer:[{actor:Reference(Organization)}], quantity, daysSupply,
  whenHandedOver. Task.input links #last-fill; description repeats pharmacy,
  quantity, supply and date. Live migration retains an existing external
  prescription focus when present and adds the same dispense fields there.
- Portal Communication: status:"completed", category patient-message, subject,
  sender, recipient, sent, payload:[{contentString}]. These are collection
  items, never simulator tasks.

### Reconciliation and metadata

world/realism/reconcile.mjs completes medications after recorded end dates;
stops imports over five years old without renewal evidence; completes old
short antibiotic courses; retains latest ingredient/dose across duplicates,
brands and superseded strengths. Statins and P2Y12 inhibitors each reconcile
to one agent. Combination analgesics suppress concurrent plain acetaminophen
and older combination products. Scheduled antihypertensives receive
asNeededBoolean:false and explicit timing.repeat. Notes identify synthetic
reconciliation. This is an authored synthetic scenario policy, not treatment
advice for a real patient.

Allergy 609328004 (Allergic disposition) is withdrawn. Scientific allergens
retain codes and gain common text/display: 256355007 becomes Soy; mold, dust
mites, dander, pollen, foods and latex use common names. Positive allergies
have reaction[].manifestation, severity and criticality. Source reactions
take precedence; added reactions are labeled synthetic. Patients without
active allergies receive SNOMED CT 716186003, text No Known Allergies,
active clinical status, confirmed verification, recordedDate, reviewed note
and an allergy-review Provenance. Do not treat this negated assertion as an
allergen. New task allergies supersede baseline NKA; the live migration
withdraws conflicting NKA assertions. See
[FHIR R4 negated allergy guidance](https://hl7.org/fhir/R4/allergyintolerance.html).

Patient.generalPractitioner references one of 11 stable community PCPs with
a human display. Every patient has active Coverage; source insurance remains.
Generated Coverage includes beneficiary, payor[].display, type, subscriberId
and calendar-year period. Historical encounters gain human type/department
text; legal location names use title case.

The Lean lane must load the shared dated List graph, resolve rows and actors,
apply overlays before chart projection, preserve patient/encounter scope, and
project standing orders, reviewed NKA, pharmacy/last fill, result summaries and
senders, and antiplatelet plans. The simulator's unchanged one-patient episode
must never absorb other list rows. No Lean files, specs or proof statements
were edited by this lane.

Human references also carry display names, allowing sender, pharmacy and provider
captions without another lookup. Original world refill fill-ages use business-day
indices; the new MedicationDispense records use calendar dates and the recorded
supply when available, otherwise the scenario's monthly 30-day fill.

Surgical rounding encounters also carry postoperative-day (valueInteger) under
the same extension root, with procedure and POD in reasonCode; pre-op encounters
use type.text Preoperative Visit – General Surgery. Pending ED ServiceRequests
use local coded human labels matching the pending-labs/pending-imaging text.
Supporting Organization and Location resources supply name, active/status,
physicalType and partOf/managingOrganization; Practitioners carry identifier,
active and name. Some resources also retain the existing worklist tag system
https://vgi-health.example/fhir/CodeSystem/worklist. New views should select the
explicit List membership, dated realism tags and referenced graph.

Background OR patients come from the imported Synthetic Hospital cohort so
they cannot preempt a future task patient's surgical episode. Background
organ-removal cases exclude prior matching source procedures and matching
procedures already scheduled in earlier context days. This prefix history is
recreated deterministically without changing the task world state.

Actual surgical requests retain source case start/end times. On P5 clinic days,
background room cases belong to other surgeons; P5 retains any actual urgent
case. Each room's performer reference supplies the operating surgeon.

### Lean world consumer

`FactsInput.worldContext` optionally supplies the shared dated Bundle separately
from the single-patient `bundle`. Existing callers omit it. `viewerPersona` in
context record metadata selects that day's persona-tagged Lists. Queue payloads
retain the existing unique patient/artifact/version binding; replacement queues
replace their bindings as well. `orSchedule`, `consultList`, `unitCensus` and
`inBasketMessages` are optional read-only info declarations, with no new clinical
requirements. A selected case/consult summary remains patient-scoped and uses its
original info ID, separately from the department queue.

The consumer adds only matching-patient resources to chart projection. A current
versioned server resource wins over the cached department graph. Imported chart
overlays are applied by source identity before the call. Ordinary source buttons
remain the only row actions; a chart outside the List snapshot keeps its opener
adjacent to the list instead of attaching it to another patient's row.

### Unified drawing compatibility

Ordinary legacy info tables, historical-note lists and trends use the same structured table, note and chart painters as explicit `present.*` nodes. Source-declared current documents retain their document-region semantics within the structured information module. Compact side summaries remain compact. One supplied-status tone map decorates all these views; the source text and clinical events remain unchanged.

Acute integration retains `shiftWorklist` for assigned patient rows and adds the optional read-only `shiftTasks` view for the selected encounter’s source Task records. Both use the shared table/worklist drawings. A dated world census can replace patient rows without replacing the selected patient’s due-task details; this adds no review, attestation or clinical guard.

### Patient workspace selection

Active programs require `patientSelection: true`. Their initial state contains a
list activity and no selected patient, banner, chart sidebar, captures or reviews.
The fixed Lean workspace supplies application activities, Patient Lookup and
source-row actions named `Open chart: <name> (MRN <number>)` when the MRN is
recorded. The painter forwards their ordinary click/entry events.

`Facts.patientDirectory` is the day-level identity/list projection. It contains
source Patient IDs, names, MRNs, and the dated persona List rows; it supplies no
clinical captures or receipts. Optional catalog identity metadata fills a missing
MRN without replacing a recorded source MRN. `Facts.sourcePatientId` is the exact
FHIR Patient.id and is separate from the existing wristband/identity-entry token.

`State.patientContext` records the selected and bound source IDs. Opening a chart
clears patient-specific state before data arrives. The host loads that exact
patient's offline or Medplum bundle. Lean binds only matching facts; stale or
foreign facts leave the chart hidden. Application activities and Return controls
clear the patient context. Clinical activity navigation retains it.

Recorded programs without this flag retain their original replay behavior.
Interactive historical layouts and fresh simulations add the same fixed
selection wrapper; recorded source artifacts and saved replay events stay intact.

The `workspace.*` component namespace is reserved by certification so a candidate
cannot replace a chart action with a workspace action. Lookup entries use the
ordinary `enter` event on `workspace.search`; row selection uses the ordinary
click event. Day-list rows preserve their source work-item reference: chart
loading honors that existing encounter/request while lookup opens the patient's
existing chart without inventing an encounter. Interactive work dates default
to the world manifest's first work date and timeline links retain their day.
