import Ehr.Sem.Screen
import Ehr.Render.UiProofs
import Ehr.Props.Properties

/-! Existing D guarantees imply structural semantics. Physical exposure remains
an explicit hypothesis; no legacy theorem is strengthened by assumption. -/
namespace Ehr.Sem
open Ehr Render

def rendered (cx : Ctx) := renderUi cx.sp cx.prog cx.facts cx.disp cx.user cx.s

/-- General transport from the exposed abstract moment to measured evidence. -/
theorem perception_of_exposure (s : Screen) (m : Moment) (f : Fact)
    (h : Perceives s exposed f) (hv : m.inViewport f) (hl : m.legible f) (hu : m.unoccluded f) :
    Perceives s m f := ⟨h.1, hv, hl, hu⟩

theorem D1_semantic (cx : Ctx) (hn : (rendered cx).modal = none) :
    Banner (meaning (rendered cx)) exposed (uiClinicalBanner cx.facts cx.disp) := by
  simp only [Banner, perceives_exposed, active, meaning, hn, Option.map_none, Option.getD_none]
  simp [rendered, renderUi]

theorem D2_semantic (cx : Ctx) (hn : (rendered cx).modal = none) :
    Reviews (meaning (rendered cx)) exposed
      ((uiRequiredReviews cx).map fun r => (r.info, uiRows cx r.info)) := by
  intro pair hp
  obtain ⟨r, hr, rfl⟩ := List.mem_map.mp hp
  exact (information_iff _ _ _ hn).mpr (D2_required_info cx r hr)

/-- Direct connection to a shown signing action, including disabled buttons. -/
theorem reviews_at_signing (cx : Ctx) (r : ReviewReq) (hr : r ∈ cx.sp.reviews)
    (hw : whenHolds cx.facts cx.s r.when = true) (it : ItemView)
    (hm : it ∈ cx.v.items) (hs : it.shown = true)
    (hk : it.comp.kind = .button (.commit r.commit)) (hn : (rendered cx).modal = none) :
    InformationShown (meaning (rendered cx)) exposed r.info (uiRows cx r.info) :=
  (information_iff _ _ _ hn).mpr (D2_commit_review cx r hr hw it hm hs hk)

/-- Receipts, waivers and commit effects retain the human-owned property 4. -/
theorem review_trace (sp prog) (h : Props.ReviewsBeforeCommit sp prog) (facts user)
    (hr : user.role = prog.role) :
    Props.CommitReviewsMet ⟨sp, prog, facts, user⟩ ∧
      Props.CommitScreenShowsReviews ⟨sp, prog, facts, user⟩ := h facts user hr

/-- Action observations preserve precisely the D3 obligation, in both directions. -/
theorem honest_iff (cx : Ctx) (s : UiScreen) :
    Honest cx (meaning s) ↔
      ∀ n, UiPresent s n ∨ n ∈ uiAtomsList s.modal.toList → UiActionHonest cx n := by
  have modal_atoms : (s.modal.map (fun n => (uiAtoms n).map observe)).toList.flatten =
      (uiAtomsList s.modal.toList).map observe := by
    cases s.modal <;> simp [uiAtomsList]
  simp only [Honest, supplied, meaning, modal_atoms, List.mem_append, List.mem_cons,
    List.mem_map]
  constructor
  · intro h n hn
    apply (actionHonest_observe cx n).mp
    rcases hn with hb | hm
    · exact h _ (Or.inl (Or.inr ⟨n, hb, rfl⟩))
    · exact h _ (Or.inr ⟨n, hm, rfl⟩)
  · intro h f hf
    rcases hf with (he | ⟨n, hn, rfl⟩) | ⟨n, hn, rfl⟩
    · subst f; trivial
    · exact (actionHonest_observe cx n).mpr (h n (Or.inl hn))
    · exact (actionHonest_observe cx n).mpr (h n (Or.inr hn))

theorem D3_semantic (cx : Ctx) : Honest cx (meaning (rendered cx)) :=
  (honest_iff cx _).mpr (D3_all_buttons cx)

theorem D4_semantic (cx : Ctx) (a key : String) (rule : AlertSpec)
    (hp : cx.v.popup? = some (a, key)) (hr : cx.sp.alert? a = some rule)
    (ht : rule.tier = .interruptive) : ModalAck (meaning (rendered cx)) exposed a := by
  have h := D4_interruptive_modal cx a key rule hp hr ht
  simp [ModalAck, Perceives, active, meaning, rendered, h, uiAtoms, uiAtomsList, observe, exposed, uiLabel_nonempty]

theorem D4_passive_semantic (cx : Ctx) (a key : String) (rule : AlertSpec)
    (hp : cx.v.popup? = some (a, key)) (hr : cx.sp.alert? a = some rule)
    (ht : rule.tier = .passive) : Nonmodal (meaning (rendered cx)) := by
  have h := D4_passive_no_modal cx a key rule hp hr ht
  simp [Nonmodal, meaning, rendered, h]

theorem D4_inline_semantic (cx : Ctx) (it : ItemView) (a : AlertId) (popup : Bool) (rule : AlertSpec)
    (hm : it ∈ cx.v.items) (hs : it.shown = true) (hk : it.comp.kind = .alert a popup)
    (hr : cx.sp.alert? a = some rule) (ht : rule.tier = .passive)
    (hn : (rendered cx).modal = none) :
    AlertShown (meaning (rendered cx)) exposed a (uiLabel rule.label "Clinical alert") "passive" := by
  have h := D4_passive_inline cx it a popup rule hm hs hk hr ht
  apply (perceives_exposed _ _).mpr
  simp only [active, meaning, hn, Option.map_none, Option.getD_none, List.mem_cons, List.mem_map]
  exact Or.inr ⟨_, h, rfl⟩

/-- Every offered field has a label; modal syntax cannot inject a field. -/
theorem D6_semantic (cx : Ctx) : FieldsClear (meaning (rendered cx)) := by
  intro f hf
  simp only [supplied, meaning, List.mem_append, List.mem_cons, List.mem_map] at hf
  rcases hf with (he | ⟨n, hn, rfl⟩) | hf
  · subst f; trivial
  · cases n <;> simp only [observe, FieldClear]
    exact D6_field_labels cx _ _ _ _ _ _ _ _ _ hn
  · have hmodal : ∀ n ∈ uiAtomsList (rendered cx).modal.toList, FieldClear (observe n) := by
      intro n hn
      simp only [rendered, renderUi, Ctx.rebuild] at hn
      cases hp : cx.v.popup? with
      | none => simp [uiModal, hp, uiAtomsList] at hn
      | some pair =>
        rcases pair with ⟨a, key⟩
        cases hr : cx.sp.alert? a with
        | none => simp [uiModal, hp, hr, uiAtomsList] at hn
        | some rule =>
          by_cases ht : rule.tier = .passive
          · simp [uiModal, hp, hr, ht, uiAtomsList] at hn
          · simp [uiModal, hp, hr, ht, uiAtomsList, uiAtoms] at hn
            rcases hn with rfl | rfl <;> trivial
    cases h : (rendered cx).modal with
    | none => simp [h] at hf
    | some node =>
      simp only [h, Option.map_some, Option.toList_some, List.flatten_cons,
        List.flatten_nil, List.append_nil, List.mem_map] at hf
      obtain ⟨n, hn, rfl⟩ := hf
      exact hmodal n (by simpa [h, uiAtomsList] using hn)

#print axioms D1_semantic
#print axioms D2_semantic
#print axioms reviews_at_signing
#print axioms review_trace
#print axioms honest_iff
#print axioms D3_semantic
#print axioms D4_semantic
#print axioms D4_passive_semantic
#print axioms D4_inline_semantic
#print axioms D6_semantic
#print axioms perception_of_exposure
#print axioms information_iff
#print axioms available_now
#print axioms actionHonest_observe
#print axioms perceives_exposed
end Ehr.Sem
