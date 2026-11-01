import Ehr.Canonical.BlueprintTests

/-- Check saved P1–P5 programs for each release using Render.NavRules.NavSane. -/
def main : IO Unit := do
  Ehr.Render.reportReleaseNav
  Ehr.Canonical.checkExportedNav
