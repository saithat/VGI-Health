import Ehr.Canonical.BlueprintTests
import Ehr.Canonical.Personas
import Ehr.Canonical.CoreBadTests
import Ehr.Core.Json
namespace Ehr.Canonical.CoreTests
open Ehr.Specs.V1 Ehr.Specs.V1_1 Ehr.Specs.V2

-- The legal correction replaces the old code; it is not a legacy alias.
#guard Specs.ruleProfile == .full || curesExemptionCodes.contains "surgery-7-day"
#guard Specs.ruleProfile == .full || !curesExemptionCodes.contains "surgery-5-day"
#guard Specs.ruleProfile == .full || curesExemptionCodes.length == 5
#guard Specs.ruleProfile == .full || match (Lean.fromJson? (Lean.toJson curesExemptionCodes) : Except String (List String)) with
  | .ok codes => codes == curesExemptionCodes
  | .error _ => false

-- Each release supports human documentation of the corrected code through
-- real composer events. This tests the waiver path, not statutory eligibility
-- or rejection of arbitrary codes: those still need core/check CR-11.
#guard Specs.ruleProfile == .full || [(specV1, canonicalV1), (specV1_1, canonicalV1_1), (specV2, canonicalV2)].all fun (sp, p) =>
  let p := p.updateScreen "w1Sign" fun s => s.dropComp "w1Sign.cures"
  let s := run opioidPath p adult physician sp
  let entered := more s [.click "w1Sign.edit",
    .enter "w1Orders.curesExemptionReason" (.code "surgery-7-day"),
    .click "w1Orders.toSign", .click "w1Verify.continue"] p adult physician sp
  (finish s "w1Sign" "signOrders" p adult physician sp).commits == [] &&
  (cap entered "curesExemptionReason").any (fun c =>
    c.byHuman && c.confirmed && c.value == .code "surgery-7-day") &&
  (finish entered "w1Sign" "signOrders" p adult physician sp).commits == ["signOrders"]

/-- v1.1 preserves a complete v1 prescribing path without any new input. -/
def optionalRelease : State := run w1Path canonicalV1_1 adult physician specV1_1
#guard Specs.ruleProfile == .full || (finish optionalRelease "w1Sign" "signOrders" canonicalV1_1 adult physician specV1_1).commits == ["signOrders"]
-- Optional and stewardship releases preserve the new Schedule II hard stop.
#guard Specs.ruleProfile == .full || [(specV1_1, canonicalV1_1), (specV2, canonicalV2)].all fun (sp, p) =>
  let path := (opioidPath).map fun e => match e with
    | .enter "w1Orders.refills" _ => .enter "w1Orders.refills" (.qty 30 .none) | _ => e
  let s := run path p adult physician sp
  reason (one s (.click "w1Sign.commit.signOrders") p adult physician sp).2 ==
    "value not allowed: refills (allowed: 0)" &&
    (finish s "w1Sign" "signOrders" p adult physician sp).commits == []
/-- A human requests prior auth on an existing order. -/
def pa : State × StepResult := one
  (run [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Orders",
    .enter "w1Orders.drug" (.code "lisinopril"), .enter "w1Orders.priorAuthRequest" (.flag true)] canonicalV1_1 adult physician specV1_1)
  (.click "w1Orders.requestPriorAuth") canonicalV1_1 adult physician specV1_1
#guard Specs.ruleProfile == .full || pa.2 == .ignored
#guard Specs.ruleProfile == .full || (cap pa.1 "priorAuthRequest").map (·.value) == some (.flag true)
#guard Specs.ruleProfile == .full || pa.1.commits == []
#guard Specs.ruleProfile == .full || !canonicalV1_1.inCatalog specV1

/-- Actual imaging-only order: no drug is needed to request prior auth. -/
def servicePa : State × StepResult := one
  (run [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Labs",
    .enter "w1Labs.orderKind" (.code "imaging"), .enter "w1Labs.orderCode" (.code "70551"), .enter "w1Labs.priorAuthRequest" (.flag true)]
    canonicalV1_1 adult physician specV1_1)
  (.click "w1Labs.requestServicePriorAuth") canonicalV1_1 adult physician specV1_1
#guard Specs.ruleProfile == .full || servicePa.2 == .ignored
#guard Specs.ruleProfile == .full || (cap servicePa.1 "priorAuthRequest").map (·.value) == some (.flag true)
#guard Specs.ruleProfile == .full || orderLines servicePa.1 == []
#guard Specs.ruleProfile == .full || (popupCandidates specV1_1 canonicalV1_1 adult servicePa.1 "signOrders").isEmpty
#guard Specs.ruleProfile == .full || infoShown specV1_1 canonicalV1_1 adult servicePa.1 "priorAuthStatus"

/-- A service order can follow a complete medication on a fresh slot, keeping
both orders distinct rather than attaching a service code to the drug line. -/
def mixedServicePa : State × StepResult := one
  (more optionalRelease [.click "w1Sign.nav.w1Labs", .click "w1Labs.newServiceOrder",
    .enter "w1Labs.orderKind" (.code "imaging"), .enter "w1Labs.orderCode" (.code "70551"), .enter "w1Labs.priorAuthRequest" (.flag true)]
    canonicalV1_1 adult physician specV1_1)
  (.click "w1Labs.requestServicePriorAuth") canonicalV1_1 adult physician specV1_1
#guard Specs.ruleProfile == .full || mixedServicePa.2 == .ignored
#guard Specs.ruleProfile == .full || mixedServicePa.1.currentSlot == 1
#guard Specs.ruleProfile == .full || serviceOrderAt mixedServicePa.1 1
#guard Specs.ruleProfile == .full || (orderLines mixedServicePa.1).length == 1
#guard Specs.ruleProfile == .full || (cap mixedServicePa.1 "priorAuthRequest" 1).map (·.value) == some (.flag true)

-- A request click cannot forge the never-policy human entry.
#guard Specs.ruleProfile == .full || reason (one (run [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Labs",
  .enter "w1Labs.orderKind" (.code "imaging"), .enter "w1Labs.orderCode" (.code "70551")]
  canonicalV1_1 adult physician specV1_1) (.click "w1Labs.requestServicePriorAuth")
  canonicalV1_1 adult physician specV1_1).2 == "human entry required: priorAuthRequest"
#guard Specs.ruleProfile == .full || (cap servicePa.1 "priorAuthRequest").any (·.byHuman)

-- v2 has teeth: the old UI still reaches sign, but cannot meet the new entry.
#guard Specs.ruleProfile == .full || reason (one (run amoxPath canonicalV1_1 adult physician specV2)
  (.click "w1Sign.commit.signOrders") canonicalV1_1 adult physician specV2).2 == "entry required: abxIndication"
/-- Confirm v2 antibiotic defaults on the appropriate composer before sign. -/
def confirmBeforeSign (es : List Event) (screen : String) : List Event := es.flatMap fun e =>
  if e == .click (cid screen "toSign") then [.confirm (cid screen "abxIndication"), e] else [e]
/-- W1 antibiotic preference defaults remain pending until a human confirms. -/
def w1V2 : State := run (confirmBeforeSign amoxPath "w1Orders") canonicalV2 adult physician specV2
#guard Specs.ruleProfile == .full || (cap w1V2 "abxIndication").any fun x => x.confirmed && !x.byHuman && x.provenance? == some "macro"
#guard Specs.ruleProfile == .full || (finish w1V2 "w1Sign" "signOrders" canonicalV2 adult physician specV2).commits == ["signOrders"]
#guard Specs.ruleProfile == .full || !(cap (run amoxPath canonicalV2 adult physician specV2) "abxIndication").any (·.confirmed)
#guard Specs.ruleProfile == .full || (finish (run amoxPath canonicalV2 adult physician specV2) "w1Sign" "signOrders"
  canonicalV2 adult physician specV2).commits == []
/-- Pediatric antibiotic path uses the same NP confirmation. -/
def w5V2 : State := run (confirmBeforeSign w5Path "w5Orders") canonicalV2 child np specV2
#guard Specs.ruleProfile == .full || (finish w5V2 "w5Sign" "signOrders" canonicalV2 child np specV2).commits == ["signOrders"]
/-- Pre-op surgeon explicitly chooses surgical prophylaxis. -/
def preOpV2 : State := run (preOpPath.flatMap fun e =>
  if e == .click "w6Orders.toSign" then
    [.enter "w6Orders.abxIndication" (.code "surgical-prophylaxis"), e] else [e])
  canonicalV2 preOpFacts surgeon specV2
#guard Specs.ruleProfile == .full || (finish preOpV2 "w6Sign" "signOrders" canonicalV2 preOpFacts surgeon specV2).commits == ["signOrders"]
/-- ED sepsis set: both antibiotic rows get defaults; both need confirmation. -/
def sepsisPath : List Event :=
  [.click "home.work.w3TrackBoard", .click "w3TrackBoard.open",
   .enter "w3Triage.weight" (.qty 700 .kg), .click "w3Triage.nav.w3OrderSets", .click "w3OrderSets.sepsis"] ++
  [10, 11].flatMap (fun n => confirmLine "w3OrderSets" (rowPrefix n)) ++
  [.confirm "w3OrderSets.row10.abxIndication", .click "w3OrderSets.toSign"] ++ enter "w3Sign"
    [("dosingWeight", .qty 700 .kg), ("patientIdReentry", .text "RK/M/58")]
/-- Deliberately leave line 11 unconfirmed. -/
def sepsisMissing : State := run sepsisPath canonicalV2 hospital physician specV2
#guard Specs.ruleProfile == .full || (cap sepsisMissing "abxIndication" 10).any (·.confirmed)
#guard Specs.ruleProfile == .full || !(cap sepsisMissing "abxIndication" 11).any (·.confirmed)
#guard Specs.ruleProfile == .full || (finish sepsisMissing "w3Sign" "signOrders" canonicalV2 hospital physician specV2).commits == []
/-- Confirm the second antibiotic in the same episode. -/
def sepsis : State := more sepsisMissing
  [.click "w3Sign.nav.w3OrderSets", .confirm "w3OrderSets.row11.abxIndication", .click "w3OrderSets.toSign"]
  canonicalV2 hospital physician specV2
#guard Specs.ruleProfile == .full || (finish sepsis "w3Sign" "signOrders" canonicalV2 hospital physician specV2).commits == ["signOrders"]
-- Non-antibiotic post-op set and ordinary orders do not acquire an abx obligation.
#guard Specs.ruleProfile == .full || (finish (run postOpPath canonicalV2 hospital surgeon specV2) "w6Sign" "signOrders"
  canonicalV2 hospital surgeon specV2).commits == ["signOrders"]
#guard Specs.ruleProfile == .full || (finish (run w1Path canonicalV2 adult physician specV2) "w1Sign" "signOrders"
  canonicalV2 adult physician specV2).commits == ["signOrders"]

/-- MAR episode carries the signed antibiotic's indication as a named fact.
The renderer lane must render this fact, not just the panel heading (CR-10). -/
def antibioticAdminFacts : Facts :=
  { adminFacts "cefazolin" with record := [("abxIndication", "surgical-prophylaxis")] }
/-- Old MAR lacks the newly required indication display. -/
def oldMar : State := run (adminPath "cefazolin") canonicalV1_1 antibioticAdminFacts nurse specV2
#guard Specs.ruleProfile == .full || reason (one oldMar (.click "w4Admin.commit.administerMed")
  canonicalV1_1 antibioticAdminFacts nurse specV2).2 == "review required: abxIndication must be shown"
/-- v2 places it beside the dose, always open. -/
def newMar : State := run (adminPath "cefazolin") canonicalV2 antibioticAdminFacts nurse specV2
#guard Specs.ruleProfile == .full || infoShown specV2 canonicalV2 antibioticAdminFacts newMar "abxIndication"
#guard Specs.ruleProfile == .full || (finish newMar "w4Admin" "administerMed" canonicalV2 antibioticAdminFacts nurse specV2).commits == ["administerMed"]
/-- Regression for the first failed migration: collapsed indication drawer. -/
def collapsedMar : Program := canonicalV2.updateScreen "w4Admin" fun s =>
  (s.insertAfter "w4Admin.dose" [group s.id "details" "Details" (startCollapsed := true)])
    |>.updateComp "w4Admin.antibioticIndication" fun c => { c with parent? := some "w4Admin.details" }
#guard Specs.ruleProfile == .full || reason (one (run (adminPath "cefazolin") collapsedMar antibioticAdminFacts nurse specV2)
  (.click "w4Admin.commit.administerMed") collapsedMar antibioticAdminFacts nurse specV2).2 ==
  "review required: abxIndication must be shown"

-- Role projections retain complete paths for their actual users.
#guard Specs.ruleProfile == .full || (finish (run w1Path (forPersona specV1 canonicalV1 "P1" .physician))
  "w1Sign" "signOrders" (forPersona specV1 canonicalV1 "P1" .physician)).commits == ["signOrders"]
#guard Specs.ruleProfile == .full || (finish (run (adminPath "insulin lispro" ++ [.enter "w4Admin.highAlertCosign" (.user "nurse2")])
    (forPersona specV1 canonicalV1 "P3" .rn) (adminFacts "insulin lispro") nurse)
  "w4Admin" "administerMed" (forPersona specV1 canonicalV1 "P3" .rn)
  (adminFacts "insulin lispro") nurse).commits == ["administerMed"]
#guard Specs.ruleProfile == .full || (finish (run w5Path (forPersona specV1 canonicalV1 "P4" .np) child np)
  "w5Sign" "signOrders" (forPersona specV1 canonicalV1 "P4" .np) child np).commits == ["signOrders"]
#guard Specs.ruleProfile == .full || (finish (run preOpPath (forPersona specV1 canonicalV1 "P5" .surgeon) preOpFacts surgeon)
  "w6Sign" "signOrders" (forPersona specV1 canonicalV1 "P5" .surgeon) preOpFacts surgeon).commits == ["signOrders"]

end Ehr.Canonical.CoreTests
