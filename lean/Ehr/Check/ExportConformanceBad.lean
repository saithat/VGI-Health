import Ehr.Canonical.Releases
import Ehr.Canonical.Personas
import Ehr.Core.Json

open Ehr Ehr.Canonical

def writeJson [Lean.ToJson α] (root : System.FilePath) (path : String) (x : α) : IO Unit := do
  IO.FS.createDirAll (root / path).parent.get!
  IO.FS.writeFile (root / path) ((Lean.toJson x).pretty ++ "\n")

def main (args : List String) : IO Unit := do
  let root : System.FilePath := args.headD ".."
  let base := forPersona Ehr.Specs.V1.specV1 canonicalV1 "P1" .physician
  let rewrite := fun (p : Program) (f : Component → Option Component) =>
    { p with screens := p.screens.map fun s => { s with components := s.components.filterMap f } }
  let cures := rewrite base fun c => if showsInfo "curesReport" c.kind then none else some c
  let linked := rewrite base fun c => some (match c.kind with
    | .field "dosingWeight" slot _ => { c with kind := .field "dosingWeight" slot (.default "70") }
    | _ => c)
  let foreign := base.updateScreen base.start fun s => { s with components := s.components ++
    [{ id := "foreignAllergies", kind := .button (.markReviewed "patient-A-allergies"), label := "Other patient's allergies" }] }
  let empty := rewrite { base with macros := [] } fun c => match c.kind with
    | .field "drug" _ _ | .field "orderKind" _ _ | .field "orderCode" _ _ | .«macro» _ => none
    | _ => some c
  let denial := rewrite base fun c => match c.kind with
    | .field "refillDenyReason" _ _ => none
    | _ => some c
  -- R3 (new specification for owner review): three copies of one control on
  -- three screens exceed the default copy budget of 2. The base is the certified
  -- release persona, so no unrelated rule fails first under the release spec.
  let releaseText ← IO.FS.readFile (root / "releases/v1/personas/P1.json")
  let release ← IO.ofExcept (Lean.Json.parse releaseText >>= Lean.fromJson? (α := Program))
  let spray := { release with screens := release.screens.map fun s =>
    if ["w1Rooming", "w1MedRec", "w1Hpi"].contains s.id then
      { s with components := s.components ++
        [{ id := s.id ++ ".sprayToSign", kind := .button (.goto "w1Verify"), label := "Review and sign",
           tag := s.id ++ ".sprayToSign", copyOf? := some "w1Orders.toSign" }] }
    else s }
  -- R4 and R6, new specifications. Retain every other release control.
  let noContext := rewrite release fun c =>
    if showsInfo "problemList" c.kind then none else some c
  let wrongNav := release.updateScreen "w1Rooming" fun s =>
    { s with components := s.components.map fun c =>
      if c.id == "w1Rooming.nav.w1MedRec" then { c with label := "Orders" } else c }
  let stuffedNav := release.updateScreen "w1Rooming" fun s =>
    { s with components := s.components.map fun c =>
      if c.id == "w1Rooming.nav.w1MedRec" then
        { c with label := "Medication allergy problems results history" } else c }
  -- New specification for owner review. Retain the v2 service kind/code
  -- while removing both authorization controls, as in a partial migration.
  let v2Text ← IO.FS.readFile (root / "releases/v2/personas/P1.json")
  let v2 ← IO.ofExcept (Lean.Json.parse v2Text >>= Lean.fromJson? (α := Program))
  let partialService := rewrite v2 fun c => match c.kind with
    | .button .requestPriorAuth | .field "priorAuthRequest" _ _ => none
    | _ => some c
  -- New specification for owner review. These mutations retain the old commit
  -- routes, so each finding identifies the missing clinical capability.
  let authOnly := rewrite v2 fun c => match c.kind with
    | .field "orderKind" _ _ | .field "orderCode" _ _ | .field "imagingPriority" _ _ => none
    | _ => some c
  let identity := ((components release).find? fun c => match c.kind with | .field "patientIdReentry" .. => true | _ => false).get!
  let elsewhere := (rewrite release fun c => if c == identity then none else some c).updateScreen
    "w2Message" fun s => { s with components := s.components ++ [{ identity with parent? := none }] }
  let oneLine := rewrite release fun c => if c.kind == .button .newOrderLine then none else some c
  let strayResult := release.updateScreen "chartSummary" fun s =>
    { s with components := s.components ++ [{ id := "criticalNotice", kind := .alert "criticalResult" false, label := "Critical result" }] }
  let noAllergyReview := rewrite release fun c =>
    if c.kind == .button (.markReviewed "allergyList") then none else some c
  let twoBanners := release.updateScreen release.start fun sc =>
    {sc with components := sc.components ++
      [{ id := "extraPatientBanner", kind := .banner, label := "Patient banner", tag := "second.landmark" }]}
  let cases := [("36-cures-without-review", "completable", cures),
    ("37-stale-dosing-weight", "capturesAllOnce", linked),
    ("38-cross-patient-panel", "writesOnly", foreign),
    ("39-empty-order-signing", "completable", empty),
    ("40-denial-without-reason", "completable", denial),
    ("41-copy-spray", "copyBudget", spray),
    ("50-context-removed", "contextRetained", noContext),
    ("51-misleading-navigation", "navigation", wrongNav),
    ("52-stuffed-navigation", "navigation", stuffedNav),
    ("54-partial-service", "servicePriorAuth", partialService),
    ("55-authorization-only", "serviceBundle", authOnly),
    ("56-identity-outside-workflow", "patientIdentityReview", elsewhere),
    ("57-no-next-medication-line", "medicationLines", oneLine),
    ("58-critical-without-follow-up", "criticalFollowThrough", strayResult),
    ("67-missing-human-review", "clinicalScenarios", noAllergyReview),
    ("68-duplicate-banner", "clinicalScenarios", twoBanners)]
  for (name, _, p) in cases do writeJson root s!"lean/Ehr/Check/bad/{name}.json" p
  writeJson root "lean/Ehr/Check/conformance-bad-programs.json" (cases.map fun (name, prop, _) => (s!"lean/Ehr/Check/bad/{name}.json", prop))
