import Ehr.Sim.Resumption.Work
import Ehr.Proofs.T0
import Ehr.Render.WorkspaceProofs

namespace Ehr.Sim.Resumption
open Ehr

theorem resume_foreign_patient (sp f u patient task clock frame)
    (foreign : frame.patient ≠ patient) : resume sp f u patient task clock frame = none := by
  simp [resume, foreign]

theorem resume_foreign_owner (sp f u patient task clock frame)
    (foreign : frame.owner ≠ u.id) : resume sp f u patient task clock frame = none := by
  simp [resume, foreign]

theorem resume_foreign_task (sp f u patient task clock frame)
    (foreign : frame.task ≠ task) : resume sp f u patient task clock frame = none := by
  simp [resume, foreign]

theorem resume_foreign_source (sp f u patient task clock frame)
    (foreign : sourcePatient f ≠ patient) : resume sp f u patient task clock frame = none := by
  simp [resume, foreign]

/-- Acceptance binds both the saved and current source identity to this task's
patient; changing only a frame's label cannot move drafts to a different chart. -/
theorem resume_source_identity (sp f u patient task clock frame restored)
    (accepted : resume sp f u patient task clock frame = some restored) :
    frame.owner = u.id ∧ frame.patient = patient ∧ frame.task = task ∧
      sourcePatient f = patient ∧ sourcePatient frame.facts = patient := by
  unfold resume at accepted
  split at accepted
  · rename_i checks
    simp only [Bool.and_eq_true, beq_iff_eq] at checks
    exact ⟨checks.1.1.1.1.1, checks.1.1.1.1.2, checks.1.1.1.2, checks.1.1.2, checks.1.2⟩
  · contradiction

/-- Reorientation preserves position, pending draft values and sign history;
revalidation can remove authority but cannot add a commit. -/
theorem revalidation_frame (sp f u clock frame) :
    (revalidate sp f u clock frame).screen = frame.state.screen ∧
    (revalidate sp f u clock frame).history = frame.state.history ∧
    (revalidate sp f u clock frame).currentSlot = frame.state.currentSlot ∧
    (revalidate sp f u clock frame).tabSel = frame.state.tabSel ∧
    (revalidate sp f u clock frame).commits = frame.state.commits ∧
    (revalidate sp f u clock frame).captured.map (fun x => (x.element, x.slot, x.value, x.byHuman)) =
      frame.state.captured.map (fun x => (x.element, x.slot, x.value, x.byHuman)) := by
  simp only [revalidate]
  split <;> simp [List.map_map]

/-- Every retained receipt passes the current version/time/role predicate for
at least one declared review, and belongs to the returning clinician. -/
theorem resumed_receipt_current (sp f u clock frame r)
    (kept : r ∈ (revalidate sp f u clock frame).receipts) :
    keepReceipt sp f u { frame.state with clock := max frame.state.clock clock } r = true := by
  exact (List.mem_filter.mp kept).2

/-- A receipt invalid for all current requirements cannot survive resumption. -/
theorem invalid_receipt_removed (sp f u clock frame r)
    (invalid : keepReceipt sp f u { frame.state with clock := max frame.state.clock clock } r = false) :
    r ∉ (revalidate sp f u clock frame).receipts := by
  intro kept
  have valid := resumed_receipt_current sp f u clock frame r kept
  simp [invalid] at valid

/-- Changed chart data never retains a confirmed draft entry. -/
theorem changed_draft_needs_confirmation (sp f u clock frame)
    (changed : chartChanged frame.facts f = true) :
    ∀ x ∈ (revalidate sp f u clock frame).captured, x.confirmed = false := by
  intro x hx
  simp only [revalidate, changed, ↓reduceIte] at hx
  obtain ⟨y, _, rfl⟩ := List.mem_map.mp hx
  rfl

/-- The next clinical event uses the unchanged interpreter. Every newly added
commit passes the full current guard, after revalidation and elapsed time. -/
def resumeStep (sp : Spec) (prog : Program) (f : Facts) (u : User) (clock : Nat)
    (frame : DraftFrame) (e : Event) : State × StepResult :=
  step sp prog f u .human (revalidate sp f u clock frame) e

theorem resumed_commit_guarded (sp prog f u clock frame e cm)
    (newCommit : cm ∉ (revalidate sp f u clock frame).commits)
    (added : cm ∈ (resumeStep sp prog f u clock frame e).1.commits) :
    commitGuard sp prog f u (revalidate sp f u clock frame) cm = true :=
  Proofs.T0_commit_needs_guard sp prog f u .human _ e cm newCommit added

/-- Every suspended frame passed to settlement gets exactly one explicit
terminal disposition. This is finite-run accounting, not scheduler fairness. -/
def settleFrames (sp : Spec) (f : Facts) (u : User) (patient task : String) (clock atMs : Nat)
    (pending : List DraftFrame) : List FrameRecord :=
  pending.map fun frame => (closeFrame sp f u patient task clock atMs frame).2

theorem every_suspension_settled (sp f u patient task clock atMs pending) :
    (settleFrames sp f u patient task clock atMs pending).length = pending.length ∧
    ∀ frame ∈ pending, ∃ record ∈ settleFrames sp f u patient task clock atMs pending,
      record.task = frame.task ∧ record.owner = frame.owner ∧ record.patient = frame.patient ∧
      (record.disposition = .resumed ∨ record.disposition = .handedOver ∨ record.disposition = .discarded) := by
  constructor
  · simp [settleFrames]
  · intro frame hf
    refine ⟨(closeFrame sp f u patient task clock atMs frame).2, List.mem_map.mpr ⟨frame, hf, rfl⟩, ?_⟩
    simp only [closeFrame]
    split <;> simp

/-- The actual task-closing checkpoint leaves no deferred communication queued. -/
theorem checkpoint_closes_queue (sp prog f u task s elapsed runtime) :
    (checkpoint sp prog f u task s elapsed runtime true).2.2.queued = [] := by
  simp [checkpoint, handOverPending]

/-- Each deferred item consumed by the closing hook has a patient-matched,
explicit handover record. The hook is used by the actual checkpoint. -/
theorem queued_work_accounted (u atMs runtime) (w : InterruptWork) (pending : w ∈ runtime.queued) :
    ∃ record ∈ (handOverPending u atMs runtime).metrics.frames,
      record.task = w.id ∧ record.patient = w.patient ∧ record.disposition = .handedOver := by
  refine ⟨_, List.mem_append_right _ (List.mem_map.mpr ⟨w, pending, rfl⟩), rfl, rfl, rfl⟩

/-- The resumed communication frame cannot contaminate the interrupting
patient's clinical workspace: its initial chart has no draft/evidence. -/
theorem interrupting_patient_empty (sp : Spec) (prog : Program) (frame : DraftFrame) (patient : String) :
    (Workspace.openPatient sp prog frame.state patient prog.start).captured = [] ∧
    (Workspace.openPatient sp prog frame.state patient prog.start).receipts = [] := by
  have h := Workspace.opening_clears_patient_state sp prog frame.state patient prog.start
  exact ⟨h.1, h.2.1⟩

#print axioms resume_foreign_patient
#print axioms resume_foreign_owner
#print axioms resume_foreign_task
#print axioms resume_foreign_source
#print axioms resume_source_identity
#print axioms revalidation_frame
#print axioms resumed_receipt_current
#print axioms invalid_receipt_removed
#print axioms changed_draft_needs_confirmation
#print axioms resumed_commit_guarded
#print axioms every_suspension_settled
#print axioms checkpoint_closes_queue
#print axioms queued_work_accounted
#print axioms interrupting_patient_empty
end Ehr.Sim.Resumption
