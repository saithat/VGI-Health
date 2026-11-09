import Ehr.Core.Json
import Ehr.Core.Guard
import Ehr.Sim.InformationNeeds

/-!
Task goals come from clinical choices and hospital requirements.
The same commits and required values are used for every UI version.
Expected alert acknowledgments contribute to the action floor;
choices that conflict with the spec are reported as problems.
-/

namespace Ehr.Sim

open Ehr

/-- A value the clinician must capture before a commit. -/
structure ValueGoal where
  element : ElementId
  /-- The order line; `none` means any slot. -/
  slot? : Option Nat := none
  /-- The value to capture; `none` means any accepted value. -/
  value? : Option Value := none
  /-- The commit that requires it. -/
  commit : CommitId
  deriving DecidableEq, Repr, Inhabited

/-- Everything a task asks of the clinician. -/
structure Goals where
  /-- Opt-in simulator specification; absent in historical runs. -/
  informationNeeds : List Information.Need := []
  informationOffset : Nat := 0
  informationDisplay : Render.Display := Render.Display.empty
  commits : List CommitId
  values : List ValueGoal
  /-- Optional legal alternatives, available only when the scenario is exempt. -/
  waivers : List ValueGoal := []
  /-- Interruptive alerts (with keys) expected to fire at the goal commits. -/
  expectedAcks : List (AlertId × String)
  /-- Choices that do not fit the spec, in words. -/
  problems : List String := []
  deriving DecidableEq, Repr, Inhabited

/-! ## Values derived from choices and facts -/

/-- The user ID a second clinician types for a cosign (differs from `user`). -/
def secondUser (user : User) : UserId := user.id ++ "-second"

/-- A decimal string for tenths (`725` ↦ `"72.5"`, `5000` ↦ `"500"`). -/
def tenthsText (t : Nat) : String :=
  if t % 10 == 0 then toString (t / 10) else s!"{t / 10}.{t % 10}"

/-- Today's weight in tenths of kg: as recorded if in kg, converted if in lb
(the clinician converts; the spec never accepts lb). -/
def weightKgGoal (facts : Facts) : Option Value :=
  match facts.weightToday? with
  | some (w, .kg) => some (.qty w .kg)
  | some (w, .lb) => some (.qty ((w * 45359237 + 50000000) / 100000000) .kg)
  | _ => none

/-- Order-line element names. -/
def orderElements : List ElementId :=
  ["drug", "dose", "doseUnit", "unit", "route", "freq", "frequency", "indication", "abxIndication", "duration", "quantity", "refills", "pharmacy",
   "substitution", "prn", "orderDiagnosis", "orderKind", "orderCode", "imagingPriority"]

/-- The chosen value of an order element for one order (`none`: no chosen value). -/
def orderValue (e : ElementId) (o : OrderChoice) : Option Value :=
  if e == "drug" then some (.code o.drug)
  else if e == "dose" then some (.qty o.doseTenths o.unit)
  else if e == "doseUnit" || e == "unit" then some (.code o.unit.name)
  else if e == "route" then some (.code o.route)
  else if e == "freq" || e == "frequency" then some (.code o.freq)
  else if e == "indication" then o.indication?.map .text
  else if e == "abxIndication" then o.indication?.map .code
  else if e == "prn" then some (.code (toString o.prn))
  else if e == "duration" then o.supplyDays?.map (fun n => .code s!"{n} days")
  else if e == "orderKind" then some (.code (match o.kind?.getD .medication with
    | .medication => "medication" | .imaging => "imaging" | .procedure => "procedure"))
  else if e == "orderCode" then o.code?.map .code
  else if e == "imagingPriority" then o.priority?.map .code
  else none

/-- Translate typed world exemption decisions to the hospital's coded
vocabulary. Surgical supply decisions use the current hospital code, surgery-7-day,
with its seven-day bound. The removed surgery-5-day code is not an alias. No note-section strings are interpreted. -/
def curesReason (o : OrderChoice) : Option String := do
  let r ← o.curesExemptReason?
  if r == "ed-supply-7-days-or-less" then
    if o.supplyDays?.any (· ≤ 7) then some "ed-7-day" else none
  else if r == "postoperative-supply-7-days-or-less" then
    if o.supplyDays?.any (· ≤ 7) then some "surgery-7-day" else none
  else if ["admin-in-facility", "ed-7-day", "surgery-7-day", "hospice", "cures-unavailable"].contains r then some r
  else none

/-- A single commit-wide waiver is used only when every controlled order has
the same documented exemption. Mixed or partly exempt prescriptions review
CURES instead of waiving the whole batch from one exempt line. -/
def taskCuresReason (choices : TaskChoices) : Option String := do
  let controlled := choices.orders.filter (fun o => inClass o.drug "controlled-II-IV")
  let first ← controlled.head?
  let reason ← curesReason first
  if controlled.all (fun o => curesReason o == some reason) then some reason else none

/-- Elements filled once per immunization (slot = index). -/
def immunizationElements : List ElementId := ["vaccine", "immunization", "cvx"]

/-- The fixed phrase typed for a note section without supplied text. -/
def noteText (sec : String) : String := sec ++ ": reviewed, see plan."

/-- The text typed for a note section: the task's supplied text, else the fixed phrase. -/
def sectionText (choices : TaskChoices) (sec : String) : String :=
  (((choices.noteTexts?.getD []).find? (·.id == sec)).map (·.text)).getD (noteText sec)

/-- Explicit administration outcomes take priority. Frozen schedules keep their
historical hold data, including the former refusal sentinel, without redrawing them. -/
def administrationOutcome (m : OrderChoice) : AdministrationOutcome :=
  match m.administration? with
  | some a => a.outcome
  | none => if m.holdReason? == some "patient-refused" then .refused
    else if m.holdReason?.isSome then .held else .given

def administrationStatus (m : OrderChoice) : String :=
  match administrationOutcome m with
  | .given => "given" | .held => "held" | .refused => "refused"
  | .notGiven => "not-given" | .delayed => "delayed"

/-- Document the reason and performed follow-up, without converting refusal to hold. -/
def administrationReason (m : OrderChoice) : String :=
  match m.administration? with
  | none => m.holdReason?.getD "scheduled"
  | some a => a.reason ++ (if a.reoffer then "; re-offered within window" else "") ++
    (if a.notifyPrescriber then "; prescriber notified" else "")

def administrationFollowup (m : OrderChoice) : String :=
  match m.administration? with
  | none => ""
  | some a => s!"Dose {a.occurrence}: {administrationStatus m}; {administrationReason m}. " ++
    s!"Scheduled {a.scheduledMin}; attempt {a.attemptMin}; window ends {a.windowEndMin}."

/-- The value of a task-level element. `med?` is the medication given in this
episode (W4), used for order-element names on an administration. -/
def taskValue (facts : Facts) (user : User) (choices : TaskChoices) (med? : Option OrderChoice)
    (el : ElementSpec) : Option Value :=
  match el.kind with
  | .identity => some (.text (identityText facts.identity))
  | .scan t =>
    if t == "wristband" then some (.code facts.patientId)
    else if t == "medication" then facts.medToGive?.map .code
    else some (.code t)
  | .cosign => some (.user (secondUser user))
  | .flag => some (.flag true)
  | _ =>
    if el.id == weightElement || el.id == "dosingWeight" then weightKgGoal facts
    else if el.id == "refillDose" then choices.orders.head?.bind (orderValue "dose")
    else if el.id == "painScore" || el.id == "painReassessment" then choices.painScore?.map (fun n => .code (toString n))
    else if (el.id == "refillReason" || el.id == "refillDenyReason") then
      choices.refillReason?.bind (parseValue el.kind)
    else if el.id == "curesExemptionReason" then
      (taskCuresReason choices).map .code
    else if el.id == "naloxoneOffer" then some (.code
      (if facts.record.lookup "naloxoneOffer" == some "accepted" then "prescribed" else "offered-declined"))
    else if el.id == "adminStatus" then med?.map fun m => .code (administrationStatus m)
    else if el.id == "adminReason" then med?.map fun m => .code (administrationReason m)
    else if ["nursingAssessment", "nursingIntervention", "nursingIncidents"].contains el.id &&
        med?.any (fun m => m.administration?.any (·.notifyPrescriber)) then
      med?.map fun m => .text (administrationFollowup m)
    else if el.id == "refillDecision" then choices.refill?.map .code
    else if el.id == "disposition" || el.id == "dispositionChoice" then choices.disposition?.map .code
    else if choices.noteSections.contains el.id then some (.text (sectionText choices el.id))
    else match med? with
      | some m => orderValue el.id m
      | none => none

/-- A placeholder for "any accepted value" goals (what the simulated clinician
types when the scenario fixes no value). -/
def placeholder (facts : Facts) (user : User) : ValueKind → Value
  | .quantity u => .qty 10 u
  | .medicationDose => .qty 10 .mg
  | .coded _ => .code "other"
  | .text => .text "See note."
  | .flag => .flag true
  | .identity => .text (identityText facts.identity)
  | .scan t => .code (if t == "wristband" then facts.patientId else (facts.medToGive?.getD t))
  | .cosign => .user (secondUser user)

/-- The value a goal asks for, or the placeholder. -/
def goalValue (sp : Spec) (facts : Facts) (user : User) (g : ValueGoal) : Value :=
  match g.value? with
  | some v => v
  | none =>
    match sp.element? g.element with
    | some el => placeholder facts user el.kind
    | none => .text ""

/-! ## Commits per workflow -/

/-- The commits a task needs, by workflow and choices (core-model commit IDs),
keeping only those the spec defines. -/
def taskCommits (sp : Spec) (wf : Workflow) (ch : TaskChoices) : List CommitId :=
  let orders := if ch.orders.isEmpty then [] else ["signOrders"]
  let note := if ch.noteSections.isEmpty then [] else ["signNote"]
  let cand : List CommitId := match wf with
    | .W1 => orders ++ note
    | .W2 => (if ch.ackResult then ["ackResult"] else []) ++ orders
    | .W3 => orders ++ (if ch.disposition?.isSome then ["disposition"] else []) ++ note
    | .W4 => if ch.administer.isEmpty then
        (if ch.noteSections.isEmpty && ch.painScore?.isNone then [] else ["chartAssessment"])
      else ["administerMed"]
    | .W5 => orders ++ (if ch.immunizations.isEmpty then [] else ["recordImmunization"]) ++ note
    | .W6 =>
      orders ++ (if ch.noteSections.contains "opNote" then ["signOpNote"] else []) ++
        (if ch.w6Step? == some .discharge || ch.disposition? == some "discharge" then ["discharge"] else []) ++
        (if ch.w6Step? == some .discharge || ch.w6Step? == some .preop || ch.w6Step? == some .postop ||
          (ch.noteSections.filter (· != "opNote")).isEmpty then [] else ["signNote"])
    | .W7 => match ch.refill? with
      | some "deny" => ["denyRefill"]
      | some "modify" => orders
      | some "approve" =>
        -- Schedule II renewals are new prescriptions, never an eligibility
        -- attestation claiming that a known Schedule II drug is not one.
        if ch.orders.isEmpty then []
        else if ch.orders.any (fun o => inClass o.drug "scheduleII") then orders
        else ["approveRefill"]
      | _ => []
  cand.filter fun c => (sp.commit? c).isSome

/-! ## Required values -/

/-- A state with the chosen order lines (drugs on slots 0, 1, …) and the given
extra captured values, used to evaluate `When` conditions and alert keys. -/
def hypothetical (orders : List OrderChoice) (extra : List ValueGoal) : State :=
  let drugs : List Captured := (List.range orders.length).zip orders |>.filterMap fun (i, o) =>
    if o.kind?.getD .medication != .medication then none else
    some { element := drugElement, slot := i, value := .code o.drug, byHuman := true, confirmed := true }
  let others : List Captured := extra.filterMap fun g =>
    if g.element == drugElement && !orders.isEmpty then none else
    g.value?.map fun v =>
      { element := g.element, slot := g.slot?.getD 0, value := v, byHuman := true, confirmed := true }
  { screen := "", history := [], captured := drugs ++ others, receipts := [], acked := []
    commits := [], expanded := [], tabSel := [], currentSlot := 0, clock := 0 }

/-- The value goals one entry requirement creates. -/
def entryGoals (facts : Facts) (user : User) (choices : TaskChoices) (med? : Option OrderChoice)
    (orders : List OrderChoice) (hyp : State) (el : ElementSpec) (rq : EntryReq) : List ValueGoal :=
  let lines := ((List.range orders.length).zip orders).filter fun (_, o) =>
    if el.id == "orderKind" || el.id == "orderCode" then o.kind?.getD .medication != .medication
    else o.kind?.getD .medication == .medication
  if orderElements.contains el.id && !orders.isEmpty then
    lines.filterMap fun (i, o) =>
      if (rq.perOrderLine && !lineMatches facts hyp rq.when i o.drug) ||
         (!rq.perOrderLine && !whenHolds facts hyp rq.when) then none
      else some { element := el.id, slot? := some i, value? := orderValue el.id o, commit := rq.commit }
  else if rq.perOrderLine then
    lines.filterMap fun (i, o) =>
      if lineMatches facts hyp rq.when i o.drug then
        some { element := el.id, slot? := some i, value? := taskValue facts user choices med? el
               commit := rq.commit }
      else none
  else if !whenHolds facts hyp rq.when then []
  else if immunizationElements.contains el.id && !choices.immunizations.isEmpty then
    (List.range choices.immunizations.length).zip choices.immunizations |>.map fun (i, c) =>
      { element := el.id, slot? := some i, value? := some (.code c), commit := rq.commit }
  else [{ element := el.id, value? := taskValue facts user choices med? el, commit := rq.commit }]

/-- Keep the first goal per (element, slot). -/
def dedupGoals (gs : List ValueGoal) : List ValueGoal :=
  (gs.foldl (fun acc g =>
    if acc.any (fun h => h.element == g.element && h.slot? == g.slot?) then acc else g :: acc) []).reverse

/-- Preserve explicit clinical choices even when the spec cannot accept them.
An incompatible choice must remain incomplete, never become a different dose. -/
def checkFit (sp : Spec) (facts : Facts) (user : User) (g : ValueGoal) : ValueGoal × List String :=
  match g.value?, sp.element? g.element with
  | some v, some el =>
    if valueSatisfies facts user el.kind v then (g, [])
    else (g, [s!"choice for {g.element} does not fit the spec ({repr v}); preserving chosen value"])
  | _, none => (g, [s!"element {g.element} is not in the spec"])
  | none, _ => (g, [])

/-- Capture dependencies of a clinical predicate. A scenario-supplied choice
must actually be entered before it can make another requirement inapplicable. -/
def predicateCaptures : ClinicalPredicate → List (ElementId × Nat)
  | .capturedCode e slot _ => [(e, slot)]
  | .and l r | .or l r => predicateCaptures l ++ predicateCaptures r
  | .not p => predicateCaptures p
  | _ => []

def whenCaptures : When → List (ElementId × Nat)
  | .clinical p => predicateCaptures p
  | _ => []

/-- Keep scenario-chosen predicate inputs as real goals, even when the spec
uses them only as conditions. Unknown record facts stay unknown. -/
def clinicalChoiceGoals (sp : Spec) (facts : Facts) (user : User)
    (choices : TaskChoices) (med? : Option OrderChoice) (commits : List CommitId) : List ValueGoal :=
  dedupGoals <| commits.flatMap fun cm =>
    let entries := (sp.entries.filter (·.commit == cm)).flatMap (fun r => whenCaptures r.when)
    let reviews := (sp.reviews.filter (·.commit == cm)).flatMap (fun r => whenCaptures r.when)
    let temporal := ((sp.commit? cm).bind (·.temporal?) |>.getD []).flatMap
      (fun r => r.when?.toList.flatMap predicateCaptures)
    let expiry := ((sp.commit? cm).bind (·.expiry?) |>.getD []).flatMap
      (fun r => r.when?.toList.flatMap predicateCaptures)
    let displays := (sp.displays?.getD []).flatMap fun r =>
      if displayScopeActive facts (some cm) r.scope then r.when?.toList.flatMap predicateCaptures else []
    let alerts := (sp.alerts.filter (·.commit == cm)).flatMap fun a =>
      match a.cond with | .clinical p => predicateCaptures p | _ => []
    (entries ++ reviews ++ temporal ++ expiry ++ displays ++ alerts).filterMap fun (e, slot) => do
      let el ← sp.element? e
      let value ← (choices.orders[slot]?.bind (orderValue e)).or (taskValue facts user choices med? el)
      -- capturedCode can only use a code; do not turn an arbitrary placeholder
      -- into clinical evidence for a condition.
      let .code _ := value | none
      pure { element := e, slot? := some slot, value? := some value, commit := cm }

/-- A condition's exact-slot capture can also satisfy an any-slot entry.
Keep the exact binding, so an earlier field on another slot cannot satisfy the
planner's goal while leaving the clinical predicate unknown. -/
def mergeClinicalGoals (base clinical : List ValueGoal) : List ValueGoal :=
  if clinical.isEmpty then base else
  let base := base.filter fun b => !(b.slot?.isNone && clinical.any (fun g =>
    g.element == b.element && (b.value?.isNone || b.value? == g.value?)))
  dedupGoals (clinical ++ base)

/-- Construct candidates only for unspecified values. Every candidate is checked
by Core's validator below; this is not a second implementation of validation. -/
def validationCandidates (facts : Facts) (hyp : State) (slot : Nat) : Validation → List Value
  | .codeMember system version => (facts.codeTables?.getD []).flatMap fun table =>
      if table.system == system && table.version == version then table.codes.map .code else []
  | .quantityRange unit lo hi => [.qty lo unit, .qty hi unit]
  | .formulationUnit e pairs => pairs.filterMap fun (code, unit) =>
      if validationCapture hyp slot e == some (.code code) then some (.qty 10 unit) else none
  | .doseByWeight weight factor cap unit =>
      match validationCapture hyp 0 weight with
      | some (.qty w .kg) => [.qty (min cap (w * factor / 10)) unit]
      | _ => []
  | .supplyDaysCeil quantity dose frequency =>
      match validationCapture hyp slot quantity, validationCapture hyp slot dose,
          validationCapture hyp slot frequency with
      | some (.qty q u), some (.qty d u'), some (.code f) =>
          match freqPerDay f with
          | some n => if u == u' && 0 < d && 0 < n then
              [.qty (((q + d * n - 1) / (d * n)) * 10) .none] else []
          | none => []
      | _, _, _ => []
  | .and l r => validationCandidates facts hyp slot l ++ validationCandidates facts hyp slot r
  | _ => []

/-- Resolve every applicable allowed-value constraint for an otherwise
unspecified entry. Explicit clinical choices are preserved and a conflict is
reported, rather than silently changed to make a guard pass. -/
def constrainGoal (sp : Spec) (facts : Facts) (user : User) (hyp : State)
    (g : ValueGoal) : ValueGoal × List String :=
  match sp.element? g.element with
  | none => (g, [])
  | some el =>
    let requirements := sp.entries.filter fun rq =>
      rq.commit == g.commit && rq.element == g.element &&
        (if rq.perOrderLine then (orderLines hyp).any fun (slot, drug) =>
          (g.slot?.isNone || g.slot? == some slot) && lineMatches facts hyp rq.when slot drug
         else whenHolds facts hyp rq.when)
    let fits := fun v => valueSatisfies facts user el.kind v &&
      elementValueValid facts hyp el (g.slot?.getD 0) v &&
      requirements.all (fun rq => entryValueAllowed el rq.allowed? v)
    if requirements.all (·.allowed?.isNone) && el.validation?.isNone then (g, []) else
    match g.value? with
    | some v => if fits v then (g, []) else
        (g, [s!"chosen value for {g.element} conflicts with a value or validation requirement"])
    | none =>
      let candidates := (requirements.flatMap fun rq =>
        (rq.allowed?.getD []).filterMap (parseValue el.kind)) ++
        (el.defaultValue?.bind (parseValue el.kind)).toList ++
        (el.recordFact?.bind (recordValue facts el.kind)).toList ++
        [placeholder facts user el.kind] ++
        (el.validation?.toList.flatMap (validationCandidates facts hyp (g.slot?.getD 0)))
      match candidates.find? (fun v => valueSatisfies facts user el.kind v && fits v) with
      | some v => ({ g with value? := some v }, [])
      | none => (g, [s!"no candidate for {g.element} satisfies all applicable value and validation requirements"])

/-- **The goals of one episode.** `orders` are the order lines (empty for an
administration); `med?` is the medication given (W4). `facts` must already be
the episode's facts (e.g. `medToGive?` set for W4). -/
def deriveGoals (sp : Spec) (facts : Facts) (user : User) (wf : Workflow) (choices : TaskChoices)
    (orders : List OrderChoice) (med? : Option OrderChoice)
    (informationDisplay? : Option Render.Display := none) : Goals :=
  let commits := taskCommits sp wf choices
  let orderGoals := (List.range orders.length).zip orders |>.flatMap fun (i, o) =>
    orderElements.filterMap fun e => (orderValue e o).map fun v =>
      { element := e, slot? := some i, value? := some v, commit := "" : ValueGoal }
  let clinical := clinicalChoiceGoals sp facts user choices med? commits
  let hyp0 := hypothetical orders (dedupGoals (orderGoals ++ clinical))
  let raw := commits.flatMap fun c =>
    (sp.entries.filter (·.commit == c)).flatMap fun rq =>
      match sp.element? rq.element with
      | some el => entryGoals facts user choices med? orders hyp0 el rq
      | none => []
  -- Core's currentLineComplete checks every per-line requirement, including
  -- other signing artifacts, before advancing. These captures are necessary
  -- to reach a later chosen slot, even on an ordinary prescription task.
  let advance := if !commits.contains "signOrders" then [] else
    sp.entries.filter (fun rq => rq.perOrderLine && !commits.contains rq.commit) |>.flatMap fun rq =>
      match sp.element? rq.element with
      | none => []
      | some el =>
        (entryGoals facts user choices med? orders hyp0 el { rq with commit := "signOrders" }).filter
          (fun g => g.slot?.any (fun n => n + 1 < orders.length))
  let explicitChoices : List ValueGoal :=
    let pain := match choices.painScore?, commits.head? with
      | some score, some cm =>
        if wf == .W4 && choices.administer.isEmpty then [] else
        [{ element := "painScore", value? := some (.code (toString score)), commit := cm }]
      | _, _ => []
    let reason := if wf == .W7 then match choices.refillReason?, commits.head? with
      | some reason, some cm =>
        let e := if choices.refill? == some "deny" then "refillDenyReason" else "refillNote"
        [{ element := e, value? := some ((sp.element? e).bind
            (fun el => parseValue el.kind reason) |>.getD (.text reason)), commit := cm }]
      | _, _ => []
      else []
    pain ++ reason
  let waiver := sp.reviews.flatMap fun rq =>
    if !commits.contains rq.commit || !whenHolds facts hyp0 rq.when then [] else
    match rq.waivedBy?, taskCuresReason choices with
    | some e, some reason => [{ element := e, value? := some (.code reason), commit := rq.commit }]
    | _, _ => []
  let services := ((List.range orders.length).zip orders).flatMap fun (i, o) =>
    if o.kind?.getD .medication == .medication then [] else
    -- Imaging priority is entered only when chosen and the release declares it.
    (["orderKind", "orderCode"] ++
      (if o.priority?.isSome && (sp.element? "imagingPriority").isSome then ["imagingPriority"] else [])).map fun e =>
      { element := e, slot? := some i, value? := orderValue e o, commit := "signOrders" : ValueGoal }
  let base := dedupGoals (raw ++ advance ++ explicitChoices ++ services)
  let fitted := (mergeClinicalGoals base clinical).map (checkFit sp facts user)
  let hypValues := hypothetical orders (dedupGoals (orderGoals ++ fitted.map (·.1)))
  let checked := fitted.map fun (g, problems) =>
    let (g, constraints) := constrainGoal sp facts user hypValues g
    (g, problems ++ constraints)
  let checkedWaivers := (dedupGoals waiver).map (checkFit sp facts user)
  let values := checked.map (·.1)
  -- Final alerts use the values actually required by this task, not uncaptured
  -- order choices. Refill approval requires the requested drug.
  let hyp := hypothetical [] (values.map fun g =>
    { g with value? := some (goalValue sp facts user g) })
  let acks := sp.alerts.flatMap fun al =>
    if al.tier == .interruptive && commits.contains al.commit then
      (alertKeys facts hyp al.cond).map (al.id, ·)
    else []
  let assumptions := if values.any (·.element == "naloxoneOffer") &&
    (facts.record.lookup "naloxoneOffer").isNone then
      ["naloxone response unspecified; modeling offered-declined"] else []
  let missing := if commits.isEmpty then [s!"no commit in spec {sp.version} for workflow {repr wf}"] else []
  {
    informationNeeds := informationDisplay?.map (fun d => Information.derive facts d commits orders med? choices.ackResult) |>.getD [],
    informationDisplay := informationDisplay?.getD Render.Display.empty,
    commits, values, waivers := checkedWaivers.map (·.1), expectedAcks := acks,
    problems := missing ++ assumptions ++ checked.flatMap (·.2) ++ checkedWaivers.flatMap (·.2) }

/-- An episode resets captures/commits while keeping the day's review receipts.
W4 medications and W5 vaccines each require their own commit. -/
structure Episode where
  facts : Facts
  choices : TaskChoices
  orders : List OrderChoice
  med? : Option OrderChoice := none

/-- Typed episode context: pre-op requirements must never depend on a screen
name or overloaded note-section strings. -/
def episodeFacts (facts : Facts) (ch : TaskChoices) : Facts :=
  match ch.w6Step? with
  | none => facts
  | some stage => { facts with encounterKind? := some (match stage with
    | .consult => "consult" | .preop => "preop" | .postop => "postop"
    | .rounding => "rounding" | .discharge => "discharge") }

def episodes (facts : Facts) (wf : Workflow) (ch : TaskChoices) : List Episode :=
  let facts := episodeFacts facts ch
  match wf with
  | .W4 =>
    let meds := ch.administer.map fun m =>
      { facts := { facts with medToGive? := some m.drug },
        choices := { ch with administer := [m], noteSections := [] }, orders := [], med? := some m : Episode }
    let assessment := if ch.noteSections.isEmpty && (!ch.administer.isEmpty || ch.painScore?.isNone) then [] else
      [{ facts, choices := { ch with administer := [] }, orders := [] }]
    let followups := ch.administer.filterMap fun m =>
      if m.administration?.any (·.notifyPrescriber) then
        some ({ facts := facts
                choices := { ch with administer := [], noteSections := ["nursingAssessment"] }
                orders := [], med? := some m } : Episode)
      else none
    meds ++ followups ++ assessment
  | .W5 =>
    let medical := if ch.orders.isEmpty && (ch.noteSections.filter (· != "visGiven")).isEmpty &&
      (!ch.immunizations.isEmpty || ch.noteSections.isEmpty) then [] else
      [{ facts, choices := { ch with immunizations := [] }, orders := ch.orders }]
    let vaccines := ch.immunizations.map fun v =>
      { facts, choices := { ch with orders := [], immunizations := [v], noteSections := [] }, orders := [] : Episode }
    medical ++ vaccines
  | _ => [{ facts, choices := ch, orders := ch.orders }]

/-! ## Meeting the goals -/

/-- A captured value meets a value goal: right element and slot, confirmed,
valid for the element (unit, flag, identity, scan, cosign), entered by a
human if the element is human-only, and equal to the chosen value if any. -/
def capturedMeets (facts : Facts) (user : User) (el : ElementSpec) (g : ValueGoal) (x : Captured) :
    Bool :=
  x.element == g.element && (match g.slot? with | some n => x.slot == n | none => true) &&
    capturedSatisfies facts user el x && (match g.value? with | some v => x.value == v | none => true)

/-- The value goal is met in this state. -/
def valueGoalMet (sp : Spec) (facts : Facts) (user : User) (s : State) (g : ValueGoal) : Bool :=
  match sp.element? g.element with
  | some el => s.captured.any fun x => capturedMeets facts user el g x &&
      elementValueValid facts s el x.slot x.value
  | none => false

/-- All value goals of commit `c` are met. -/
def commitValuesMet (sp : Spec) (facts : Facts) (user : User) (g : Goals) (s : State)
    (c : CommitId) : Bool :=
  g.values.all fun v => v.commit != c || valueGoalMet sp facts user s v

/-- **The task is complete:** every goal commit is done and every value goal
is met. -/
def goalsMet (sp : Spec) (facts : Facts) (user : User) (g : Goals) (s : State) : Bool :=
  !g.commits.isEmpty && g.commits.all (s.commits.contains ·) &&
    g.values.all (valueGoalMet sp facts user s)

end Ehr.Sim
