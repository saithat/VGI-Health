import Ehr.Core.Interp

/-!
# Screen view

`view` describes the current screen for the app to paint: every component in
order, whether it counts as shown, its nesting, its bound value, whether an
alert fires, which components are enabled or blocked (with the reason), and
the open popup. The app renders info contents (allergy rows, med lists) from
FHIR; Lean decides presence and visibility.
-/

namespace Ehr

/-- The value captured for an element on a slot, if any. -/
def capturedAt? (s : State) (e : ElementId) (n : Nat) : Option Captured :=
  s.captured.find? fun x => x.element == e && x.slot == n

/-- Whether a shown component accepts a click or entry now.
`none`: not an actionable component. `some none`: enabled.
`some (some reason)`: blocked, with the reason. -/
def actionStatus (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (c : Component) : Option (Option String) :=
  match c.kind with
  | .button (.goto t) => some (if (prog.screen? t).isSome then none else some "unknown screen")
  | .button .back => some (if s.history.isEmpty then some "no previous screen" else none)
  | .button (.commit cm) =>
    some (if s.commits.contains cm then some "already done"
          else if guardBase sp prog facts user s cm then none
          else some (guardReason sp prog facts user s cm))
  | .button (.markReviewed i) =>
    some (if infoShown sp prog facts s i then none else some s!"{i} is not shown")
  | .button .newOrderLine => some none
  | .button .requestPriorAuth =>
    some (match sp.element? priorAuthElement with
          | none => some s!"unknown element {priorAuthElement}"
          | some el =>
            if !el.enteredBy.contains user.role then some s!"role: {user.role.name} may not enter {priorAuthElement}"
            else if !(orderLines s).any (·.1 == s.currentSlot) then some "no order on this line"
            else none)
  | .field e _ _ =>
    some (match sp.element? e with
          | none => some s!"unknown element {e}"
          | some el => if el.enteredBy.contains user.role then none
                       else some s!"role: {user.role.name} may not enter {e}")
  | .group true _ => some none
  | .tabs => some none
  | .«macro» m => some (if (prog.macro? m).isSome then none else some "unknown macro")
  | .search _ => some none
  | _ => none

/-- How one component should be painted. `comps` are the screen's components. -/
def itemView (sp : Spec) (facts : Facts) (s : State) (comps : List Component)
    (c : Component) : ItemView :=
  let slot := match c.kind with
    | .field _ sl _ => resolveSlot s sl
    | .priorAuth _ => s.currentSlot
    | _ => 0
  let cap := match c.kind with
    | .field e _ _ => capturedAt? s e slot
    | .priorAuth _ => capturedAt? s priorAuthElement slot
    | _ => none
  { comp := c
    shown := compShown sp facts s comps c
    depth := depthAux comps (comps.length + 1) c
    expanded := match c.kind with
      | .group coll _ => !coll || s.expanded.contains c.id
      | _ => false
    selectedTab := match c.kind with
      | .tabs => s.tabOf c.id
      | _ => 0
    slot := slot
    value? := cap.map (·.value)
    provenance? := cap.bind (·.provenance?)
    pendingConfirm := match cap with
      | some x => !x.confirmed
      | none => false
    humanOnly := match c.kind with
      | .field e _ _ => sp.isHumanOnly e
      | _ => false
    firing := match c.kind with
      | .alert a _ => alertHolds sp facts s a
      | _ => false }

/-- **The screen view.** While a popup is open nothing is enabled (only the
acknowledgment is accepted). -/
def view (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State) : ScreenView :=
  let comps := prog.compsOf s.screen
  let statuses := (comps.filter (compShown sp facts s comps)).filterMap fun c =>
    (actionStatus sp prog facts user s c).map (c.id, ·)
  { screen := s.screen
    title := match prog.screen? s.screen with
      | some sc => sc.title
      | none => ""
    items := comps.map (itemView sp facts s comps)
    enabled := if s.popup?.isSome then []
               else statuses.filterMap (fun p => if p.2.isNone then some p.1 else none)
    blocked := statuses.filterMap (fun p => p.2.map (p.1, ·))
    popup? := s.popup? }

end Ehr
