import Ehr.Render.Ui
import Ehr.Render.Fhir
import Ehr.Render.Dated

/-! New simulator spec surface, information-needs-v1. This does not change the
clinical rulebook. Data comes from the trusted patient projection, not labels or
an agent's proposed summary. Screen decoding is deliberately conservative. -/
namespace Ehr.Sim.Information
open Ehr Ehr.Render
abbrev Row := List (String × String)

inductive Gate
  | commit (id : CommitId)
  | entry (element : ElementId) (slot : Nat)
  deriving DecidableEq, Repr, Inhabited
inductive Authority
  | guidance | drugLabel | hospitalPolicy | simulationAssumption
  deriving DecidableEq, Repr, Inhabited
structure Source where
  authority : Authority
  citation : String
  /-- Operational windows and sequencing are assumptions even for sourced needs. -/
  «assumption» : String
  deriving DecidableEq, Repr, Inhabited
inductive Question
  | latest (measure unit : String) (windowMinutes : Nat)
  | trend (measure unit : String) (windowMinutes : Nat)
  | flagged (measure unit : String) (windowMinutes : Nat)
  | active (inventory : InfoId)
  | threshold (measure unit : String) (windowMinutes : Nat) (lowerTenths : Nat)
  deriving DecidableEq, Repr, Inhabited
structure Sample where
  code : String := ""
  measure : String
  heading : String := "Test"
  value : String
  unit : String
  /-- Absolute source minute. Date-only and malformed timestamps are unknown. -/
  minute : Int
  time : String
  flag : String
  deriving DecidableEq, Repr, Inhabited
structure Need where
  id : String
  question : Question
  gate : Gate
  reads : List InfoId
  source : Source
  samples : List Sample := []
  /-- Complete source inventory, including inactive rows; [] means known empty. -/
  inventory : List Row := []
  deriving DecidableEq, Repr, Inhabited

def window : Question → Nat
  | .latest _ _ w | .trend _ _ w | .flagged _ _ w | .threshold _ _ w _ => w
  | .active _ => 0

def relevant (q : Question) (now : Int) (s : Sample) : Bool :=
  match q with
  | .latest m u w | .trend m u w | .flagged m u w | .threshold m u w _ =>
    s.measure == m && s.unit == u && s.minute ≤ now && now - s.minute ≤ w &&
      s.value != "" && s.unit != "" && s.time != ""
  | .active _ => false

def selected (n : Need) (now : Int) : List Sample :=
  let xs := (n.samples.filter (relevant n.question now)).mergeSort (fun a b => a.minute ≤ b.minute)
  match n.question with
  | .latest .. | .threshold .. =>
    match xs.getLast? with | none => [] | some last => xs.filter (·.minute == last.minute)
  | _ => xs

def sampleCells (s : Sample) (flag : Bool) : Row :=
  [(s.heading, s.measure), ("Value", s.value), ("Unit", s.unit), ("Recorded", uiDate s.time)] ++
    if flag then [("Flag", s.flag)] else []

/-- Required cells may coexist with other clinical detail, but each must be in
one row. A bare label, sparkline, rounded value or unitless number cannot answer. -/
def rowContains (expected actual : Row) : Bool := expected.all (fun p =>
  (if p.1 == "Recorded" then (actual.lookup "Recorded").or (actual.lookup "Collected")
   else actual.lookup p.1) == some p.2)

def orderedRows : List Row → List Row → Bool
  | [], _ => true
  | _ :: _, [] => false
  | e :: es, a :: rest => if rowContains e a then orderedRows es rest else orderedRows (e :: es) rest

/-- Decode one complete info node. Trends require ≥2 ordered dated values.
A negative flag answer requires all in-window rows, each with an explicit flag.
Active-list questions require the complete source inventory (including status), so a selected subset cannot establish absence. Threshold answers expose the
exact measurement; comparing to the question's bound is a modeled mental act. -/
def rowsAnswer (n : Need) (now : Int) (info : InfoId) (rows : List Row) : Bool :=
  n.reads.contains info && match n.question with
  | .active i => info == i && rows == n.inventory
  | q =>
    let xs := selected n now
    let flags := match q with | .flagged .. => true | _ => false
    let enough := match q with | .trend .. => xs.length ≥ 2 | _ => !xs.isEmpty
    enough && (!flags || xs.all (·.flag != "")) &&
      (orderedRows (xs.map (sampleCells · flags)) rows ||
       orderedRows (xs.reverse.map (sampleCells · flags)) rows ||
       ((info == "flowsheetHistory" || info == "flowsheet") && !flags && rows.any (fun row =>
         xs.all (fun s => rowContains [("Measure", s.measure), ("Unit", s.unit),
           (Fhir.acuteTimeColumn s.time, s.value)] row))))

/-- The current encoding's decoder. Future plots must add a faithful decoder;
no credit is given for chart titles, reference curves or text summaries. -/
def witnesses (n : Need) (now : Int) : UiNode → List CompId
  | .info c _ i _ rows => if rowsAnswer n now i rows then [c] else []
  | .presentation _ cs | .timeline _ cs | .datedTimeline _ _ _ cs
  | .valueSet _ _ cs | .chartReferences _ cs | .rowAction _ _ cs
  | .section _ _ cs | .columns cs | .tabs _ _ _ cs | .board _ cs => cs.flatMap (witnesses n now)
  -- A separate patient's pane never answers a question in this patient's chart.
  | .patientPane .. => []
  | _ => []

/-- Deepest source row required by the current decoder, one-based. This is
ordinal geometry: the policy must scroll through intervening unrelated rows. -/
def rowDepth (n : Need) (now : Int) (info : InfoId) (rows : List Row) : Nat :=
  match n.question with
  | .active _ => rows.length
  | _ =>
    let flags := match n.question with | .flagged .. => true | _ => false
    (selected n now).foldl (fun depth s =>
      let expected := if info == "flowsheetHistory" || info == "flowsheet" then
        [("Measure", s.measure), ("Unit", s.unit), (Fhir.acuteTimeColumn s.time, s.value)]
        else sampleCells s flags
      max depth (rows.findIdx (rowContains expected) + 1)) 0

def depth (n : Need) (now : Int) (comp : CompId) : UiNode → Nat
  | .info c _ i _ rows => if c == comp && rowsAnswer n now i rows then rowDepth n now i rows else 0
  | .presentation _ cs | .timeline _ cs | .datedTimeline _ _ _ cs
  | .valueSet _ _ cs | .chartReferences _ cs | .rowAction _ _ cs
  | .section _ _ cs | .columns cs | .tabs _ _ _ cs | .board _ cs =>
    (cs.map (depth n now comp)).foldl max 0
  | _ => 0

def satisfied (n : Need) (now : Int) (tree : List UiNode) : Bool :=
  !(tree.flatMap (witnesses n now)).isEmpty

@[simp] theorem presentation_preserves (n now kind cs) :
    satisfied n now [.presentation kind cs] = satisfied n now cs := by
  simp [satisfied, witnesses]
@[simp] theorem timeline_preserves (n now title cs) :
    satisfied n now [.timeline title cs] = satisfied n now cs := by
  simp [satisfied, witnesses]
@[simp] theorem references_preserve (n now refs cs) :
    satisfied n now [.chartReferences refs cs] = satisfied n now cs := by
  simp [satisfied, witnesses]
@[simp] theorem dated_preserves (n now title dates undated cs) :
    satisfied n now [.datedTimeline title dates undated cs] = satisfied n now cs := by
  simp [satisfied, witnesses]

/-- Match the public renderer's full clinical projection. Only minute-resolution
ISO timestamps are accepted; source instants use the existing timezone parser. -/
def sourceMinute (date : String) : Option Int := do
  (Dated.parse date).map (fun p => p.1 / 60)

/-- Accept exact JSON numbers at arbitrary decimal precision; do not apply the
entry parser's one-decimal restriction to read-only source measurements. -/
def numeric (value : String) : Bool :=
  (Lean.Json.parse value).toOption.any (fun j => match j with | .num _ => true | _ => false)

def displaySamples (d : Display) : List Sample :=
  (d.labResults.filterMap fun r => do
    if r.unit == "" || !numeric r.value then none else do
    let minute ← sourceMinute r.date
    pure { code := r.code, measure := r.name, value := r.value, unit := r.unit, minute, time := r.date, flag := r.flag }) ++
  (d.vitals.filterMap fun r => do
    let minute ← sourceMinute r.date
    pure { code := r.code, measure := r.name, heading := "Vital sign", value := r.value, unit := r.unit, minute, time := r.date, flag := "" })

def asOfMinute (d : Display) (clock : Nat) : Int :=
  (Fhir.chartMinute d.asOf 0).getD 0 + Int.ofNat clock

/-- UTC minute offsets for the world's fixed November PST shifts. Task.startMin
is shift-relative, whereas FHIR timestamps carry -08:00. Simulation convention. -/
def shiftOffset (persona : String) : Nat :=
  (([("P1", 450), ("P2", 420), ("P3", 420), ("P4", 480), ("P5", 390)] : List (String × Nat)).lookup persona).getD 0 + 480

/-- Small sourced catalog; recency windows are simulation assumptions. No
clinical recommendation is inferred from the synthetic answer. -/
def derive (facts : Facts) (d : Display) (commits : List CommitId) (orders : List OrderChoice)
    (med : Option OrderChoice) (ackResult : Bool) : List Need := Id.run do
  let mut ns := []
  let cm := if commits.contains "administerMed" then "administerMed" else
    if commits.contains "approveRefill" then "approveRefill" else "signOrders"
  let drugs := orders ++ med.toList
  let latest := fun (id needle unit : String) (minutes : Nat) (citation : String) =>
    let code := (([("glucose", "2345-7"), ("inr", "6301-6"), ("potassium", "2823-3"), ("creatinine", "2160-0")] : List (String × String)).lookup needle).getD ""
    let samples := (displaySamples d).filter (·.code == code)
    let measure := (samples.head?.map (·.measure)).getD needle
    ({ id, question := .latest measure unit minutes, gate := .commit cm, reads := ["labs", "labResults", "resultTrend"], samples, source := { authority := .drugLabel, citation := citation, «assumption» := "Fixed window and lookup before episode actions are simulation assumptions; labeling requires monitoring, not this UI sequence." } } : Need)
  if drugs.any (fun o => inClass o.drug "insulin") then
    ns := ns ++ [latest "insulin-glucose" "glucose" "mg/dL" 120
      "DailyMed HUMALOG and LANTUS, sections 2.2 and 5.2; setids c8ecbd7a-0e22-4fc7-a503-faa58c1b6f3f / d5e07a0c-7e14-4756-9152-9fea485d654a"]
  if drugs.any (fun o => o.drug == "warfarin") then
    ns := ns ++ [latest "warfarin-inr" "inr" "{INR}" 1440
      "DailyMed warfarin sodium, section 2.4; setid bd6ea120-5d1c-4815-94f2-81e28dc6b7a9"]
  if drugs.any (fun o => o.drug == "potassium chloride") then
    ns := ns ++ [latest "potassium-level" "potassium" "mmol/L" 1440
      "DailyMed potassium chloride oral solution, sections 2.2 and 8.7; setid 590dd25c-c4cb-489a-a09b-eccbf1d37c1f", latest "potassium-renal" "creatinine" "mg/dL" 1440
      "DailyMed potassium chloride oral solution, section 8.7; setid 590dd25c-c4cb-489a-a09b-eccbf1d37c1f"]
  if drugs.any (fun o => inClass o.drug "antibiotic") then
    ns := ns ++ [{ id := "antibiotic-allergy", question := .active "allergyList", gate := .commit cm, reads := ["allergyList"], inventory := d.allergies.map allergyCells, source := { authority := .guidance, citation := "NICE CG183 recommendation 1.2.6 (2014)", «assumption» := "Chart lookup only; patient confirmation is outside the simulator. Complete list required to answer whether any active allergy is recorded." } }]
  if med.any (fun o => inClass o.drug "antihypertensive") then
    let measure := (d.vitals.find? (fun r => r.code == "8480-6")).map (·.name) |>.getD "Systolic blood pressure"
    ns := ns ++ [{ id := "mar-bp-hold", question := .threshold measure "mmHg" 60 1000, gate := .entry "adminStatus" 0, reads := ["vitals", "flowsheetHistory", "flowsheet"], samples := (displaySamples d).filter (·.code == "8480-6"), source := { authority := .hospitalPolicy, citation := "hospital policy (not law): fictional SBP <100 hold example", «assumption» := "Simulation assumption: illustrative local hold threshold, not a universal clinical standard; does not change the chosen administration decision." } }]
  if ackResult then
    -- Two explicit assumptions exercise review questions without inventing a law.
    let focused := (infoPayload facts "resultDetail").bind (fun p => p.rows.head?) |>.bind fun r =>
      (r.fields.lookup "test").or (r.fields.lookup "Test")
    if let some s := (displaySamples d).find? (fun s => s.heading == "Test" && focused.any (· == s.measure)) then
      for (id, q) in [("result-trend", Question.trend s.measure s.unit 10080), ("result-flags", Question.flagged s.measure s.unit 10080)] do
        ns := ns ++ [{ id, question := q, gate := .commit "ackResult", reads := ["labs", "labResults", "resultTrend"], samples := (displaySamples d).filter (·.code == s.code), source := { authority := .simulationAssumption, citation := "simulation assumption", «assumption» := "Review seven-day trend and flags before acknowledging a numeric result; not a legal obligation." } }]
  return ns.filter fun n => match n.gate with | .commit c => commits.contains c | .entry .. => true
end Ehr.Sim.Information
