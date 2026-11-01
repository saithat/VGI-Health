import Ehr.Core.View

/-!
Definitions shared by the theorem statements and their proofs.
These extend the interpreter with review receipts, human waivers,
alert tiers and the reference used to check macro behavior.
-/

namespace Ehr.Props

open Ehr

/-! ## T2: receipts -/

/-- A receipt for the current data version, from an allowed role, within the
permitted time window and not dated in the future. -/
def ValidReceiptFor (sp : Spec) (facts : Facts) (s : State) (rq : ReviewReq) : Prop :=
  ∃ w roles, rq.mode = .shownOrReceipt w roles ∧
    ∃ r ∈ s.receipts, r.info = rq.info ∧ infoVersion sp facts rq.info = some r.dataVersion ∧
      r.time ≤ nowMin facts s ∧ nowMin facts s - r.time ≤ w ∧ r.role ∈ roles

/-- The named waiver has a nonempty, confirmed value entered by a human. -/
def HumanWaiverFor (s : State) (rq : ReviewReq) : Prop :=
  ∃ e, rq.waivedBy? = some e ∧
    ∃ x ∈ s.captured, x.element = e ∧ x.byHuman = true ∧ x.confirmed = true ∧
      x.value.nonEmpty = true

/-! ## A4: popups -/

/-- The open popup, if any, belongs to an alert rule (looked up by ID) that is
not passive. -/
def PopupNotPassive (sp : Spec) (s : State) : Prop :=
  ∀ a k, s.popup? = some (a, k) → ∃ al, sp.alert? a = some al ∧ al.tier ≠ .passive

/-! ## T6: the reference macro run -/

/-- What one macro step does, through the public interface: `setValue` and
`click` send an event to `step` as `Actor.macro`; `goto` moves to the screen
(refused while a popup is open). -/
def macroAct (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State) :
    MacroStep → State × StepResult
  | .setValue cid str => step sp prog facts user .«macro» s (.enter cid (macroValue sp prog facts s cid str))
  | .click cid => step sp prog facts user .«macro» s (.click cid)
  | .goto t => if s.popup?.isSome then (s, .blocked "popup: acknowledge the alert first")
               else goTo sp prog facts s t

/-- Run macroAct on each step and stop at the first result that is not ok.
Return the final state and any failure index and result; i is the first index. -/
def foldMacro (sp : Spec) (prog : Program) (facts : Facts) (user : User) :
    Nat → State → List MacroStep → State × Option (Nat × StepResult)
  | _, s, [] => (s, none)
  | i, s, st :: rest =>
    match macroAct sp prog facts user s st with
    | (s', .ok) => foldMacro sp prog facts user (i + 1) s' rest
    | (s', r) => (s', some (i, r))

end Ehr.Props
