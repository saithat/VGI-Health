import Ehr.Canonical.Builders

/-!
W7: refill queue, chart review and decision.
The baseline separates review tabs and the decision screen, repeats review
actions and includes removable popups. Required labs remain at the decision;
last-visit and fill-history review may use an allowed receipt.
-/

namespace Ehr.Canonical.W7

open Ehr.Canonical

/-- The W7 workflow (the decision screen is reached from the review). -/
def nav : List (ScreenId × String) :=
  [("w2Inbox", "Results"), ("w7Queue", "Rx Requests")]

/-- The chart-history tabs on W7 screens. -/
def chart : List Block :=
  [(.table, "encounterHistory", "Encounters"), (.panel, "priorNotes", "Notes"),
   (.table, "labResults", "Results"), (.table, "currentMeds", "Medications"),
   (.table, "problemList", "Problems"), (.table, "allergyList", "Allergies"),
   (.table, "imaging", "Imaging")]

/-- The shell for a W7 screen. -/
def frame (s : ScreenId) : List Component := ambulatoryShell s nav chart "Inbox"

/-- The refill-request folder. -/
def queue : Screen :=
  let s := "w7Queue"
  { id := s, title := "Inbox: Rx Requests", workflow := "W7"
    components := ambulatoryInboxShell s nav chart ++ [
      { table s "folders" "inboxFolders" "Inbox folders" (parent := some "encounterWorkflow") with tag := "present.folderList" },
      { clinicalSection s "messages" "Rx Requests" (parent := some "inboxColumns") with tag := "present.messages" },
      { table s "items" "inboxRxRequests" "Requests" (parent := some "messages") with tag := "present.messages" },
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
      reviewBtn s "lastVisit" "Mark last visit reviewed" (parent := some "refillTabs") (tab := 0) (feedback := true),
      reviewBtn s "adherence" "Mark fill history reviewed" (parent := some "refillTabs") (tab := 2) (feedback := true),
      goto s "decide" "w7Decision" "Respond to request"
    ] }

/-- The refill decision: labs, last visit, and fill history on screen; the
decision fields; alerts; Approve. -/
def decision : Screen :=
  let s := "w7Decision"
  { id := s, title := "Rx Response", workflow := "W7"
    components := frame s ++ [
      panel s "request" "refillRequest" "Refill request",
      table s "comparison" "refillComparison" "Prescription response comparison",
      clinicalSection s "decisionGroup" "Prescription response",
      field s "refillDecision" "refillDecision" "Approve / deny / modify" (parent := some "decisionGroup"),
      field s "refillDose" "refillDose" "Dose (mg)" (parent := some "decisionGroup"),
      field s "refillQuantity" "refillQuantity" "Dispense quantity" (parent := some "decisionGroup"),
      field s "refillRefills" "refillRefills" "Refills" (parent := some "decisionGroup"),
      field s "refillPharmacy" "refillPharmacy" "Pharmacy" (parent := some "decisionGroup")
        (prefill := .fromRecord "requestPharmacy"),
      field s "refillProtocolMet" "refillProtocolMet" "Refill protocol criteria met"
        (parent := some "decisionGroup"),
      field s "refillDenyReason" "refillDenyReason" "Reason for denial (if denying)" (parent := some "decisionGroup"),
      field s "refillNote" "refillNote" "Note to pharmacy" (parent := some "decisionGroup"),
      { table s "labs" "relevantLabs" "Latest available labs" with tag := "present.results" },
      panel s "lastVisit" "lastVisit" "Last visit",
      table s "adherence" "adherence" "Fill history",
      alertC s "alert.interaction" "interactionRefill" "Severe interaction" (popup := false),
      alertC s "alert.activeRx" "activeRxPopup" "Active prescription exists" (popup := true),
      alertC s "alert.careGap" "refillCareGapPopup" "Patient has care gaps" (popup := true),
      commitBtn s "approveRefill" "Approve / Sign Rx",
      goto s "toReview" "w7Review" "Back to chart review"
    ] }

/-- The W7 macros (none in the canonical UI). -/
def macros : List Macro := []

/-- The W7 screens. -/
def screens : List Screen := [queue, review, decision]

end Ehr.Canonical.W7
