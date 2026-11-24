import Ehr.Check.ReviewEncounters

namespace Ehr.Check.ReviewTrace
open Ehr Ehr.Props EntryWitness

/-- New specification for owner review. Observe the two native service requests
in the same workflow as human order entry. The second click preserves the
entire confirmed capture observed before navigating back to the request button. -/
def serviceCases (sp : Spec) (p : Program) : List Case := Id.run do
  unless ["orderKind", "orderCode", "priorAuthRequest"].all (fun e => (sp.element? e).isSome) do return []
  let some origin := p.screens.find? (serviceOptIn sp) | return []
  let wf := origin.workflow
  let base := scene sp p "" (facts "")
  let i := {base with paths := routes p true}
  let inWorkflow := fun (label : String) (action : State → Component → Except String State) s c => do
    unless (p.screen? s.screen).any (·.workflow == wf) do throw s!"Provide {label} in {wf}"
    action s c
  let field := fun e v =>
    let label := "enter " ++ e
    control i label (fun c => match c.kind with | .field id .current _ => id == e | _ => false)
      (inWorkflow label fun s c => (execute (enterAt i c e v) s).map (·.2))
      (fun _ t => !t.captured.any (·.element == "drug") &&
        (e != "priorAuthRequest" || (t.captured.find? (·.element == e)).any (fun x => x.byHuman && x.confirmed)))
  let req := fun c : Component => c.kind == .button .requestPriorAuth
  let request := control i "refuse automatic prior auth" req (inWorkflow "refuse automatic prior auth" fun s c => do
    unless !s.captured.any (·.element == "drug") do throw "Use a service route free of medication prefills"
    let r := dispatch i.toInitInput s (.click c.id)
    unless r.result == .blocked "human entry required: priorAuthRequest" do
      throw s!"Expected a human-entry refusal, observed {repr r.result}"
    return r.state)
  let sameCapture := fun (before after : State) =>
    let saved := before.captured.find? (·.element == "priorAuthRequest")
    saved.any (fun x => x.byHuman && x.confirmed && x.value == .flag true) &&
      after.captured.find? (·.element == "priorAuthRequest") == saved
  let repeatRequest := control i "repeat prior auth" req (inWorkflow "repeat prior auth" fun s c => do
    let t := (dispatch i.toInitInput s (.click c.id)).state
    unless !t.captured.any (·.element == "drug") &&
        !(runView ⟨sp, p, i.facts, i.user, t⟩).items.any (fun item =>
          item.shown && item.firing && (alertOf? item.comp.kind).isSome) do
      throw "Keep the service route free of medication lines and firing alerts"
    return t) sameCapture
  let status := control i "show authorization status" (fun c => showsInfo "priorAuthStatus" c.kind)
    (inWorkflow "show authorization status" fun s _ => .ok s)
  return ["imaging", "procedure"].map fun kind =>
    ⟨"v2.prior-auth." ++ kind, i, do
      checked (fun s => (execute (openChart i.toInitInput) s).map (·.2))
      field "orderKind" (.code kind)
      field "orderCode" (.code "70551")
      if (sp.element? "imagingPriority").isSome then field "imagingPriority" (.code "routine")
      request
      field "priorAuthRequest" (.flag true)
      if (sp.info? "priorAuthStatus").isSome then status
      repeatRequest⟩

end Ehr.Check.ReviewTrace
