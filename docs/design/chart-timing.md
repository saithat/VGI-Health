# Entry times, late entries, signing deficiencies and order reconciliation

[Overview](../../README.md) · [Live drafts](../methods/live-drafts.md) · [Rule catalog](../rules/catalog.md)

Status: **approved direction, in implementation.** Every definition below marked
*new specification* is new and is flagged for owner review.

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
| Record completed within 30 days of discharge | 42 CFR §482.24(c)(4)(viii) | Encoded as `temporal007`; no cross-record view |
| Record completed and authenticated within two weeks of discharge | 22 CCR §70751(g) | Encoded as `temporal018`, `temporal019`; "needs cross-record deficiency tracking" |
| H&P within 24 hours of admission | 42 CFR §482.24(c)(4)(i)(A) | Encoded; no cross-record view |

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
  pending, or delinquent once the deadline has passed.
- Items:
  - Every `TemporalReq` whose status is missing or overdue, for commits the
    clinician's role performs. The deadlines are the encoded rules above.
  - Every saved unsigned draft (a draft checkpoint). Its deadline is the commit's
    temporal deadline if it has one. Otherwise, it is
    `spec.design.unsignedDraftMinutes`, default 1440 (local policy).
- Computed in Lean from the same `temporalStatus` the interpreter uses, so the
  list introduces no new rule semantics. The commit service serves it to the
  signed-in clinician, and the app shows it as a work list.
- To prove: completeness (every overdue obligation of the role's commits is
  listed) and soundness (no listed item belongs to a signed commit).

## 4. Order reconciliation at transfer and discharge (*new specification*, hospital policy)

- A draft checkpoint records the patient's ADT revision when it is saved.
- **Transfer:** if the ADT revision changed because of a transfer, unsigned order
  drafts restore marked "Needs reconciliation". The order commit is blocked until
  the clinician makes an explicit per-line decision: keep, change or discontinue.
  Only a human can make it, like medication reconciliation.
- **Discharge:** the encounter is closed, so unsigned inpatient order drafts are
  not restored. They are kept in provenance and listed to their author as
  discarded at discharge.
- To prove: after a transfer, no restored order draft can be signed without a
  decision; after a discharge, no inpatient order draft is restored.

## Effect on recordings

These change the Lean contract, the commit service and the app. The certified
app hash changes, so `runs/core-10day` needs one re-certification after both
parts merge.
