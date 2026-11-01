import Ehr.Render.Html
import Ehr.Core.View

/-!
# Executable page renderer

The interpreter has already resolved ancestry, collapsed groups, tabs and
visibility in `view`. Render its shown items in component-list order. Group
and tab headers control that view; their visible children follow in that same
list, rather than being filtered a second time by a separate tree traversal.
Every component has a labeled wrapper. All actions use `Part.toHtmls`, which
writes their component id and disabled state from the same view.
-/
namespace Ehr.Render

structure Ctx where
  sp : Spec
  prog : Program
  facts : Facts
  disp : Display
  user : User
  s : State
  /-- A render call resolves the interpreter once. The dependent equality keeps
  this cache exact, including after a structure update changes any input. -/
  viewCache : { v : ScreenView // v = view sp prog facts user s } :=
    ⟨view sp prog facts user s, rfl⟩

@[inline] def Ctx.v (cx : Ctx) : ScreenView := cx.viewCache.val

theorem Ctx.viewCache_exact (cx : Ctx) :
    cx.viewCache.val = view cx.sp cx.prog cx.facts cx.user cx.s := cx.viewCache.property

theorem Ctx.v_exact (cx : Ctx) :
    cx.v = view cx.sp cx.prog cx.facts cx.user cx.s := cx.viewCache.property

@[simp] theorem Ctx.rebuild (cx : Ctx) :
    ({ sp := cx.sp, prog := cx.prog, facts := cx.facts, disp := cx.disp,
       user := cx.user, s := cx.s } : Ctx) = cx := by
  cases cx with
  | mk sp prog facts disp user s cache =>
    rcases cache with ⟨v, h⟩
    cases h
    rfl

def txt (cl : Cls) (s : String) : Ro := .el .span [cl] [] [.text s]
def cell (s : String) : Ro := .el .td [] [] [.text s]
def row (ss : List String) : Ro := .el .tr [] [] (ss.map cell)
def table (heads : List String) (rows : List Ro) (empty : String) : Ro :=
  if rows.isEmpty then .el .div [.empty] [] [.text empty]
  else .el .table [.table, .tableCompact] []
    [.el .thead [] [] [.el .tr [] [] (heads.map fun s => .el .th [] [] [.text s])],
     .el .tbody [] [] rows]

def allergyTr (r : AllergyRow) : Ro :=
  row [r.substance, r.reaction, r.severity, r.status, r.verification, r.recorded]
def medTr (r : MedRow) : Ro := row [r.name, r.sig, r.status, r.authored, r.prescriber]
def bannerContent (d : Display) : Ro :=
  .el .div [.banner] [] (([
    ("Patient", d.banner.name), ("MRN", d.banner.mrn), ("DOB", d.banner.dob),
    ("Age / sex", s!"{d.banner.ageYears} / {d.banner.sex}"),
    ("Language", d.banner.language), ("PCP", d.banner.pcp), ("Coverage", d.banner.coverage),
    ("Encounter", d.banner.encounterClass), ("Attending", d.banner.attending),
    ("Location", d.banner.location)] : List (String × String)).map fun (k, v) =>
      .el .div [.bannerField] [] [txt .bannerLabel k, txt .value v])

/-- A trend uses a fixed 300×100 viewBox with every point scaled to fit. -/
def sparkline (points : List TrendPoint) : Ro :=
  let maxY := points.foldl (fun m p => max m p.hundredths) 1
  let coords := points.zipIdx |>.map fun (p, i) =>
    s!"{10 + i * 280 / max 1 (points.length - 1)},{90 - p.hundredths * 80 / maxY}"
  .el .svg [.trend] [.viewBox "0 0 300 100", .role .img, .aria .label "Recorded result trend"]
    [.el .polyline [.trendLine] [.points (" ".intercalate coords)] []]

def infoLabel (cx : Ctx) (i : InfoId) : String :=
  ((cx.sp.info? i).map (·.label)).getD i

/-- Full read-only contents of an info panel. No row limits. -/
def infoContent (cx : Ctx) (i : InfoId) : Ro :=
  let d := cx.disp
  match i with
  | "patientBanner" => bannerContent d
  | "allergyList" => table ["Substance", "Reaction", "Severity", "Status", "Verification", "Recorded"]
      (d.allergies.map allergyTr) "No allergy records on file"
  | "currentMeds" => table ["Medication", "Instructions", "Status", "Authored", "Prescriber"]
      (d.meds.map medTr) "No current medication requests on file"
  | "vitals" => table ["Vital sign", "Value", "Unit", "Recorded"]
      (d.vitals.map fun r => row [r.name, r.value, r.unit, r.date]) "No vital signs on file"
  | "resultTrend" | "labs" | "labResults" => .el .div [] []
      [table ["Test", "Value", "Unit", "Range", "Recorded"]
        (d.labs.map fun r => .el .tr (if r.abnormal then [.abnormal] else []) []
          ([r.name, r.value, r.unit, r.refRange, r.date].map cell)) "No laboratory results on file",
       .el .div [] [] (d.labs.map fun r => .el .div [] [] [txt .panelTitle r.name, sparkline r.trend])]
  | "problemList" => table ["Problem", "Code", "Onset", "Abatement", "Status"]
      (d.problems.map fun r => row [r.name, r.code, r.onset, r.abatement, r.status]) "No problems on file"
  | "immunizations" | "immunizationHistory" => table ["Vaccine", "CVX", "Date", "Status"]
      (d.immunizations.map fun r => row [r.vaccine, r.cvx, r.date, r.status]) "No immunizations on file"
  | "encounters" | "encounterHistory" => table ["Encounter", "Class", "Start", "End", "Reason", "Provider", "Location"]
      (d.encounters.map fun r => row [r.encType, r.encClass, r.start, r.stop, r.reason, r.provider, r.location])
      "No encounters on file"
  | "procedures" => table ["Procedure", "Code", "Date", "Status"]
      (d.procedures.map fun r => row [r.name, r.code, r.date, r.status]) "No procedures on file"
  | "growthChart" => .el .div [] []
      [table ["Date", "Age (months)", "Weight (kg)", "Height (cm)"]
        (d.growth.map fun r => row [r.date, toString r.ageMonths,
          (r.weightTenths?.map tenthsText).getD "", (r.heightTenths?.map tenthsText).getD ""])
        "No growth measurements on file",
       sparkline (d.growth.filterMap fun r => r.weightTenths?.map fun w => { date := r.date, hundredths := w * 10 })]
  | "doseCheck" => .el .div [] []
      [txt .value (match weightKgTenths? cx.facts cx.s with
        | some w => "Weight for dose check: " ++ tenthsText w ++ " kg"
        | none => "No confirmed kg weight available for dose check"),
       table ["Line", "Drug", "Dose check"]
        ((orderLines cx.s).map fun (n, drug) => row [toString n, drug,
          if doseOutOfRange cx.facts cx.s n drug then "OUT OF RANGE" else "No out-of-range flag"])
        "No order lines to check"]
  | "anticoagulants" | "anticoagulantList" => table ["Medication", "Instructions", "Status", "Authored", "Prescriber"]
      ((d.meds.filter fun r => inClass r.drug "anticoagulant" || inClass r.drug "antiplatelet").map medTr) "No anticoagulant requests on file"
  | "careGaps" => table ["Care gap"] (cx.facts.careGaps.map fun g => row [g]) "No configured care gaps"
  | "priorAuthStatus" => txt .value (if (capturedAt? cx.s priorAuthElement cx.s.currentSlot).isSome
      then "Prior authorization requested" else "Prior authorization not requested")
  | _ => .el .div [.empty] [] [.text (infoLabel cx i ++ ": no display records available")]
where
  tenthsText (n : Nat) : String := s!"{n / 10}.{n % 10}"

def valueText : Value → String
  | .text s => s | .code s => s | .user s => s | .flag b => toString b
  | .qty n _ => s!"{n / 10}.{n % 10}"

/-- Provenance always includes its source and the display's reference date. -/
def provenanceText (d : Display) (p : String) : String :=
  "Source: " ++ p ++ " · as of " ++ d.asOf

def fieldKind (k : ValueKind) : ValueKindName × InputType × UnitKind :=
  match k with
  | .quantity u => (.qty, .number, u)
  | .medicationDose => (.qty, .number, .none)
  | .coded _ | .scan _ => (.code, .text, .none)
  | .flag => (.flag, .checkbox, .none)
  | .cosign => (.user, .text, .none)
  | _ => (.text, .text, .none)

def panelPart (cx : Ctx) (i : InfoId) : Part :=
  .el .div [.panel] [] [.ro (txt .panelTitle (infoLabel cx i)),
    .ro (txt .badge (if hasValidReceipt cx.sp cx.facts cx.s i then "Reviewed · valid receipt" else "Review required")),
    .ro (infoContent cx i)]

def fieldPart (cx : Ctx) (it : ItemView) (e : ElementId) : Part :=
  let kind := ((cx.sp.element? e).map (·.kind)).getD .text
  let (vk, ty, baseUnit) := fieldKind kind
  let requiredUnit := if kind == .medicationDose then (doseInputUnit? cx.s it.slot).getD .none else baseUnit
  let unit := if kind == .medicationDose then requiredUnit else
    match it.value? with | some (.qty _ u) => u | _ => requiredUnit
  let v := if kind == .medicationDose &&
    it.value?.any (fun v => match v with | .qty _ u => u != requiredUnit | _ => true)
    then "" else (it.value?.map valueText).getD ""
  let attrs := [.valueKind vk, .type ty, .unit unit, .value v,
    .ro (.aria .label it.comp.label)]
  let input := match kind with
    | .coded "formulary" => Part.act .enter .select [.input] attrs
        (.el .option [] [.value ""] [.ro (.text "Choose medication")] :: formulary.map fun d =>
          .el .option [] [.value d.name] [.ro (.text d.name)])
    | _ => Part.act .enter .input ([.input] ++ if it.pendingConfirm then [.inputPending] else []) attrs []
  .el .div [.field] []
    ((if cx.sp.entries.any (fun r => r.element == e && whenHolds cx.facts cx.s r.when)
       then [.ro (txt .required "Required")] else []) ++ [input] ++
     (if unit == .none then [] else [.ro (txt .unit (unitName unit))]) ++
     (match it.provenance? with | some p => [.ro (txt .provenance (provenanceText cx.disp p))] | none => []) ++
     (if it.pendingConfirm then [.act .confirm .button [.confirm] [] [.ro (.text "Confirm prefilled value")]] else []) ++
     (if it.humanOnly then [.ro (txt .humanOnly "Human entry required")] else []) ++
     (match it.value?, kind with
      | some (.qty _ u), .quantity want =>
        if u != want then [.ro (txt .blockedReason ("Unit mismatch: recorded " ++ unitName u ++ "; required " ++ unitName want))] else []
      | _, _ => []))

def blockedReason (cx : Ctx) (id : CompId) : String :=
  if cx.s.popup?.isSome then "Acknowledge the open alert first"
  else (cx.v.blocked.lookup id).getD ""

/-- Content of one shown component; ids and disabled are supplied centrally. -/
def itemPart (cx : Ctx) (it : ItemView) : Part :=
  match it.comp.kind with
  | .banner => .ro (infoContent cx "patientBanner")
  | .field e _ _ => fieldPart cx it e
  | .panel i | .table i | .trend i | .priorAuth i => panelPart cx i
  | .alert a _ =>
    let rule := cx.sp.alert? a
    .el .div ([.alertInline] ++ (match rule.map (·.tier) with
        | some .interruptive => [.alertInterruptive] | some .passive => [.alertPassive] | _ => [])) []
      [.ro (.text ((rule.map (·.label)).getD a)),
       .ro (.text (" · " ++ ", ".intercalate ((rule.map fun r => alertKeys cx.facts cx.s r.cond).getD [])))]
  | .button action =>
    let reason := blockedReason cx it.comp.id
    .el .div [] [] ([.act .click .button
      [.button, match action with | .commit _ => .buttonPrimary | _ => .buttonSecondary]
      [.ro (.title reason)] [.ro (.text it.comp.label)]] ++
      if reason == "" then [] else [.ro (txt .blockedReason reason)])
  | .group coll _ =>
    .el .div ([.«section»] ++ if it.expanded then [] else [.sectionCollapsed]) []
      [if coll then .act .toggle .button [.sectionHeader]
        [.ro (.aria .expanded (toString it.expanded))] [.ro (.text it.comp.label)]
       else .ro (txt .sectionHeader it.comp.label)]
  | .tabs =>
    let tabs := (cx.v.items.filter (·.comp.parent? == some it.comp.id)).map (·.comp.tab) |>.eraseDups
    .el .div [.tabs] [.ro (.role .tablist)] (tabs.map fun n =>
      let title := ((cx.v.items.find? fun c => c.comp.parent? == some it.comp.id && c.comp.tab == n).map (·.comp.label)).getD s!"Tab {n}"
      .act .selectTab .button ([.tab] ++ if n == it.selectedTab then [.tabActive] else [])
        [.tab n, .ro (.role .tab), .ro (.aria .selected (toString (n == it.selectedTab)))] [.ro (.text title)])
  | .«macro» _ => .act .click .button [.«macro»] [] [.ro (.text it.comp.label)]
  | .search _ => .act .search .input [.search] [.type .search, .placeholder it.comp.label,
      .ro (.aria .label it.comp.label)] []

/-- Exactly one wrapper for each shown item, including its literal label. -/
def renderItem (cx : Ctx) (it : ItemView) : Html :=
  .node .div (if it.comp.size == .compact then [.compact] else []) [.compId it.comp.id]
    (.node .div [.fieldLabel] [] [.text it.comp.label] ::
      (itemPart cx it).toHtmls it.comp.id (cx.v.enabled.contains it.comp.id) [])

def popup (cx : Ctx) : List Html :=
  match cx.v.popup? with
  | none => []
  | some (a, key) =>
    [.node .div [.modalBackdrop] [] [.node .div [.modal] [.role .dialog, .aria .modal "true"]
      [.node .h2 [.modalTitle] [] [.text (((cx.sp.alert? a).map (·.label)).getD a)],
       .node .div [.modalBody] [] [.text key],
       .node .button [.button, .buttonPrimary] [.event .ack, .alert a] [.text "Acknowledge"]]]]

def shellBefore (cx : Ctx) : List Ro :=
  [.el .div [.toolbar] [] [.text ("Certified Adaptive Clinical Interface · " ++ cx.user.id)],
   bannerContent cx.disp,
   .el .div [.nav] [.role .navigation] (cx.prog.screens.map fun sc =>
     .el .span ([.navItem] ++ if sc.id == cx.s.screen then [.navActive] else []) [] [.text sc.title])]

def sidebarContent (cx : Ctx) : Ro :=
  .el .div [.sidebar] [.role .complementary]
    [txt .sidebarSection ("Record date: " ++ cx.disp.asOf),
     txt .sidebarSection ("Wristband payload: " ++ cx.facts.patientId),
     txt .sidebarSection ("Allergies: " ++ toString cx.disp.allergies.length)]

def mainContent (cx : Ctx) : Html :=
  .node .div [.main] [.role .main]
    (.node .h1 [.screenTitle] [] [.text cx.v.title] ::
      (cx.v.items.filter (·.shown)).map (renderItem cx))

def gridContent (cx : Ctx) : Html :=
  .node .div [.grid] [] [(sidebarContent cx).toHtml, mainContent cx]

/-- Lean's complete page. Shell content never carries component ids. -/
def page (cx : Ctx) : Html :=
  .node .div [.shell] [] ((shellBefore cx).map Ro.toHtml ++ popup cx ++ [gridContent cx])

def render (sp : Spec) (prog : Program) (facts : Facts) (disp : Display) (user : User) (s : State) : Html :=
  page { sp, prog, facts, disp, user, s }

end Ehr.Render
