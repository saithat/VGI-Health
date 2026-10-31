import Ehr.Core.View
import Ehr.Examples.Tiny

/-!
# Interpreter tests on the tiny example

Each test runs a short click path through the real interpreter and checks the
result with `#guard` (the build fails if a check is false).
-/

namespace Ehr.Examples.TinyTests

open Ehr Ehr.Examples.Tiny

/-- The initial state. -/
def s0 : State := init spec program facts user

/-- Run human events from a state. -/
def run (s : State) (es : List Event) (f : Facts := facts) (p : Program := program)
    (u : User := user) : State :=
  runAll spec p f u .human s es

/-- One human step. -/
def stepH (s : State) (e : Event) (f : Facts := facts) (p : Program := program)
    (u : User := user) : State × StepResult :=
  step spec p f u .human s e

/-- The result is `blocked`. -/
def isBlocked : StepResult → Bool
  | .blocked _ => true
  | _ => false

/-- The reason of a `blocked` result (empty otherwise). -/
def reason : StepResult → String
  | .blocked r => r
  | _ => ""

/-- The captured value for an element on a slot. -/
def cap (s : State) (e : ElementId) (n : Nat := 0) : Option Captured :=
  s.captured.find? fun x => x.element == e && x.slot == n

/-! ## Initial state and prefill -/

-- Weight is prefilled from the record, with provenance, awaiting a confirm.
#guard s0.screen == "rooming"
#guard (cap s0 "weight").map (·.value) == some (.qty 200 .kg)
#guard (cap s0 "weight").map (·.confirmed) == some false
#guard (cap s0 "weight").bind (·.provenance?) == some "record:weightToday"

/-- An order for `drug` with `dose` (tenths of mg), ending on the sign screen
with the patient ID typed. Allergies are still on the closed tab. -/
def toSign (drug : String) (dose : Nat) : List Event :=
  [.confirm "weightField", .click "toOrder",
   .enter "drugField" (.code drug), .enter "doseField" (.qty dose .mg),
   .click "toSign", .enter "patientIdField" (.text "JD/F/34")]

/-- At the sign screen with an acetaminophen 300 mg order (no allergy). -/
def atSign : State := run s0 (toSign "acetaminophen" 3000)

#guard atSign.screen == "sign"

/-! ## Test 1: allergies hidden in a closed tab block the commit -/

#guard isBlocked (stepH atSign (.click "signButton")).2
#guard reason (stepH atSign (.click "signButton")).2 ==
  "review required: allergyList must be shown or covered by a valid receipt"
#guard (stepH atSign (.click "signButton")).1.commits == []
-- The view agrees: the sign button is blocked, the allergy panel is not shown.
#guard ((view spec program facts user atSign).blocked.map (·.1)).contains "signButton"
#guard ((view spec program facts user atSign).items.find? (·.comp.id == "signAllergies")).map (·.shown)
  == some false

/-- The same state with the allergy tab opened. -/
def atSignTab : State := run atSign [.selectTab "signTabs" 1]

#guard ((view spec program facts user atSignTab).items.find? (·.comp.id == "signAllergies")).map (·.shown)
  == some true
#guard (stepH atSignTab (.click "signButton")).2 == .ok
#guard (stepH atSignTab (.click "signButton")).1.commits == ["signOrders"]
-- A second click on a done commit is ignored.
#guard (stepH (stepH atSignTab (.click "signButton")).1 (.click "signButton")).2 == .ignored

/-! ## Test 2: a valid receipt allows the commit; a stale version does not -/

/-- Facts with a prior allergy-review receipt at data version `v`. -/
def factsWithReceipt (v : Nat) : Facts :=
  { facts with receipts := [{ info := "allergyList", dataVersion := v, time := 590
                              role := .rn, user := "nurse1" }] }

/-- At the sign screen (tab closed) with the given facts. -/
def atSignWith (f : Facts) : State :=
  run (init spec program f user) (toSign "acetaminophen" 3000) (f := f)

-- Current version (3): the commit goes through without opening the tab.
#guard (stepH (atSignWith (factsWithReceipt 3)) (.click "signButton") (f := factsWithReceipt 3)).2 == .ok
-- Stale version (2): blocked.
#guard isBlocked (stepH (atSignWith (factsWithReceipt 2)) (.click "signButton") (f := factsWithReceipt 2)).2
-- Too old (time window is 720 minutes): blocked.
#guard isBlocked
  (stepH (atSignWith { factsWithReceipt 3 with now := 590 + 721 }) (.click "signButton")
    (f := { factsWithReceipt 3 with now := 590 + 721 })).2
-- A receipt made in this episode (allergies shown during rooming) also works.
#guard (stepH (run s0 (.click "reviewAllergies" :: toSign "acetaminophen" 3000)) (.click "signButton")).2 == .ok
-- Marking reviewed is refused where the info is not shown.
#guard isBlocked
  (stepH (atSign) (.click "reviewAllergies")).2 ||
  (stepH (atSign) (.click "reviewAllergies")).2 == .ignored

/-! ## Test 3: a macro stops at a human-only step -/

/-- On the order screen, before any order. -/
def atOrder : State := run s0 [.confirm "weightField", .click "toOrder"]

/-- The result of clicking the macro button. -/
def afterMacro : State × StepResult := stepH atOrder (.click "quickAmox")

#guard reason afterMacro.2 == "macro stopped at step 3: human only: patientIdReentry"
#guard afterMacro.1.screen == "sign"
-- The macro filled the order, but its values wait for a human confirm.
#guard (cap afterMacro.1 "drug").map (·.value) == some (.code "amoxicillin")
#guard (cap afterMacro.1 "drug").map (·.confirmed) == some false
#guard (cap afterMacro.1 "drug").map (·.byHuman) == some false
-- It did not type the patient ID and did not commit.
#guard cap afterMacro.1 "patientIdReentry" == none
#guard afterMacro.1.commits == []
-- Macro-level events are refused directly too.
#guard isBlocked (step spec program facts user .«macro» atSignTab (.click "signButton")).2
#guard isBlocked (step spec program facts user .«macro» s0 (.confirm "weightField")).2
#guard isBlocked (step spec program facts user .«macro» atSign (.enter "patientIdField" (.text "JD/F/34"))).2

/-! ## Test 4: a prefill on a `never` element is ignored -/

/-- A bad program: the patient-ID field is prefilled with a default. -/
def badPrefillProgram : Program :=
  { program with screens := program.screens.map fun sc =>
      { sc with components := sc.components.map fun c =>
          if c.id == "patientIdField" then
            { c with kind := .field "patientIdReentry" (.fixed 0) (.default "JD/F/34") }
          else c } }

/-- On the sign screen of the bad program, nothing typed. -/
def atSignBad : State :=
  run (init spec badPrefillProgram facts user)
    [.confirm "weightField", .click "toOrder", .click "toSign"] (p := badPrefillProgram)

#guard atSignBad.screen == "sign"
#guard cap atSignBad "patientIdReentry" == none

/-! ## Test 5: a weight in lb does not satisfy a kg requirement -/

/-- Like `atSignTab`, but the weight was typed in lb. -/
def atSignLb : State :=
  run s0 ([.enter "weightField" (.qty 440 .lb)] ++ (toSign "acetaminophen" 3000).drop 1 ++
          [.selectTab "signTabs" 1])

#guard (cap atSignLb "weight").map (·.value) == some (.qty 440 .lb)
#guard reason (stepH atSignLb (.click "signButton")).2 == "invalid value: weight (must be in kg)"
#guard (stepH atSignLb (.click "signButton")).1.commits == []
-- The weight-in-lb condition fires.
#guard alertKeys facts atSignLb .weightInLb == ["weight"]

/-! ## Test 6: an interruptive alert pops up once; after ack it does not re-pop (A3) -/

/-- At the sign screen, tab open, with an amoxicillin 500 mg order (the patient
is allergic to penicillins). -/
def atSignAmox : State := run s0 (toSign "amoxicillin" 5000 ++ [.selectTab "signTabs" 1])

/-- First click on Sign: the alert pops up. -/
def popped : State × StepResult := stepH atSignAmox (.click "signButton")

#guard popped.2 == .blocked "alert"
#guard popped.1.popup? == some ("drugAllergy", "amoxicillin@3")
#guard popped.1.commits == []
-- While the popup is open, nothing else is accepted, and nothing is enabled.
#guard isBlocked (stepH popped.1 (.click "signButton")).2
#guard (view spec program facts user popped.1).enabled == []
-- Acknowledge, then sign: no second popup, and the commit goes through.
def acked : State × StepResult := stepH popped.1 (.ack "drugAllergy")
#guard acked.2 == .ok
#guard acked.1.popup? == none
#guard acked.1.acked == [("drugAllergy", "amoxicillin@3")]
#guard (stepH acked.1 (.click "signButton")).2 == .ok
#guard (stepH acked.1 (.click "signButton")).1.popup? == none
#guard (stepH acked.1 (.click "signButton")).1.commits == ["signOrders"]
-- A new allergy version is a new key: the alert may fire again.
#guard popupCandidates spec program { facts with allergyVersion := 4 } acked.1 "signOrders" ==
  [("drugAllergy", "amoxicillin@4")]

/-! ## Test 7: a passive alert never pops up (A4) -/

-- The care-gap alert is shown inline on the order screen and fires…
#guard ((view spec program facts user atOrder).items.find? (·.comp.id == "careGapAlert")).map
  (fun i => (i.shown, i.firing)) == some (true, true)
-- …but it is never a popup candidate, and no step of the run pops it up.
#guard (popupCandidates spec program facts atSignAmox "signOrders").all (·.1 != "careGap")
#guard (runEvents spec program facts user .human s0
          (toSign "amoxicillin" 5000 ++ [.selectTab "signTabs" 1, .click "signButton",
           .ack "drugAllergy", .click "signButton"])).all
  (fun p => p.1.popup?.map (·.1) != some "careGap")
-- The drug–allergy alert component is not shown when its condition fails (A2).
#guard ((view spec program facts user atSignTab).items.find? (·.comp.id == "drugAllergyAlert")).map
  (·.shown) == some false

/-! ## Test 8: a cosign by the same user is rejected -/

/-- At the sign screen with a warfarin order (high-alert: a cosign is required). -/
def atSignWarfarin : State := run s0 (toSign "warfarin" 30 ++ [.selectTab "signTabs" 1])

#guard reason (stepH atSignWarfarin (.click "signButton")).2 == "entry required: cosigner"
#guard reason (stepH atSignWarfarin (.enter "cosignField" (.user "u1"))).2 ==
  "cosign must be a different user: cosigner"
#guard (stepH atSignWarfarin (.enter "cosignField" (.user "u2"))).2 == .ok
#guard (stepH (run atSignWarfarin [.enter "cosignField" (.user "u2")]) (.click "signButton")).2 == .ok

/-! ## Other checks -/

-- A wrong patient ID is refused.
#guard reason (stepH atSign (.enter "patientIdField" (.text "XX/M/50"))).2 ==
  "identity mismatch: patientIdReentry"
-- A dose out of range fires the dose condition (amoxicillin 2000 mg at 20 kg).
#guard alertKeys facts (run s0 (toSign "amoxicillin" 20000)) .doseOutOfRange == ["amoxicillin#0"]
#guard alertKeys facts atSignAmox .doseOutOfRange == []
-- A role that may not sign is refused.
#guard reason (stepH atSignTab (.click "signButton") (u := { id := "n1", role := .rn })).2 ==
  "role: rn may not enter patientIdReentry" ||
  isBlocked (stepH atSignTab (.click "signButton") (u := { id := "n1", role := .rn })).2
-- Back returns to the previous screen.
#guard (stepH atSign (.click "backButton")).1.screen == "order"
-- The view lists every component in order, with the banner first.
#guard ((view spec program facts user atSign).items.map (·.comp.id)).head? == some "banner"
#guard (view spec program facts user atSign).title == "Sign orders"
-- The patient-ID field is marked human-only in the view.
#guard ((view spec program facts user atSign).items.find? (·.comp.id == "patientIdField")).map
  (·.humanOnly) == some true

/-! ## California rules: naloxone risk (B&P §741) and CURES waiver (H&S §11165.4) -/

/-- A state with one order line: drug, dose (tenths of mg), and frequency. -/
def orderState (drug : String) (dose : Nat) (freq : Option String) : State :=
  { s0 with captured :=
      [{ element := "drug", slot := 0, value := .code drug, byHuman := true, confirmed := true },
       { element := "dose", slot := 0, value := .qty dose .mg, byHuman := true, confirmed := true }] ++
      match freq with
      | some f => [{ element := "freq", slot := 0, value := .code f, byHuman := true, confirmed := true }]
      | none => [] }

-- Oxycodone 30 mg q4h: 30 × 6 × 1.5 = 270 MME/day, at least 90: risk.
#guard whenHolds facts (orderState "oxycodone" 300 (some "q4h")) .naloxoneRisk
-- Oxycodone 5 mg q6h: 30 MME/day, no benzodiazepine: no risk.
#guard !whenHolds facts (orderState "oxycodone" 50 (some "q6h")) .naloxoneRisk
-- The same order with a current benzodiazepine: risk.
#guard whenHolds { facts with currentMedClasses := ["benzodiazepine"] }
  (orderState "oxycodone" 50 (some "q6h")) .naloxoneRisk
-- Tramadol 50 mg qid: 40 MME/day: no risk.
#guard !whenHolds facts (orderState "tramadol" 500 (some "qid")) .naloxoneRisk
-- Morphine 30 mg tid is exactly 90 MME/day: risk. 29 mg tid (87): no risk.
#guard whenHolds facts (orderState "morphine" 300 (some "tid")) .naloxoneRisk
#guard !whenHolds facts (orderState "morphine" 290 (some "tid")) .naloxoneRisk
-- An unknown or missing frequency counts as a risk (the stricter choice).
#guard whenHolds facts (orderState "oxycodone" 50 (some "prn")) .naloxoneRisk
#guard whenHolds facts (orderState "oxycodone" 50 none) .naloxoneRisk
-- Not an opioid: no risk.
#guard !whenHolds facts (orderState "amoxicillin" 5000 none) .naloxoneRisk
-- Per order line: the line's own dose and frequency are used.
#guard lineMatches facts (orderState "oxycodone" 300 (some "q4h")) .naloxoneRisk 0 "oxycodone"

/-- An allergy-list review that a documented reason can waive. -/
def waivableReview : ReviewReq :=
  { commit := "signOrders", info := "allergyList", mode := .shownOrReceipt 1440 [.physician]
    waivedBy? := some "curesReason" }

/-- `atSign` plus a reason value, entered by a human or not. -/
def withReason (byHuman : Bool) (reason : String := "CURES unavailable") : State :=
  { atSign with captured := atSign.captured ++
      [{ element := "curesReason", slot := 0, value := .text reason, byHuman, confirmed := true }] }

-- Not shown, no receipt, no reason: not met.
#guard !reviewMet spec program facts atSign waivableReview
-- A reason entered by a human meets it.
#guard reviewMet spec program facts (withReason true) waivableReview
-- A reason not entered by a human, or an empty reason, does not.
#guard !reviewMet spec program facts (withReason false) waivableReview
#guard !reviewMet spec program facts (withReason true "") waivableReview
-- Without `waivedBy`, a reason does nothing.
#guard !reviewMet spec program facts (withReason true) { waivableReview with waivedBy? := none }

end Ehr.Examples.TinyTests
