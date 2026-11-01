import Ehr.Canonical.Sanity
import Ehr.Specs.V3
namespace Ehr.Canonical

/-- Optional prior-auth status/request controls in shared medication composers.
Medication use anticipates the proposed drug rule; service controls below
provide the final-rule imaging/procedure demonstration. -/
def withPriorAuth (p : Program) (id : ScreenId) : Program := p.updateScreen id fun s =>
  s.insertAfter (cid id "pending")
    [lineField id "priorAuthRequest" "priorAuthRequest" "Request authorization (human entry)",
     mk id "priorAuthStatus" (.priorAuth "priorAuthStatus") "Prior-auth status",
     button id "requestPriorAuth" .requestPriorAuth "Request prior authorization"]

/-- Imaging/procedure ordering with actual service-only prior-auth requests. -/
def withServicePriorAuth (p : Program) (id : ScreenId) : Program := p.updateScreen id fun s =>
  s.insertAfter (cid id "banner")
    [group id "servicePriorAuth" "Imaging / procedure authorization" (collapsible := false),
     button id "newServiceOrder" .newOrderLine "Add imaging / procedure order"
       (parent := some "servicePriorAuth"),
     lineField id "orderKind" "orderKind" "Kind: imaging / procedure" (parent := some "servicePriorAuth"),
     lineField id "orderCode" "orderCode" "Service code" (parent := some "servicePriorAuth"),
     lineField id "priorAuthRequest" "priorAuthRequest" "Request authorization (human entry)"
       (parent := some "servicePriorAuth"),
     mk id "servicePriorAuthStatus" (.priorAuth "priorAuthStatus") "Service prior-auth status"
       (parent := some "servicePriorAuth"),
     button id "requestServicePriorAuth" .requestPriorAuth "Request service prior authorization"
       (parent := some "servicePriorAuth")]

/-- Canonical optional-feature release. No previous required field is moved. -/
def canonicalV2 : Program :=
  { ["w1Labs", "w6PreOp"].foldl withServicePriorAuth
      (["w1Orders", "w3Orders", "w5Orders", "w6Orders"].foldl withPriorAuth canonicalV1) with
    version := 2, specVersion := "v2" }

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
            [c, { indicationField s.id pre slot with
              id := if c.id == cid s.id (pre ++ "drug") then cid s.id (pre ++ "abxIndication")
                    else c.id ++ ".abxIndication",
              parent? := c.parent?, tab := c.tab }]
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
                  sc.toList.flatMap fun s => [st, .setValue
                    (if c.id == cid s.id (pre ++ "drug") then cid s.id (pre ++ "abxIndication")
                     else c.id ++ ".abxIndication") indication]
                else [st]
              | _ => [st]
            | none => [st]
          | _ => [st] } }

/-- v3: antibiotic pickers in composers and all set rows, a sign-screen summary
column, and an always-open MAR indication row. These are additive changes. -/
def canonicalV3 : Program :=
  let fields := withAntibioticDefaults (withAntibioticFields canonicalV2)
  let signing := fields.screens.filter fun s => s.components.any fun c => match c.kind with
    | .button (.commit k) => k == "signOrders" || Specs.V1.issuanceCommits.contains k
    | _ => false
  let summaries := signing.foldl (fun p sc => p.updateScreen sc.id fun s =>
    let anchor := ((s.components.find? fun c => showsInfo "orderSummary" c.kind).map (·.id)).getD (cid s.id "banner")
    s.insertAfter anchor
      [table s.id "antibioticIndications" "abxIndication" "Order indications (per antibiotic line)"]) fields
  { summaries.updateScreen "w4Admin" (fun s => s.insertAfter "w4Admin.dose"
      [panel s.id "antibioticIndication" "abxIndication" "Antibiotic indication"]) with
    version := 3, specVersion := "v3" }

#guard canonicalV1.inCatalog Specs.V2.specV2
#guard canonicalV2.inCatalog Specs.V2.specV2
#guard !canonicalV2.inCatalog Specs.V1.specV1
#guard referencesValid Specs.V2.specV2 canonicalV2
#guard referencesValid Specs.V3.specV3 canonicalV3
#guard macroTargetsValid canonicalV3
#guard Specs.V1.allDistinct (components canonicalV3 |>.map (·.id))
end Ehr.Canonical
