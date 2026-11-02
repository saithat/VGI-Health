import Ehr.Sem.TimelineProgram

/-! Research primitives. These typed envelopes are deliberately separate from
UiNode: the per-program language has not yet admitted their view transitions.
The proofs below are obligations discharged, not a deployment certificate. -/
namespace Ehr.Sem.Exotic
open Ehr Render

structure Command where
  id : String
  label : String
  enabled : Bool
  reason : Option String
  deriving Lean.ToJson, Lean.FromJson, DecidableEq, Repr

def commands (s : UiScreen) : List Command :=
  (if s.modal.isSome then uiAtomsList s.modal.toList else baseAtoms s).filterMap fun n =>
    match n with
    | .button id label _ enabled reason _ => some ⟨id, label, enabled, reason⟩
    | _ => none

/-- Exact typed IDs avoid ambiguous prefix execution; the input may filter labels,
but Enter executes only a selected enabled offer. -/
def resolve (s : UiScreen) (id : String) : Option Event :=
  if (commands s).any (fun c => c.id == id && c.enabled) then some (.click id) else none

theorem resolve_authority (s id event) (h : resolve s id = some event) :
    event = .click id ∧ ∃ c ∈ commands s, c.id = id ∧ c.enabled = true := by
  unfold resolve at h
  split at h
  next yes =>
    cases h
    exact ⟨rfl, by simpa using List.any_eq_true.mp yes⟩
  next => contradiction

/-- Every enabled offered command is reachable by typing its exact ID and
submitting. Physical focus/typing exposure still needs a measured view graph. -/
theorem command_reachable (s : UiScreen) (c : Command) (hc : c ∈ commands s)
    (he : c.enabled = true) : resolve s c.id = some (.click c.id) := by
  unfold resolve
  have yes : (commands s).any (fun x => x.id == c.id && x.enabled) = true :=
    List.any_eq_true.mpr ⟨c, hc, by simp [he]⟩
  simp [yes]

/-- Command offers inherit the original disabled reasons, including modality. -/
theorem commands_honest (cx : Ctx) (s : UiScreen) (h : Honest cx (meaning s))
    (c : Command) (hc : c ∈ commands s) :
    c.label ≠ "" ∧ (c.enabled = false → ∃ why, c.reason = some why ∧ why ≠ "") := by
  unfold commands at hc
  obtain ⟨n, hn, he⟩ := List.mem_filterMap.mp hc
  have hs : observe n ∈ supplied (meaning s) := by
    by_cases hm : s.modal.isSome = true
    · simp only [hm, ↓reduceIte] at hn
      cases hh : s.modal with
      | none => simp [hh] at hn
      | some m =>
        simp only [hh, Option.toList_some, uiAtomsList, List.append_nil] at hn
        exact List.mem_append_right _ (by simpa [meaning, hh] using List.mem_map.mpr ⟨n, hn, rfl⟩)
    · simp only [hm, Bool.false_eq_true, ↓reduceIte] at hn
      exact List.mem_append_left _ (List.mem_cons_of_mem _ (List.mem_map.mpr ⟨n, hn, rfl⟩))
  cases n <;> simp at he
  next id label role enabled reason key =>
    cases he
    exact ⟨(h _ hs).1, (h _ hs).2.1⟩

/-- A pin is a view choice only: no dragging, overlap or hidden panes. -/
structure Zone where
  name : String
  pinned : Bool
  children : List UiNode
  deriving Lean.ToJson, Lean.FromJson, Repr

def zones (s : UiScreen) : List Zone :=
  [⟨"Work", false, s.workspace⟩, ⟨"Review", true, s.side⟩]

theorem zones_complete (s : UiScreen) :
    (zones s).flatMap (·.children) = s.workspace ++ s.side := by simp [zones]

structure PatientPane where
  patient : String
  screen : UiScreen
  deriving Lean.ToJson, Lean.FromJson, Repr

/-- A binding carries both an opaque patient key and that patient's complete banner.
Unique nonempty keys are checked before the DOM can offer any action. -/
def BoardValid (panes : List PatientPane) : Prop :=
  (panes.map (·.patient)).Nodup ∧ ∀ p ∈ panes, p.patient ≠ "" ∧ p.screen.banner ≠ []

instance (panes : List PatientPane) : Decidable (BoardValid panes) := inferInstanceAs
  (Decidable ((panes.map (·.patient)).Nodup ∧ ∀ p ∈ panes, p.patient ≠ "" ∧ p.screen.banner ≠ []))

def admitBoard (panes : List PatientPane) : Option (List PatientPane) :=
  if BoardValid panes then some panes else none

theorem admitted_board_valid (panes accepted) (h : admitBoard panes = some accepted) :
    BoardValid accepted := by
  unfold admitBoard at h
  split at h
  next hv => cases h; exact hv
  next => contradiction

/-- Dispatch returns the *whole* selected pane, never an ambient active patient. -/
def route (panes : List PatientPane) (patient : String) : Option PatientPane :=
  panes.find? (fun p => p.patient == patient)

theorem route_patient (panes patient pane) (h : route panes patient = some pane) :
    pane ∈ panes ∧ pane.patient = patient := by
  exact ⟨List.mem_of_find?_eq_some h, by simpa using List.find?_some h⟩

theorem route_unique (panes : List PatientPane) (valid : BoardValid panes)
    (p q : PatientPane) (hp : p ∈ panes) (hq : q ∈ panes) (he : p.patient = q.patient) : p = q := by
  have unique := valid.1
  clear valid
  induction panes with
  | nil => simp at hp
  | cons a rest ih =>
    have hn := List.nodup_cons.mp unique
    simp only [List.mem_cons] at hp hq
    rcases hp with rfl | hp <;> rcases hq with rfl | hq
    · rfl
    · exact False.elim (hn.1 (List.mem_map.mpr ⟨q, hq, he.symm⟩))
    · exact False.elim (hn.1 (List.mem_map.mpr ⟨p, hp, he⟩))
    · exact ih hp hq hn.2

/-- No commit route can borrow another pane's identity banner. -/
theorem commit_banner (panes patient pane) (valid : BoardValid panes)
    (h : route panes patient = some pane) :
    pane.patient = patient ∧ pane.screen.banner ≠ [] :=
  ⟨(route_patient _ _ _ h).2, (valid.2 pane (route_patient _ _ _ h).1).2⟩

structure DatedNode where
  /-- UTC minutes since Unix epoch; zero is a real instant, not an unknown date. -/
  minute : Nat
  node : UiNode
  deriving Lean.ToJson, Lean.FromJson, Repr

structure Axis where
  dated : List DatedNode
  undated : List UiNode
  deriving Lean.ToJson, Lean.FromJson, Repr

/-- Reject out-of-order input rather than silently moving or discarding clinical rows. -/
def Chronological (axis : Axis) : Prop := axis.dated.Pairwise (fun a b => a.minute ≤ b.minute)
instance (axis : Axis) : Decidable (Chronological axis) := inferInstanceAs
  (Decidable (axis.dated.Pairwise (fun a b => a.minute ≤ b.minute)))

def admitAxis (axis : Axis) : Option Axis := if Chronological axis then some axis else none

theorem admitted_chronological (axis accepted) (h : admitAxis axis = some accepted) :
    Chronological accepted := by
  unfold admitAxis at h
  split at h
  next hc => cases h; exact hc
  next => contradiction

def axisChildren (axis : Axis) : List UiNode := axis.dated.map (·.node) ++ axis.undated

/-- Time metadata cannot change any child, unit, source, disabled reason or event. -/
def axisScreen (s : UiScreen) (axis : Axis) (_complete : axisChildren axis = s.workspace) : UiScreen :=
  { s with workspace := [.timeline "Dated clinical timeline (UTC)" (axisChildren axis)] }

theorem axis_meaning (s axis complete) : meaning (axisScreen s axis complete) = meaning s := by
  simp [axisScreen, complete, meaning, baseAtoms, uiBannerAtom]

theorem axis_preserves (s axis complete) (P : Screen → Prop) :
    P (meaning (axisScreen s axis complete)) ↔ P (meaning s) := by rw [axis_meaning]

def canonicalAxis : Axis :=
  ⟨[⟨29890080, .info "earlier" "Earlier encounter" "encounterHistory" "table"
      [[("Recorded UTC", "2026-10-31T00:00:00Z"), ("Reason", "Medication review")]]⟩,
    ⟨29892960, .info "current" "Current encounter" "encounterHistory" "table"
      [[("Recorded UTC", "2026-11-02T00:00:00Z"), ("Reason", "ED assessment")]]⟩],
    [.button "sign" "Sign" "secondary" false (some "Review required") none]⟩

theorem canonical_chronological : Chronological canonicalAxis := by decide

#guard Chronological canonicalAxis
#guard admitAxis { canonicalAxis with dated := canonicalAxis.dated.reverse } |>.isNone
#guard resolve Examples.lyingUi "sign" == none

#print axioms command_reachable
#print axioms admitted_board_valid
#print axioms canonical_chronological
#print axioms resolve_authority
#print axioms commands_honest
#print axioms zones_complete
#print axioms route_patient
#print axioms route_unique
#print axioms commit_banner
#print axioms admitted_chronological
#print axioms axis_meaning
#print axioms axis_preserves
end Ehr.Sem.Exotic
