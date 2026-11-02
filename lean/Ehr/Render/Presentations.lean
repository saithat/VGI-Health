import Ehr.Render.UiData

/-! Structured clinical layouts retain their complete ordinary info child.
Only Lean reads source records and assigns clinical statuses. -/
namespace Ehr.Render

/-- The public tag names are stable; unknown tags keep the ordinary info layout. -/
def UiPresentationKind.tag : UiPresentationKind → String
  | .table => "table" | .schedule => "schedule" | .trackBoard => "trackBoard"
  | .orSchedule => "orSchedule" | .worklist => "worklist" | .timeGrid => "timeGrid"
  | .flowsheet => "flowsheet" | .folderList => "folderList" | .messages => "messages"
  | .results => "results" | .trend => "trend" | .growth => "growth" | .notes => "notes"

/-- All supported clinical presentations, in stable contract order. -/
def presentationKinds : List UiPresentationKind :=
  [.table, .schedule, .trackBoard, .orSchedule, .worklist, .timeGrid, .flowsheet,
   .folderList, .messages, .results, .trend, .growth, .notes]

/-- Explicit tags override default presentations for the known clinical info IDs. -/
def presentationKind? (tag info : String) : Option UiPresentationKind :=
  (presentationKinds.find? (fun k => tag == "present." ++ k.tag ||
    tag.endsWith (".present." ++ k.tag))).orElse fun _ =>
    match info with
    | "schedule" | "appointmentSchedule" => some .schedule
    | "trackBoard" => some .trackBoard
    | "orSchedule" => some .orSchedule
    | "worklist" => some .worklist
    | "mar" | "medicationAdministration" => some .timeGrid
    | "flowsheet" => some .flowsheet
    | "inBasketFolders" => some .folderList
    | "inBasketMessages" => some .messages
    | "labs" | "labResults" => some .results
    | "resultTrend" => some .trend
    | "growthChart" => some .growth
    | "encounterNotes" | "priorNotes" => some .notes
    | _ => none

/-- Add a transparent layout wrapper without changing the underlying info. -/
def uiWrapInfo (kind : Option UiPresentationKind) (node : UiNode) : UiNode :=
  match kind with | none => node | some k => .presentation k [node]

/-- A normal group can explicitly request the existing semantic column container. -/
def uiColumnTag (tag : String) : Bool :=
  tag == "layout.columns" || tag.endsWith ".layout.columns"

/-- An explicit overview hint omits only automatic chart-side summaries. -/
def uiOverviewTag (tag : String) : Bool :=
  let parts := tag.splitOn "."
  (parts.zip parts.tail).any (fun (a, b) => a == "layout" && b == "overview")

/-- A proof-admitted timeline is a layout choice on an ordinary expanded group. -/
def uiTimelineTag (tag : String) : Bool :=
  tag == "layout.timeline" || tag.endsWith ".layout.timeline"

/-- Timeline children retain complete source order, without sorting or filtering. -/
def uiTimelineChildren (tag : String) (children : List UiNode) : List UiNode :=
  if uiTimelineTag tag then [.timeline "Clinical timeline" children] else children

/-- Columns change layout only; every child remains present in source order. -/
def uiColumnChildren (tag : String) (children : List UiNode) : List UiNode :=
  if uiColumnTag tag then [.columns (uiTimelineChildren tag children)]
  else uiTimelineChildren tag children

/-- An explicit row tag names an info component and zero-based source row. -/
def uiRowTarget? (tag : String) : Option (CompId × Nat) := do
  if tag == "" then none else match tag.splitOn "|" with
  | [head, target, row] =>
    if !(head == "present.row" || head.endsWith ".present.row") || target == "" then none
    else
      let index ← row.toNat?
      if index ≤ 9007199254740991 then some (target, index) else none
  | _ => none

/-- The original semantic control is retained with all of its event metadata. -/
def uiWrapRow (tag : String) (node : UiNode) : UiNode :=
  match uiRowTarget? tag with
  | some (target, row) => .rowAction target row [node]
  | none => node

/-- Clinical test codes distinguish identical labels only when necessary. -/
def labResultLabel (labels : List (String × String)) (r : LabResultRow) : String :=
  let name := if r.name == "" then "Laboratory result" else r.name
  if labels.any (fun (otherName, code) => otherName == r.name && code != r.code) then
    name ++ " (" ++ (if r.code == "" then "code not recorded" else r.code) ++ ")"
  else name

/-- Every displayed lab record uses its own source value, unit, interval and flag. -/
def labResultCells (labels : List (String × String)) (r : LabResultRow) : List (String × String) :=
  [("Test", labResultLabel labels r), ("Value", r.value), ("Unit", r.unit),
   ("Flag", r.flag), ("Range", r.refRange), ("Recorded", uiDate r.date), ("Status", r.status)]

/-- Human-facing schedule columns, without FHIR references or resource IDs. -/
def scheduleCells (r : ScheduleRow) : List (String × String) :=
  [("Time", uiDate r.time), ("Patient", r.patient), ("Age/sex", r.ageSex),
   ("Visit type", r.visitType), ("Status", r.status), ("Chief complaint", r.complaint),
   ("Provider", r.provider), ("Location", r.location)]

/-- Human-facing department board columns. Unavailable data stays empty. -/
def boardCells (r : BoardRow) : List (String × String) :=
  [("Room", r.room), ("Patient", r.patient), ("Age/sex", r.ageSex),
   ("Chief complaint", r.complaint), ("Acuity", r.acuity), ("Arrival", uiDate r.arrival),
   ("RN", r.nurse), ("Provider", r.provider), ("Disposition", r.disposition), ("Status", r.status)]

/-- Join only the referenced medication order; names alone do not identify orders. -/
def administrationFor (order : MarOrderRow) (a : AdministrationRow) : Bool :=
  order.id != "" && (a.orderId == order.id || a.orderId == "MedicationRequest/" ++ order.id)

/-- A MAR cell carries the exact recorded clock time; its column carries the date. -/
def marClock (s : String) : String :=
  if s.toList.length ≥ 16 && s.toList[10]? == some 'T'
  then uiChars (s.toList.drop 11 |>.take 5) else uiDate s

/-- Every documented administration detail remains visible in its time cell. -/
def administrationText (a : AdministrationRow) : String :=
  " · ".intercalate ([a.status, marClock a.time, a.dose, a.route, a.site, a.reason, a.performer].filter (· != ""))

/-- Recorded timestamps become time columns. Missing timestamps stay explicit. -/
def gridTime (s : String) : String := if s == "" then "Time not recorded" else uiDate s

/-- MAR columns use recorded hours. Exact administration times remain in the cell. -/
def gridHour (s : String) : String :=
  if s.toList.length ≥ 16 && s.toList[10]? == some 'T'
  then uiDate (uiChars (s.toList.take 13) ++ ":00:00") else gridTime s

/-- Fill only the axis between the first and last recorded hour on each day.
Empty axis cells are not scheduled doses or evidence of an administration. -/
def marTimeColumns (d : Display) : List String :=
  let times := (d.marOrders.flatMap (·.scheduled) ++ d.administrations.map (·.time)).filter
    (fun t => t.toList.length ≥ 16 && t.toList[10]? == some 'T')
  let days := ((times.map (fun t => uiChars (t.toList.take 10))).eraseDups).mergeSort (fun a b => decide (a ≤ b))
  days.flatMap fun day =>
    let hours := (times.filter (·.startsWith day)).filterMap
      (fun t => (uiChars (t.toList.drop 11 |>.take 2)).toNat?)
    match hours.head? with
    | none => []
    | some first =>
      let lo := hours.foldl min first
      let hi := min 23 (hours.foldl max first)
      (List.range (hi - lo + 1)).map fun n =>
        gridHour (day ++ "T" ++ (if lo + n < 10 then "0" else "") ++ toString (lo + n) ++ ":00:00")

/-- Each ordered medication with explicit schedule events and matching actual doses.
Unmatched actual administrations remain separate rows instead of disappearing. -/
def marCells (d : Display) : List (List (String × String)) :=
  (d.marOrders.map fun r =>
    [("Medication", r.medication), ("Dose", r.dose), ("Route", r.route),
     ("Frequency", r.frequency), ("Order status", r.status)] ++
    (marTimeColumns d).map (fun t => (t, "")) ++
    r.scheduled.map (fun t => (gridHour t, "Scheduled · " ++ marClock t)) ++
    (d.administrations.filter (administrationFor r)).map (fun a => (gridHour a.time, administrationText a))) ++
  (d.administrations.filter (fun a => !d.marOrders.any (administrationFor · a))).map fun a =>
    [("Medication", a.medication), ("Dose", a.dose), ("Route", a.route),
     ("Frequency", ""), ("Order status", ""), (gridHour a.time, administrationText a)]

/-- Labs retain their Results view; nursing collections use other source categories.
Legacy rows with no category and explicitly vital-sign results remain included. -/
def flowsheetObservation (r : ObservationRow) : Bool :=
  !r.categories.contains "laboratory" || r.categories.contains "vital-signs"

/-- Measures with different units remain different rows. Repeated observations
at the same timestamp remain repeated cells; no value is replaced by a lookup. -/
def flowsheetCells (d : Display) : List (List (String × String)) :=
  let observations := d.observations.filter flowsheetObservation
  let keys := (observations.map (fun r => (r.measure, r.unit))).eraseDups
  keys.map fun (measure, unit) =>
    [("Measure", measure), ("Unit", unit)] ++
    (observations.filter (fun r => r.measure == measure && r.unit == unit)).map
      (fun r => (gridTime r.time, r.value ++
        (if r.status == "" || r.status == "final" then "" else " · " ++ r.status)))

/-- New queue IDs accept an explicit trusted payload, otherwise typed FHIR rows.
A present empty payload stays empty; it does not silently fall back to chart data. -/
def structuredRows? (cx : Ctx) (info : InfoId) : Option (List (List (String × String))) :=
  if !(["schedule", "appointmentSchedule", "trackBoard", "orSchedule", "worklist", "mar",
    "medicationAdministration", "flowsheet", "inBasketFolders", "inBasketMessages"] : List String).contains info then none
  else if (infoPayload cx.facts info).isSome then
    match infoPayload cx.facts info with
    | none => some []
    | some p => some (((if p.fields.isEmpty then [] else [p.fields]) ++ p.rows.map (·.fields)).map
        (fun row => row.map (fun (key, value) => (key, uiDate value))))
  else some (match info with
    | "schedule" | "appointmentSchedule" => cx.disp.schedule.map scheduleCells
    | "trackBoard" => cx.disp.board.map boardCells
    | "mar" | "medicationAdministration" => marCells cx.disp
    | "flowsheet" => flowsheetCells cx.disp
    | _ => [])

/-- A concrete schedule tag selects the schedule presentation. -/
def scheduleTagExample : Option UiPresentationKind := presentationKind? "clinic.present.schedule" "custom"
#guard scheduleTagExample == some .schedule

/-- Missing schedule data is not replaced by an invented appointment. -/
theorem empty_mar_example : marCells Display.empty = [] := rfl

end Ehr.Render
