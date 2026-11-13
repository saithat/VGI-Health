# Entry times, late entries, signing deficiencies and order reconciliation

[Overview](../../README.md) · [Live drafts](../methods/live-drafts.md) · [Rule catalog](../rules/catalog.md)

Status: **implemented.** All four parts are in Lean, the commit service and the
app. Every new definition and theorem is marked *New specification for owner
review* in Lean.

## Why

An open chart session can be renewed at any age if the patient's record is
unchanged ([live drafts](../methods/live-drafts.md)). Real EHRs don't put a
maximum age on unsigned work either. They handle the same risk in four ways,
which this design adopts. Renewal itself stays as it is, with no time cap.

1. Each entry keeps the time it was entered, and observations keep the time the
   patient was observed, separately from the time the entry was signed.
2. An entry signed long after the observation is labeled a late entry.
3. Unsigned and overdue work appears on a per-clinician deficiency list.
4. Unsigned orders are reconciled when the patient is transferred or discharged.

The catalog records these binding rules and their implementation scope:

| Rule | Source | Catalog status |
|---|---|---|
| Entries are dated and timed | 42 CFR §482.24(c)(1) (`cms-482.24-c1-dated`, `-timed`) | Interpreter entry stamps and persisted provenance (legacy clockless entries excluded) |
| Record completed within 30 days of discharge | 42 CFR §482.24(c)(4)(viii) | Encoded as `temporal007`; listed on the deficiency list (section 3) |
| Record completed and authenticated within two weeks of discharge | 22 CCR §70751(g) | Encoded as `temporal018`, `temporal019`; listed on the deficiency list |
| H&P within 24 hours of admission | 42 CFR §482.24(c)(4)(i)(A) | Encoded; listed on the deficiency list |

Late-entry labeling and order reconciliation are hospital policy, not law.
Their numbers are local policy defaults and are labeled as such.

## 1. Entry and observation time (*new specification*)

- Every capture records `enteredAt`, the interpreter's epoch minute at the moment
  of entry (`epochNow`). It comes from the trusted clock, never from the screen.
- Elements whose value describes a moment of care (vitals, measurements,
  assessments, administrations already handled by the MAR) are marked
  `observation`. For those, the clinician may set an earlier `observedAt`
  ("Time taken"), which defaults to `enteredAt`. Only a human can set it; it
  cannot be prefilled or automated, like other human-only entries.
- Bounds checked by the interpreter: `observedAt ≤ enteredAt`, and not before the
  encounter start when that is known.
- At signing, `signedAt` is the trusted commit time. The record keeps all three:
  FHIR `effectiveDateTime` is `observedAt`, `issued` is `signedAt`, and the entry
  time is kept in provenance. The existing MAR split between bedside time and
  charting time is the model.

## 2. Late entries (*new specification*, hospital policy)

- An entry is late when `signedAt − observedAt` exceeds
  `spec.design.lateEntryMinutes`. The default is 1440 (24 hours), a local policy
  value; record-keeping guidance asks for late entries to be identified but sets
  no number.
- A late entry is labeled "Late entry" with its observed and signed times, on the
  signing screen and in the stored record. The label informs; it does not block
  signing.
- Proved: the label appears exactly when the gap exceeds the threshold, and no
  accepted timing projection has `observedAt` after `signedAt` (theorems below).

### Encoding and trust boundary

`Captured.enteredAt?` is set by every value-creation path (human entry, macro,
record/default/link prefill and prior-authorization convenience action), from
`epochNow`. Confirmation and draft restoration retain the original stamp.
A replacement value is a new entry with a new stamp. The FHIR adapter supplies
an absolute UTC minute and the selected encounter's start when present.

Observation elements carry `observation? = some true`. Their optional companion
`<element>.observedAt` is a normal text field, with `observationOf?` naming the
source, `.never` prefill, human-only entry, and the new `.observationTime` validation.
The wire text is an integer UTC epoch minute; the painter offers local date/time
input. This companion was chosen over a new event constructor to retain the
existing field, event, role, macro and painter paths. It also avoids extending
workspace state. It is not a required entry and never copies an observed time.
Empty text resets to entry time; all nonempty values must satisfy the inclusive
source-entry and known encounter-start bounds. Source-value changes invalidate
the companion through the existing linked-dependency mechanism. Canonical
programs place it beside each marked vital, measurement and assessment field.
The initial marked set is weight, height, head circumference, both blood-pressure
components, pulse, respiratory rate, temperature, oxygen saturation, pain score
and reassessment, exam, assessment/plan, nursing and handoff assessments, fall-risk
and depression screens, disposition condition, operative findings, estimated
blood loss and postoperative condition. Historical narrative and calculated
dosing copies retain entry timing without a separate observation override.

`DesignRules.lateEntryMinutes` reads the optional wire field `lateEntryMinutes`,
with a default of 1440. This is **local policy**, not a regulatory interval.
The shared `DesignRules` JSON codec independently retains nondefault late-entry
and unsigned-draft settings; absent settings preserve the legacy release JSON.
The same native `EntryTimes.records` drives the signing preview and accepted
command's `entryTimes`; a timestamp after signing refuses the commit, while a
late label alone never does. The app formats the informational observed/signed
times for the clinician. Clearing an optional override always remains possible;
the completion checker permits only this resettable, optional validation family
and retains its conservative refusal for required or other validated values.

The service stamps each accepted interaction with server-owned
`entryEpochMinute` journal metadata (overwriting any caller value), and supplies
it as `Facts.epochMinute?` during native reconstruction. The metadata is
removed before decoding the unchanged Lean `Event` format. Live fields wait for
that response before painting, so replay uses the original clock rather than
renewal or replay time. Ordinary interactions reuse their session; an expired
interaction uses the existing guarded renewal before retry. Signing and
departure retain their existing renewal boundary, with no chart-session cap. The commit guard receives the fresh trusted signing
clock. This requires no schema migration: command events, draft checkpoints and
FHIR resources already persist JSON atomically.

Observation resources use observed time for `effectiveDateTime` and signing time
for `issued`. Blood-pressure components observed at different times become
separate resources. `Provenance` retains each source capture's entry, observed
and signed times and a per-entry `late-entry` extension; late observations also
carry that extension. Notes retain their existing FHIR document signing date
and store per-section timing in provenance. MAR keeps its existing bedside vs
charted-time projection and gains capture timing in the durable accepted command.
TypeScript/FHIR/SQL serialization remains a tested trust boundary.

### Proofs and compatibility

All new timing statements are marked **New specification for owner review**:

| Lean theorem | Scope |
|---|---|
| `EntryTimes.late_iff`, `EntryTimes.records_late_exact` | A native stored/preview label is true exactly when signed minus observed exceeds the local threshold, including equality at the boundary. |
| `EntryTimes.stored_observed_le_signed`, `Commit.accepted_observed_le_signed` | No timestamp in an accepted native timing projection has observation after signing. |
| `EntryTimes.companion_needsHuman`, `companion_no_prefill`, `companion_no_macro` | The time companion cannot be prefilled or supplied by a macro. |
| `EntryTimes.prefill_enteredAt`, `prefill_field_new_enteredAt`, `enter_new_enteredAt`, `new_entry_has_enteredAt`, `prior_auth_new_enteredAt` | Newly created prefills and entered values use the trusted clock; with an absolute clock, new entries have an entry timestamp. |
| `EntryTimes.observation_time_reset` | A human can reset an optional override despite missing historical facts. |
| `Render.uiLateEntries_exact`, `uiLateEntries_readOnly` | Signing labels appear exactly for above-policy gaps and add no interactive component identity. |
| `Check.accepted_reconcileIds`, `reconcile_comp_reserved`, `accepted_reconcile_no_shadow` | Every accepted program excludes the entire runtime reconciliation namespace; no runtime line control can shadow a program component. |
| `Runtime.hydrating_refuses`, `hydrating_reconcile` | A chart-loading call refuses commits, acknowledgments and reconciliation controls before the clinician sees the loaded chart. |
| `Deficiencies.overdue_listed`, `missing_listed`, `draft_listed`, `discard_listed`, `listed_unsigned` | Completeness for started/overdue obligations, drafts and discarded orders; every listed row belongs to the clinician's unsigned role-performed work. |
| `Deficiencies.transfer_restores_tagged`, `pending_blocks_orders`, `transfer_needs_decision`, `reentry_keeps_tag`, `discharge_restores_no_orders`, `discharge_keeps_provenance` | Transfer tags survive re-entry and block signing until a decision; discharge removes saved order lines while retaining their provenance. |
| `Ehr.reconcileCore_ok`, `reconcileCore_macro`, `reconcileCore_captured`, `reconcileCore_frame` | Only an authorized human can decide for an awaiting line; decisions preserve clinical values and all unrelated state. |
| `Render.Fhir.Temporal.evidence_bound` | Projected event identity is bound to its patient, exact encounter, artifact/version and actual-event status. |

Existing guarantee statements stay proved. Auxiliary capture-construction
statements include the new metadata, and prior-authorization frame lemmas are
generalized over that metadata. No clinical requirement or guard is relaxed.

All new core fields are optional: absent JSON decodes to `none`, and `none` is
omitted on encoding. The derived encoding for existing events is unchanged.
Legacy facts without an absolute clock retain unstamped captures, rather than
inventing a date from a day-relative clock. This compatibility exception is why
the capture-time proofs explicitly assume a trusted absolute clock; live service
contexts provide it. It is not a claim that historical entries were retroactively
dated. The catalog's dated/timed entries describe this implemented scope.

## 3. Signing deficiencies (*new specification* for the cross-record view)

- A deficiency is a clinician, patient, encounter, item, deadline and status:
  pending, delinquent once the deadline has passed, or discarded at discharge
  (section 4).
- Items, for every commit the clinician's role performs that is not signed in
  the chart's selected encounter (`openCommits`):
  - Every `TemporalReq` that is overdue (delinquent), or missing after its
    anchor event happened (pending). A requirement whose anchor event has not
    happened, such as a discharge-relative deadline before discharge, is not
    yet an obligation and is not listed. The deadlines are the encoded rules
    above.
  - Every saved unsigned draft (the latest draft checkpoint of the login) that
    holds a human entry named by the commit's entry requirements. Its deadline
    is the commit's first temporal deadline if it has one. Otherwise it is
    `spec.design.unsignedDraftMinutes` after the checkpoint was saved, default
    1440 (local policy; the field is omitted from spec JSON at its default).
- Computed in Lean (`Ehr.Deficiencies.deficiencies`) from the same
  `temporalStatus` the interpreter uses, so the list introduces no new rule
  semantics. The service's `GET /deficiencies` gathers each chart's current
  facts, the commits signed in its encounter, the drafts and their ADT stamps,
  and asks native Lean for the list. The service clock is the trusted time
  source when the facts carry none. The list is stored (migration
  `009-deficiencies-reconciliation.sql`) and a chart session binds it by ID, so
  native replay paints exactly the work list the browser showed.
- The app adds the list as the workspace activity "Deficiencies (n)",
  painted by the existing Lean worklist presentation; opening a row opens that
  patient's chart where the role's landing list would.
- Proved: `overdue_listed`, `missing_listed`, `draft_listed` and
  `discard_listed` (completeness: every overdue or started obligation, saved
  draft and discarded order of the role's unsigned commits is listed) and
  `listed_unsigned` (soundness: every listed item belongs to the signed-in
  clinician, to a commit the role performs, and that commit is not signed in
  its chart).
- The live FHIR projection now derives the supported temporal evidence below.
  The active release still determines which obligations exist. Packaged V1–V3
  use the core rule profile, which has no `TemporalReq` entries; this change
  does not silently enable the full catalog or alter protected specifications.
  The live integration regression uses an explicit temporal test release.

### Trusted temporal record mappings

**New specification for owner review:** `Render.Fhir.Temporal` receives only the
FHIR record and trusted context, never captures, UI events or typed attestations.
It requires an exact patient-bound selected encounter with a unique resource
identity and nonempty `meta.versionId`. Without an explicit selector, tied latest
encounters are ambiguous. The episode is that Encounter's ID. Every source time
uses the strict offset-bearing FHIR parser (`Dated.parse`), converted to UTC epoch
minutes; date-only, local and invalid dates supply nothing. `eventTime` additionally
rejects future actual events, duplicate event evidence, missing clocks, different
patients/episodes and obsolete artifact versions.

| Encoded event(s) | Record source and artifact key |
|---|---|
| `admission` | Selected inpatient Encounter (`IMP`/`inpatient`), in-progress/onleave/finished, `period.start`; keys `verifyPreoperativeRecord`, `recordNursingTransition`. An outpatient visit is not called an admission. |
| `discharge` | That inpatient Encounter only when `status = finished`, `period.end`; key `completeMedicalRecord`. A planned end or ADT UI action is insufficient. |
| `encounter.start` | Actual selected Encounter `period.start`; key `verifyEncounterWeight`. |
| `record.completed`, `record.authenticated` | One current, final/amended Composition explicitly typed `medical-record-completion` in `urn:vgi:document-type`, with one professional/legal attester, a nonempty Practitioner reference and an offset-bearing `attester.time`; key `completeMedicalRecord`. The signed certificate explicitly concerns the whole encounter record. A discharge summary or arbitrary signed note is insufficient. |
| `hp.completed` | Same signed Composition contract, type `history-physical`; key `verifyPreoperativeRecord`. Time is document completion at attestation, with no inferred earlier examination or filing time. |
| `postanesthesia.documented` | Same contract, type `postanesthesia-evaluation`; key `signPostAnesthesiaNote`. |
| `nursing.assessmentDocumented` | Same contract, type `nursing-assessment`; or a single final/amended/corrected Observation coded `nursing-assessment` in `https://vgi-health.example/fhir/CodeSystem/observation`, with one Practitioner performer and `issued`; key `chartAssessment`. |
| `weight.measured` | One final/amended/corrected encounter-bound Observation with LOINC `29463-7`, one Practitioner performer and explicit `effectiveDateTime`; key `verifyEncounterWeight`. Multiple measurements require a future explicit selector; none is chosen implicitly. |

Compositions must match the patient and encounter exactly, be uniquely current,
and not be replaced by another supplied resource. Missing signatures, versions,
actors or times supply no evidence. The local document types above are explicit
adapter contracts, not inferred meanings of generic FHIR documents. Existing
DocumentReferences have no unambiguous signature instant and are not relabeled.
Encounter evidence identifies its source actor as `fhir-record:Encounter/<id>`;
this denotes the authoritative administrative record, not an invented clinician.
Document and observation actors are the recorded Practitioner references.

Each supported artifact key gets one binding to a patient/encounter snapshot.
Its digest covers sorted resource types, IDs and versions, so admission and
completion can share the same rule binding while retaining their distinct event
times. Evidence copies that binding's artifact/version and is always actual
(`Temporal.evidence_bound`). Digest collision resistance and the accuracy of
imported FHIR data remain trust boundaries. Clinical appropriateness is unchanged.
The deficiency endpoint uses the injected service clock for both projection and
deadline evaluation; a regression advances that clock from pending to delinquent.

The following encoded events remain **unsourced**. The supplied record does not
uniquely establish their exact clinical meaning, occurrence/filing/signature time,
actor or selected procedure/order/shift. No event is inferred from a click, a
checkbox, a generic note date, a planned procedure, or narrative keyword matching:

```text
abortion, access.providedOrDenied, access.requested, advanceDirective.learned,
advanceDirective.recorded, airway.assessed, allergies.confirmed, anesthesia.induction,
bloodLoss.assessed, capacity.learned, capacity.recorded, care.start,
cures.practitionerReviewed, delivery, emergencyPrescription.delivered,
emergencyPrescription.oralAuthorization, essentialImaging.displayed, hp.filed,
hp.updateFiled, identity.twoPersonIdentifiers, identity.verified, incision,
instruments.countConfirmed, intervalHp.performed, intervalHp.recorded,
medication.administered, medication.scheduled, needles.countConfirmed,
nursing.processInitiated, nursing.transferAssessment, operativeReport.writtenOrDictated,
oximeter.functionConfirmed, pain.intervention, pain.responseDocumented,
patient.leavesOR, preanesthesia.completed, preinduction.review, prescription.issued,
procedure.start, prophylaxis.administered, restraint.attendingConsult,
restraint.evaluationDocumented, restraint.faceToFace, restraint.newOrder,
restraint.responsibleAssessment, restraint.rnConsult, restraint.start, rights.informed,
screening.recorded, shift.start, side.verified, site.marked, site.verified,
specimen.labelsReadAloud, sponges.countConfirmed, standingOrder.initiated,
standingOrder.signed, sterility.confirmed, sterilization.consent,
sterilization.procedure, summary.available, summary.requested, surgery.end,
surgery.start, surgicalConsent.filed, team.introduced, telehealth.consented,
telehealth.informed, telehealth.start, timeout.identityAgreement,
timeout.procedureAgreement, timeout.repeatedForPerformer, timeout.siteAgreement,
transfer.received, transmissionFailure.ended, transmissionFailure.reasonRecorded,
vaccine.administered, verbalOrder.countersigned, verbalOrder.given,
verbalOrder.recorded, vis.provided
```


## 4. Order reconciliation at transfer and discharge (*new specification*, hospital policy)

- **Order drafts.** An order draft is an unsigned capture of an order-line
  element, read from the spec (`isOrderLineElement`): a per-order-line entry of
  an order-entry commit (`isOrderCommit`: `signOrders` or a commit with a
  per-line drug entry), plus the line identities `drug`, `orderKind` and
  `orderCode` that the order guard already reads. Whole-order entries such as
  weight or patient-ID re-entry are not order lines: they belong to the visit,
  not to a line the transfer could make wrong, and a whole-order entry shared
  with another commit would otherwise be tagged for that commit too.
- **ADT stamp.** Each draft checkpoint records, per stored patient draft, the
  patient's ADT stamp (revision, admission ordinal, admitted) from the native
  ADT record, taken when that chart's session opened (`draft_adt`). Drafts
  carried over from an earlier checkpoint keep their stamp.
- **Movement** (`movement`). Only drafts saved during an admission are
  inpatient drafts. The admission ended (discharge) when the patient is no
  longer admitted or another admission is current; this includes a cancelled
  admission. Any other ADT event in the same admission (transfer, swap, bed
  assignment, cancelled transfer, cancelled discharge) counts as a transfer:
  the design calls for reconciliation after a transfer, and these events also
  change the patient's placement. Unknown stamps change nothing.
- **Restore.** When a chart is opened from a checkpoint, the service asks native
  Lean to reconcile that patient's stored draft (`reconcileStore`) before the
  session starts; Lean's unchanged hydration then restores it. The immutable
  checkpoint keeps the original draft.
- **Transfer:** restored order-line captures are tagged "Needs reconciliation"
  (`reconcileTag`). Every order-entry commit is refused while any tag remains
  (`signingHasOrder`; reason "Needs reconciliation: …"). The chart shows an
  "Order reconciliation after transfer" section with one coded control per
  line (keep, change, discontinue), painted as an ordinary field. Choosing one
  sends an entry that `reconcileCore` handles: only a human, without an open
  alert, and only for lines whose elements the role may enter. Keep retains
  the line, change retains it and selects it for editing, discontinue removes
  the line's order captures. Re-entering a tagged value keeps the tag, so
  editing a field is not a decision.
- **Discharge:** the encounter is closed, so restored drafts lose their
  order-line captures. They are kept in provenance (the source checkpoint and
  `commit_discarded_drafts`) and listed to their author as discarded at
  discharge. The draft's other unsigned work is still restored and listed.
- Proved: `transfer_restores_tagged` (after a transfer every restorable order
  line of the saved draft is in the reopened chart, tagged),
  `pending_blocks_orders` and `transfer_needs_decision` (no event by any actor
  adds an order-entry commit while a line awaits a decision), `reconcileCore_ok`
  (an accepted decision is a human's, for one awaiting line, clears exactly
  that line and changes no commit, receipt, acknowledgment or popup),
  `reconcileCore_macro`, `reentry_keeps_tag`, `discharge_restores_no_orders`
  (after a discharge every order-line capture of the reopened chart comes from
  the fresh chart, none from the draft) and `discharge_keeps_provenance`. The
  transfer and discharge statements are about the hydration `Workspace.bind`
  performs (`Ehr.Runtime.Hydrated`).
- Existing theorems are unchanged, including `signed_leave_reopen`. The
  interpreter's step invariants (macro safety, human-only entries, writes,
  screens, drafts and critical-result framing) were extended to the new
  decision path without changing their statements.
- The loading call refuses reconciliation decisions before the clinician has
  seen the restored chart (`Runtime.hydrating_reconcile`). The checker reserves
  the entire `reconcile.line|` component-ID prefix on every screen
  (`Check.accepted_reconcileIds`, `accepted_reconcile_no_shadow`). These are
  **New specification for owner review**.
- Reconciliation dispatch is in `stepEvent`, beside ordinary `enterCore` value
  entry. This preserves the timing theorem statements: a decision changes
  provenance while retaining the original value and entry timestamp; replacing
  a value creates a newly stamped capture and retains any reconciliation tag.
- Limits: a linked dependent capture on another line can still be discarded
  when its source changes. The list is fetched when the workspace opens and is
  refreshed on reload.

## Effect on recordings

These change the Lean contract, exported release specs and programs, the
commit service and the app. Historical codecs remain compatible, but new
absolute-clock captures and new controls change replay output, and the facts
input gains `extraActivities`. The certified app hash changes, the packaged WASM
must be rebuilt, and `runs/core-10day` needs one re-certification.


## Verification

The integrated native build passes **629 jobs**, including the production FHIR
projection regressions. Edited and new theorem axiom prints use only `propext`,
`Classical.choice` and `Quot.sound`. `lake exe gents` regenerates 204 types and
44 samples, restoring the deficiency fields lost in the merge. A scratch
`lake exe export-content` export matches all 21 release JSON files byte-for-byte;
no release rewrite is needed. The two focused live service regressions pass,
including transfer/discharge behavior and pending-to-delinquent temporal work
without UI-generated evidence. The latter checks the injected clock, future
signature refusal and a current signed completion certificate.

The combined packaged-WASM, proof-map and sequential verification results will
be recorded here after the final run. Recording re-certification is intentionally
left for the integrated branch; no data under `runs/` is re-certified here.
