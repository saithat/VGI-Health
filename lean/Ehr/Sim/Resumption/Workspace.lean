import Ehr.Core.Workspace
import Ehr.Sim.Resumption.Types

namespace Ehr.Sim.Resumption
open Ehr
/-- A private clinician/patient/task frame, never merged into the active chart. -/
structure DraftFrame where
  owner : UserId
  patient : String
  task : String
  state : State
  facts : Facts
  suspendedAtMs : Nat

def sourcePatient (f : Facts) : String := f.sourcePatientId?.getD f.patientId

def suspend (u : User) (patient task : String) (f : Facts) (s : State) (atMs : Nat) : DraftFrame :=
  { owner := u.id, patient, task, state := s, facts := f, suspendedAtMs := atMs }

/-- Ignore clock, cached receipts and department rows when comparing chart data.
Any other fact change invalidates confirmations and alert acknowledgments. -/
def chartChanged (old current : Facts) : Bool :=
  old != { current with now := old.now, receipts := old.receipts, patientDirectory? := old.patientDirectory? }

/-- Keep only this clinician's receipts valid under a current declared review.
The actual commit still checks its own requirement's window and roles. -/
def keepReceipt (sp : Spec) (f : Facts) (u : User) (s : State) (r : Receipt) : Bool :=
  r.user == u.id && sp.reviews.any fun rq => match rq.mode with
    | .shownOnCommit => false
    | .shownOrReceipt window roles => receiptValid sp f (nowMin f s) rq.info window roles r

/-- Position and drafts survive. Changed data requires explicit reconfirmation;
expired/version-stale receipts are removed before the next guarded event. -/
def revalidate (sp : Spec) (f : Facts) (u : User) (clock : Nat) (frame : DraftFrame) : State :=
  let s := { frame.state with clock := max frame.state.clock clock }
  { s with
    receipts := s.receipts.filter (keepReceipt sp f u s)
    captured := if chartChanged frame.facts f then s.captured.map (fun x => { x with confirmed := false }) else s.captured
    acked := if chartChanged frame.facts f then [] else s.acked
    popup? := if chartChanged frame.facts f then none else s.popup? }

/-- A foreign actor, task or source patient cannot restore any part of a draft. -/
def resume (sp : Spec) (f : Facts) (u : User) (patient task : String) (clock : Nat)
    (frame : DraftFrame) : Option State :=
  if frame.owner == u.id && frame.patient == patient && frame.task == task && sourcePatient f == patient &&
      sourcePatient frame.facts == patient && frame.state.patientContext?.all (fun c =>
        c.patient? == some patient && c.bound? == some patient)
    then some (revalidate sp f u clock frame) else none

/-- Closing consumes the only runtime frame. Failed ownership checks discard
explicitly; handover records a named recipient, but transfers no sign authority. -/
def closeFrame (sp : Spec) (f : Facts) (u : User) (patient task : String) (clock atMs : Nat)
    (frame : DraftFrame) : Option State × FrameRecord :=
  let restored := resume sp f u patient task clock frame
  (restored, {
    task := frame.task, owner := frame.owner, patient := frame.patient,
    suspendedAtMs := frame.suspendedAtMs, closedAtMs := atMs,
    disposition := if restored.isSome then .resumed else .discarded,
    reason := if restored.isSome then "returned to owned task after revalidation" else "owner, task or source patient mismatch" })

/-- Intentional abandonment is refused without an explicit nonblank reason. -/
def discardFrame (frame : DraftFrame) (reason : String) (atMs : Nat) : Option FrameRecord :=
  if reason.trimAscii.toString == "" then none else
    some {
      task := frame.task, owner := frame.owner, patient := frame.patient,
      suspendedAtMs := frame.suspendedAtMs, closedAtMs := atMs,
      disposition := .discarded, reason }

def handOver (frame : DraftFrame) (recipient reason : String) (atMs : Nat) : Option FrameRecord :=
  if recipient.trimAscii.toString == "" || recipient == frame.owner || reason.trimAscii.toString == "" then none else
    some {
      task := frame.task, owner := frame.owner, patient := frame.patient,
      suspendedAtMs := frame.suspendedAtMs, closedAtMs := atMs,
      disposition := .handedOver, reason := recipient ++ ": " ++ reason }
/-- Offer and acceptance are separate transitions. The offer alone leaves
responsibility with the sender. All clocks share the source schedule origin. -/
def offerHandover (task patient sender recipient reason : String) (atMs : Nat) :
    Option Scheduling.Handover :=
  if [task, patient, sender, recipient, reason].any (fun x => x.trimAscii.toString == "") || sender == recipient then none
  else some { task, patient, sender, recipient, offeredAtMs := atMs, reason }

def acceptHandover (offer : Scheduling.Handover) (recipient : String) (atMs : Nat) :
    Option Scheduling.Handover :=
  if offer.recipient == recipient && offer.acceptedAtMs?.isNone && offer.offeredAtMs ≤ atMs then
    some { offer with acceptedAtMs? := some atMs } else none

def responsibility (h : Scheduling.Handover) : String :=
  if h.acceptedAtMs?.isSome then h.recipient else h.sender

theorem offered_owner (h : Scheduling.Handover) (pending : h.acceptedAtMs? = none) :
    responsibility h = h.sender := by simp [responsibility, pending]

theorem accepted_owner (h : Scheduling.Handover) (recipient : String) (atMs : Nat)
    (accepted : (acceptHandover h recipient atMs).isSome = true) :
    responsibility ((acceptHandover h recipient atMs).getD h) = recipient := by
  simp only [acceptHandover] at accepted ⊢
  split at accepted
  · rename_i checks
    rw [if_pos checks]
    have recipientMatches : h.recipient = recipient := by
      simp only [Bool.and_eq_true, beq_iff_eq] at checks
      exact checks.1.1
    simpa [responsibility] using recipientMatches
  · simp at accepted

#print axioms offered_owner
#print axioms accepted_owner
end Ehr.Sim.Resumption
