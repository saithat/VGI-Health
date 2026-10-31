import Ehr.Canonical.Personas
import Ehr.Canonical.BadTests
namespace Ehr.Canonical.Tests
open Ehr.Specs.V1 Ehr.Specs.V1_1 Ehr.Specs.V2

/-- v1.1 preserves a complete v1 prescribing path without any new input. -/
def optionalRelease : State := run w1Path canonicalV1_1 adult physician specV1_1
#guard (finish optionalRelease "w1Sign" "signOrders" canonicalV1_1 adult physician specV1_1).commits == ["signOrders"]
/-- A human requests prior auth on an existing order. -/
def pa : State × StepResult := one
  (run [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Orders",
    .enter "w1Orders.drug" (.code "lisinopril")] canonicalV1_1 adult physician specV1_1)
  (.click "w1Orders.requestPriorAuth") canonicalV1_1 adult physician specV1_1
#guard pa.2 == .ok
#guard (cap pa.1 "priorAuthRequest").map (·.value) == some (.flag true)
#guard pa.1.commits == []
#guard !canonicalV1_1.inCatalog specV1

/-- Actual imaging-only order: no drug is needed to request prior auth. -/
def servicePa : State × StepResult := one
  (run [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Labs",
    .enter "w1Labs.orderKind" (.code "imaging"), .enter "w1Labs.orderCode" (.code "70551")]
    canonicalV1_1 adult physician specV1_1)
  (.click "w1Labs.requestServicePriorAuth") canonicalV1_1 adult physician specV1_1
#guard servicePa.2 == .ok
#guard (cap servicePa.1 "priorAuthRequest").map (·.value) == some (.flag true)
#guard orderLines servicePa.1 == []
#guard (popupCandidates specV1_1 canonicalV1_1 adult servicePa.1 "signOrders").isEmpty
#guard infoShown specV1_1 canonicalV1_1 adult servicePa.1 "priorAuthStatus"

-- v2 has teeth: the old UI still reaches sign, but cannot meet the new entry.
#guard reason (one (run amoxPath canonicalV1_1 adult physician specV2)
  (.click "w1Sign.commit.signOrders") canonicalV1_1 adult physician specV2).2 == "entry required: abxIndication"
/-- Confirm v2 antibiotic defaults on the appropriate composer before sign. -/
def confirmBeforeSign (es : List Event) (screen : String) : List Event := es.flatMap fun e =>
  if e == .click (cid screen "toSign") then [.confirm (cid screen "abxIndication"), e] else [e]
/-- W1 antibiotic preference defaults remain pending until a human confirms. -/
def w1V2 : State := run (confirmBeforeSign amoxPath "w1Orders") canonicalV2 adult physician specV2
#guard (cap w1V2 "abxIndication").any fun x => x.confirmed && !x.byHuman && x.provenance? == some "macro"
#guard (finish w1V2 "w1Sign" "signOrders" canonicalV2 adult physician specV2).commits == ["signOrders"]
#guard !(cap (run amoxPath canonicalV2 adult physician specV2) "abxIndication").any (·.confirmed)
#guard (finish (run amoxPath canonicalV2 adult physician specV2) "w1Sign" "signOrders"
  canonicalV2 adult physician specV2).commits == []
/-- Pediatric antibiotic path uses the same NP confirmation. -/
def w5V2 : State := run (confirmBeforeSign w5Path "w5Orders") canonicalV2 child np specV2
#guard (finish w5V2 "w5Sign" "signOrders" canonicalV2 child np specV2).commits == ["signOrders"]
/-- Pre-op surgeon explicitly chooses surgical prophylaxis. -/
def preOpV2 : State := run (preOpPath.flatMap fun e =>
  if e == .click "w6Orders.toSign" then
    [.enter "w6Orders.abxIndication" (.code "surgical-prophylaxis"), e] else [e])
  canonicalV2 preOpFacts surgeon specV2
#guard (finish preOpV2 "w6Sign" "signOrders" canonicalV2 preOpFacts surgeon specV2).commits == ["signOrders"]
/-- ED sepsis set: both antibiotic rows get defaults; both need confirmation. -/
def sepsisPath : List Event :=
  [.click "home.work.w3TrackBoard", .click "w3TrackBoard.open",
   .enter "w3Triage.weight" (.qty 700 .kg), .click "w3Triage.nav.w3OrderSets", .click "w3OrderSets.sepsis"] ++
  [10, 11].flatMap (fun n => confirmLine "w3OrderSets" (rowPrefix n)) ++
  [.confirm "w3OrderSets.row10.abxIndication", .click "w3OrderSets.toSign"] ++ enter "w3Sign"
    [("dosingWeight", .qty 700 .kg), ("patientIdReentry", .text "RK/M/58")]
/-- Deliberately leave line 11 unconfirmed. -/
def sepsisMissing : State := run sepsisPath canonicalV2 hospital physician specV2
#guard (cap sepsisMissing "abxIndication" 10).any (·.confirmed)
#guard !(cap sepsisMissing "abxIndication" 11).any (·.confirmed)
#guard (finish sepsisMissing "w3Sign" "signOrders" canonicalV2 hospital physician specV2).commits == []
/-- Confirm the second antibiotic in the same episode. -/
def sepsis : State := more sepsisMissing
  [.click "w3Sign.nav.w3OrderSets", .confirm "w3OrderSets.row11.abxIndication", .click "w3OrderSets.toSign"]
  canonicalV2 hospital physician specV2
#guard (finish sepsis "w3Sign" "signOrders" canonicalV2 hospital physician specV2).commits == ["signOrders"]
-- Non-antibiotic post-op set and ordinary orders do not acquire an abx obligation.
#guard (finish (run postOpPath canonicalV2 hospital surgeon specV2) "w6Sign" "signOrders"
  canonicalV2 hospital surgeon specV2).commits == ["signOrders"]
#guard (finish (run w1Path canonicalV2 adult physician specV2) "w1Sign" "signOrders"
  canonicalV2 adult physician specV2).commits == ["signOrders"]

/-- MAR episode carries the signed antibiotic's indication as a named fact.
The renderer lane must render this fact, not just the panel heading (CR-10). -/
def antibioticAdminFacts : Facts :=
  { adminFacts "cefazolin" with record := [("abxIndication", "surgical-prophylaxis")] }
/-- Old MAR lacks the newly required indication display. -/
def oldMar : State := run (adminPath "cefazolin") canonicalV1_1 antibioticAdminFacts nurse specV2
#guard reason (one oldMar (.click "w4Admin.commit.administerMed")
  canonicalV1_1 antibioticAdminFacts nurse specV2).2 == "review required: abxIndication must be shown"
/-- v2 places it beside the dose, always open. -/
def newMar : State := run (adminPath "cefazolin") canonicalV2 antibioticAdminFacts nurse specV2
#guard infoShown specV2 canonicalV2 antibioticAdminFacts newMar "abxIndication"
#guard (finish newMar "w4Admin" "administerMed" canonicalV2 antibioticAdminFacts nurse specV2).commits == ["administerMed"]
/-- Regression for the first failed migration: collapsed indication drawer. -/
def collapsedMar : Program := canonicalV2.updateScreen "w4Admin" fun s =>
  (s.insertAfter "w4Admin.dose" [group s.id "details" "Details" (startCollapsed := true)])
    |>.updateComp "w4Admin.antibioticIndication" fun c => { c with parent? := some "w4Admin.details" }
#guard reason (one (run (adminPath "cefazolin") collapsedMar antibioticAdminFacts nurse specV2)
  (.click "w4Admin.commit.administerMed") collapsedMar antibioticAdminFacts nurse specV2).2 ==
  "review required: abxIndication must be shown"

-- Role projections retain complete paths for their actual users.
#guard (finish (run w1Path (forPersona specV1 canonicalV1 "P1" .physician))
  "w1Sign" "signOrders" (forPersona specV1 canonicalV1 "P1" .physician)).commits == ["signOrders"]
#guard (finish (run (adminPath "insulin lispro" ++ [.enter "w4Admin.highAlertCosign" (.user "nurse2")])
    (forPersona specV1 canonicalV1 "P3" .rn) (adminFacts "insulin lispro") nurse)
  "w4Admin" "administerMed" (forPersona specV1 canonicalV1 "P3" .rn)
  (adminFacts "insulin lispro") nurse).commits == ["administerMed"]
#guard (finish (run w5Path (forPersona specV1 canonicalV1 "P4" .np) child np)
  "w5Sign" "signOrders" (forPersona specV1 canonicalV1 "P4" .np) child np).commits == ["signOrders"]
#guard (finish (run preOpPath (forPersona specV1 canonicalV1 "P5" .surgeon) preOpFacts surgeon)
  "w6Sign" "signOrders" (forPersona specV1 canonicalV1 "P5" .surgeon) preOpFacts surgeon).commits == ["signOrders"]

end Ehr.Canonical.Tests
