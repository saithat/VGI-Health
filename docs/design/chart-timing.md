# Entry times, late entries, signing deficiencies and order reconciliation

[Overview](../../README.md) · [Live drafts](../methods/live-drafts.md) · [Rule catalog](../rules/catalog.md)

Status: **approved direction.** Sections 3 and 4 are implemented
(`lean/Ehr/Core/Deficiencies.lean`); sections 1 and 2 are in implementation.
Every definition below marked *new specification* is new and is flagged for
owner review.

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

The catalog already lists the binding rules as not yet implemented:

| Rule | Source | Catalog status |
|---|---|---|
| Entries are dated and timed | 42 CFR §482.24(c)(1) (`cms-482.24-c1-dated`, `-timed`) | Needs entry provenance with immutable time |
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
- To prove: the label appears exactly when the gap exceeds the threshold, and no
  stored entry has `observedAt` after `signedAt`.

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
- Limit: the live FHIR projection does not yet derive the event evidence
  (admission, discharge, completion events) that temporal requirements read,
  so in the live stack the list currently shows drafts and discarded orders;
  temporal rows appear when facts carry evidence, as in the Lean tests.

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
- Limits: the decision runs on the loading call that hydrates a chart like any
  other entry; the reconcile control namespace (`reconcile.line|`) is not yet
  reserved by the layout checker, as `critical.` is; a linked dependent
  capture on another line can still be discarded when its source changes. The
  list is fetched when the workspace opens and is refreshed on reload.

## Effect on recordings

These change the Lean contract, the commit service and the app. The certified
app hash changes, so `runs/core-10day` needs one re-certification after both
parts merge. Sections 3 and 4 also add `extraActivities` to the facts input and
the reconciliation path to the interpreter, so the packaged WASM must be
rebuilt with them.
