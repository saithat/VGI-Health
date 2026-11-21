import Ehr.Check.AlertEncounters

namespace Ehr.Check.ReviewTrace
open Ehr Ehr.Props

/-- New specification for owner review. A wrong human entry is refused and
cannot establish a confirmed capture on its line. -/
def refuseEntry (e : ElementId) (v : Value) (noCapture := true) : Checkpoint :=
  {(enterValue e v) with label := "refuse incorrect " ++ e, act := fun i s c => do
    let r := fire i s (.enter c.id v)
    unless (i.spec.element? e).any (fun el => r.result == .blocked (rejectReason el v)) &&
      (if noCapture then !(r.state.captured.any (·.element == e))
       else !(r.state.captured.find? (·.element == e)).any (·.confirmed)) do
      throw s!"Incorrect {e} established a capture or was not refused"
    return r.state}

/-- New specification for owner review. A legitimate prefix ending immediately
before the omitted field, or a full corrected execution from the same fixture. -/
def prefixBefore (steps : List Checkpoint) (e : ElementId) : List Checkpoint :=
  steps.takeWhile (·.label != "enter " ++ e)

/-- New specification for owner review. From the very same reached chart,
validate the successful alternative, then exercise the negative branch on
the original state. Neither branch supplies evidence to the other. -/
def withAlternative (g : Checkpoint) (steps : List Checkpoint) : Checkpoint :=
  {g with act := fun i s c => do
    let _ ← search i (routes i.program false) s steps
    g.act i s c}

/-- New specification for owner review. Split a prepared sequence at the
tested omission and require both continuations after its legitimate prefix. -/
def forkBefore (steps : List Checkpoint) (e : ElementId) (g : Checkpoint) : List Checkpoint :=
  let prior := prefixBefore steps e
  prior ++ [withAlternative g (steps.drop prior.length)]

/-- New specification for owner review. The suite's identity, barcode, cosign,
dose-unit, preoperative and opioid-risk refusal and recovery encounters. -/
def correctionCases (sp : Spec) (p : Program) (cm : CommitId) : List ClinicalCase := Id.run do
  let f := factsFor cm
  let basic := completeCase sp p cm ("positive." ++ cm)
  let wrong := fun e v => { basic with name := "refuse incorrect " ++ e, steps := refuseEntry e v :: basic.steps }
  if cm == "administerMed" then
    return [wrong "wristbandScan" (.code "heldout-B"), wrong "medScan" (.code "amoxicillin"),
      wrong "highAlertCosign" (.user p.owner)]
  if cm != "signOrders" then return []
  let mut cases := [wrong "patientIdReentry" (.text "WRONG/M/99")]
  let pre := {f with encounterKind? := some "preop"}
  if p.role != .np then
    let prep := prepare sp cm pre []
    for e in ["consentVerified", "hpUpdate", "medsToHold"] do
      cases := cases ++ [⟨"preop." ++ e, encounterInput sp p pre, prefixBefore prep e ++ [refuseCommit cm e], false⟩]
  for unit in [UnitKind.units, .mcg, .mL] do
    cases := cases ++ [⟨"dose.wrong-" ++ Render.unitName unit, basic.input,
      forkBefore basic.steps "dose" (refuseEntry "dose" (.qty 100 unit) false), false⟩]
  let insulin := [("drug", Value.code "insulin lispro"), ("dose", .qty 100 .units), ("doseUnit", .code "units")]
  let nativeDose := completeCase sp p cm "dose.native-units-positive" [] f insulin
  cases := cases ++ [{nativeDose with steps := forkBefore nativeDose.steps "dose" (refuseEntry "dose" (.qty 100 .mg) false)}]
  for benzo in [false, true] do
    let risk := {f with currentMedClasses := if benzo then ["benzodiazepine"] else []}
    let vals := [("freq", Value.code "q4h"), ("dose", .qty (if benzo then 50 else 200) .mg)] ++ controlled
    let prep := prepare sp cm risk vals ++ [enterValue "naloxoneOffer" (.code "offered-declined"),
      enterValue "naloxoneEducation" (.flag true)]
    let name := "naloxone." ++ (if benzo then "benzodiazepine" else "high-mme")
    let input := encounterInput sp p risk
    for e in ["naloxoneOffer", "naloxoneEducation"] do
      cases := cases ++ [⟨name ++ "." ++ e, input, forkBefore (prep ++ [finish cm]) e (refuseCommit cm e), false⟩]
  return cases

end Ehr.Check.ReviewTrace
