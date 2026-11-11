import Ehr.Core.Types

namespace Ehr.CriticalRuntime
open Multi.Critical

def now (f : Facts) (s : State) : Nat := f.now + s.clock / 600

def tickets (f : Facts) (s : State) : List Ticket :=
  let stored := s.criticalResults?.getD []
  let incoming := f.criticalResults?.getD []
  let merged := (incoming.map fun t =>
    (stored.find? (fun old => old.result == t.result)).getD t) ++
    stored.filter (fun old => !incoming.any (fun t => old.result.id == t.result.id))
  (merged.filter (fun t => t.result.patient == f.patientId)).map (advance (now f s))

/-- Reconcile the separate workflow before evaluating/rendering its alert. -/
def effectiveFacts (f : Facts) (s : State) : Facts :=
  { f with now := now f s, criticalResults? := some (tickets f s) }

/-- The drafted action text for one result, read from `State.criticalDrafts?`.
It is never read from `State.captured`. -/
def actionText (s : State) (id : String) : String :=
  (((s.criticalDrafts?.getD []).find? (fun d => d.result == id)).map (·.text)).getD ""

/-- The draft list after documenting `text` for result `id`: one draft per
result, the newest first. -/
def setDraft (s : State) (id text : String) : List CriticalDraft :=
  { result := id, text } :: (s.criticalDrafts?.getD []).filter (fun d => d.result != id)

/-- Component IDs in this namespace belong to the runtime, including future
critical-result endpoints. The checker reserves the whole prefix. -/
def reservedId (id : CompId) : Bool := "critical.".toList.isPrefixOf id.toList

/-- The refusal while an alert popup is open; the same message as `stepCore`. -/
def popupBlocked : StepResult := .blocked "popup: acknowledge the alert first"

/-- A separate workflow endpoint, using the same executable multi-actor reducer.
Ordinary alert acknowledgment still goes to the original interpreter. A handled
event changes only `criticalResults?` and `criticalDrafts?`; the action text is
a draft, not a clinical capture. While an alert popup is open, every event this
handler matches is refused with the state unchanged. Events it does not match
return `none` and go to the original interpreter. A successful resolve removes
only that result's draft; a refused resolve retains it. Authorization is the
responsible/covering user-ID rule (covering only after escalation), stricter
than a role check: sharing a role never grants access. No role check is added;
`Ehr.Runtime.Witness.role_not_checked` documents this contract. -/
def handle (f : Facts) (u : User) (s : State) (e : Event) : Option (State × StepResult) := do
  let ts := tickets f s
  match e with
  | .enter comp (.text text) =>
    let t ← ts.find? (fun t => comp == "critical.action:" ++ t.result.id)
    if s.popup?.isSome then return (s, popupBlocked)
    else if !authorized t u.id then return (s, .blocked "responsible clinician only")
    else return ({ s with criticalDrafts? := some (setDraft s t.result.id text),
                          criticalResults? := some ts }, .ok)
  | .click comp =>
    let t ← ts.find? fun t => ["critical.receive:", "critical.resolve:", "critical.escalate:"].any
      (fun head => comp == head ++ t.result.id)
    if s.popup?.isSome then return (s, popupBlocked)
    else
      let updated := if comp == "critical.escalate:" ++ t.result.id then advance (now f s) t
        else step (now f s) u.id t (if comp == "critical.receive:" ++ t.result.id then .receive
          else .resolve (actionText s t.result.id))
      let drafts := if comp == "critical.resolve:" ++ t.result.id && updated != t then
        let remaining := (s.criticalDrafts?.getD []).filter (fun d => d.result != t.result.id)
        if remaining.isEmpty then none else some remaining
        else s.criticalDrafts?
      let next := { s with
        criticalResults? := some (ts.map fun row => if row.result.id == t.result.id then updated else row)
        criticalDrafts? := drafts }
      return (next, if updated == t then .blocked "receipt, responsible clinician and documented action required; escalation only at deadline" else .ok)
  | _ => none
end Ehr.CriticalRuntime
