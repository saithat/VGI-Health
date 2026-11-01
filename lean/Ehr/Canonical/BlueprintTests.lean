import Ehr.Canonical.Personas
import Ehr.Render.NavRules

/-! Acceptance checks on the actual migrated canonical, using Render.NavRules
rather than a duplicate navigation predicate. Exported JSON is checked separately
by --run below. These are executable checks, not a checker certificate. -/
namespace Ehr.Canonical

#guard canonicalV1.screens.length == (if Specs.ruleProfile == .full then 50 else 48)
#guard Blueprint.relocations.length == 87
#guard personaRoles.all fun (id, role) =>
  decide (Render.NavSane Specs.V1.specV1 (forPersona Specs.V1.specV1 canonicalV1 id role))
#guard personaRoles.all fun (id, role) =>
  decide (Render.NavSane Specs.V2.specV2 (forPersona Specs.V2.specV2 canonicalV2 id role))
#guard personaRoles.all fun (id, role) =>
  decide (Render.NavSane Specs.V3.specV3 (forPersona Specs.V3.specV3 canonicalV3 id role))
#guard commitReviewsPinned Specs.V2.specV2 canonicalV2
#guard commitReviewsPinned Specs.V3.specV3 canonicalV3

/-- Every source clinical field/commit survives relocation with the same ID,
element, slot and action. Shell-only panels/navigation are intentionally replaced. -/
def originalClinicalControlsRetained : Bool :=
  let base := [home] ++ W1.screens ++ W2.screens ++
    W3.screens ++ W4.screens ++ W5.screens ++ W6.screens ++ W7.screens
  let original := if Specs.ruleProfile == .full then Features.screens (Rules.screens base) else base
  original.all fun source => source.components.all fun c =>
    match c.kind with
    | .field e slot _ => (canonicalV1.screen? (Blueprint.host source.id)).any fun sc =>
        sc.components.any fun kept => kept.id == c.id && match kept.kind with
          | .field element bound _ => element == e && bound == slot | _ => false
    | .button (.commit k) => (canonicalV1.screen? (Blueprint.host source.id)).any fun sc =>
        sc.components.any fun kept => kept.id == c.id && kept.kind == .button (.commit k)
    | _ => true
#guard originalClinicalControlsRetained

/-- On every required identity/signature path, an unfed human identity input is
the immediately preceding component. The guard and validator stay unchanged. -/
def signatureIdentityAdjacent (sp : Spec) (p : Program) : Bool :=
  p.screens.all fun sc => sc.components.zipIdx.all fun (c, n) => match c.kind with
    | .button (.commit k) =>
      !(sp.entries.any fun r => r.commit == k && r.element == "patientIdReentry") ||
        ((sc.components.take n).getLast?).any fun previous => match previous.kind with
          | .field "patientIdReentry" _ .none => previous.parent? == c.parent?
          | _ => false
    | _ => true
#guard signatureIdentityAdjacent Specs.V1.specV1 canonicalV1
#guard signatureIdentityAdjacent Specs.V2.specV2 canonicalV2
#guard signatureIdentityAdjacent Specs.V3.specV3 canonicalV3

/-- Verify all fifteen saved persona artifacts through the renderer's D5. -/
def checkExportedNav : IO Unit := do
  for release in ["v1", "v2", "v3"] do
    let raw ← IO.FS.readFile ("../releases/" ++ release ++ "/spec.json")
    let sp ← match Lean.Json.parse raw >>= Lean.fromJson? (α := Spec) with
      | .ok sp => pure sp | .error e => throw (IO.userError e)
    for (persona, _) in personaRoles do
      let path := "../releases/" ++ release ++ "/personas/" ++ persona ++ ".json"
      let raw ← IO.FS.readFile path
      let p ← match Lean.Json.parse raw >>= Lean.fromJson? (α := Program) with
        | .ok p => pure p | .error e => throw (IO.userError e)
      unless decide (Render.NavSane sp p) do
        throw (IO.userError ("D5 failed: " ++ path))
      IO.println s!"D5 NavSane {release}/{persona}: true ({p.screens.length} screens)"
end Ehr.Canonical

