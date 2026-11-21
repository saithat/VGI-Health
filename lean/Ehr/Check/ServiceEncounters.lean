import Ehr.Check.ReviewEncounters

namespace Ehr.Check.ReviewTrace
open Ehr Ehr.Props

/-- New specification for owner review. Observe the two native service requests
in the same workflow as human order entry. The second click preserves the
entire confirmed capture observed before navigating back to the request button. -/
def serviceCases (sp : Spec) (p : Program) : List ClinicalCase := Id.run do
  unless ["orderKind", "orderCode", "priorAuthRequest"].all (fun e => (sp.element? e).isSome) do return []
  let some origin := p.screens.find? (serviceOptIn sp) | return []
  let wf := origin.workflow
  let inWorkflow := fun (g : Checkpoint) => {g with act := fun i s c => do
    unless (p.screen? s.screen).any (·.workflow == wf) do throw s!"Provide {g.label} in {wf}"
    g.act i s c}
  let field := fun e v => inWorkflow {(enterValue e v) with
    accepts := fun c => match c.kind with | .field id .current _ => id == e | _ => false
    preserves := fun _ t => !t.captured.any (·.element == "drug") &&
      (e != "priorAuthRequest" || (t.captured.find? (·.element == e)).any (fun x => x.byHuman && x.confirmed))}
  let req := fun c : Component => c.kind == .button .requestPriorAuth
  let request : Checkpoint := inWorkflow ⟨"refuse automatic prior auth", req, fun i s c => do
    unless !s.captured.any (·.element == "drug") do throw "Use a service route free of medication prefills"
    let r := fire i s (.click c.id)
    unless r.result == .blocked "human entry required: priorAuthRequest" do
      throw s!"Expected a human-entry refusal, observed {repr r.result}"
    return r.state, fun _ _ => true⟩
  let repeatRequest : Checkpoint := inWorkflow ⟨"repeat prior auth", req, fun i s c => do
    let t := (fire i s (.click c.id)).state
    unless !t.captured.any (·.element == "drug") &&
        !(runView ⟨sp, p, i.facts, i.user, t⟩).items.any (fun item =>
          item.shown && item.firing && (alertOf? item.comp.kind).isSome) do
      throw "Keep the service route free of medication lines and firing alerts"
    return t, fun _ _ => true⟩
  let status : Checkpoint := inWorkflow ⟨"show authorization status", fun c => showsInfo "priorAuthStatus" c.kind,
    fun _ s _ => .ok s, fun _ _ => true⟩
  let tail := if (sp.info? "priorAuthStatus").isSome then [status] else []
  let sameCapture := fun (before after : State) =>
    let saved := before.captured.find? (·.element == "priorAuthRequest")
    saved.any (fun x => x.byHuman && x.confirmed && x.value == .flag true) &&
      after.captured.find? (·.element == "priorAuthRequest") == saved
  return ["imaging", "procedure"].map fun kind =>
    let steps := [field "orderKind" (.code kind), field "orderCode" (.code "70551")] ++
      (if (sp.element? "imagingPriority").isSome then [field "imagingPriority" (.code "routine")] else []) ++
      [request, field "priorAuthRequest" (.flag true)] ++ tail ++
      [{repeatRequest with preserves := sameCapture}]
    ⟨"v2.prior-auth." ++ kind, encounterInput sp p clinicalFacts, steps, true⟩

end Ehr.Check.ReviewTrace
