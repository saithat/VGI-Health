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
  [("w2Inbasket", "In-basket"), ("w2Result", "Result"), ("w2Message", "Message patient")]

/-- The chart-review tabs on W2 screens. -/
def chart : List Block :=
  [(.table, "labResults", "All results"), (.panel, "priorNotes", "Notes"),
   (.table, "encounterHistory", "Encounters"), (.table, "imaging", "Imaging")]

/-- The shell for a W2 screen. -/
def frame (s : ScreenId) : List Component := shell s nav clinicSidebar chart

/-- The in-basket: results, messages, and refill requests in one list. -/
def inbasket : Screen :=
  let s := "w2Inbasket"
  { id := s, title := "In-basket", workflow := "W2"
    components := frame s ++ [
      searchC s "basketSearch" "inbasket" "Search in-basket",
      table s "items" "inbasketItems" "Messages",
      panel s "preview" "messagePreview" "Selected message",
      goto s "openResult" "w2Result" "Open result",
      goto s "refills" "w7Queue" "Refill requests folder"
    ] }

/-- The result: detail and trend on screen, the decision, an optional follow-up
test, and Acknowledge. -/
def result : Screen :=
  let s := "w2Result"
  { id := s, title := "Result", workflow := "W2"
    components := frame s ++ [
      table s "detail" "resultDetail" "Result",
      trend s "trend" "resultTrend" "Trend",
      table s "trendValues" "resultTrend" "Dated values",
      field s "resultAction" "resultAction" "Action",
      field s "resultFollowUpOrder" "resultFollowUpOrder" "Follow-up test",
      goto s "message" "w2Message" "Message patient",
      commitBtn s "ackResult" "Acknowledge and mark done"
    ] }

/-- The patient message composer, with letter templates. -/
def message : Screen :=
  let s := "w2Message"
  { id := s, title := "Message patient", workflow := "W2"
    components := frame s ++ [
      panel s "detail" "resultDetail" "Result",
      macroBtn s "normalLetter" "w2NormalLetter" "Template: normal result",
      macroBtn s "repeatLetter" "w2RepeatLetter" "Template: repeat the test",
      field s "patientMessage" "patientMessage" "Message to patient",
      goto s "return" "w2Result" "Return to result"
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
