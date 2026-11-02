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

def actionText (s : State) (id : String) : String :=
  ((s.captured.find? (fun c => c.element == "critical.action:" ++ id)).map fun c =>
    match c.value with | .text text => text | _ => "").getD ""

/-- A separate workflow endpoint, using the same executable multi-actor reducer.
Ordinary alert acknowledgment still goes to the original interpreter. -/
def handle (f : Facts) (u : User) (s : State) (e : Event) : Option (State × StepResult) := do
  let ts := tickets f s
  match e with
  | .enter comp (.text text) =>
    let t ← ts.find? (fun t => comp == "critical.action:" ++ t.result.id)
    if !authorized t u.id then return (s, .blocked "responsible clinician only")
    return ({ s with captured :=
      { element := comp, slot := 0, value := .text text, byHuman := true, confirmed := true } ::
        s.captured.filter (·.element != comp), criticalResults? := some ts }, .ok)
  | .click comp =>
    let t ← ts.find? fun t => ["critical.receive:", "critical.resolve:", "critical.escalate:"].any
      (fun head => comp == head ++ t.result.id)
    let updated := if comp == "critical.escalate:" ++ t.result.id then advance (now f s) t
      else step (now f s) u.id t (if comp == "critical.receive:" ++ t.result.id then .receive
        else .resolve (actionText s t.result.id))
    let next := { s with criticalResults? := some (ts.map fun row => if row.result.id == t.result.id then updated else row) }
    return (next, if updated == t then .blocked "receipt, responsible clinician and documented action required; escalation only at deadline" else .ok)
  | _ => none
end Ehr.CriticalRuntime
