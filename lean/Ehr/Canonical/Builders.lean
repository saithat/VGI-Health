import Ehr.Core.Types

/-!
Component builders keep canonical screens consistent and readable.
IDs and stable tags use screen.name. Parent arguments name local containers.
Shared helpers build chart navigation, review panels and order composers;
macros fill drafts without performing human-only actions.
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



/-- Use actual workflow sections in place of an additional numbered progress strip. -/
def activityWorkflow (c : Component) : Component :=
  { c with tag := c.tag ++ ".layout.activities.nav" }

/-- The layout hint retains the authored workflow and its identifier. -/
def activityWorkflowExample := activityWorkflow (mk "example" "nav" (.group false false) "Workflow")
#guard activityWorkflowExample.id == "example.nav"
#guard activityWorkflowExample.kind == .group false false

/-- Keep a selected work item's real navigation action beside its clinical context. -/
def primaryNavigation (c : Component) : Component :=
  { c with tag := c.tag ++ ".primaryNavigation" }

/-- Place an existing action in a supplied clinical row; its event stays unchanged. -/
def rowAction (target : CompId) (row : Nat) (c : Component) : Component :=
  { c with tag := c.tag ++ ".present.row|" ++ target ++ "|" ++ toString row }

/-- A wide clinical grid omits automatic summary-rail supplements, not authored reviews. -/
def wideWorkspace (c : Component) : Component :=
  { c with tag := c.tag ++ ".layout.overview" }

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
    (parent : Option String := none) (hotkey : Option String := none) (tab : Nat := 0) :
    Component :=
  mk s name (.button action) label parent tab (hotkey := hotkey)

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
    (parent : Option String := none) (tab : Nat := 0) (feedback : Bool := false) : Component :=
  let comp := button s ("review." ++ info) (.markReviewed info) label parent (tab := tab)
  if feedback then { comp with tag := comp.tag ++ ".feedback.review" } else comp

/-- A group. Collapsible and open by default. -/
def group (s : ScreenId) (name : String) (label : String) (collapsible : Bool := true)
    (startCollapsed : Bool := false) (parent : Option String := none) (tab : Nat := 0) :
    Component :=
  mk s name (.group collapsible startCollapsed) label parent tab

/-- A structured information view; its original info and all rows are retained. -/
def presented (kind : String) (c : Component) : Component :=
  { c with tag := c.tag ++ ".present." ++ kind }

/-- Compatibility spelling for the shared presentation selector. -/
abbrev presentation := presented

/-- A narrative input retains its ordinary field binding and capture policy. -/
def narrative (s : ScreenId) (name : String) (element : ElementId) (label : String)
    (parent : Option String := none) : Component :=
  let c := field s name element label parent
  { c with tag := c.tag ++ ".multiline" }

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
    (((List.range blocks.length).zip blocks).map fun (i, look, info, lbl) =>
      showInfo s (name ++ "." ++ info) look info lbl (parent := some name) (tab := i)) ++
    (match blocks.findIdx? (fun (_, info, _) => info == "problemList") with
     | some index =>
       [group s (name ++ ".includeResolved") "Include resolved problems"
         (startCollapsed := true) (parent := some name) (tab := index)]
     | none => [])

/-- A visit workflow: one button per screen of the workflow, except `s` itself. -/
def workflow (s : ScreenId) (steps : List (ScreenId × String)) : List Component :=
  group s "nav" "Workflow" (collapsible := false) ::
    (steps.filter (·.1 != s)).map fun (target, label) =>
      goto s ("nav." ++ target) target label (parent := some "nav")

/-- The chart shell: banner, chart search, Back, Home, the visit workflow, the
sidebar, and a chart-history tab strip. Every canonical screen starts with it. -/
def shell (s : ScreenId) (nav : List (ScreenId × String)) (side : List Block)
    (chart : List Block) : List Component :=
  [banner s, searchC s "chartSearch" "chart" "Search chart",
   button s "back" .back "Back", goto s "home" "home" "Patient workspace"] ++
  workflow s nav ++ sidebar s side ++ tabStrip s "chart" "Chart History" chart

/-- Ambulatory encounters keep their section list as real navigation through
blueprint migration. Chart review stays in the workspace, so a second full chart
rail does not compete with the encounter editor. Component IDs stay stable. -/
def ambulatoryShell (s : ScreenId) (nav : List (ScreenId × String))
    (chart : List Block) (navTitle : String := "Visit workflow") : List Component :=
  ((shell s nav [] chart).filter (fun c => c.id != cid s "sidebar")).map fun c =>
    if c.kind == .banner then { c with tag := "layout.clinicalActivity" }
    else if c.id == cid s "nav" then
      { c with id := cid s "encounterWorkflow", tag := "workflow", label := navTitle }
    else if c.parent? == some (cid s "nav") then
      { c with parent? := some (cid s "encounterWorkflow") }
    else if c.id == cid s "chart" then
      { c with tag := "layout.focusedWorkspace" }
    else if c.id == cid s "back" || c.id == cid s "home" then
      { c with tag := c.tag ++ ".layout.footer" }
    else c

/-- Inbox landing views put their original folder actions beside the
message list. Row tags place the same buttons; they never infer a destination. -/
def ambulatoryInboxShell (s : ScreenId) (nav : List (ScreenId × String))
    (chart : List Block) : List Component :=
  (ambulatoryShell s nav chart "Inbox").flatMap fun c =>
    if c.id == cid s "encounterWorkflow" then
      [{ group s "inboxColumns" "Inbox" (collapsible := false) with tag := "layout.columns" },
       { c with tag := "present.folderList", label := "Folders", parent? := some (cid s "inboxColumns") }]
    else if c.parent? == some (cid s "encounterWorkflow") then
      let row := match c.kind with
        | .button (.goto "w7Queue") => "1"
        | _ => "0"
      [{ c with tag := "present.row|" ++ cid s "folders" ++ "|" ++ row }]
    else [c]

/-- An open clinical section. No extra collapse action is needed for ordinary
rooming and documentation fields; optional history can still use `group`. -/
def clinicalSection (s : ScreenId) (name label : String)
    (parent : Option String := none) : Component :=
  group s name label (collapsible := false) (parent := parent)

/-! ## Medication order lines -/

/-- The fields of one medication order line, in three sections (medication,
dispense, and pharmacy and diagnosis). Component names start with `pre` and
section groups are named `pre ++ "medication"` and so on. `slot` is
`Slot.current` in the composer and a fixed line number in order-set rows. -/
def lineFields (s : ScreenId) (pre : String) (slot : Slot) (parent : Option String := none)
    (pharmacyPrefill : Prefill := .none) : List Component :=
  let g := fun (n l : String) => group s (pre ++ n) l (parent := parent)
  let f := fun (sec n e l : String) =>
    field s (pre ++ n) e l (parent := some (pre ++ sec)) (slot := slot)
  [g "medication" "Medication",
   f "medication" "drug" "drug" "Medication",
   f "medication" "dose" "dose" "Dose",
   f "medication" "doseUnit" "doseUnit" "Dose unit",
   f "medication" "route" "route" "Route",
   f "medication" "freq" "freq" "Frequency",
   f "medication" "prn" "prn" "As needed (PRN)",
   g "dispense" "Dispense",
   f "dispense" "duration" "duration" "Duration",
   f "dispense" "quantity" "quantity" "Dispense quantity",
   f "dispense" "refills" "refills" "Refills",
   f "dispense" "substitution" "substitution" "Generic substitution allowed",
   g "dx" "Pharmacy and diagnosis",
   field s (pre ++ "pharmacy") "pharmacy" "Pharmacy" (parent := some (pre ++ "dx"))
     (slot := slot) (prefill := pharmacyPrefill),
   f "dx" "indication" "indication" "Indication",
   f "dx" "orderDiagnosis" "orderDiagnosis" "Associated diagnosis (ICD-10)"]

/-- The controlled-substance section of a composer: the CURES exemption picker
and the naloxone offer and education (California). Bound to line 0: they are
asked once per signing. -/
def controlledFields (s : ScreenId) : List Component :=
  [group s "controlled" "Controlled substances (CURES / naloxone)",
   field s "curesExemptionReason" "curesExemptionReason" "CURES not checked: exemption"
     (parent := some "controlled"),
   field s "naloxoneOffer" "naloxoneOffer" "Naloxone offered" (parent := some "controlled"),
   field s "naloxoneEducation" "naloxoneEducation" "Overdose and naloxone education given"
     (parent := some "controlled")]

/-! ## Medication order composer -/

/-- Options for one order composer. -/
structure ComposerOptions where
  /-- Order-favorites buttons: local name, macro id, label. -/
  prefs : List (String × MacroId × String) := []
  /-- Show the mg/kg field and a dose-check preview (pediatrics). -/
  weightBased : Bool := false
  /-- Ask for today's weight in the composer too (screens without rooming). -/
  askWeight : Bool := false
  /-- Ask for the dosing weight in the composer (otherwise the sign screen asks). -/
  askDosingWeight : Bool := true
  /-- Show the controlled-substance section (otherwise the sign screen has it). -/
  askControlled : Bool := true
  /-- Pre-fill for the pharmacy field. -/
  pharmacyPrefill : Prefill := .none
  /-- Inline (passive) alerts to show at the top: local name, alert id, label. -/
  inlineAlerts : List (String × AlertId × String) := []
  /-- The screen "Review and sign" goes to. -/
  signScreen : ScreenId
  /-- Extra navigation buttons at the bottom: target, label. -/
  extraNav : List (ScreenId × String) := []

/-- The medication order composer for the current order line. It is long on
purpose, like a production composer: a order favorites, the dosing weight,
the order line (medication, dispense, pharmacy and diagnosis), the
controlled-substance section, a collapsed "additional" section, an order-info
tab strip whose second tab holds the CURES report, the pending-orders list, and
the buttons. -/
def orderComposer (s : ScreenId) (o : ComposerOptions) : List Component :=
  [searchC s "orderSearch" "formulary" "Find orders"] ++
  o.inlineAlerts.map (fun (n, a, l) => alertC s n a l (popup := false)) ++
  [group s "orderFavorites" "Order favorites"] ++
  o.prefs.map (fun (n, m, l) => macroBtn s n m l (parent := some "orderFavorites")) ++
  (if o.askWeight || o.askDosingWeight || o.weightBased then [group s "dosing" "Dosing"] else []) ++
  (if o.askWeight then [field s "weight" "weight" "Weight today (kg)" (parent := some "dosing")]
   else []) ++
  (if o.askDosingWeight then
    [field s "dosingWeight" "dosingWeight" "Dosing weight (kg)" (parent := some "dosing")]
   else []) ++
  (if o.weightBased then
    [lineField s "doseMgPerKg" "doseMgPerKg" "Dose (mg/kg)" (parent := some "dosing"),
     panel s "dosePreview" "doseCheck" "Calculated dose and range" (parent := some "dosing")]
   else []) ++
  lineFields s "" .current (pharmacyPrefill := o.pharmacyPrefill) ++
  (if o.askControlled then controlledFields s else []) ++
  [group s "more" "Additional" (startCollapsed := true),
   lineField s "orderComment" "orderComment" "Note to pharmacy" (parent := some "more"),
   field s "allergyReconfirmOrdering" "allergyReconfirmOrdering"
     "I have reviewed the patient's allergies" (parent := some "more")] ++
  tabStrip s "orderInfo" "Order information"
    [(.table, "currentMeds", "Current meds"), (.panel, "curesReport", "CURES report"),
     (.table, "labResults", "Recent labs")] ++
  [reviewBtn s "curesReport" "Mark CURES report reviewed" (parent := some "orderInfo") (tab := 1),
   table s "pending" "orderSummary" "Pending orders",
   button s "newLine" .newOrderLine "Accept and add another order",
   goto s "toSign" o.signScreen "Review and sign"] ++
  o.extraNav.map fun (t, l) => goto s ("to." ++ t) t l

/-! ## Order-set rows

An order set shows each of its orders as a row on fixed order lines, so the
clinician can confirm every value a macro filled in. Rows use order lines 10
and up, so they never collide with lines started in the composer (0, 1, …). -/

/-- The name prefix of the order-set row on order line `n`. -/
def rowPrefix (n : Nat) : String := "row" ++ toString n ++ "."

/-- Order-set rows on the given order lines, each in its own group. -/
def orderSetRows (s : ScreenId) (lines : List Nat) : List Component :=
  lines.flatMap fun n =>
    group s ("row" ++ toString n) ("Order set line " ++ toString (n - 9)) ::
      lineFields s (rowPrefix n) (.fixed n) (parent := some ("row" ++ toString n))

/-! ## Macros that fill order lines -/

/-- One complete order line, as an order set or order favorites fills it.
Numbers are in the element's unit (mg for the dose). Frequencies use the codes
the interpreter understands (`daily`, `bid`, `tid`, `qid`, `q4h`, `q6h`,
`q8h`, `q12h`). -/
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

/-- The steps that fill every element of `o` into the fields named with prefix
`pre` on screen `s`. -/
def fillLine (s : ScreenId) (pre : String) (o : OrderLine) : List MacroStep :=
  let c := fun n => cid s (pre ++ n)
  [.setValue (c "drug") o.drug, .setValue (c "dose") o.dose,
   .setValue (c "doseUnit") o.doseUnit, .setValue (c "route") o.route,
   .setValue (c "freq") o.freq, .setValue (c "prn") (toString o.prn),
   .setValue (c "duration") o.duration, .setValue (c "quantity") o.quantity,
   .setValue (c "refills") o.refills, .setValue (c "substitution") (toString o.substitution),
   .setValue (c "pharmacy") o.pharmacy, .setValue (c "indication") o.indication] ++
   (if o.diagnosis == "" then [] else [.setValue (c "orderDiagnosis") o.diagnosis])

/-- An order-set macro: goes to screen `s` and fills the rows on order lines
10, 11, … with `lines`. The clinician then confirms each value. It never signs. -/
def orderSet (id : MacroId) (label : String) (s : ScreenId) (lines : List OrderLine)
    (extra : List MacroStep := []) : Macro :=
  { id, label,
    steps := [.goto s] ++ extra ++
      (((List.range lines.length).zip lines).flatMap fun (i, o) => fillLine s (rowPrefix (10 + i)) o) }

/-- A order-favorites macro: fills the clinical part of the current line in the
composer on screen `s` (drug, dose, unit, route, frequency, duration, quantity,
refills). The clinician confirms these and fills the rest. -/
def preference (id : MacroId) (label : String) (s : ScreenId) (o : OrderLine) : Macro :=
  let c := cid s
  { id, label,
    steps := [.setValue (c "drug") o.drug, .setValue (c "dose") o.dose,
              .setValue (c "doseUnit") o.doseUnit, .setValue (c "route") o.route,
              .setValue (c "freq") o.freq, .setValue (c "duration") o.duration,
              .setValue (c "quantity") o.quantity, .setValue (c "refills") o.refills] }

/-- A macro that types text into fields (templates and copy-forward). -/
def textMacro (id : MacroId) (label : String) (values : List (CompId × String)) : Macro :=
  { id, label, steps := values.map fun (c, v) => .setValue c v }

end Ehr.Canonical
