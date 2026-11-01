import Ehr.Canonical.Builders

/-!
# W2: results in-basket (P1)

In-basket → open the result (detail and trend) → message the patient (a
separate screen) → acknowledge and mark done.

Deliberate friction: the patient message is on its own screen and the user
must come back to acknowledge; all prior results and notes are one tab away.
Kept: the result and, when abnormal, its trend are on the acknowledge screen.
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
    components := frame s ++ [
      { table s "folders" "inBasketFolders" "In Basket folders" with tag := "present.folderList" },
      searchC s "basketSearch" "inbasket" "Search In Basket",
      { table s "items" "inBasketResults" "Results messages" with tag := "present.messages" },
      clinicalSection s "selected" "Selected result message",
      panel s "preview" "messagePreview" "Message details" (parent := some "selected"),
      goto s "openResult" "w2Result" "Review result" (parent := some "selected"),
      goto s "refills" "w7Queue" "Rx Requests"
    ] }

/-- The result: detail and trend on screen, the decision, an optional follow-up
test, and Acknowledge. -/
def result : Screen :=
  let s := "w2Result"
  { id := s, title := "Result Review", workflow := "W2"
    components := frame s ++ [
      { table s "detail" "resultDetail" "Result details and reference ranges" with tag := "present.results" },
      { trend s "trend" "resultTrend" "Result trend" with tag := "present.trend" },
      { table s "trendValues" "resultTrend" "Dated values" with tag := "present.table" },
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
