import Ehr.Check.AlertEncounters

namespace Ehr.Check.ReviewTrace
open Ehr Ehr.Props EntryWitness

/-- New specification for owner review. A wrong human entry is refused and
cannot establish a confirmed capture on its line. -/
def refuseEntry (i : Scene) (e : ElementId) (v : Value) (noCapture := true) (alternative : Option (Trial Unit) := none) : Trial Unit :=
  control i ("refuse incorrect " ++ e) (fun c => (fieldOf? c.kind).any (fun f => f.1 == e)) fun s c => do
    if let some task := alternative then
      let _ ← execute task s
    let r := dispatch i.toInitInput s (.enter c.id v)
    unless (i.spec.element? e).any (fun el => r.result == .blocked (rejectReason el v)) &&
      (if noCapture then !(r.state.captured.any (·.element == e))
       else !(r.state.captured.find? (·.element == e)).any (·.confirmed)) do
      throw s!"Incorrect {e} established a capture or was not refused"
    return r.state

/-- New specification for owner review. The suite's identity, barcode, cosign,
dose-unit, preoperative and opioid-risk refusal and recovery encounters. -/
def correctionCases (sp : Spec) (p : Program) (cm : CommitId) : List Case := Id.run do
  let f := facts cm
  let i := scene sp p "" f
  let wrong := fun e v => (⟨"refuse incorrect " ++ e, i, do
    checked (fun s => (execute (openChart i.toInitInput) s).map (·.2))
    refuseEntry i e v
    prepare i sp cm f []
    finish i cm⟩ : Case)
  if cm == "administerMed" then
    return [wrong "wristbandScan" (.code "heldout-B"), wrong "medScan" (.code "amoxicillin"),
      wrong "highAlertCosign" (.user p.owner)]
  if cm != "signOrders" then return []
  let mut cases := [wrong "patientIdReentry" (.text "WRONG/M/99")]
  let pre := {f with encounterKind? := some "preop"}
  if p.role != .np then
    let j := scene sp p "" pre
    for e in ["consentVerified", "hpUpdate", "medsToHold"] do
      cases := cases ++ [⟨"preop." ++ e, j, do
        checked (fun s => (execute (openChart j.toInitInput) s).map (·.2))
        prepare j sp cm pre [] [] (some e)
        refuseCommit j cm e⟩]
  for unit in [UnitKind.units, .mcg, .mL] do
    cases := cases ++ [⟨"dose.wrong-" ++ Render.unitName unit, i, do
      checked (fun s => (execute (openChart i.toInitInput) s).map (·.2))
      prepare i sp cm f [] [] (some "dose")
      refuseEntry i "dose" (.qty 100 unit) false (some do
        enterValue i "dose" (sample sp cm "metformin" "dose")
        prepare i sp cm f [] ((fields cm).takeWhile (· != "dose") ++ ["dose"])
        finish i cm)⟩]
  let insulin := [("drug", Value.code "insulin lispro"), ("dose", .qty 100 .units), ("doseUnit", .code "units")]
  cases := cases ++ [⟨"dose.native-units-positive", i, do
    checked (fun s => (execute (openChart i.toInitInput) s).map (·.2))
    prepare i sp cm f insulin [] (some "dose")
    refuseEntry i "dose" (.qty 100 .mg) false (some do
      enterValue i "dose" (.qty 100 .units)
      prepare i sp cm f insulin ((fields cm).takeWhile (· != "dose") ++ ["dose"])
      finish i cm)⟩]
  for benzo in [false, true] do
    let risk := {f with currentMedClasses := if benzo then ["benzodiazepine"] else []}
    let vals := [("freq", Value.code "q4h"), ("dose", .qty (if benzo then 50 else 200) .mg)] ++ controlled
    let name := "naloxone." ++ (if benzo then "benzodiazepine" else "high-mme")
    let j := scene sp p "" risk
    for e in ["naloxoneOffer", "naloxoneEducation"] do
      cases := cases ++ [⟨name ++ "." ++ e, j, do
        checked (fun s => (execute (openChart j.toInitInput) s).map (·.2))
        prepare j sp cm risk vals
        if e == "naloxoneEducation" then enterValue j "naloxoneOffer" (.code "offered-declined")
        refuseCommit j cm e (some do
          if e == "naloxoneOffer" then enterValue j "naloxoneOffer" (.code "offered-declined")
          enterValue j "naloxoneEducation" (.flag true)
          finish j cm)⟩]
  return cases

end Ehr.Check.ReviewTrace
