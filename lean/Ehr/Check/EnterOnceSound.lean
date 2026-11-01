import Ehr.Check.RuleSound
import Ehr.Check.RequestSound

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

private theorem prefillField_keeps (sp f s c) (x : Captured) (hx : x ∈ s.captured) :
    x ∈ (prefillField sp f s c).captured := by
  unfold prefillField
  repeat' (first | exact hx | split | dsimp only)
  exact List.mem_append.mpr (Or.inl hx)

private theorem prefillScreen_keeps (sp p f s) (x : Captured) (hx : x ∈ s.captured) :
    x ∈ (prefillScreen sp p f s).captured := by
  unfold prefillScreen
  generalize p.compsOf s.screen = cs
  induction cs generalizing s with
  | nil => exact hx
  | cons c cs ih => exact ih _ (prefillField_keeps sp f s c x hx)

private theorem goTo_keeps (sp p f s z) (x : Captured) (hx : x ∈ s.captured) :
    x ∈ (goTo sp p f s z).1.captured := by
  unfold goTo
  split
  · exact hx
  · exact prefillScreen_keeps _ _ _ _ _ hx

private theorem goBack_keeps (sp p f s) (x : Captured) (hx : x ∈ s.captured) :
    x ∈ (goBack sp p f s).1.captured := by
  unfold goBack
  split
  · exact hx
  · exact prefillScreen_keeps _ _ _ _ _ hx

private theorem clickCore_keeps (sp p f u actor s c) (x : Captured)
    (hx : x ∈ s.captured) (hc : x.confirmed = true) :
    x ∈ (clickCore sp p f u actor s c).1.captured := by
  unfold clickCore
  split
  · cases actor
    · unfold clickAlert; repeat' (first | exact hx | split | dsimp only)
    · exact hx
  · exact goTo_keeps _ _ _ _ _ _ hx
  · exact goBack_keeps _ _ _ _ _ hx
  · cases actor
    · unfold clickCommit; repeat' (first | exact hx | split | dsimp only)
    · exact hx
  · cases actor
    · unfold markReviewed; repeat' (first | exact hx | split | dsimp only)
    · exact hx
  · split
    · exact prefillScreen_keeps _ _ _ _ _ hx
    · exact hx
  · exact requestPriorAuth_preserves_confirmed _ _ _ _ _ hx hc
  · exact hx
  · cases actor <;> exact hx
  · exact hx

private theorem confirmCore_keeps (sp p f u actor s cid) (x : Captured)
    (hx : x ∈ s.captured) (hc : x.confirmed = true) :
    x ∈ (confirmCore sp p f u actor s cid).1.captured := by
  unfold confirmCore
  repeat' (first | exact hx | split | dsimp only)
  apply List.mem_map.mpr
  refine ⟨x, hx, ?_⟩
  split
  · cases x
    simp_all
  · rfl

private theorem stepCore_keeps (sp p f u actor s e)
    (hne : ∀ cid v, e ≠ .enter cid v) (x : Captured)
    (hx : x ∈ s.captured) (hc : x.confirmed = true) :
    x ∈ (stepCore sp p f u actor s e).1.captured := by
  unfold stepCore
  split
  · exact hx
  · cases e with
    | click cid =>
      simp only [stepEvent]
      split
      · exact hx
      · exact clickCore_keeps _ _ _ _ _ _ _ _ hx hc
    | enter cid v => exact False.elim (hne cid v rfl)
    | confirm cid => exact confirmCore_keeps _ _ _ _ _ _ _ _ hx hc
    | ack a => simp only [stepEvent]; unfold ackCore; repeat' (first | exact hx | split | dsimp only)
    | selectTab cid idx => simp only [stepEvent]; unfold selectTabCore; repeat' (first | exact hx | split | dsimp only)
    | scroll z => simp only [stepEvent]; split <;> exact hx
    | search q => simp only [stepEvent]; split <;> exact hx

private theorem step_eq_core (sp p f u actor s e)
    (hmacro : actor = .human → ∀ cid, e = .click cid →
      clickedMacro? sp p f s cid = none ∨ s.popup?.isSome) :
    step sp p f u actor s e = stepCore sp p f u actor s e := by
  cases actor with
  | «macro» => rfl
  | human =>
    cases e with
    | click cid =>
      cases hp : s.popup? with
      | some pop => simp [step, hp]
      | none =>
        have hm : clickedMacro? sp p f s cid = none := by
          rcases hmacro rfl cid rfl with hm | hm
          · exact hm
          · simp [hp] at hm
        simp [step, hp, hm]
    | _ => rfl

/-- Navigation, review, confirmation and alert handling preserve each
confirmed value. Only explicit entry or a human-started macro may replace it. -/
theorem enteredOnce (ep : Episode) : EnteredOnce ep := by
  intro s _ actor e hne hmacro x hx hc
  change x ∈ (step ep.spec ep.prog ep.facts ep.user actor s e).1.captured
  rw [step_eq_core _ _ _ _ _ _ _ hmacro]
  exact stepCore_keeps _ _ _ _ _ _ _ hne x hx hc

/-- Accepted programs capture all requirements and never re-request a
confirmed value; declared auto-links eliminate transcription (property 2). -/
theorem accepted_capturesAllOnce (sp prev can p) (h : check sp prev can p = .ok) :
    CapturesAllOnce sp p := by
  have ht := accepted_structural sp prev can p h
  exact ⟨ht.2.2.2.2.2.2.2.2.2.2.2.1, fun facts user _ =>
    ⟨commitCapturesAll ⟨sp, p, facts, user⟩, enteredOnce ⟨sp, p, facts, user⟩⟩⟩

#print axioms enteredOnce
#print axioms accepted_capturesAllOnce
end Ehr.Check
