import Ehr.Specs.AlertUrgency

namespace Ehr.Specs.CriticalResults
open Ehr

/-- Local simulation timeout, not a duration specified by either authority.
Real deployments must configure their approved reporting procedure. -/
def escalationMinutes : Nat := 30

/-- A configured procedure names distinct clinician recipients and a positive
local time limit. Numeric values are hospital policy, never attributed to law. -/
def ValidRoute (r : Multi.Critical.Result) : Prop :=
  r.responsible ≠ "" ∧ r.covering ≠ "" ∧ r.responsible ≠ r.covering ∧ 0 < r.limit

/-- A UI acknowledgment is deliberately absent from clinical resolution. -/
def Resolved (t : Multi.Critical.Ticket) : Prop :=
  ∃ record, t.resolution = some record ∧ record.action.trimAscii.toString ≠ "" ∧
    (record.actor = t.result.responsible ∨ record.actor = t.result.covering)

/-- Delivery and covering notification are auditable workflow timestamps. -/
def ReportedWithinBound (t : Multi.Critical.Ticket) : Prop :=
  ∃ atMinute, t.deliveredAt = some atMinute ∧ atMinute ≤ t.result.availableAt + t.result.limit

/-- Urgency and workflow are independent: the warning is urgent and inline;
clinical delivery/escalation/resolution are workflow transitions, never `ack`. -/
def alert : AlertSpec :=
  { id := "criticalResult", label := "Critical result requires clinician action",
    cond := .criticalResult, tier := .passive, commit := "ackResult",
    screens := ["W2"] }

/-- Additive successor spec. Old certified definitions remain unchanged. -/
def followThrough (sp : Spec) : Spec :=
  { sp with alerts := (sp.alerts.map fun a =>
      if a.id == "minorInteractionPopup" then { a with cond := .minorInteraction } else a) ++
      (if sp.alerts.any (·.id == alert.id) then [] else [alert]) }

def specV1 : Spec := followThrough V1.specV1
def specV2 : Spec := followThrough V2.specV2
def specV3 : Spec := followThrough V3.specV3

#guard (specV1.alerts.find? (·.id == "minorInteractionPopup")).map (·.cond) == some .minorInteraction
#guard [specV1, specV2, specV3].all fun sp =>
  sp.alerts.all fun a => (AlertUrgency.approvedTier a.id).isSome
end Ehr.Specs.CriticalResults
