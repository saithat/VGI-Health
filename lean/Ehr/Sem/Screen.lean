import Ehr.Render.UiContracts

/-! Layout-independent information and action offers. Geometry is evidence,
not inferred from tree membership. Closed bodies are resolved by renderUi. -/
namespace Ehr.Sem
open Ehr Render

/-- Information identity includes complete rows; summaries have different content. -/
inductive Fact where
  | information (id : InfoId) (rows : List (List (String × String)))
  | action (id label role : String) (enabled : Bool) (reason hotkey : Option String)
  | field (id label kind : String) (value unit source : Option String) (pending human required : Bool)
  | alert (id : AlertId) (label severity : String)
  | identity (fields : List (String × String))
  | decoration
  deriving DecidableEq, Repr

def observe : UiNode → Fact
  | .info _ _ id _ rows => .information id rows
  | .button id label role enabled reason key => .action id label role enabled reason key
  | .field id label kind value unit source pending human required =>
      .field id label kind value unit source pending human required
  | .alert _ id label severity => .alert id label severity
  | _ => .decoration

structure Screen where
  background : List Fact
  foreground : Option (List Fact)
  deriving DecidableEq, Repr

def baseAtoms (s : UiScreen) : List UiNode :=
  uiAtomsList s.workspace ++ uiAtomsList s.side ++ uiNavAtoms s.nav ++ [uiBannerAtom s]

def meaning (s : UiScreen) : Screen :=
  ⟨.identity s.banner :: (baseAtoms s).map observe,
    s.modal.map (fun node => (uiAtoms node).map observe)⟩

def supplied (s : Screen) : List Fact := s.background ++ s.foreground.toList.flatten

def active (s : Screen) : List Fact := s.foreground.getD s.background

/-- Supplied by a measured view adapter; each conjunct is independently needed. -/
structure Moment where
  inViewport : Fact → Prop
  legible : Fact → Prop
  unoccluded : Fact → Prop

def Perceives (s : Screen) (m : Moment) (f : Fact) : Prop :=
  f ∈ active s ∧ m.inViewport f ∧ m.legible f ∧ m.unoccluded f

def exposed : Moment := ⟨fun _ => True, fun _ => True, fun _ => True⟩

@[simp] theorem perceives_exposed (s f) : Perceives s exposed f ↔ f ∈ active s := by
  simp [Perceives, exposed]

/-- View transitions may change screens (tabs/navigation) or perception (scroll). -/
structure View where
  screen : Screen
  moment : Moment

/-- Number of deliberate view steps, not interpreter events or wall time. -/
inductive Within {α : Type} (edge : α → α → Prop) : Nat → α → α → Prop
  | refl (m) : Within edge 0 m m
  | step {n a b c} : edge a b → Within edge n b c → Within edge (n + 1) a c

def Available (s : Screen) (edge : View → View → Prop) (bound : Nat) (m : Moment) (f : Fact) : Prop :=
  ∃ n ≤ bound, ∃ target, Within edge n ⟨s, m⟩ target ∧ Perceives target.screen target.moment f

def ActionWithin (s : Screen) (edge : View → View → Prop) (bound : Nat) (m : Moment) (id : CompId) : Prop :=
  ∃ label role reason key, Available s edge bound m (.action id label role true reason key)

def UrgentVisible (s : Screen) (m : Moment) (urgent : List Fact) : Prop :=
  ∀ f ∈ urgent, Perceives s m f

def InformationShown (s : Screen) (m : Moment) (id : InfoId) (rows : List (List (String × String))) : Prop :=
  Perceives s m (.information id rows)

def Reviews (s : Screen) (m : Moment) (required : List (InfoId × List (List (String × String)))) : Prop :=
  ∀ r ∈ required, InformationShown s m r.1 r.2

def Banner (s : Screen) (m : Moment) (fields : List (String × String)) : Prop :=
  Perceives s m (.identity fields)

/-- Action authority comes from the interpreter, independent of presentation. -/
def ActionHonest (cx : Ctx) : Fact → Prop
  | .action id label role enabled reason _ => label ≠ "" ∧
      (enabled = false → ∃ why, reason = some why ∧ why ≠ "") ∧
      (role = "primary" →
        (∃ it ∈ cx.v.items, it.shown = true ∧ it.comp.id = id ∧
          ∃ cm, it.comp.kind = .button (.commit cm)) ∧ enabled = uiEnabled cx id)
  | _ => True

def Honest (cx : Ctx) (s : Screen) : Prop := ∀ f ∈ supplied s, ActionHonest cx f

def FieldClear : Fact → Prop
  | .field _ label _ _ _ _ _ _ _ => label ≠ ""
  | _ => True

def FieldsClear (s : Screen) : Prop := ∀ f ∈ supplied s, FieldClear f

def Nonmodal (s : Screen) : Prop := s.foreground = none

def ModalAck (s : Screen) (m : Moment) (id : AlertId) : Prop :=
  s.foreground.isSome = true ∧ Perceives s m (.action id "Acknowledge" "ack" true none none)

/-- Severity stays attached to its alert identity; urgency is a separate policy. -/
def AlertShown (s : Screen) (m : Moment) (id label tier : String) : Prop :=
  Perceives s m (.alert id label tier)

@[simp] theorem actionHonest_observe (cx n) : ActionHonest cx (observe n) ↔ UiActionHonest cx n := by
  cases n <;> simp [observe, ActionHonest, UiActionHonest]

/-- Exact structural converse at an exposed nonmodal moment. -/
theorem information_iff (s : UiScreen) (id rows) (hn : s.modal = none) :
    InformationShown (meaning s) exposed id rows ↔
    ∃ comp label display, UiPresent s (.info comp label id display rows) := by
  simp only [InformationShown, perceives_exposed, active, meaning, hn, Option.map_none,
    Option.getD_none, List.mem_cons, List.mem_map]
  constructor
  · rintro (h | ⟨n, hm, he⟩)
    · cases h
    · cases n <;> simp [observe] at he
      rename_i comp label i display rs
      rcases he with ⟨rfl, rfl⟩
      exact ⟨comp, label, display, hm⟩
  · rintro ⟨comp, label, display, hm⟩
    exact Or.inr ⟨_, hm, rfl⟩

theorem available_now (s edge m f) (h : Perceives s m f) : Available s edge 0 m f :=
  ⟨0, Nat.le_refl _, ⟨s, m⟩, .refl _, h⟩

end Ehr.Sem
