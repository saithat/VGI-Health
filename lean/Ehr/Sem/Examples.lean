import Ehr.Sem.Trace

namespace Ehr.Sem.Examples
open Ehr Render

def identity : List (String × String) := [("Patient", "Example patient"), ("MRN", "example-1")]
def rows : List (List (String × String)) := [[("Substance", "Penicillin"), ("Reaction", "Rash")]]
def goodUi : UiScreen :=
  { banner := identity, nav := [], title := "Review", side := [], modal := none,
    workspace := [.info "allergies" "Allergies" "allergyList" "table" rows,
      .button "next" "Continue" "secondary" true none none,
      .field "weight" "Weight" "qty" (some "70") (some "kg") none false true true,
      .alert "warning" "interaction" "Interaction" "passive"] }
def emptyUi : UiScreen := { goodUi with banner := [], workspace := [] }
def good := meaning goodUi
def empty := meaning emptyUi
def urgent : Fact := .alert "interaction" "Interaction" "passive"
def dark : Moment := ⟨fun _ => False, fun _ => True, fun _ => True⟩
def noSteps : View → View → Prop := fun _ _ => False

theorem information_good : InformationShown good exposed "allergyList" rows := by
  simp [InformationShown, good, goodUi, meaning, active, baseAtoms, uiAtomsList, uiAtoms, observe]
theorem information_bad : ¬ InformationShown empty exposed "allergyList" rows := by
  simp [InformationShown, empty, emptyUi, goodUi, meaning, active, baseAtoms, uiAtomsList, uiAtoms, observe, uiNavAtoms, uiBannerAtom]
theorem reviews_good : Reviews good exposed [("allergyList", rows)] := by
  simpa [Reviews] using information_good
theorem reviews_bad : ¬ Reviews empty exposed [("allergyList", rows)] := by
  simpa [Reviews] using information_bad
theorem banner_good : Banner good exposed identity := by
  simp [Banner, good, goodUi, meaning, active]
theorem banner_bad : ¬ Banner empty exposed identity := by
  simp [Banner, empty, emptyUi, goodUi, meaning, active, baseAtoms, uiAtomsList, uiAtoms, observe, uiNavAtoms, uiBannerAtom, identity]
theorem honest_good (cx : Ctx) : Honest cx good := by
  simp [Honest, good, goodUi, supplied, meaning, baseAtoms, uiAtomsList, uiAtoms,
    uiNavAtoms, uiBannerAtom, observe, ActionHonest]
def lyingUi := { goodUi with workspace := [.button "next" "Continue" "secondary" false none none] }
theorem honest_bad (cx : Ctx) : ¬ Honest cx (meaning lyingUi) := by
  simp [Honest, lyingUi, goodUi, supplied, meaning, baseAtoms, uiAtomsList, uiAtoms,
    uiNavAtoms, uiBannerAtom, observe, ActionHonest]
theorem fields_good : FieldsClear good := by
  simp [FieldsClear, good, goodUi, supplied, meaning, baseAtoms, uiAtomsList, uiAtoms,
    uiNavAtoms, uiBannerAtom, observe, FieldClear]
def unlabeledUi := { goodUi with workspace := [.field "weight" "" "qty" none (some "kg") none false true true] }
theorem fields_bad : ¬ FieldsClear (meaning unlabeledUi) := by
  simp [FieldsClear, unlabeledUi, goodUi, supplied, meaning, baseAtoms, uiAtomsList,
    uiAtoms, uiNavAtoms, uiBannerAtom, observe, FieldClear]
theorem urgent_good : UrgentVisible good exposed [urgent] := by
  simp [UrgentVisible, urgent, good, goodUi, meaning, active, baseAtoms, uiAtomsList, uiAtoms, observe]
/-- Same complete screen fails urgency when scrolled out of the viewport. -/
theorem urgent_bad : ¬ UrgentVisible good dark [urgent] := by
  simp [UrgentVisible, Perceives, dark]
theorem alert_good : AlertShown good exposed "interaction" "Interaction" "passive" := by
  simpa [UrgentVisible, urgent, AlertShown] using urgent_good
theorem alert_bad : ¬ AlertShown good exposed "interaction" "Interaction" "interruptive" := by
  simp [AlertShown, good, goodUi, meaning, active, baseAtoms, uiAtomsList, uiAtoms, observe, uiNavAtoms, uiBannerAtom]
def modalUi := { goodUi with modal := some (.section "interaction" "Interaction"
  [.button "interaction" "Acknowledge" "ack" true none none]) }
theorem modal_good : ModalAck (meaning modalUi) exposed "interaction" := by
  simp [ModalAck, modalUi, meaning, active, uiAtoms, uiAtomsList, observe]
theorem modal_bad : ¬ ModalAck good exposed "interaction" := by
  simp [ModalAck, good, goodUi, meaning]
theorem nonmodal_good : Nonmodal good := rfl
theorem nonmodal_bad : ¬ Nonmodal (meaning modalUi) := by simp [Nonmodal, meaning, modalUi]
/-- A modal blocks background review even when it is structurally present. -/
theorem occluded_review_bad : ¬ InformationShown (meaning modalUi) exposed "allergyList" rows := by
  simp [InformationShown, meaning, modalUi, active, uiAtoms, uiAtomsList, observe]
theorem available_good : Available good noSteps 0 exposed (.information "allergyList" rows) :=
  available_now _ _ _ _ information_good
theorem available_bad : ¬ Available empty noSteps 0 exposed (.information "allergyList" rows) := by
  rintro ⟨n, hn, target, hw, hp⟩
  have hz : n = 0 := Nat.eq_zero_of_le_zero hn
  subst n
  cases hw
  exact information_bad hp
theorem action_good : ActionWithin good noSteps 0 exposed "next" := by
  refine ⟨"Continue", "secondary", none, none, available_now _ _ _ _ ?_⟩
  simp [good, goodUi, meaning, active, baseAtoms, uiAtomsList, uiAtoms, observe]
theorem action_bad : ¬ ActionWithin empty noSteps 0 exposed "next" := by
  rintro ⟨label, role, reason, key, n, hn, target, hw, hp⟩
  have hz : n = 0 := Nat.eq_zero_of_le_zero hn
  subst n
  cases hw
  simpa [Perceives, empty, emptyUi, goodUi, meaning, active, baseAtoms, uiAtomsList,
    uiAtoms, uiNavAtoms, uiBannerAtom, observe] using hp.1


/-- One deliberate transition can expose a different tab/screen's content. -/
def reveal : View → View → Prop := fun a b =>
  a.screen = empty ∧ b.screen = good ∧ b.moment = exposed

theorem available_one_step : Available empty reveal 1 exposed (.information "allergyList" rows) := by
  refine ⟨1, Nat.le_refl _, ⟨good, exposed⟩, ?_, information_good⟩
  exact .step ⟨rfl, rfl, rfl⟩ (.refl _)

/-- A missing modal title fails the attention contract even with an ack button. -/
def blankModalUi := { goodUi with modal := some (.section "interaction" ""
  [.button "interaction" "Acknowledge" "ack" true none none]) }
theorem blank_modal_bad : ¬ ModalAck (meaning blankModalUi) exposed "interaction" := by
  simp [ModalAck, meaning, blankModalUi, active, uiAtoms, uiAtomsList, observe]

#print axioms available_one_step
#print axioms blank_modal_bad

#print axioms information_good
#print axioms information_bad
#print axioms reviews_good
#print axioms reviews_bad
#print axioms banner_good
#print axioms banner_bad
#print axioms honest_good
#print axioms honest_bad
#print axioms fields_good
#print axioms fields_bad
#print axioms urgent_good
#print axioms urgent_bad
#print axioms alert_good
#print axioms alert_bad
#print axioms modal_good
#print axioms modal_bad
#print axioms nonmodal_good
#print axioms nonmodal_bad
#print axioms occluded_review_bad
#print axioms available_good
#print axioms available_bad
#print axioms action_good
#print axioms action_bad
end Ehr.Sem.Examples
