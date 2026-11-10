import Ehr.Canonical.BlueprintTests
import Ehr.Canonical.Personas
import Ehr.Canonical.BadTests
import Ehr.Canonical.FeatureTests
import Ehr.Core.Json
namespace Ehr.Canonical.Tests
open Ehr.Specs.V1 Ehr.Specs.V2 Ehr.Specs.V3

-- The legal correction replaces the old code; it is not a legacy alias.
#guard curesExemptionCodes.contains "surgery-7-day"
#guard !curesExemptionCodes.contains "surgery-5-day"
#guard curesExemptionCodes.length == 5
#guard match (Lean.fromJson? (Lean.toJson curesExemptionCodes) : Except String (List String)) with
  | .ok codes => codes == curesExemptionCodes
  | .error _ => false

-- Each release supports human documentation of the corrected code through
-- real composer events, with independent evidence for the procedure, eligible
-- facility and a supply within seven days. Human category entry is still needed.
def surgeryExemptionFacts : Facts := { adult with record := adult.record ++
  [("facilityKind", "surgical-clinic"), ("surgicalProcedure", "synthetic-procedure"),
   ("directedSupplyDays", "7")] }
#guard [(specV1, canonicalV1), (specV2, canonicalV2), (specV3, canonicalV3)].all fun (sp, p) =>
  let p := p.updateScreen "w1Sign" fun s => s.dropComp "w1Sign.cures"
  let s := run opioidPath p surgeryExemptionFacts physician sp
  let entered := more s [.click "w1Sign.edit",
    .enter "w1Orders.curesExemptionReason" (.code "surgery-7-day"),
    .click "w1Orders.toSign", .click "w1Verify.continue"] p surgeryExemptionFacts physician sp
  (finish s "w1Sign" "signOrders" p surgeryExemptionFacts physician sp).commits == [] &&
  (cap entered "curesExemptionReason").any (fun c =>
    c.byHuman && c.confirmed && c.value == .code "surgery-7-day") &&
  (finish entered "w1Sign" "signOrders" p surgeryExemptionFacts physician sp).commits == ["signOrders"]

/-- v2 preserves a complete v1 prescribing path without any new input. -/
def optionalRelease : State := run w1Path canonicalV2 adult physician specV2
#guard (finish optionalRelease "w1Sign" "signOrders" canonicalV2 adult physician specV2).commits == ["signOrders"]
-- Optional and stewardship releases preserve the new Schedule II hard stop.
#guard [(specV2, canonicalV2), (specV3, canonicalV3)].all fun (sp, p) =>
  let path := (opioidPath).map fun e => match e with
    | .enter "w1Orders.refills" _ => .enter "w1Orders.refills" (.qty 30 .none) | _ => e
  let s := run path p adult physician sp
  reason (one s (.click "w1Sign.commit.signOrders") p adult physician sp).2 ==
    "value not allowed: refills (allowed: 0)" &&
    (finish s "w1Sign" "signOrders" p adult physician sp).commits == []
/-- A human requests prior auth on an existing order. -/
def pa : State × StepResult := one
  (run [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Orders",
    .enter "w1Orders.drug" (.code "lisinopril"), .enter "w1Orders.priorAuthRequest" (.flag true)] canonicalV2 adult physician specV2)
  (.click "w1Orders.requestPriorAuth") canonicalV2 adult physician specV2
#guard pa.2 == .ignored
#guard (cap pa.1 "priorAuthRequest").map (·.value) == some (.flag true)
#guard pa.1.commits == []
#guard !canonicalV2.inCatalog specV1

/-- Actual imaging-only order: no drug is needed to request prior auth. -/
def servicePa : State × StepResult := one
  (run [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Labs",
    .enter "w1Labs.orderKind" (.code "imaging"), .enter "w1Labs.orderCode" (.code "70551"), .enter "w1Labs.priorAuthRequest" (.flag true)]
    canonicalV2 adult physician specV2)
  (.click "w1Labs.requestServicePriorAuth") canonicalV2 adult physician specV2
#guard servicePa.2 == .ignored
#guard (cap servicePa.1 "priorAuthRequest").map (·.value) == some (.flag true)
#guard orderLines servicePa.1 == []
#guard (popupCandidates specV2 canonicalV2 adult servicePa.1 "signOrders").isEmpty
#guard infoShown specV2 canonicalV2 adult servicePa.1 "priorAuthStatus"

/-- A service order can follow a complete medication on a fresh slot, keeping
both orders distinct rather than attaching a service code to the drug line. -/
def mixedServicePa : State × StepResult := one
  (more optionalRelease [.click "w1Sign.nav.w1Labs", .click "w1Labs.newServiceOrder",
    .enter "w1Labs.orderKind" (.code "imaging"), .enter "w1Labs.orderCode" (.code "70551"), .enter "w1Labs.priorAuthRequest" (.flag true)]
    canonicalV2 adult physician specV2)
  (.click "w1Labs.requestServicePriorAuth") canonicalV2 adult physician specV2
#guard mixedServicePa.2 == .ignored
#guard mixedServicePa.1.currentSlot == 1
#guard serviceOrderAt mixedServicePa.1 1
#guard (orderLines mixedServicePa.1).length == 1
#guard (cap mixedServicePa.1 "priorAuthRequest" 1).map (·.value) == some (.flag true)

-- A request click cannot forge the never-policy human entry.
#guard reason (one (run [.click "home.work.w1Rooming", .click "w1Rooming.nav.w1Labs",
  .enter "w1Labs.orderKind" (.code "imaging"), .enter "w1Labs.orderCode" (.code "70551")]
  canonicalV2 adult physician specV2) (.click "w1Labs.requestServicePriorAuth")
  canonicalV2 adult physician specV2).2 == "human entry required: priorAuthRequest"
#guard (cap servicePa.1 "priorAuthRequest").any (·.byHuman)

-- v3 has teeth: the old UI still reaches sign, but cannot meet the new entry.
#guard reason (one (run amoxPath canonicalV2 adult physician specV3)
  (.click "w1Sign.commit.signOrders") canonicalV2 adult physician specV3).2 == "entry required: abxIndication"
/-- Confirm v3 antibiotic defaults on the appropriate composer before sign. -/
def confirmBeforeSign (es : List Event) (screen : String) : List Event := es.flatMap fun e =>
  if e == .click (cid screen "toSign") then [.confirm (cid screen "abxIndication"), e] else [e]
/-- W1 antibiotic preference defaults remain pending until a human confirms. -/
def w1V3 : State := run (confirmBeforeSign amoxPath "w1Orders") canonicalV3 adult physician specV3
#guard (cap w1V3 "abxIndication").any fun x => x.confirmed && !x.byHuman && x.provenance? == some "macro"
#guard (finish w1V3 "w1Sign" "signOrders" canonicalV3 adult physician specV3).commits == ["signOrders"]
#guard !(cap (run amoxPath canonicalV3 adult physician specV3) "abxIndication").any (·.confirmed)
#guard (finish (run amoxPath canonicalV3 adult physician specV3) "w1Sign" "signOrders"
  canonicalV3 adult physician specV3).commits == []
/-- Pediatric antibiotic path uses the same NP confirmation. -/
def w5V3 : State := run (confirmBeforeSign w5Path "w5Orders") canonicalV3 child np specV3
#guard (finish w5V3 "w5Sign" "signOrders" canonicalV3 child np specV3).commits == ["signOrders"]
/-- Pre-op surgeon explicitly chooses surgical prophylaxis. -/
def preOpV3 : State := run (preOpPath.flatMap fun e =>
  if e == .click "w6Orders.toSign" then
    [.enter "w6Orders.abxIndication" (.code "surgical-prophylaxis"), e] else [e])
  canonicalV3 preOpFacts surgeon specV3
#guard (finish preOpV3 "w6Sign" "signOrders" canonicalV3 preOpFacts surgeon specV3).commits == ["signOrders"]
/-- ED sepsis set: both antibiotic rows get defaults; both need confirmation. -/
def sepsisPath : List Event :=
  [.click "home.work.w3TrackBoard", .click "w3TrackBoard.open",
   .enter "w3Triage.weight" (.qty 700 .kg), .click "w3Triage.nav.w3OrderSets", .click "w3OrderSets.sepsis"] ++
  [10, 11].flatMap (fun n => confirmLine "w3OrderSets" (rowPrefix n)) ++
  [.confirm "w3OrderSets.row10.abxIndication", .click "w3OrderSets.toSign"] ++ enter "w3Sign"
    [("dosingWeight", .qty 700 .kg), ("patientIdReentry", .text "RK/M/58")]
/-- Deliberately leave line 11 unconfirmed. -/
def sepsisMissing : State := run sepsisPath canonicalV3 hospital physician specV3
#guard (cap sepsisMissing "abxIndication" 10).any (·.confirmed)
#guard !(cap sepsisMissing "abxIndication" 11).any (·.confirmed)
#guard (finish sepsisMissing "w3Sign" "signOrders" canonicalV3 hospital physician specV3).commits == []
/-- Confirm the second antibiotic in the same episode. -/
def sepsis : State := more sepsisMissing
  [.click "w3Sign.nav.w3OrderSets", .confirm "w3OrderSets.row11.abxIndication", .click "w3OrderSets.toSign"]
  canonicalV3 hospital physician specV3
#guard (finish sepsis "w3Sign" "signOrders" canonicalV3 hospital physician specV3).commits == ["signOrders"]
-- Non-antibiotic post-op set and ordinary orders do not acquire an abx obligation.
#guard (finish (run postOpPath canonicalV3 hospital surgeon specV3) "w6Sign" "signOrders"
  canonicalV3 hospital surgeon specV3).commits == ["signOrders"]
#guard (finish (run w1Path canonicalV3 adult physician specV3) "w1Sign" "signOrders"
  canonicalV3 adult physician specV3).commits == ["signOrders"]

/-- MAR episode carries the signed antibiotic's indication as a named fact.
The named fact supplies the indication for the administration display. -/
def antibioticAdminFacts : Facts :=
  { adminFacts "cefazolin" with record := [("abxIndication", "surgical-prophylaxis")] }
/-- Old MAR lacks the newly required indication display. -/
def oldMar : State := run (adminPath "cefazolin") canonicalV2 antibioticAdminFacts nurse specV3
#guard reason (one oldMar (.click "w4Admin.commit.administerMed")
  canonicalV2 antibioticAdminFacts nurse specV3).2 == "review required: abxIndication must be shown"
/-- v3 places it beside the dose, always open. -/
def newMar : State := run (adminPath "cefazolin") canonicalV3 antibioticAdminFacts nurse specV3
#guard infoShown specV3 canonicalV3 antibioticAdminFacts newMar "abxIndication"
#guard (finish newMar "w4Admin" "administerMed" canonicalV3 antibioticAdminFacts nurse specV3).commits == ["administerMed"]
/-- Regression for the first failed migration: collapsed indication drawer. -/
def collapsedMar : Program := canonicalV3.updateScreen "w4Admin" fun s =>
  (s.insertAfter "w4Admin.dose" [group s.id "details" "Details" (startCollapsed := true)])
    |>.updateComp "w4Admin.antibioticIndication" fun c => { c with parent? := some "w4Admin.details" }
#guard reason (one (run (adminPath "cefazolin") collapsedMar antibioticAdminFacts nurse specV3)
  (.click "w4Admin.commit.administerMed") collapsedMar antibioticAdminFacts nurse specV3).2 ==
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
#guard (finish (run ([.click "home.work.w6Schedule", .click "w6Schedule.openCase"] ++ preOpPath.drop 1)
    (forPersona specV1 canonicalV1 "P5" .surgeon) preOpFacts surgeon)
  "w6Sign" "signOrders" (forPersona specV1 canonicalV1 "P5" .surgeon) preOpFacts surgeon).commits == ["signOrders"]

-- Every added artifact action still completes after optional and stewardship
-- releases, using human values on the actual inherited canonical screens.
#guard [(specV2, canonicalV2), (specV3, canonicalV3)].all fun (sp, p) =>
  newArtifacts.all fun (screen, commit) =>
    (artifactWalk screen commit p (sp := sp)).commits.contains commit

-- The new prescribing variants inherit v3's antibiotic gate too. The old
-- optional release cannot satisfy it; the actual v3 composer can.
#guard !(artifactWalk "w1ScheduleIISeries" "signScheduleIISeries" canonicalV2
  "cefazolin" specV3).commits.contains "signScheduleIISeries"
#guard (artifactWalk "w1ScheduleIISeries" "signScheduleIISeries" canonicalV3
  "cefazolin" specV3).commits == ["signScheduleIISeries"]
#guard Specs.V1.issuanceCommits.all fun k => canonicalV3.screens.all fun s =>
  !(s.components.any (fun c => c.kind == .button (.commit k))) ||
    s.components.any (fun c => c.kind == .table "abxIndication" && c.parent? == none)

-- Every feature action remains completable with the inherited payload/clock contracts.
#guard featureArtifactsComplete canonicalV2 specV2
#guard featureArtifactsComplete canonicalV3 specV3
#guard specV2.displays? == specV1.displays? && specV3.displays? == specV1.displays?
end Ehr.Canonical.Tests
