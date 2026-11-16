import Ehr.Layout.Format
import Ehr.Layout.Types
import Ehr.Render.Dated

/-! New specification for owner review: data for rich read-only displays.
All parsing, series separation, labels and normalized mark geometry are Lean's.
Original info children remain present, including nonnumeric and undated values. -/
namespace Ehr.Layout.Widgets
open Lean Ehr.Render

structure Sample where
  x : Int
  y : Int
  label : String
  deriving Repr, DecidableEq, Inhabited, ToJson

structure Plot where
  paths : List (List Point) := []
  dots : List Point := []
  deriving Repr, DecidableEq, Inhabited, ToJson

structure Item where
  kind : String
  text : String := ""
  row : Nat := 0
  col : Nat := 0
  plot : Option Plot := none
  deriving Inhabited

abbrev Row := List (String × String)
def cell (row : Row) (key : String) : String := (row.lookup key).getD ""

/-- New specification for owner review: whole decimal strings only; at most
six fractional digits. Inequalities, ratios and units are never parsed as values. -/
def number (s : String) : Option Int := do
  let s := s.trimAscii.toString
  let negative := s.startsWith "-"
  let digits := if negative then (s.drop 1).toString else s
  match digits.splitOn "." with
  | [whole] => return (if negative then -1 else 1) * (← whole.toNat?) * 1000000
  | [whole,frac] =>
    if frac.isEmpty || frac.length > 6 then none else
      return (if negative then -1 else 1) * ((← whole.toNat?) * 1000000 + (← frac.toNat?) * 10^(6-frac.length))
  | _ => none

def rows : UiNode → List Row
  | .info _ _ _ _ rs => rs
  | .section _ _ cs | .columns cs | .presentation _ cs | .chartReferences _ cs
  | .rowAction _ _ cs | .timeline _ cs | .datedTimeline _ _ _ cs => cs.flatMap rows
  | .tabs _ _ _ cs => cs.flatMap rows
  | .valueSet _ _ cs => cs.flatMap rows
  | .board _ cs => cs.flatMap rows
  | .patientPane _ _ _ cs _ => cs.flatMap rows
  | _ => []

def timeColumn (key : String) : Bool :=
  key.length ≥ 16 && ((key.toList[10]? == some 'T') || (key.toList[10]? == some ' ')) ||
    (key.length ≥ 5 && key.toList[2]? == some ':')

def gridItems (rs : List Row) : List Item :=
  let columns := ((rs.flatMap fun r => r.map Prod.fst).filter timeColumn).eraseDups
  [{kind := "gridCorner", text := "Medication / time"}] ++
  columns.zipIdx.map (fun (c,i) => {kind := "gridHour",text := Format.columnCaption c,col := i+1}) ++
  rs.zipIdx.flatMap fun (r,i) =>
    [{kind := "gridMedication",text := cell r "Medication" ++ " · " ++ cell r "Dose" ++ " · " ++ cell r "Route",row := i+1}] ++
    columns.zipIdx.map fun (c,j) =>
      {kind := "gridCell",text := let values := (r.filter fun p => p.1 == c && p.2 != "").map Prod.snd
                                 if values.isEmpty then "—" else " · ".intercalate values,
       row := i+1,col := j+1}

def cardItems (kind : String) (rs : List Row) : List Item := rs.zipIdx.map fun (r,i) =>
  {kind, text := " · ".intercalate (r.map fun (k,v) => Format.columnCaption k ++ ": " ++ Format.cellText "" r k v), row := i}

/-- Normalize into a 10000-square with an inset for point radii. Equal domains
use the center. This is geometry only; it supplies no clinical reference range. -/
def coordinate (lo hi value : Int) : Int := if lo == hi then 5000 else 300 + (value-lo)*9400/(hi-lo)
def plot (paths : List (List Sample)) (points : List Sample) : Plot := Id.run do
  let all := paths.flatten ++ points
  let first := all.headD ⟨0,0,""⟩
  let xmin := all.foldl (fun n p => min n p.x) first.x
  let xmax := all.foldl (fun n p => max n p.x) first.x
  let ymin := all.foldl (fun n p => min n p.y) first.y
  let ymax := all.foldl (fun n p => max n p.y) first.y
  let project (p : Sample) : Point := ⟨coordinate xmin xmax p.x,10000-coordinate ymin ymax p.y⟩
  return {paths := [[⟨300,300⟩,⟨300,9700⟩,⟨9700,9700⟩]] ++ paths.map (fun ps => ps.map project),dots := points.map project}

/-- New specification for owner review: exact signed axis decimals, with up to
six fractional digits, matching the numeric parser without rounding endpoints. -/
def axisValue (n : Int) : String :=
  let whole := toString (n.natAbs / 1000000)
  let remainder := n.natAbs % 1000000
  let digits := toString remainder
  let fraction := (String.join (List.replicate (6-digits.length) "0") ++ digits).toList.reverse.dropWhile (· == '0') |>.reverse
  (if n < 0 then "−" else "") ++ whole ++
    (if remainder == 0 then "" else "." ++ fraction.foldl String.push "")

def seriesItems (name unit axis : String) (points : List Sample) (refs : List (List Sample)) (time : Bool := false) : List Item :=
  if points.isEmpty && refs.flatten.isEmpty then [] else
  let all := refs.flatten ++ points
  let first := all.headD ⟨0,0,""⟩
  let low := all.foldl (fun n p => min n p.y) first.y
  let high := all.foldl (fun n p => max n p.y) first.y
  let xmin := all.foldl (fun n p => min n p.x) first.x
  let xmax := all.foldl (fun n p => max n p.x) first.x
  let xLabel (x : Int) := if time then Format.utcInstant (x / 1000000000) (x % 1000000000).toNat else axisValue x ++ " mo"
  [{kind := "plotTitle",text := name ++ " (" ++ unit ++ ") · " ++ axis ++
      " · Y " ++ axisValue low ++ "–" ++ axisValue high},
   {kind := "plotYHigh",text := axisValue high},
   {kind := "plotYLow",text := axisValue low},
   {kind := "plotXLow",text := xLabel xmin},
   {kind := "plotXHigh",text := xLabel xmax},
   {kind := "plot",plot := some (plot (refs ++ [points]) points)}] ++
  points.zipIdx.map (fun (p,i) => {kind := "plotLabel",text := toString (i+1) ++ ". " ++ p.label,row := i})

def growthItems (rs : List Row) (references : List UiChartReference) : List Item :=
  [("Weight","kg","Weight (kg)"),("Height","cm","Height (cm)"),
   ("Head circumference","cm","Head circumference (cm)"),("BMI","kg/m²","BMI (kg/m²)")].flatMap fun (name,unit,key) =>
    let ps := rs.filterMap fun r => do
      let x ← number (cell r "Age (months)")
      let y ← number (cell r key)
      pure ⟨x,y,cell r "Age (months)" ++ " mo · " ++ cell r key ++ " " ++ unit ++ " · " ++ cell r "Date"⟩
    let refs := (references.filter fun r => r.measure == name && r.unit == unit).map fun r =>
      r.points.map fun (age,value) => (⟨(age:Int)*100000,(value:Int)*10000,r.percentile⟩ : Sample)
    seriesItems name unit "Age (months) / recorded value" ps refs

def trendItems (rs : List Row) : List Item :=
  let groups := (rs.map fun r => (let name := cell r "Test"
                                 if name == "" then cell r "Measure" else name,cell r "Unit")).eraseDups
  groups.flatMap fun (name,unit) =>
    let selected := rs.filter fun r => (cell r "Test" == name || cell r "Measure" == name) && cell r "Unit" == unit
    let ps := selected.filterMap fun r => do
      let y ← number (cell r "Value")
      let label := if cell r "Recorded" == "" then cell r "Date" else cell r "Recorded"
      let (second,nano) ← Dated.parse label
      pure ⟨second*1000000000+nano,y,label ++ " · " ++ cell r "Value" ++ " " ++ unit⟩
    seriesItems name unit "UTC time / recorded value" (ps.mergeSort fun a b => a.x ≤ b.x) [] true

def presentation (kind : UiPresentationKind) (cs : List UiNode) (refs : List UiChartReference) : List Item :=
  let rs := cs.flatMap rows
  match kind with
  | .timeGrid => gridItems rs
  | .notes => cardItems "noteCard" rs
  | .folderList => cardItems "folderCard" rs
  | .trend => trendItems rs
  | .growth => growthItems rs refs
  | _ => []

/-- New specification for owner review: a proportional UTC axis; equal instants
share a point. Undated sources retain their explicit readable parts. -/
def datedPlot (ds : List UiDatedItem) : Plot :=
  let p := plot [] (ds.map fun d => ⟨d.utcSecond*1000000000+d.nanosecond.val,0,""⟩)
  {p with paths := [[⟨300,5000⟩,⟨9700,5000⟩]]}

#guard axisValue 1 == "0.000001" && axisValue 1234567 == "1.234567"
#guard number "<5" == none && number "120/80" == none && number "-1.25" == some (-1250000)
end Ehr.Layout.Widgets
