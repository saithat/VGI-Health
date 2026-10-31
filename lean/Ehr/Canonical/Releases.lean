import Ehr.Canonical.Sanity
import Ehr.Specs.V2
namespace Ehr.Canonical

/-- Optional status and request controls in the shared order composer. The
current core action records a request on a medication order slot; it is not a
payer API transaction. Medical-service-only slots are requested in CR-9. -/
def withPriorAuth (p : Program) (id : ScreenId) : Program := p.updateScreen id fun s =>
  s.insertAfter (cid id "pending")
    [mk id "priorAuthStatus" (.priorAuth "priorAuthStatus") "Prior-auth status",
     button id "requestPriorAuth" .requestPriorAuth "Request prior authorization"]

/-- Canonical optional-feature release. No previous required field is moved. -/
def canonicalV1_1 : Program :=
  { ["w1Orders", "w3Orders", "w5Orders", "w6Orders"].foldl withPriorAuth canonicalV1 with
    version := 2, specVersion := "v1.1" }

/-- One coded stewardship field, bound to the same slot as the drug. -/
def indicationField (s : ScreenId) (pre : String) (slot : Slot) : Component :=
  field s (pre ++ "abxIndication") "abxIndication" "Antibiotic indication (required for antibiotics)"
    (slot := slot)

/-- Add the picker beside each existing drug binding, including fixed order-set rows. -/
def withAntibioticFields (p : Program) : Program :=
  { p with screens := p.screens.map fun s =>
      { s with components := s.components.flatMap fun c =>
          match c.kind with
          | .field "drug" slot _ =>
            let pre := match slot with | .fixed n => rowPrefix n | .current => ""
            [c, { indicationField s.id pre slot with parent? := c.parent?, tab := c.tab }]
          | _ => [c] } }

/-- Default the indication in antibiotic preference/order-set macros, preserving
human confirmation and provenance. Non-antibiotic lines get no new default. -/
def withAntibioticDefaults (p : Program) : Program :=
  { p with macros := p.macros.map fun m =>
      { m with steps := m.steps.flatMap fun st =>
          match st with
          | .setValue id drug =>
            match (components p).find? (·.id == id) with
            | some c => match c.kind with
              | .field "drug" slot _ =>
                if inClass drug "antibiotic" then
                  let sc := p.screens.find? fun s => s.components.any (·.id == id)
                  let pre := match slot with | .fixed n => rowPrefix n | .current => ""
                  let indication := if m.id == "w6PrefCefazolin" then "surgical-prophylaxis"
                    else if m.id == "w3SepsisSet" then "sepsis"
                    else if m.id == "w3CellulitisSet" then "skin-infection"
                    else "respiratory-infection"
                  sc.toList.flatMap fun s => [st, .setValue (cid s.id (pre ++ "abxIndication")) indication]
                else [st]
              | _ => [st]
            | none => [st]
          | _ => [st] } }

/-- v2: antibiotic pickers in composers and all set rows, a sign-screen summary
column, and an always-open MAR indication row. These are additive changes. -/
def canonicalV2 : Program :=
  let fields := withAntibioticDefaults (withAntibioticFields canonicalV1_1)
  let summaries := ["w1Sign", "w3Sign", "w5Sign", "w6Sign"].foldl (fun p id =>
    p.updateScreen id fun s => s.insertAfter (cid id "orders")
      [table id "antibioticIndications" "abxIndication" "Order indications (per antibiotic line)"]) fields
  { summaries.updateScreen "w4Admin" (fun s => s.insertAfter "w4Admin.dose"
      [panel s.id "antibioticIndication" "abxIndication" "Antibiotic indication"]) with
    version := 3, specVersion := "v2" }

#guard canonicalV1.inCatalog Specs.V1_1.specV1_1
#guard canonicalV1_1.inCatalog Specs.V1_1.specV1_1
#guard !canonicalV1_1.inCatalog Specs.V1.specV1
#guard referencesValid Specs.V1_1.specV1_1 canonicalV1_1
#guard referencesValid Specs.V2.specV2 canonicalV2
#guard macroTargetsValid canonicalV2
#guard Specs.V1.allDistinct (components canonicalV2 |>.map (·.id))
end Ehr.Canonical
