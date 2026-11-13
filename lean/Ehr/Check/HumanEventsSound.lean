import Ehr.Check.RuleSound
import Ehr.Check.HumanSound

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

private theorem clickCommit_added (sp p f u s cm c)
    (hc : c ∈ (clickCommit sp p f u s cm).1.commits) : c ∈ s.commits ∨ c = cm := by
  unfold clickCommit at hc
  repeat' (first | exact Or.inl hc | split at hc | dsimp only at hc)
  simpa only [List.mem_append, List.mem_singleton] using hc

private theorem clickCore_commit_kind (sp p f u actor s comp c)
    (hn : c ∉ s.commits) (ha : c ∈ (clickCore sp p f u actor s comp).1.commits) :
    actor = .human ∧ comp.kind = .button (.commit c) := by
  unfold clickCore at ha
  split at ha
  · cases actor
    · rw [clickAlert_commits] at ha; contradiction
    · contradiction
  · rw [(goTo_safe ..).commits] at ha; contradiction
  · rw [(goBack_safe ..).commits] at ha; contradiction
  · rename_i cm hk
    cases actor
    · have heq := (clickCommit_added sp p f u s cm c ha).resolve_left hn
      subst c
      exact ⟨rfl, hk⟩
    · contradiction
  · cases actor
    · rw [markReviewed_commits] at ha; contradiction
    · contradiction
  · split at ha
    · rw [(prefillScreen_safe ..).commits] at ha; contradiction
    · contradiction
  · rw [requestPriorAuth_commits] at ha; contradiction
  · contradiction
  · cases actor <;> contradiction
  · contradiction

private theorem stepCore_commit_witness (sp p f u actor s e c)
    (hn : c ∉ s.commits) (ha : c ∈ (stepCore sp p f u actor s e).1.commits) :
    actor = .human ∧ ∃ cid, e = .click cid ∧
      ∃ comp ∈ p.compsOf s.screen, comp.id = cid ∧ comp.kind = .button (.commit c) := by
  unfold stepCore at ha
  split at ha
  · contradiction
  · cases e with
    | click cid =>
      simp only [stepEvent] at ha
      cases hf : shownComp? sp p f s cid with
      | none => simp [hf] at ha; contradiction
      | some comp =>
        simp only [hf] at ha
        have hk := clickCore_commit_kind _ _ _ _ _ _ _ _ hn ha
        have hfind := List.find?_some hf
        simp only [Bool.and_eq_true, beq_iff_eq] at hfind
        exact ⟨hk.1, cid, rfl, comp, List.mem_of_find?_eq_some hf, hfind.1, hk.2⟩
    | enter cid v => simp only [stepEvent] at ha; rw [enterCore_commits] at ha; contradiction
    | confirm cid => simp only [stepEvent] at ha; rw [confirmCore_commits] at ha; contradiction
    | ack a => simp only [stepEvent] at ha; rw [ackCore_commits] at ha; contradiction
    | selectTab cid idx => simp only [stepEvent] at ha; rw [(selectTabCore_safe ..).commits] at ha; contradiction
    | scroll z => simp only [stepEvent] at ha; split at ha <;> contradiction
    | search q => simp only [stepEvent] at ha; split at ha <;> contradiction

private theorem clickCore_acked (sp p f u actor s c) :
    (clickCore sp p f u actor s c).1.acked = s.acked := by
  unfold clickCore
  split
  · cases actor
    · unfold clickAlert; repeat' (first | rfl | split | dsimp only)
    · rfl
  · exact (goTo_safe ..).acked
  · exact (goBack_safe ..).acked
  · cases actor
    · unfold clickCommit; repeat' (first | rfl | split | dsimp only)
    · rfl
  · cases actor
    · unfold markReviewed; repeat' (first | rfl | split | dsimp only)
    · rfl
  · split
    · exact (prefillScreen_safe ..).acked
    · rfl
  · unfold requestPriorAuth; repeat' (first | rfl | split | dsimp only)
  · rfl
  · cases actor <;> rfl
  · rfl

private theorem stepCore_acked_nonAck (sp p f u actor s e) (he : e.isAck = false) :
    (stepCore sp p f u actor s e).1.acked = s.acked := by
  unfold stepCore
  split
  · rfl
  · cases e with
    | click cid => simp only [stepEvent]; split; rfl; exact clickCore_acked ..
    | enter cid v => simp only [stepEvent]; unfold enterCore; repeat' (first | rfl | exact reconcileCore_acked .. | split | dsimp only)
    | confirm cid => simp only [stepEvent]; unfold confirmCore; repeat' (first | rfl | split | dsimp only)
    | ack a => contradiction
    | selectTab cid idx => exact (selectTabCore_safe ..).acked
    | scroll z => simp only [stepEvent]; split <;> rfl
    | search q => simp only [stepEvent]; split <;> rfl

private theorem stepCore_ack_witness (sp p f u actor s e)
    (ha : (stepCore sp p f u actor s e).1.acked ≠ s.acked) :
    actor = .human ∧ ∃ a, e = .ack a := by
  cases actor with
  | «macro» => exact False.elim (ha (stepCore_macro_safe ..).acked)
  | human =>
    cases e with
    | ack a => exact ⟨rfl, a, rfl⟩
    | _ => exact False.elim (ha (stepCore_acked_nonAck _ _ _ _ _ _ _ rfl))

/-- One step from any state, reachable or not: new commits and acknowledgments
arise only from the human's own public events. -/
theorem onlyHumanCommitsAndAcks_at (ep : Episode) (s : State) (actor : Actor) (e : Event) :
    (∀ c, CommitHappens ep s actor e c →
      actor = .human ∧ ∃ cid, e = .click cid ∧
        ∃ comp ∈ ep.prog.compsOf s.screen, comp.id = cid ∧ comp.kind = .button (.commit c)) ∧
    ((ep.next actor s e).acked ≠ s.acked → actor = .human ∧ ∃ a, e = .ack a) := by
  constructor
  · intro c hc
    change c ∉ s.commits ∧ c ∈ (step ep.spec ep.prog ep.facts ep.user actor s e).1.commits at hc
    cases actor with
    | «macro» =>
      have heq := (T3_macro_step ep.spec ep.prog ep.facts ep.user s e).1
      exact False.elim (hc.1 (heq ▸ hc.2))
    | human =>
      cases e with
      | click cid =>
        cases hp : s.popup? with
        | some pop =>
          apply stepCore_commit_witness _ _ _ _ _ _ _ _ hc.1
          simpa only [step, hp] using hc.2
        | none =>
          cases hm : clickedMacro? ep.spec ep.prog ep.facts s cid with
          | none =>
            apply stepCore_commit_witness _ _ _ _ _ _ _ _ hc.1
            simpa only [step, hp, hm] using hc.2
          | some mac =>
            have heq := (runMacro_safe ep.spec ep.prog ep.facts ep.user mac.steps 0 s).commits
            have ha := hc.2
            simp only [step, hp, hm] at ha
            rw [heq] at ha
            exact False.elim (hc.1 ha)
      | _ => exact stepCore_commit_witness _ _ _ _ _ _ _ _ hc.1 hc.2
  · intro ha
    change (step ep.spec ep.prog ep.facts ep.user actor s e).1.acked ≠ s.acked at ha
    cases actor with
    | «macro» => exact False.elim (ha (T3_macro_step ep.spec ep.prog ep.facts ep.user s e).2.1)
    | human =>
      cases e with
      | click cid =>
        cases hp : s.popup? with
        | some pop =>
          apply stepCore_ack_witness _ _ _ _ _ _ _
          simpa only [step, hp] using ha
        | none =>
          cases hm : clickedMacro? ep.spec ep.prog ep.facts s cid with
          | none =>
            apply stepCore_ack_witness _ _ _ _ _ _ _
            simpa only [step, hp, hm] using ha
          | some mac =>
            apply False.elim
            apply ha
            simpa only [step, hp, hm] using
              (runMacro_safe ep.spec ep.prog ep.facts ep.user mac.steps 0 s).acked
      | _ => exact stepCore_ack_witness _ _ _ _ _ _ _ ha

/-- New commits and acknowledgments arise only from the human's own public
events, never from a macro click, convenience action, or hidden button. -/
theorem onlyHumanCommitsAndAcks (ep : Episode) : OnlyHumanCommitsAndAcks ep :=
  fun s _ actor e => onlyHumanCommitsAndAcks_at ep s actor e

/-- Accepted programs keep every human step explicit, refuse automation
attempts structurally, and require a distinct cosigner (property 5). -/
theorem accepted_humanOnlyKept (sp prev can p) (h : check sp prev can p = .ok) :
    HumanOnlyKept sp p := by
  have ht := accepted_structural sp prev can p h
  exact ⟨ht.2.2.2.2.2.2.2.2.2.1, fun facts user _ =>
    ⟨humanStepsByHuman ⟨sp, p, facts, user⟩, onlyHumanCommitsAndAcks ⟨sp, p, facts, user⟩,
      cosignIsSecondUser ⟨sp, p, facts, user⟩⟩⟩

#print axioms onlyHumanCommitsAndAcks_at
#print axioms onlyHumanCommitsAndAcks
#print axioms accepted_humanOnlyKept
end Ehr.Check
