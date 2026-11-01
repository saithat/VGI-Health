import Ehr.Sim.Goals
import Ehr.Render.Fhir

namespace Ehr.Sim
open Ehr Lean
open Ehr.Render.Fhir

/-- Resolve only the current task's focused contained prescription. Other
patient medications and earlier refill requests cannot choose the refill drug.
The world attaches this FHIR Task to todayResources even for unchanged renewals. -/
def refillPrescription (task : Task) : Option OrderChoice := do
  let requests := task.todayResources.filter fun r =>
    resourceType r == "Task" && str (field r "for") "reference" == "Patient/" ++ task.patientId
  let request ← match requests with | [r] => some r | _ => none
  let focus := str (field request "focus") "reference"
  if !focus.startsWith "#" then none else do
    let rx ← (arr request "contained").find? fun r =>
      resourceType r == "MedicationRequest" && "#" ++ str r "id" == focus &&
      str (field r "subject") "reference" == "Patient/" ++ task.patientId
    let drug := medDrug rx
    if drug.isEmpty then none else do
      let instruction := first rx "dosageInstruction"
      let quantity := field (first instruction "doseAndRate") "doseQuantity"
      let dose ← qtyScaled quantity 1
      let unit ← (fromJson? (.str (str quantity "unit")) : Except String UnitKind).toOption
      let route := ccText (field instruction "route")
      let freq := ccText (field (field instruction "timing") "code")
      if route.isEmpty || freq.isEmpty then none else
      some { drug := drug
             doseTenths := dose
             unit := unit
             route := route
             freq := freq
             supplyDays? := qtyScaled (field (field rx "dispenseRequest") "expectedSupplyDuration") 0
             prn := (field instruction "asNeededBoolean").getBool?.toOption.getD false }

/-- Bind an unchanged renewal to its actual prescription. Modifications retain
the scenario's replacement dose; denials never become prescription signing.
No administration context or captured drug is fabricated. -/
def taskChoices (task : Task) : TaskChoices :=
  if task.workflow != .W7 || task.choices.refill? != some "approve" ||
      !task.choices.orders.isEmpty then task.choices
  else match refillPrescription task with
    | some order => { task.choices with orders := [order] }
    | none => task.choices

/-- Shared episode input for persona replay and exact minimum search. -/
def taskEpisodes (facts : Facts) (task : Task) : List Episode :=
  let choices := taskChoices task
  if task.workflow == .W7 && choices.refill? == some "approve" && choices.orders.isEmpty then []
  else episodes facts task.workflow choices

end Ehr.Sim
