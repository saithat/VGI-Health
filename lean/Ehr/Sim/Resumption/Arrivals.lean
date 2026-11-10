import Ehr.Core.Json
import Ehr.Render.Types
import Ehr.Sim.Resumption.Types

namespace Ehr.Sim.Resumption
open Ehr
/-- Names bind role AND setting. Transfers and exposure windows are provisional. -/
inductive InterruptionProfile
  | wardNurse | surgicalPhysician | clinicPrescriber | emergencyPhysician | inpatientPharmacy
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson
structure InterruptionConfig where
  mode : ResumptionMode := .realWork
  profile? : Option InterruptionProfile := none
  /-- Explicit opt-out for all wave-3 simulation assumptions. -/
  legacyModel : Bool := false
  lengthCosts : Bool := true
  chartDisplay : Task → Render.Display := fun _ => Render.Display.empty
  /-- Opt-in experimental choice latency, milliseconds per mental operator.
  Zero retains the uncalibrated KLM policy; never a novice multiplier. -/
  choiceLatencyMs : Nat := 0
  /-- Optional independent absolute-time offered-work stream for paired fits. -/
  arrivalSeed? : Option Nat := none
  /-- External scenario timeline at absolute service time; native snapshot runs
  use identity. Foreign-patient refreshes are refused by the service boundary. -/
  refreshFacts : Facts → Nat → Facts := fun facts _ => facts
  deriving Inhabited

def profile (role : Role) (workflow : Workflow) : InterruptionProfile :=
  if role == .rn then .wardNurse else
    match workflow with
    | .W3 => .emergencyPhysician | .W6 => .surgicalPhysician | _ => .clinicPrescriber

/-- Milli-arrivals/hour: Myers & Parikh (259/47.3 h), Bagnasco et al.
(~13/h), Chisholm et al. (20.7 task switches/3 h), pharmacy observations (10.6/h).
Clinic 3/h is an explicit assumption, not an estimate from nursing/pharmacy. -/
def ratePerHourMilli : InterruptionProfile → Nat
  | .wardNurse => 5500 | .surgicalPhysician => 13000 | .clinicPrescriber => 3000
  | .emergencyPhysician => 6900 | .inpatientPharmacy => 10600

/-- N4: 27/4 h (ED residents, 2023). Clinic/surgery/ward non-pump
rates remain scenarios. N8 (2024) 34/day is NOT an hourly dispensing rate.
N5 (2024) is activity-specific: 44% pump activities, not ward arrivals/hour. -/
def activityRate (p : InterruptionProfile) (task : Task) : Nat :=
  match p with
  | .emergencyPhysician => 6750
  | .clinicPrescriber => if task.workflow == .W2 || task.workflow == .W7 then 2000 else 3000
  | .surgicalPhysician => if task.workflow == .W6 then 8000 else 4000
  | .wardNurse => if task.choices.administer.any (fun o => o.route == "IV") then 5800 else 4000
  | .inpatientPharmacy => 4250 -- scenario eight-hour conversion; N8 sensitivity only

/-- Per-channel means are scenario values (ms). Only ICU IV-pump work uses
N5's 28 s total mean (2024); channel multipliers and other roles are scenarios.
N11 (2020) motivates activity conditioning, not a universal duration multiplier. -/
def channelServiceMs (p : InterruptionProfile) (task : Task) (kind : InterruptKind) : Nat :=
  let base := if p == .wardNurse && task.choices.administer.any (fun o => o.route == "IV")
    then 28000 else match p with
      | .emergencyPhysician => 35000 | .clinicPrescriber => 45000
      | .wardNurse => 30000 | .surgicalPhysician => 40000 | .inpatientPharmacy => 50000
  base * (match kind with
    | .page => 100 | .urgentResult => 150 | .colleagueQuestion => 70
    | .familyRequest => 120 | .pharmacyClarification => 130) / 100

/-- Role/activity channel weights: scenario, not measured channel proportions. -/
def channelKind (p : InterruptionProfile) (workflow : Workflow) (n : Nat) : InterruptKind :=
  let page := if p == .emergencyPhysician then 40 else 20
  let urgent := if workflow == .W2 || workflow == .W3 then 20 else 10
  let pharmacy := if workflow == .W4 || workflow == .W7 then 30 else 10
  if n < page then .page else if n < page + urgent then .urgentResult
  else if n < page + urgent + pharmacy then .pharmacyClarification
  else if n < 85 then .colleagueQuestion else .familyRequest

/-- Fixed offered-work exposure, never fitted to either comparison arm's speed. -/
def exposureMinutes : Workflow → Nat
  | .W1 | .W5 => 15 | .W6 => 20 | .W3 => 12 | .W4 => 6 | _ => 5

/-- Separate hash stream; no UI, action count or behavioral RNG is an input. -/
def arrivalDraw (seed : Nat) (key : String) (bound : Nat) : Nat :=
  let h := key.toUTF8.foldl (fun h b => (h ^^^ b.toUInt64) * 1099511628211)
    (14695981039346656037 ^^^ UInt64.ofNat seed)
  let z := (h ^^^ (h >>> 30)) * 0xbf58476d1ce4e5b9
  let z := (z ^^^ (z >>> 27)) * 0x94d049bb133111eb
  (z ^^^ (z >>> 31)).toNat % max 1 bound

/-- Bernoulli minute bins approximate arrivals (at most one/minute). These are
communication tasks; an urgent-result call escalates, never resolves the result. -/
def arrivals (seed : Nat) (task : Task) (role : Role) (patients : List String)
    (config : InterruptionConfig) : List InterruptWork :=
  let setting := config.profile?.getD (profile role task.workflow)
  (List.range (exposureMinutes task.workflow)).filterMap fun minute =>
    let key := task.id ++ ":interruptions-v1:" ++ toString minute
    let rate := if config.legacyModel then ratePerHourMilli setting else activityRate setting task
    if arrivalDraw seed (key ++ ":arrival") 60000 ≥ rate then none else
    let others := patients.filter (· != task.patientId) |>.eraseDups
    let patient := (others[arrivalDraw seed (key ++ ":patient") others.length]?).getD task.patientId
    let kind := if !config.legacyModel then channelKind setting task.workflow (arrivalDraw seed (key ++ ":kind") 100) else match arrivalDraw seed (key ++ ":kind") 5 with
      | 0 => if others.isEmpty then InterruptKind.colleagueQuestion else .page
      | 1 => .urgentResult | 2 => .colleagueQuestion | 3 => .familyRequest | _ => .pharmacyClarification
    let urgency := match kind with
      | .urgentResult => InterruptUrgency.urgent
      | .page => if arrivalDraw seed (key ++ ":urgency") 3 == 0 then .urgent else .timeSensitive
      | .pharmacyClarification => .timeSensitive | _ => .routine
    some {
      id := key, patient, kind, urgency,
      arrivedAtMs := (task.startMin + minute) * 60000 + arrivalDraw seed (key ++ ":offset") 60000,
      essential := kind == .urgentResult || kind == .pharmacyClarification || kind == .page,
      serviceMs? := if config.legacyModel then none else some (channelServiceMs setting task kind),
      message := match kind with
        | .page => "Care-team call about the named patient's pending care"
        | .urgentResult => "Urgent-result notification: communicate to responsible team; clinical follow-through required"
        | .colleagueQuestion => "Colleague requests clarification of the named patient's plan"
        | .familyRequest => "Family requests a care-team update for the named patient"
        | .pharmacyClarification => "Pharmacy requests clarification before dispensing for the named patient" }
end Ehr.Sim.Resumption
