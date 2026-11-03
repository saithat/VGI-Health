import Ehr.Canonical.Urgency
import Ehr.Core.Json

open Ehr
/-- Only tracked successor releases; never rewrites ignored historical data. -/
def main : IO Unit := do
  for (version, sp, p) in Canonical.Urgency.releases do
    IO.FS.writeFile s!"../releases/{version}/spec.json" ((Lean.toJson sp).pretty ++ "\n")
    IO.FS.writeFile s!"../releases/{version}/canonical.json" ((Lean.toJson p).pretty ++ "\n")
    for (persona, role) in Canonical.personaRoles do
      IO.FS.writeFile s!"../releases/{version}/personas/{persona}.json"
        ((Lean.toJson (Canonical.forPersona sp p persona role)).pretty ++ "\n")
