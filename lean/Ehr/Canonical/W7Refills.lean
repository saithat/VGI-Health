import Ehr.Canonical.Builders

/-!
# W7: refill requests (P1)

Refill folder → open the request (chart review with last visit, labs, fill
history, and the last note on separate tabs) → decision screen → Approve.

Deliberate friction: the review screen buries each item one tab away, with its
own "mark reviewed" button; then a separate decision screen; a refill protocol
checkbox; two removable popups ("active prescription exists", "care gaps").
Kept: the relevant labs are on the decision screen; the last visit and fill
history are there too (or covered by a receipt).
-/

namespace Ehr.Canonical.W7

open Ehr.Canonical

/-- The W7 navigator (the decision screen is reached from the review). -/
def nav : List (ScreenId × String) :=
  [("w2Inbasket", "Results"), ("w7Queue", "Rx Requests")]

/-- The chart-review tabs on W7 screens. -/
def chart : List Block :=
  [(.table, "encounterHistory", "Encounters"), (.panel, "priorNotes", "Notes"),
   (.table, "labResults", "Results"), (.table, "currentMeds", "Medications"),
   (.table, "problemList", "Problems"), (.table, "allergyList", "Allergies"),
   (.table, "imaging", "Imaging")]

/-- The shell for a W7 screen. -/
def frame (s : ScreenId) : List Component := ambulatoryShell s nav chart "In Basket"

/-- The refill-request folder. -/
def queue : Screen :=
  let s := "w7Queue"
  { id := s, title := "In Basket: Rx Requests", workflow := "W7"
    components := ambulatoryInBasketShell s nav chart ++ [
      { table s "folders" "inBasketFolders" "In Basket folders" (parent := some "encounterNavigator") with tag := "present.folderList" },
      { clinicalSection s "messages" "Rx Requests" (parent := some "inBasketColumns") with tag := "present.messages" },
      { table s "items" "inBasketRxRequests" "Requests" (parent := some "messages") with tag := "present.messages" },
      clinicalSection s "selected" "Selected refill request" (parent := some "messages"),
      panel s "request" "refillRequest" "Requested prescription" (parent := some "selected"),
      { goto s "open" "w7Review" "Review request" (parent := some "messages") with
        tag := "present.row|" ++ cid s "items" ++ "|0" }
    ] }

/-- Chart review for the refill: each item on its own tab. -/
def review : Screen :=
  let s := "w7Review"
  { id := s, title := "Request Review", workflow := "W7"
    components := frame s ++ [
      panel s "request" "refillRequest" "Refill request"] ++
      tabStrip s "refillTabs" "Patient reports"
        [(.panel, "lastVisit", "Last visit"), (.table, "relevantLabs", "Labs"),
         (.table, "adherence", "Fill history"), (.table, "currentMeds", "Medications"),
         (.panel, "priorNotes", "Last note")] ++ [
      reviewBtn s "lastVisit" "Mark last visit reviewed" (parent := some "refillTabs") (tab := 0),
      reviewBtn s "adherence" "Mark fill history reviewed" (parent := some "refillTabs") (tab := 2),
      goto s "decide" "w7Decision" "Respond to request"
    ] }

/-- The refill decision: labs, last visit, and fill history on screen; the
decision fields; alerts; Approve. -/
def decision : Screen :=
  let s := "w7Decision"
  { id := s, title := "Rx Response", workflow := "W7"
    components := frame s ++ [
      table s "comparison" "refillComparison" "Requested / current / proposed",
      panel s "request" "refillRequest" "Refill request",
      { table s "labs" "relevantLabs" "Relevant labs" with tag := "present.results" },
      panel s "lastVisit" "lastVisit" "Last visit",
      table s "adherence" "adherence" "Fill history",
      alertC s "alert.interaction" "interactionRefill" "Severe interaction" (popup := false),
      alertC s "alert.activeRx" "activeRxPopup" "Active prescription exists" (popup := true),
      alertC s "alert.careGap" "refillCareGapPopup" "Patient has care gaps" (popup := true),
      clinicalSection s "decisionGroup" "Prescription response",
      field s "refillDecision" "refillDecision" "Approve / deny / modify" (parent := some "decisionGroup"),
      field s "refillDose" "refillDose" "Dose (mg)" (parent := some "decisionGroup"),
      field s "refillQuantity" "refillQuantity" "Dispense quantity" (parent := some "decisionGroup"),
      field s "refillRefills" "refillRefills" "Refills" (parent := some "decisionGroup"),
      field s "refillPharmacy" "refillPharmacy" "Pharmacy" (parent := some "decisionGroup")
        (prefill := .fromRecord "requestPharmacy"),
      field s "refillProtocolMet" "refillProtocolMet" "Refill protocol criteria met"
        (parent := some "decisionGroup"),
      field s "refillDenyReason" "refillDenyReason" "Reason for denial" (parent := some "decisionGroup"),
      field s "refillNote" "refillNote" "Note to pharmacy" (parent := some "decisionGroup"),
      commitBtn s "approveRefill" "Approve / Sign Rx",
      goto s "toReview" "w7Review" "Back to chart review"
    ] }

/-- The W7 macros (none in the canonical UI). -/
def macros : List Macro := []

/-- The W7 screens. -/
def screens : List Screen := [queue, review, decision]

end Ehr.Canonical.W7
