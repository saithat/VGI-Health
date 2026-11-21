import Ehr.Check.ClinicalCorrections
import Ehr.Render.Fhir

namespace Ehr.Check.ReviewTrace
open Ehr Ehr.Props Ehr.Render

/-- New specification for owner review. Exact synthetic FHIR bundle used to
project the EPCS display by the native adapter. -/
def prescriptionDisplay : Except String Display := do
  let bundle := Lean.Json.parse r#"{"resourceType":"Bundle","type":"collection","entry":[{"resource":{"resourceType":"Patient","id":"heldout-A","name":[{"given":["Heldout"],"family":"heldout-A"}],"gender":"female","birthDate":"1984-01-02","identifier":[{"type":{"coding":[{"code":"MR"}]},"value":"heldout-A"}]}},{"resource":{"resourceType":"Observation","id":"heldout-A-weight","status":"final","subject":{"reference":"Patient/heldout-A"},"code":{"coding":[{"system":"http://loinc.org","code":"29463-7"}]},"effectiveDateTime":"2026-11-02T09:00:00Z","valueQuantity":{"value":70,"unit":"kg","code":"kg"}}}]}"#
  let projected ← Fhir.runFacts {bundle := ← bundle, context := { today := "2026-11-02", now := 600 }}
  return projected.display

/-- New specification for owner review. The controlled order's details occur in
one native summary row at the signing control, followed by a successful signature. -/
def prescriptionDetails (sp : Spec) (p : Program) : ClinicalCase :=
  let cm := "signOrders"
  let sign : Checkpoint := {(atCommit cm) with act := fun i s c => do
    unless showsControlledLine i s (← prescriptionDisplay) do
      throw "Show the controlled medication, dose, directions, quantity and refills together before signing"
    (finish cm ["orderSummary"]).act i s c}
  ⟨"epcs.details-content", encounterInput sp p clinicalFacts, prepare sp cm clinicalFacts controlled ++ [sign], false⟩

/-- New specification for owner review. Incomplete active line cannot advance
before dose entry. The ordinary positive case separately completes that fixture. -/
def incompleteLine (sp : Spec) (p : Program) : ClinicalCase :=
  let blocked : Checkpoint := ⟨"refuse incomplete medication line", fun c => c.kind == .button .newOrderLine,
    fun i s c => do
      let r := fire i s (.click c.id)
      if r.result == .blocked "finish this order line first" && r.state.currentSlot == s.currentSlot then return r.state
      throw "Adding a medication line must refuse the unfinished dose and retain its slot", fun _ _ => true⟩
  ⟨"orders.incomplete-line-cannot-advance", encounterInput sp p clinicalFacts,
    forkBefore (prepare sp "signOrders" clinicalFacts [] ++ [finish "signOrders"]) "dose" blocked, false⟩

/-- New specification for owner review. Approval cannot serve as a denial with
no reason. The same clinician can then record the reason and use dedicated
denial. A second trace with the identical fixture completes ordinary approval. -/
def refillCases (sp : Spec) (p : Program) : List ClinicalCase :=
  let cm := "approveRefill"
  let f := {clinicalFacts with
      medToGive? := some "metformin"
      record := [("requestMedication", "metformin"), ("requestQuantity", "30")]}
  let base := completeCase sp p cm "refill.ordinary-approval" [] f
  let refuse : Checkpoint := {(atCommit cm) with act := fun i s c => do
    unless !(s.captured.find? (·.element == "refillDenyReason")).any (·.confirmed) do throw "Denial reason already confirmed"
    let mut t := s
    for _ in [:31] do
      let r := fire i t (.click c.id)
      if let some key := r.state.popup? then t ← applyOk i r.state (.ack key.1)
      else if i.spec.entries.any (fun rq => rq.commit == cm && rq.element == "refillDecision" &&
          !entryMet i.spec i.facts i.user t rq && r.result == .blocked (entryReason i.spec i.facts i.user t rq)) then
        unless !r.state.commits.contains cm do throw "Denial was signed through approval"
        return r.state
      else throw "Refuse denial through the approval control"
    throw "Denial refusal obscured by repeating alerts"}
  let deny := {(enterValue "refillDecision" (.code "deny")) with
    preserves := fun _ t => !((t.captured.find? (·.element == "refillDenyReason")).any (·.confirmed))}
  [{base with name := "refill.denial-via-approval-action", steps := prepare sp cm f [] ++
    [withAlternative deny [finish cm], refuse, enterValue "refillDenyReason" (.code "needs-visit"),
      finish "denyRefill"]}]

/-- New specification for owner review. Run each controlled-substance exemption
on the layout with the CURES display removed. Exercise the actual waiver field
when supplied, then observe refusal or completion for this duration. -/
def curesCases (sp : Spec) (p : Program) : List ClinicalCase :=
  if p.role == .np then [] else
  [("review-required", "7-days", none, false), ("procedure-seven-day", "7-days", some "surgery-7-day", true),
   ("procedure-eight-day", "8-days", some "surgery-7-day", false),
   ("unknown-exemption", "7-days", some "invented-exemption", false)].map fun (name, duration, waiver, allowed) =>
    let cm := "signOrders"
    let f := {clinicalFacts with encounterKind? := some "preop", record := [("surgicalProcedure", "appendectomy"),
      ("facilityKind", "general-acute-care"), ("directedSupplyDays", if duration == "8-days" then "8" else "7")]}
    let field := waiver.toList.map fun code =>
      let g := enterValue "curesExemptionReason" (.code code)
      if allowed then g else {g with act := fun i s c => .ok (fire i s (.enter c.id (.code code))).state}
    ⟨"cures." ++ name, encounterInput sp (withoutPanel p "curesReport") f,
      prepare sp cm f (("duration", .code duration) :: controlled) ++ field ++
        [if allowed then finish cm else refuseCommit cm "curesReport"], false⟩

end Ehr.Check.ReviewTrace
