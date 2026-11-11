import Ehr.Render.Ui
import Ehr.Core.CriticalRuntime
import Ehr.Specs.AlertUrgency

namespace Ehr.Render

/-- All active urgent conditions, independent of navigation and acknowledgment. -/
def urgentRules (sp : Spec) (facts : Facts) (s : State) : List AlertSpec :=
  sp.alerts.filter fun a => Specs.AlertUrgency.approvedTier a.id == some .urgent &&
    !(alertKeys facts s a.cond).isEmpty

def urgentNodes (sp : Spec) (facts : Facts) (s : State) : List UiNode :=
  (urgentRules sp facts s).map fun a => .alert ("urgent:" ++ a.id) a.id
    (uiLabel a.label "Clinical alert")
    (match a.tier with | .interruptive => "interruptive" | .passive => "passive" | .removable => "removable")

/-- Critical workflow controls read the named `CriticalDraft.text` through the
shared lookup; resolved results show the recorded action rather than a draft. -/
def criticalNodes (facts : Facts) (user : User) (s : State) : List UiNode :=
  let s := { s with clock := 0 }
  (CriticalRuntime.tickets facts s).filterMap fun t =>
    if t.result.availableAt > CriticalRuntime.now facts s then none else
    let allowed := Multi.Critical.authorized t user.id
    let received := t.receivedBy.contains user.id
    let resolved := t.resolution.isSome
    let text := CriticalRuntime.actionText s t.result.id
    some (.section ("critical:" ++ t.result.id) t.result.label
      ([.text ("Responsible: " ++ t.result.responsible ++ " · covering: " ++ t.result.covering ++
        " · deadline: minute " ++ toString (t.result.availableAt + t.result.limit)),
        .text (if t.result.responsible == "" || t.result.covering == "" then "Recipient route missing; immediate manual notification required"
          else if resolved then "Resolved: " ++ ((t.resolution.map (·.action)).getD "")
          else if t.escalatedAt.isSome then "Escalated to covering clinician; unresolved"
          else "Delivered to responsible clinician; unresolved")] ++
       (if resolved then [] else
       [.button ("critical.receive:" ++ t.result.id) "Receive critical result" "workflow"
          (allowed && !received) (if allowed && !received then none else some "Receipt requires a notified clinician; already received receipts are retained") none,
        .button ("critical.escalate:" ++ t.result.id) "Escalation at deadline" "workflow" false
          (some (if t.escalatedAt.isSome then "Already escalated to covering clinician" else "Timeout service escalates at the reporting deadline")) none,
        .field ("critical.action:" ++ t.result.id) "Clinical action taken" "text" (some text) none none false true true,
        .button ("critical.resolve:" ++ t.result.id) "Record action and resolve" "workflow"
          (allowed && received && text.trimAscii.toString != "")
          (if allowed && received && text.trimAscii.toString != "" then none
           else some "Responsible clinician must receive result and document clinical action") none])))

/-- Additive renderer: historical renderUi and its modal counterexamples remain
valid. Production pins all active urgent facts and moves an urgent popup's ack
into the same strip. An unrelated modal retains its own boundary. -/
def withUrgentStrip (sp : Spec) (facts : Facts) (user : User) (s : State) (base : UiScreen) : UiScreen :=
  let urgent := urgentNodes sp facts s
  let ack := match s.popup? with
    | some (id, _) => if Specs.AlertUrgency.approvedTier id == some .urgent then
        [.button id "Acknowledge" "ack" true none none] else []
    | none => []
  { base with
    urgent? := if urgent.isEmpty && ack.isEmpty then none else some (urgent ++ ack)
    modal := match s.popup? with
      | some (id, _) => if Specs.AlertUrgency.approvedTier id == some .urgent then none else base.modal
      | none => base.modal
    workspace := criticalNodes facts user s ++ base.workspace }
end Ehr.Render
