import Ehr.Check.PrescriptionEncounters

namespace Ehr.Check.ReviewTrace
open Ehr Ehr.Props EntryWitness

/-- New specification for owner review. Add the suite's single-click macro and
its visible root button only on the screen reached by the original execution. -/
def injectClick (p : Program) (screen : ScreenId) (name target : CompId) : Program :=
  let button : Component := { id := name, kind := .«macro» name, label := "Probe", tag := name }
  { p with macros := p.macros ++ [⟨name, "Probe", [.click target]⟩],
           screens := p.screens.map fun sc =>
             if sc.id == screen then {sc with components := sc.components ++ [button]} else sc }

/-- New specification for owner review. On the forked, probe-modified layout
neither macro may create human evidence. The original prepared state signs. -/
def automationCase (sp : Spec) (p : Program) : Case :=
  let cm := "signOrders"
  let i := scene sp p "" (facts "")
  let probe := atCommit i cm fun s c => do
    let some target := (p.compsOf s.screen).find? (fun b => commitOf? b.kind == some cm)
      | throw "Provide the signing action"
    let first := "heldout-commit-probe"
    let fork := {i with program := injectClick p s.screen first target.id}
    let r := dispatch fork.toInitInput s (.click first)
    unless r.result == .blocked "macro stopped at step 0: human only: commit" &&
      r.state.commits.isEmpty do throw "Require human-only signing on the injected commit probe"
    let j := {fork with paths := routes fork.program}
    let review := control j "human allergy review" (fun b => reviewOf? b.kind == some "allergyList")
      fun t b => do
        let second := "heldout-review-probe"
        let rr := dispatch {j.toInitInput with program := injectClick j.program t.screen second b.id} t (.click second)
        unless rr.result == .blocked "macro stopped at step 0: human only: review" &&
          rr.state.receipts == t.receipts do throw "Require human-only review on the injected review probe"
        return rr.state
    let _ ← execute review r.state
    signAt i.toInitInput cm [] none s c
  ⟨"automation.commit-and-review", i, do checked (fun s => (execute (openChart i.toInitInput) s).map (·.2)); prepare i sp cm (facts "") []; probe⟩

/-- New specification for owner review. After A signs, open a new B episode by
native init, inspect B before any clinical edit, then refuse A's identity. -/
def resetCase (sp : Spec) (p : Program) (nursing : Bool) : Case :=
  let cm := if nursing then "administerMed" else "signOrders"
  let f := facts cm
  let i := scene sp p "" f
  let endA := atCommit i cm fun s c => do
    let signed ← signAt i.toInitInput cm [] none s c
    let b := scene sp p "" { (facts "") with
      patientId := "heldout-B", identity := ⟨"HB", "M", 9⟩,
      weightToday? := some (300, .kg), medToGive? := if nursing then some "amoxicillin" else none,
      record := [("appointmentReason", "Patient B only"), ("preferredPharmacy", "B-pharmacy")] }
    let fresh ← (execute (openChart b.toInitInput) (runInit b.toInitInput)).map (·.2)
    unless fresh.commits.isEmpty && fresh.acked.isEmpty && fresh.receipts.isEmpty &&
      fresh.captured.all (fun x => !x.byHuman && !x.confirmed) do throw "Clear human evidence on fresh patient initialization"
    let wire := (Lean.toJson fresh).compress ++ (Lean.toJson (runView ⟨sp, p, b.facts, b.user, fresh⟩)).compress
    unless !["heldout-A", "HA/F/42", "heldout-second-nurse"].any (fun marker => wire.contains marker) do
      throw "Remove the previous patient's identifiers from B's initial state and view"
    let wrong := if nursing then refuseEntry b "wristbandScan" (.code "heldout-A") else
      refuseEntry b "patientIdReentry" (.text "HA/F/42")
    let _ ← execute wrong fresh
    return signed
  ⟨"patient-switch.reset", i, do checked (fun s => (execute (openChart i.toInitInput) s).map (·.2)); prepare i sp cm f []; endA⟩

end Ehr.Check.ReviewTrace
