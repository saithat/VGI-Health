import Ehr.Sim.Scheduling.Clock

namespace Ehr.Sim.Workflow
open Ehr

/-- New explicit bedside outcomes do not become late doses merely because
charting was queued. Legacy records retain the documentation proxy. Terminal
window-expiry non-administration remains distinguishable from a timely hold or
refusal in the source record. These are source-scenario events, not claims
about physical administration or clinical appropriateness. -/
def withAdministration (task : Task) (row : Scheduling.Timing) : Scheduling.Timing :=
  { row with overdueDoses := row.arrival.doseWindows.filterMap fun (key, _) =>
      let explicit := task.choices.administer.filterMap (·.administration?)
      match explicit.find? (fun a => a.occurrence == key && a.windowStartMin?.isSome) with
      | none => if row.overdueDoses.contains key then some key else none
      | some a =>
        let late := if a.outcome == .given then a.administeredMin?.any
          (fun moment => moment < a.windowStartMin?.getD a.scheduledMin || a.windowEndMin < moment)
          else a.outcome == .notGiven && a.windowEndMin < a.attemptMin
        if late then some key else none }

theorem administration_preserves_schedule (task : Task) (row : Scheduling.Timing) :
    (withAdministration task row).startMs? = row.startMs? ∧
    (withAdministration task row).finishMs? = row.finishMs? := ⟨rfl, rfl⟩

#print axioms administration_preserves_schedule
end Ehr.Sim.Workflow
