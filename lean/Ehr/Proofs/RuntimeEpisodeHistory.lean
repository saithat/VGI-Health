import Ehr.Proofs.RuntimeEpisodeWitness
import Ehr.Sim.History

/-! Why the refinement of a bound patient episode starts at the hydrated chart
and not at `init`. Hydration goes to the selected screen directly and records
the start screen in the Back history. A program without navigation controls
never has a Back history in a core run, so the hydrated chart of the workspace
witness is not a core reachable state, also when the patient context is
ignored. Every definition and theorem here is a new specification for owner
review, outside Comparator. -/

namespace Ehr.Runtime
open Ehr Props

/-- New specification for owner review: the program has no "go to" button, no
Back button and no macro button. -/
def NoNavigation (p : Program) : Prop :=
  ∀ sc ∈ p.screens, ∀ c ∈ sc.components,
    gotoOf? c.kind = none ∧ c.kind ≠ .button .back ∧ macroOf? c.kind = none

instance (p : Program) : Decidable (NoNavigation p) := by
  unfold NoNavigation; infer_instance

/-- Prefilling a screen keeps the Back history. -/
theorem prefillScreen_keepsHistory (sp prog facts s) :
    (prefillScreen sp prog facts s).history = s.history := by
  have h : prefillScreen sp prog facts s = Sim.withHistory (prefillScreen sp prog facts s) s.history :=
    Sim.prefillScreen_history sp prog facts s s.history
  have hh := congrArg State.history h
  exact hh

/-- A click on a component that is neither a "go to" nor a Back button keeps
the Back history. -/
theorem clickCore_keepsHistory (sp prog facts user actor s c)
    (hgoto : gotoOf? c.kind = none) (hback : c.kind ≠ .button .back) :
    (clickCore sp prog facts user actor s c).1.history = s.history := by
  unfold clickCore clickCommit clickAlert markReviewed requestPriorAuth
  repeat' (first
    | rfl
    | exact prefillScreen_keepsHistory sp prog facts _
    | (exfalso; simp_all [gotoOf?]; done)
    | split
    | dsimp only)

variable {prog : Program} (hnav : NoNavigation prog)
include hnav

/-- Without navigation controls, one event without macros keeps the Back history. -/
theorem stepCore_keepsHistory (sp facts user actor s e) :
    (stepCore sp prog facts user actor s e).1.history = s.history := by
  unfold stepCore
  split
  · rfl
  · cases e <;> simp only [stepEvent]
    case click cid =>
      split
      · rfl
      · rename_i c hc
        obtain ⟨sc, hsc, hcc⟩ := Sim.compsOf_mem (List.mem_of_find?_eq_some hc)
        exact clickCore_keepsHistory _ _ _ _ _ _ _ (hnav sc hsc c hcc).1 (hnav sc hsc c hcc).2.1
    case selectTab cid idx => unfold selectTabCore; repeat' (first | rfl | split | dsimp only)
    case enter cid v => unfold enterCore; repeat' (first | rfl | split | dsimp only)
    case confirm cid => unfold confirmCore; repeat' (first | rfl | split | dsimp only)
    case ack a => unfold ackCore; repeat' (first | rfl | split | dsimp only)
    all_goals split <;> rfl

/-- Without macro buttons, no click starts a macro. -/
theorem clickedMacro_none (sp facts s cid) : clickedMacro? sp prog facts s cid = none := by
  unfold clickedMacro?
  split
  · rename_i c hc
    obtain ⟨sc, hsc, hcc⟩ := Sim.compsOf_mem (List.mem_of_find?_eq_some hc)
    have hm := (hnav sc hsc c hcc).2.2
    split
    · rename_i m hk
      simp [macroOf?, hk] at hm
    · rfl
  · rfl

/-- Without navigation controls, the interpreter step keeps the Back history. -/
theorem step_keepsHistory (sp facts user actor s e) :
    (step sp prog facts user actor s e).1.history = s.history := by
  cases actor <;> cases e <;> simp only [step, clickedMacro_none hnav]
  case human.click cid => cases s.popup? <;> exact stepCore_keepsHistory hnav ..
  all_goals exact stepCore_keepsHistory hnav ..

omit hnav

/-- New specification for owner review: a program without navigation controls
never has a Back history in a core run from `init`. -/
theorem core_history (ep : Episode) (hnav : NoNavigation ep.prog) {s : State}
    (hs : Props.Reachable ep s) : s.history = [] := by
  induction hs with
  | start => exact prefillScreen_keepsHistory ..
  | step actor e _ ih => exact (step_keepsHistory hnav ..).trans ih
  | wait d _ ih => exact ih

namespace Witness

/-- New specification for owner review: the workspace witness has no navigation controls. -/
theorem workspace_noNavigation : NoNavigation workspace := by decide

/-- New specification for owner review: hydration of the witness chart puts
the start screen on the Back history, although no click led there. -/
theorem start_history : chartEpisode.start.history = ["clinical"] := by decide

/-- New specification for owner review: **the hydrated chart is not a core
reachable state**, also when the patient context is ignored: no state the core
reaches from `init` in the witness has its Back history. So the episode
refinement cannot be stated with `Props.Reachable` and state equality on the
fields the interpreter reads; `episode_refines` starts at the hydrated chart. -/
theorem start_history_not_core :
    ¬ ∃ t, Props.Reachable chartEpisode.toEpisode t ∧ t.history = chartEpisode.start.history := by
  rintro ⟨t, ht, hh⟩
  rw [core_history chartEpisode.toEpisode workspace_noNavigation ht, start_history] at hh
  contradiction

#print axioms workspace_noNavigation
#print axioms start_history
#print axioms start_history_not_core
end Witness

#print axioms prefillScreen_keepsHistory
#print axioms clickCore_keepsHistory
#print axioms stepCore_keepsHistory
#print axioms clickedMacro_none
#print axioms step_keepsHistory
#print axioms core_history
end Ehr.Runtime
