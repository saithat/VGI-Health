import Ehr.Specs.AlertUrgency
import Ehr.Specs.PhysicalBounds
import Lean

open Lean Ehr.Specs

def sourceJson (s : AlertUrgency.Source) : Json := Json.mkObj [
  ("authority", toJson (match s.authority with
    | .regulation => "regulation" | .accreditation => "accreditation"
    | .guidance => "guidance" | .hospitalPolicy => "hospital policy (not law)")),
  ("citation", toJson s.citation), ("url", toJson s.url)]

def main : IO Unit := do
  let policy := Json.mkObj [
    ("status", toJson "APPROVED by the owner on 2026-11-02"),
    ("policyStatus", toJson "APPROVED by the owner on 2026-11-02"),
    ("assignments", toJson (AlertUrgency.approvedAssignments.map fun p => Json.mkObj [
      ("id", toJson p.id), ("urgency", toJson (match p.urgency with
        | .urgent => "urgent" | .workflow => "workflow" | .advisory => "advisory")),
      ("decision", sourceJson p.decision), ("context", toJson (p.context.map sourceJson)),
      ("pendingOwnerReview", toJson p.pendingOwnerReview)])),
    ("physical", Json.mkObj [
      ("targetCssPx", toJson PhysicalBounds.targetCssPx),
      ("textContrast", Json.num ⟨PhysicalBounds.textContrastTenths, 1⟩),
      ("nontextContrast", Json.num ⟨PhysicalBounds.nontextContrastTenths, 1⟩),
      ("textResizePercent", toJson PhysicalBounds.textResizePercent),
      ("reflowCssPx", toJson PhysicalBounds.reflowCssPx),
      ("viewportWidths", toJson PhysicalBounds.viewportWidths)])]
  IO.println policy.pretty
