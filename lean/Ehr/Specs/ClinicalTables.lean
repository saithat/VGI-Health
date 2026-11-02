import Ehr.Core.Types

/-!
Schemas for clinical display data supplied by the record adapter.
These optional views retain existing signing and review requirements.
They do not create clinical rows, doses, percentiles or completion evidence.
-/
namespace Ehr.Specs.ClinicalTables

/-- Note rows retain author, encounter, status, narrative and source dates. -/
def encounterNotes : InfoSpec :=
  { id := "encounterNotes", label := "Notes", version := "notesVersion",
    payload? := some { rowFields := ["date", "type", "author", "encounter",
      "title", "text", "status", "sourceDate", "shiftDays"] } }

/-- History rows keep their source and are grouped by kind. -/
def importedHistory : InfoSpec :=
  { id := "importedHistory", label := "History", version := "historyVersion",
    payload? := some { rowFields := ["kind", "item", "detail", "status", "source"], groupBy? := some "kind" } }

/-- Optional supporting views in the blueprint's clinical reading order. -/
def infos : List InfoSpec :=
  [encounterNotes, importedHistory,
   { id := "inBasketMessages", label := "Patient Messages", version := "inbasketVersion" },
   { id := "orSchedule", label := "OR Schedule", version := "scheduleVersion" },
   { id := "consultList", label := "Surgical consults", version := "caseVersion" },
   { id := "shiftTasks", label := "Selected patient shift tasks", version := "" },
   { id := "unitCensus", label := "Unit Census", version := "encounterVersion" },
   { id := "inBasketFolders", label := "In Basket folders", version := "inbasketVersion" },
   { id := "inBasketResults", label := "Results messages", version := "inbasketVersion" },
   { id := "inBasketRxRequests", label := "Rx Requests", version := "inbasketVersion" },
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
