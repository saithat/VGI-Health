import Ehr.Core.Types

/-!
# Builders for the canonical EHR program

Small functions that make components, so the canonical screens stay short and
consistent:
- `cid s name` is the id of component `name` on screen `s` (`"s.name"`); it is
  also the component's stable tag;
- basic components: `field`, `lineField`, `panel`, `table`, `trend`, `alertC`,
  `goto`, `commitBtn`, `reviewBtn`, `group`, `tabsC`, `macroBtn`, `searchC`;
- the chart shell every screen carries: banner, chart search, Back and Home,
  a visit navigator, a sidebar, and a chart-review tab strip;
- the medication order composer for the current order line;
- macros that fill whole order lines (preference lists and order sets).

Container arguments (`parent`) are local names on the same screen; the builders
turn them into full ids.
-/

namespace Ehr.Canonical

/-! ## Ids and basic components -/

/-- The id of component `name` on screen `s`, e.g. `cid "w1Rooming" "weight"`
is `"w1Rooming.weight"`. -/
def cid (s : ScreenId) (name : String) : CompId := s ++ "." ++ name

/-- A component on screen `s`. Its id and tag are `cid s name`; `parent` is the
local name of a group or tab container on the same screen. -/
def mk (s : ScreenId) (name : String) (kind : Kind) (label : String)
    (parent : Option String := none) (tab : Nat := 0) (size : Size := .normal)
    (hotkey : Option String := none) (visibility : Visibility := .always) : Component :=
  { id := cid s name, kind, label, parent? := parent.map (cid s), tab, size,
    hotkey? := hotkey, tag := cid s name, visibility }

/-- The patient banner (the pinned landmark). -/
def banner (s : ScreenId) : Component :=
  mk s "banner" .banner "Patient banner"

/-- An input for element `element`. By default it is bound to order line 0 and
has no pre-fill. -/
def field (s : ScreenId) (name : String) (element : ElementId) (label : String)
    (parent : Option String := none) (slot : Slot := .fixed 0)
    (prefill : Prefill := .none) (tab : Nat := 0) : Component :=
  mk s name (.field element slot prefill) label parent tab

/-- An input bound to the current order line. -/
def lineField (s : ScreenId) (name : String) (element : ElementId) (label : String)
    (parent : Option String := none) (prefill : Prefill := .none) : Component :=
  field s name element label parent .current prefill

/-- A read-only information block. -/
def panel (s : ScreenId) (name : String) (info : InfoId) (label : String)
    (parent : Option String := none) (tab : Nat := 0) (size : Size := .normal)
    (visibility : Visibility := .always) : Component :=
  mk s name (.panel info) label parent tab size (visibility := visibility)

/-- A read-only table. -/
def table (s : ScreenId) (name : String) (info : InfoId) (label : String)
    (parent : Option String := none) (tab : Nat := 0) (size : Size := .normal) : Component :=
  mk s name (.table info) label parent tab size

/-- A trend chart. -/
def trend (s : ScreenId) (name : String) (info : InfoId) (label : String)
    (parent : Option String := none) (tab : Nat := 0) : Component :=
  mk s name (.trend info) label parent tab

/-- An alert. `popup := true` asks for a popup (only removable alerts may use it;
interruptive alerts pop up at the commit anyway). -/
def alertC (s : ScreenId) (name : String) (alert : AlertId) (label : String)
    (popup : Bool) (parent : Option String := none) : Component :=
  mk s name (.alert alert popup) label parent

/-- A button. -/
def button (s : ScreenId) (name : String) (action : Action) (label : String)
    (parent : Option String := none) (hotkey : Option String := none) : Component :=
  mk s name (.button action) label parent (hotkey := hotkey)

/-- A button that goes to another screen. -/
def goto (s : ScreenId) (name : String) (target : ScreenId) (label : String)
    (parent : Option String := none) : Component :=
  button s name (.goto target) label parent

/-- A commit button (sign, give, acknowledge, …). -/
def commitBtn (s : ScreenId) (commit : CommitId) (label : String)
    (hotkey : Option String := some "Ctrl+Enter") : Component :=
  button s ("commit." ++ commit) (.commit commit) label (hotkey := hotkey)

/-- A "mark as reviewed" button (creates a review receipt). -/
def reviewBtn (s : ScreenId) (info : InfoId) (label : String)
    (parent : Option String := none) : Component :=
  button s ("review." ++ info) (.markReviewed info) label parent

/-- A group. Collapsible and open by default. -/
def group (s : ScreenId) (name : String) (label : String) (collapsible : Bool := true)
    (startCollapsed : Bool := false) (parent : Option String := none) (tab : Nat := 0) :
    Component :=
  mk s name (.group collapsible startCollapsed) label parent tab

/-- A tab container. Children choose their tab with `tab`. -/
def tabsC (s : ScreenId) (name : String) (label : String)
    (parent : Option String := none) : Component :=
  mk s name .tabs label parent

/-- A button that runs a macro. -/
def macroBtn (s : ScreenId) (name : String) (id : MacroId) (label : String)
    (parent : Option String := none) : Component :=
  mk s name (.macro id) label parent

/-- A search box. -/
def searchC (s : ScreenId) (name : String) (scope : String) (label : String) : Component :=
  mk s name (.search scope) label

/-! ## Chart shell -/

/-- How an information block is drawn. -/
inductive Look
  | panel
  | table
  | trend

/-- Draw info `info` with the given look. -/
def showInfo (s : ScreenId) (name : String) (look : Look) (info : InfoId) (label : String)
    (parent : Option String := none) (tab : Nat := 0) : Component :=
  match look with
  | .panel => panel s name info label parent tab
  | .table => table s name info label parent tab
  | .trend => trend s name info label parent tab

/-- One block of the sidebar or of a tab strip: look, info, label. -/
abbrev Block := Look × InfoId × String

/-- Sidebar for clinic screens. -/
def clinicSidebar : List Block :=
  [(.table, "problemList", "Active problems"), (.table, "currentMeds", "Current meds"),
   (.panel, "vitals", "Recent vitals"), (.panel, "lastVisit", "Last visit"),
   (.table, "upcomingAppointments", "Upcoming appointments")]

/-- Sidebar for ED and inpatient screens. -/
def hospitalSidebar : List Block :=
  [(.table, "problemList", "Active problems"), (.table, "currentMeds", "Current meds"),
   (.panel, "vitals", "Recent vitals"), (.table, "openOrders", "Open orders"),
   (.table, "pendingResults", "Pending results")]

/-- A sidebar: a collapsible group (open by default) with one block per item. -/
def sidebar (s : ScreenId) (blocks : List Block) : List Component :=
  group s "sidebar" "Sidebar" ::
    blocks.map fun (look, info, label) =>
      showInfo s ("side." ++ info) look info label (parent := some "sidebar")

/-- A tab strip: a tab container named `name`, with one block per tab. Only
tab 0 is open at first. -/
def tabStrip (s : ScreenId) (name : String) (label : String) (blocks : List Block) :
    List Component :=
  tabsC s name label ::
    (List.range blocks.length).zip blocks |>.map fun (i, look, info, lbl) =>
      showInfo s (name ++ "." ++ info) look info lbl (parent := some name) (tab := i)

/-- A visit navigator: one button per screen of the workflow, except `s` itself. -/
def navigator (s : ScreenId) (steps : List (ScreenId × String)) : List Component :=
  group s "nav" "Navigator" (collapsible := false) ::
    (steps.filter (·.1 != s)).map fun (target, label) =>
      goto s ("nav." ++ target) target label (parent := some "nav")

/-- The chart shell: banner, chart search, Back, Home, the visit navigator, the
sidebar, and a chart-review tab strip. Every canonical screen starts with it. -/
def shell (s : ScreenId) (nav : List (ScreenId × String)) (side : List Block)
    (chart : List Block) : List Component :=
  [banner s, searchC s "chartSearch" "chart" "Search chart",
   button s "back" .back "Back", goto s "home" "home" "Patient workspace"] ++
  navigator s nav ++ sidebar s side ++ tabStrip s "chart" "Chart review" chart

/-! ## Medication order composer -/

/-- Options for one order composer. -/
structure ComposerOptions where
  /-- Preference-list buttons: local name, macro id, label. -/
  prefs : List (String × MacroId × String) := []
  /-- Show the mg/kg field and a dose-check preview (pediatrics). -/
  weightBased : Bool := false
  /-- Ask for today's weight in the composer too (screens without rooming). -/
  askWeight : Bool := false
  /-- Pre-fill for the pharmacy field. -/
  pharmacyPrefill : Prefill := .none
  /-- Inline (passive) alerts to show at the top: local name, alert id, label. -/
  inlineAlerts : List (String × AlertId × String) := []
  /-- The screen "Review and sign" goes to. -/
  signScreen : ScreenId
  /-- Extra navigation buttons at the bottom: target, label. -/
  extraNav : List (ScreenId × String) := []

/-- The medication order composer for the current order line. It is long on
purpose, like a production composer: a preference list, the dosing weight,
then medication, dispense, pharmacy, and diagnosis sections, a collapsed
"additional" section, the pending-orders list, and the buttons. -/
def orderComposer (s : ScreenId) (o : ComposerOptions) : List Component :=
  [searchC s "orderSearch" "formulary" "Search medications"] ++
  o.inlineAlerts.map (fun (n, a, l) => alertC s n a l (popup := false)) ++
  [group s "prefList" "Preference list"] ++
  o.prefs.map (fun (n, m, l) => macroBtn s n m l (parent := some "prefList")) ++
  [group s "dosing" "Dosing"] ++
  (if o.askWeight then [field s "weight" "weight" "Weight today (kg)" (parent := some "dosing")]
   else []) ++
  [field s "dosingWeight" "dosingWeight" "Dosing weight (kg)" (parent := some "dosing")] ++
  (if o.weightBased then
    [lineField s "doseMgPerKg" "doseMgPerKg" "Dose (mg/kg)" (parent := some "dosing"),
     panel s "dosePreview" "doseCheck" "Calculated dose and range" (parent := some "dosing")]
   else []) ++
  [group s "medication" "Medication",
   lineField s "drug" "drug" "Medication" (parent := some "medication"),
   lineField s "dose" "dose" "Dose (mg)" (parent := some "medication"),
   lineField s "doseUnit" "doseUnit" "Dose unit" (parent := some "medication"),
   lineField s "route" "route" "Route" (parent := some "medication"),
   lineField s "freq" "freq" "Frequency" (parent := some "medication"),
   lineField s "prn" "prn" "As needed (PRN)" (parent := some "medication"),
   group s "dispense" "Dispense",
   lineField s "duration" "duration" "Duration" (parent := some "dispense"),
   lineField s "quantity" "quantity" "Dispense quantity" (parent := some "dispense"),
   lineField s "refills" "refills" "Refills" (parent := some "dispense"),
   lineField s "substitution" "substitution" "Generic substitution allowed"
     (parent := some "dispense"),
   group s "pharmacyGroup" "Pharmacy",
   lineField s "pharmacy" "pharmacy" "Pharmacy" (parent := some "pharmacyGroup")
     (prefill := o.pharmacyPrefill),
   group s "dx" "Diagnosis association",
   lineField s "indication" "indication" "Indication" (parent := some "dx"),
   lineField s "orderDiagnosis" "orderDiagnosis" "Associated diagnosis (ICD-10)"
     (parent := some "dx"),
   group s "more" "Additional" (startCollapsed := true),
   lineField s "orderComment" "orderComment" "Note to pharmacy" (parent := some "more"),
   field s "allergyReconfirmOrdering" "allergyReconfirmOrdering"
     "I have reviewed the patient's allergies" (parent := some "more"),
   table s "pending" "orderSummary" "Pending orders",
   button s "newLine" .newOrderLine "Accept and add another order",
   goto s "toSign" o.signScreen "Review and sign"] ++
  o.extraNav.map fun (t, l) => goto s ("to." ++ t) t l

/-! ## Macros that fill order lines -/

/-- One complete order line, as an order set or preference list fills it.
Numbers are in the element's unit (mg for the dose). -/
structure OrderLine where
  drug : String
  dose : String
  doseUnit : String := "mg"
  route : String
  freq : String
  duration : String
  quantity : String
  refills : String := "0"
  indication : String
  pharmacy : String
  substitution : Bool := true
  prn : Bool := false
  diagnosis : String

/-- The steps that fill every element of `o` on the current line of the composer
on screen `s`. -/
def fillLine (s : ScreenId) (o : OrderLine) : List MacroStep :=
  [.setValue (cid s "drug") o.drug, .setValue (cid s "dose") o.dose,
   .setValue (cid s "doseUnit") o.doseUnit, .setValue (cid s "route") o.route,
   .setValue (cid s "freq") o.freq, .setValue (cid s "prn") (toString o.prn),
   .setValue (cid s "duration") o.duration, .setValue (cid s "quantity") o.quantity,
   .setValue (cid s "refills") o.refills,
   .setValue (cid s "substitution") (toString o.substitution),
   .setValue (cid s "pharmacy") o.pharmacy, .setValue (cid s "indication") o.indication,
   .setValue (cid s "orderDiagnosis") o.diagnosis]

/-- An order-set macro: fills each line in turn, starting a new line between
them. It never signs. -/
def orderSet (id : MacroId) (label : String) (s : ScreenId) (lines : List OrderLine) : Macro :=
  { id, label,
    steps := (lines.map (fillLine s)).intersperse [.click (cid s "newLine")] |>.flatten }

/-- A preference-list macro: fills only the clinical part of one line (drug,
dose, unit, route, frequency, duration, quantity, refills). The clinician still
fills the pharmacy, indication, diagnosis, substitution, and PRN fields. -/
def preference (id : MacroId) (label : String) (s : ScreenId) (o : OrderLine) : Macro :=
  { id, label,
    steps := [.setValue (cid s "drug") o.drug, .setValue (cid s "dose") o.dose,
              .setValue (cid s "doseUnit") o.doseUnit, .setValue (cid s "route") o.route,
              .setValue (cid s "freq") o.freq, .setValue (cid s "duration") o.duration,
              .setValue (cid s "quantity") o.quantity, .setValue (cid s "refills") o.refills] }

/-- A macro that types text into fields (templates and copy-forward). -/
def textMacro (id : MacroId) (label : String) (values : List (CompId × String)) : Macro :=
  { id, label, steps := values.map fun (c, v) => .setValue c v }

end Ehr.Canonical
