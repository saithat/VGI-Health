import Ehr.Check.Rules
import Ehr.Check.ScreenSound

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-- Fixed components remain visible under every state of the interpreter. -/
theorem fixedShownAux_sound (sp : Spec) (facts : Facts) (s : State)
    (comps : List Component) (fuel : Nat) (c : Component)
    (h : fixedShownAux comps fuel c = true) :
    layoutShownAux sp facts s comps fuel c = true := by
  induction fuel generalizing c with
  | zero => simp [fixedShownAux] at h
  | succ fuel ih =>
    simp only [fixedShownAux, Bool.and_eq_true, bne_iff_ne, beq_iff_eq] at h
    have hv : ownVisible sp facts s c = true := by simp [ownVisible, h.1.1, h.1.2]
    simp only [layoutShownAux, hv, Bool.true_and]
    cases hp : c.parent? with
    | none => simp
    | some pid =>
      simp only [hp] at h ⊢
      cases hf : comps.find? (·.id == pid) with
      | none => simp [hf] at h
      | some par =>
        simp only [hf, Bool.and_eq_true] at h ⊢
        have ho : parentOpen s par c = true := by
          have hh := h.2.1
          cases hk : par.kind <;> simp_all [isOpenGroup, parentOpen]
          rename_i b _
          cases b <;> simp_all
        exact ⟨ho, ih par h.2.2⟩

theorem fixedShown_sound (sp facts s comps c) (h : fixedShown comps c = true) :
    layoutShown sp facts s comps c = true := fixedShownAux_sound _ _ _ _ _ _ h

/-- Existing program screens are found by lookup in reachable states. -/
theorem currentScreen (ep : Episode) (s : State)
    (hs : (ep.prog.screen? s.screen).isSome = true) :
    ∃ scr ∈ ep.prog.screens, ep.prog.screen? s.screen = some scr ∧ scr.id = s.screen := by
  cases hf : ep.prog.screen? s.screen with
  | none => simp [hf] at hs
  | some scr =>
    exact ⟨scr, List.mem_of_find?_eq_some hf, rfl,
      by simpa [Program.screen?] using List.find?_some hf⟩

/-- Landmarks pinned by the checker are shown in every reachable state. -/
theorem landmarksPinned_sound (ep : Episode)
    (hstart : (ep.prog.screen? ep.prog.start).isSome = true)
    (h : landmarksPinned ep.spec ep.prog = true) : LandmarksShown ep := by
  intro s hs l hl
  obtain ⟨scr, hscr, hlook, hid⟩ := currentScreen ep s
    (reachable_screenNames ep hstart s hs).1
  have hp := List.all_eq_true.mp (List.all_eq_true.mp h scr hscr) l hl
  obtain ⟨c, hc, hpin⟩ := List.any_eq_true.mp hp
  simp only [Bool.and_eq_true] at hpin
  obtain ⟨hi, hvis⟩ := hpin
  apply (infoShown_iff ep s l).mp
  simp only [infoShown, Program.compsOf, hlook]
  apply List.any_eq_true.mpr
  exact ⟨c, hc, by simp only [Bool.and_eq_true]; exact ⟨hi, fixedShown_sound _ _ _ _ _ hvis⟩⟩

/-- Passive alert pins refer to the actual view, including its condition. -/
theorem passivePinned_sound (ep : Episode)
    (h : passivePinned ep.spec ep.prog = true) : PassiveShownInline ep := by
  intro s _ al hal ht htarget hh
  have hr := List.all_eq_true.mp h al hal
  change (al.tier != Tier.passive || _) = true at hr
  simp only [ht, bne_self_eq_false, Bool.false_or] at hr
  cases hf : ep.prog.screen? s.screen with
  | none => simp [hf] at htarget
  | some scr =>
    have hz := List.all_eq_true.mp hr scr (List.mem_of_find?_eq_some hf)
    simp only [hf, Option.any_some] at htarget
    simp only [htarget, Bool.not_true, Bool.false_or, List.any_eq_true,
      Bool.and_eq_true] at hz
    obtain ⟨c, hc, ha, hv⟩ := hz
    cases hk : c.kind <;> simp [alertOf?, hk] at ha
    rename_i a popup
    subst a
    refine ⟨itemView ep.spec ep.facts s scr.components c, ?_, ?_, popup, hk⟩
    · change _ ∈ (ep.prog.compsOf s.screen).map _
      simp only [Program.compsOf, hf]
      exact List.mem_map.mpr ⟨c, hc, rfl⟩
    · change compShown _ _ _ _ c = true
      simp only [compShown, hk, hh, Bool.and_true]
      exact fixedShown_sound _ _ _ _ _ hv

/-- Receipt validity is monotone in its allowed age and roles. -/
theorem receiptValid_mono (sp facts now i r w w' roles roles')
    (hw : w' ≤ w) (hr : ∀ role ∈ roles', role ∈ roles)
    (h : receiptValid sp facts now i w' roles' r = true) :
    receiptValid sp facts now i w roles r = true := by
  simp only [receiptValid, Bool.and_eq_true, decide_eq_true_eq, List.contains_iff_mem] at h ⊢
  exact ⟨⟨h.1.1, Nat.le_trans h.1.2 hw⟩, hr _ h.2⟩

/-- A receipt that hides a safe pin covers that pin's review requirement. -/
theorem receiptHideSafe_sound (ep : Episode) (s : State) (rq : ReviewReq)
    (h : receiptHideSafe ep.spec rq = true)
    (hr : hasValidReceipt ep.spec ep.facts s rq.info = true) : ReceiptCovers ep s rq := by
  cases hm : rq.mode with
  | shownOnCommit => simp [receiptHideSafe, hm] at h
  | shownOrReceipt w roles =>
    simp only [receiptHideSafe, hm, List.all_eq_true] at h
    obtain ⟨rq', hrq', hvalid⟩ := List.any_eq_true.mp hr
    simp only [Bool.and_eq_true, beq_iff_eq] at hvalid
    have hb := h rq' hrq'
    simp only [hvalid.1, bne_self_eq_false, Bool.false_or] at hb
    cases hm' : rq'.mode with
    | shownOnCommit => simp [hm'] at hvalid
    | shownOrReceipt w' roles' =>
      simp only [hm', Bool.and_eq_true, decide_eq_true_eq, List.all_eq_true,
        List.contains_iff_mem] at hb
      simp only [hm', List.any_eq_true] at hvalid
      obtain ⟨r, hrs, hv⟩ := hvalid.2
      simp only [ReceiptCovers, hm]
      exact ⟨r, hrs, receiptValid_mono _ _ _ _ _ _ _ _ _ hb.1 hb.2 hv⟩

/-- Fixed ancestors plus the component's own visibility imply layout visibility. -/
theorem parentsFixed_sound (sp facts s comps c)
    (hp : parentsFixed comps c = true) (hv : ownVisible sp facts s c = true) :
    layoutShown sp facts s comps c = true := by
  simp only [layoutShown, layoutShownAux, hv, Bool.true_and]
  unfold parentsFixed at hp
  cases hc : c.parent? with
  | none => simp
  | some pid =>
    simp only [hc] at hp ⊢
    cases hf : comps.find? (·.id == pid) with
    | none => simp [hf] at hp
    | some par =>
      simp only [hf, Bool.and_eq_true] at hp ⊢
      refine ⟨?_, fixedShownAux_sound _ _ _ _ _ _ hp.2⟩
      have ho := hp.1
      cases hk : par.kind <;> simp_all [parentOpen, isOpenGroup]
      rename_i b _
      cases b <;> simp_all

/-- A pinned review remains met, including when a valid receipt hides it. -/
theorem pinnedForReview_sound (ep : Episode) (s : State) (rq : ReviewReq)
    (c : Component) (hc : c ∈ ep.prog.compsOf s.screen)
    (h : pinnedForReview ep.spec (ep.prog.compsOf s.screen) rq c = true) :
    ReviewMetIn ep s rq := by
  simp only [pinnedForReview, Bool.and_eq_true, bne_iff_ne] at h
  obtain ⟨⟨⟨hi, hsize⟩, hp⟩, hvis⟩ := h
  have shown (hv : ownVisible ep.spec ep.facts s c = true) : InfoShown ep s rq.info := by
    apply (infoShown_iff ep s rq.info).mp
    simp only [infoShown, List.any_eq_true, Bool.and_eq_true]
    exact ⟨c, hc, hi, parentsFixed_sound _ _ _ _ _ hp hv⟩
  intro _
  cases hv : c.visibility with
  | always => exact Or.inl (shown (by simp [ownVisible, hsize, hv]))
  | encounter kind => simp [hv] at hvis
  | unlessReceipt i =>
    simp only [hv, Bool.and_eq_true, beq_iff_eq] at hvis
    obtain ⟨rfl, hsafe⟩ := hvis
    by_cases hr : hasValidReceipt ep.spec ep.facts s rq.info = true
    · exact Or.inr (Or.inl (receiptHideSafe_sound ep s rq hsafe hr))
    · exact Or.inl (shown (by simp [ownVisible, hsize, hv, hr]))

/-- Pinning the review on every commit screen prevents hidden-review traps. -/
theorem reviewsPinned_sound (ep : Episode)
    (hstart : (ep.prog.screen? ep.prog.start).isSome = true)
    (h : reviewsPinned ep.spec ep.prog = true) : CommitScreenShowsReviews ep := by
  intro s hs cm hbutton rq hrq hcm hwaiver
  obtain ⟨scr, hscr, hlook, _⟩ := currentScreen ep s
    (reachable_screenNames ep hstart s hs).1
  obtain ⟨item, hi, _, hk⟩ := hbutton
  change item ∈ (ep.prog.compsOf s.screen).map _ at hi
  obtain ⟨comp, hc, rfl⟩ := List.mem_map.mp hi
  change comp.kind = .button (.commit cm) at hk
  have hrule := List.all_eq_true.mp (List.all_eq_true.mp h scr hscr) comp
    (by simpa [Program.compsOf, hlook] using hc)
  simp only [commitOf?, hk] at hrule
  have hrule' := List.all_eq_true.mp hrule rq hrq
  simp only [hcm, bne_self_eq_false, hwaiver, Option.isSome_none, Bool.false_or,
    List.any_eq_true] at hrule'
  obtain ⟨c, hc', hp⟩ := hrule'
  apply pinnedForReview_sound ep s rq c
  · simpa [Program.compsOf, hlook] using hc'
  · simpa [Program.compsOf, hlook] using hp

#print axioms fixedShown_sound
#print axioms landmarksPinned_sound
#print axioms passivePinned_sound
#print axioms reviewsPinned_sound
end Ehr.Check
