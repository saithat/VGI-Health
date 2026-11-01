import Ehr.Check.RuleSound
import Ehr.Proofs.T0
import Ehr.Proofs.T2
import Ehr.Proofs.Alerts

/-! Bridges from the interpreter's safety theorems to the checker's semantic
property statements. These use the public `view` and `step`, not a model. -/
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-- The info-shown Boolean and the property use exactly the same page view. -/
theorem infoShown_iff (ep : Episode) (s : State) (i : InfoId) :
    infoShown ep.spec ep.prog ep.facts s i = true ↔ InfoShown ep s i := by
  have hcomp (c : Component) (hc : showsInfo i c.kind = true) :
      compShown ep.spec ep.facts s (ep.prog.compsOf s.screen) c =
        layoutShown ep.spec ep.facts s (ep.prog.compsOf s.screen) c := by
    cases hk : c.kind <;> simp_all [showsInfo, compShown]
  simp only [infoShown, List.any_eq_true, Bool.and_eq_true]
  constructor
  · rintro ⟨c, hc, hi, hs⟩
    refine ⟨itemView ep.spec ep.facts s (ep.prog.compsOf s.screen) c,
      List.mem_map.mpr ⟨c, hc, rfl⟩, ?_, hi⟩
    change compShown _ _ _ _ c = true
    rw [hcomp c hi]
    exact hs
  · rintro ⟨item, hm, hs, hi⟩
    obtain ⟨c, hc, rfl⟩ := List.mem_map.mp hm
    change compShown _ _ _ _ c = true at hs
    change showsInfo i c.kind = true at hi
    exact ⟨c, hc, hi, (hcomp c hi) ▸ hs⟩

/-- The entry Boolean has the same meaning as the plain property. -/
theorem entryMet_iff (ep : Episode) (s : State) (rq : EntryReq) :
    entryMet ep.spec ep.facts ep.user s rq = true ↔ EntryMetIn ep s rq := by
  unfold entryMet EntryMetIn
  cases hel : ep.spec.element? rq.element with
  | none => simp
  | some el =>
    simp only [Option.some.injEq, exists_eq_left']
    cases ha : rq.allowed? <;> cases hp : rq.perOrderLine <;>
      simp [hasGoodEntry, capturedSatisfies, CountsFor, Applies, AllowedEntryValue, entryValueAllowed, ha, Bool.and_eq_true,
        List.any_eq_true, List.all_eq_true, Bool.or_eq_true, beq_iff_eq, and_assoc] <;> grind

/-- The review Boolean allows precisely shown info, a valid receipt, or a
human waiver, whenever the requirement applies. -/
theorem reviewMet_iff (ep : Episode) (s : State) (rq : ReviewReq) :
    reviewMet ep.spec ep.prog ep.facts s rq = true ↔ ReviewMetIn ep s rq := by
  unfold reviewMet ReviewMetIn ReceiptCovers Waived Applies
  rw [← infoShown_iff]
  cases rq.mode <;> simp [Bool.or_eq_true, List.any_eq_true] <;> grind

/-- Entry requirements are enforced for every commit (T0). -/
theorem commitCapturesAll (ep : Episode) : CommitCapturesAll ep := by
  intro s _ actor e c hc rq hrq hrc
  apply (entryMet_iff ep s rq).mp
  exact ((commitGuard_iff ..).mp
    (T0_commit_needs_guard _ _ _ _ actor s e c hc.1 hc.2)).2.1 rq hrq hrc

/-- Review requirements are enforced for every commit (T0/T2). -/
theorem commitReviewsMet (ep : Episode) : CommitReviewsMet ep := by
  intro s _ actor e c hc rq hrq hrc
  apply (reviewMet_iff ep s rq).mp
  exact ((commitGuard_iff ..).mp
    (T0_commit_needs_guard _ _ _ _ actor s e c hc.1 hc.2)).2.2.1 rq hrq hrc

/-- A commit cannot bypass any required interruptive acknowledgment. -/
theorem interruptiveHandled (ep : Episode) : InterruptiveHandled ep := by
  intro s _ actor e c hc al hal hac hat k hk
  exact ((commitGuard_iff ..).mp
    (T0_commit_needs_guard _ _ _ _ actor s e c hc.1 hc.2)).2.2.2 al hal hac hat k hk

/-- The guard requires the actual unit, rather than accepting a bare number. -/
theorem commitUnitsRight (ep : Episode) : CommitUnitsRight ep := by
  intro s _ actor e c hc rq hrq hrc el u hel hk hw hp
  have hper : rq.perOrderLine = false := by simpa using hp
  obtain ⟨x, hx, hxe, hconf, _, hv⟩ :=
    T0_entry_values _ _ _ _ actor s e c hc.1 hc.2 rq hrq hrc hper hw el hel
  exact ⟨x, hx, hxe, hconf, hv u hk⟩

/-- A cosign names another human, never the signed-in user. -/
theorem cosignIsSecondUser (ep : Episode) : CosignIsSecondUser ep := by
  intro s _ actor e c hc rq hrq hrc el hel hk hw hp
  exact T3_cosign_distinct _ _ _ _ actor s e c hc.1 hc.2 rq hrq hrc
    (by simpa using hp) hw el hel hk

/-- Every shown alert is firing according to the real interpreter. -/
theorem inlineAlert_holds (ep : Episode) (s : State) (a : AlertId)
    (h : AlertShownInline ep s a) : alertHolds ep.spec ep.facts s a = true := by
  obtain ⟨item, hi, hs, popup, hk⟩ := h
  exact A2_view_shown _ _ _ _ s item hi hs a popup hk

#print axioms infoShown_iff
#print axioms entryMet_iff
#print axioms reviewMet_iff
#print axioms commitCapturesAll
#print axioms commitReviewsMet
#print axioms interruptiveHandled
#print axioms commitUnitsRight
#print axioms cosignIsSecondUser
end Ehr.Check
