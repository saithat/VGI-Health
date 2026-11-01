import Ehr.Core.Types

/-! Blueprint display schemas. These describe clinical adapter data, never
invent rows, computed percentiles, doses or completion state. Existing mandatory
review/display contracts are retained. The new optional views add no signature,
waiver, receipt or safety rule. Adapter/row-coverage integration is CR-16/17. -/
namespace Ehr.Specs.ClinicalTables

def encounterNotes : InfoSpec :=
  { id := "encounterNotes", label := "Notes", version := "notesVersion",
    payload? := some { rowFields := ["date", "type", "author", "encounter",
      "title", "text", "status", "sourceDate", "shiftDays"] } }

def importedHistory : InfoSpec :=
  { id := "importedHistory", label := "History", version := "historyVersion",
    payload? := some { rowFields := ["kind", "item", "detail", "status", "source"], groupBy? := some "kind" } }

/-- Optional supporting views in the blueprint's clinical reading order. -/
def infos : List InfoSpec :=
  [encounterNotes, importedHistory,
   { id := "orderCatalog", label := "Order catalog", version := "formularyVersion",
     payload? := some { rowFields := ["name", "strength", "form", "route", "formularyStatus"] } },
   { id := "messagePreview", label := "Selected message", version := "inbasketVersion",
     payload? := some { fields := [{ field := "subject" }, { field := "context" }, { field := "received" }], identifiers := [.patient] } },
   { id := "flowsheetHistory", label := "Flowsheet history", version := "vitalsVersion",
     payload? := some { rowFields := ["measure", "unit", "observedAt", "enteredAt", "value", "source"], groupBy? := some "band" } },
   { id := "surgicalChecklist", label := "Surgical safety", version := "caseVersion",
     payload? := some { rowFields := ["phase", "check", "status", "performedAt", "performer"], groupBy? := some "phase" } },
   { id := "dischargeChecklist", label := "Discharge review", version := "encounterVersion",
     payload? := some { rowFields := ["phase", "task", "status", "source"], groupBy? := some "phase" } },
   { id := "noteSummary", label := "Note review", version := "noteVersion",
     payload? := some { fields := [{ field := "hpi" }, { field := "ros" }, { field := "exam" }, { field := "plan" }] } },
   { id := "scheduleTasks", label := "Today's work", version := "scheduleVersion",
     payload? := some { rowFields := ["time", "patient", "identifier", "task", "status"] } },
   { id := "refillComparison", label := "Prescription comparison", version := "refillVersion",
     payload? := some { rowFields := ["detail", "requested", "current", "proposed", "source"] } }]

/-- Complete clinical columns for existing views. A MAR row is one medication
and scheduled-time cell; no scan or administration is implied by displaying it. -/
def columns : List (InfoId × List String × Option String) :=
  [("priorNotes", ["date", "type", "author", "encounter", "title", "text", "status", "sourceDate", "shiftDays"], none),
   ("orderSummary", ["line", "action", "order", "dose", "unit", "route", "frequencyPrn",
     "timingDuration", "quantityRefills", "indicationDiagnosis", "destination", "status"], none),
   ("resultDetail", ["test", "value", "unit", "flag", "referenceRange", "collectedAt", "resultedAt", "status"], none),
   ("resultTrend", ["test", "date", "value", "unit"], none),
   ("inbasketItems", ["priority", "status", "received", "patient", "identifier", "subject", "sender", "owner"], none),
   ("edTrackBoard", ["room", "acuity", "patient", "identifier", "complaint", "arrival", "lengthOfStay",
      "physician", "nurse", "allergies", "isolation", "labs", "imaging", "disposition"], none),
   ("marSchedule", ["medication", "dose", "unit", "route", "frequency", "scheduledAt", "status", "actualAt", "reason"], some "category"),
   ("doseCheck", ["drug", "weightKg", "measuredAt", "basis", "mgPerDose", "frequency", "dailyMg", "range", "maximum"], none),
   ("growthChart", ["observedAt", "ageMonths", "measure", "value", "unit", "reference", "percentileStatus"], none)]

/-- Preserve any pre-existing payload obligation; fill only previously absent
schemas. Displaying unavailable data never manufactures trusted evidence. -/
def withSchema (info : InfoSpec) : InfoSpec :=
  if info.payload?.isSome then info else
  match columns.find? (·.1 == info.id) with
  | none => info
  | some (_, fields, groupBy) => { info with payload? := some { rowFields := fields, groupBy? := groupBy } }
end Ehr.Specs.ClinicalTables
