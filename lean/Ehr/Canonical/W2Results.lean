import Ehr.Canonical.Builders

/-!
W2: results in-basket, result review, patient message and acknowledgment.
The baseline puts the message on a separate screen and prior records in tabs.
The result and any required abnormal-result trend remain at acknowledgment.
-/

namespace Ehr.Canonical.W2

open Ehr.Canonical

/-- The W2 navigator. -/
def nav : List (ScreenId × String) :=
  [("w2Inbasket", "Results"), ("w7Queue", "Rx Requests")]

/-- The chart-review tabs on W2 screens. -/
def chart : List Block :=
  [(.table, "encounterHistory", "Encounters"), (.panel, "priorNotes", "Notes"),
   (.table, "labResults", "Results"), (.table, "currentMeds", "Medications"),
   (.table, "problemList", "Problems"), (.table, "allergyList", "Allergies"),
   (.table, "imaging", "Imaging")]

/-- The shell for a W2 screen. -/
def frame (s : ScreenId) : List Component := ambulatoryShell s nav chart "In Basket"

/-- The in-basket: results, messages, and refill requests in one list. -/
def inbasket : Screen :=
  let s := "w2Inbasket"
  { id := s, title := "In Basket: Results", workflow := "W2"
    components := ambulatoryInBasketShell s nav chart ++ [
      { table s "folders" "inBasketFolders" "In Basket folders" (parent := some "encounterNavigator") with tag := "present.folderList" },
      { clinicalSection s "messages" "Results messages" (parent := some "inBasketColumns") with tag := "present.messages" },
      { searchC s "basketSearch" "inbasket" "Search In Basket" with parent? := some (cid s "messages") },
      { table s "items" "inBasketResults" "Results" (parent := some "messages") with tag := "present.messages" },
      { table s "patientMessages" "inBasketMessages" "Patient Messages" (parent := some "messages") with tag := "present.messages" },
      clinicalSection s "selected" "Selected result message" (parent := some "messages"),
      panel s "preview" "messagePreview" "Message details" (parent := some "selected"),
      { goto s "openResult" "w2Result" "Review result" (parent := some "messages") with
        tag := "present.row|" ++ cid s "items" ++ "|0" }
    ] }

/-- The result: detail and trend on screen, the decision, an optional follow-up
test, and Acknowledge. -/
def result : Screen :=
  let s := "w2Result"
  { id := s, title := "Result Review", workflow := "W2"
    components := frame s ++ [
      { table s "detail" "resultDetail" "Result details and reference ranges" with tag := "present.results" },
      { trend s "trend" "resultTrend" "Result trend" with tag := "present.trend" },
      clinicalSection s "followup" "Result follow-up",
      field s "resultAction" "resultAction" "Clinical action" (parent := some "followup"),
      field s "resultFollowUpOrder" "resultFollowUpOrder" "Follow-up test (LOINC)" (parent := some "followup"),
      goto s "message" "w2Message" "Result Note / Message to patient" (parent := some "followup"),
      commitBtn s "ackResult" "Reviewed / Done"
    ] }

/-- The patient message composer, with letter templates. -/
def message : Screen :=
  let s := "w2Message"
  { id := s, title := "Result Note", workflow := "W2"
    components := frame s ++ [
      panel s "detail" "resultDetail" "Result",
      clinicalSection s "templates" "Result note templates",
      macroBtn s "normalLetter" "w2NormalLetter" "Normal result" (parent := some "templates"),
      macroBtn s "repeatLetter" "w2RepeatLetter" "Repeat test" (parent := some "templates"),
      clinicalSection s "draft" "Patient communication",
      field s "patientMessage" "patientMessage" "Message to patient" (parent := some "draft"),
      goto s "return" "w2Result" "Use message and return to result"
    ] }

/-- The W2 macros: letter templates. -/
def macros : List Macro := [
  textMacro "w2NormalLetter" "Template: normal result"
    [(cid "w2Message" "patientMessage",
      "Your recent test result is within the expected range. No changes are needed. Please keep your next scheduled appointment.")],
  textMacro "w2RepeatLetter" "Template: repeat the test"
    [(cid "w2Message" "patientMessage",
      "Your recent test result is outside the expected range. Please repeat the test in 2 weeks; an order has been placed. Call the clinic with any questions.")]
]

/-- The W2 screens. -/
def screens : List Screen := [inbasket, result, message]

end Ehr.Canonical.W2
