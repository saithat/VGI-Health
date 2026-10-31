import Ehr.Core.Json
import Ehr.Core.Guard

/-!
# Task goals

What a clinician must achieve in one task, derived from the task's clinical
choices and the spec. The choices are fixed per scenario, so the goals do not
depend on the UI program: the same goals are used for every program version.

A task's goals are:
- the **commits** to perform (e.g. `signOrders`), chosen from the workflow and
  the choices, keeping only commits the spec knows;
- the **values** to capture: one `ValueGoal` per required element (per order
  line for order elements such as drug, dose, route, frequency, indication).
  Required means: an entry requirement of a goal commit that applies when the
  chosen orders are in place. Patient-ID re-entry, scans, and cosigns are
  values too (their correct value comes from the facts and the user);
- the **expected acknowledgments**: interruptive alerts that will fire at the
  goal commits with the chosen values (used by the floor; acks are obstacles,
  not goals);
- **problems**: choices that do not fit the spec (reported as complaints).

Element-ID conventions (agreed names; unknown names fall back to "any value"):
order elements `drug`, `dose`, `doseUnit`/`unit`, `route`, `freq`/`frequency`,
`indication`/`abxIndication`; task elements `weight`, `refillDecision`,
`disposition`, note sections (element ID = section name in `noteSections`),
and `vaccine`/`immunization`/`cvx` (one slot per immunization).
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
  commits : List CommitId
  values : List ValueGoal
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
  ["drug", "dose", "doseUnit", "unit", "route", "freq", "frequency", "indication", "abxIndication"]

/-- The chosen value of an order element for one order (`none`: no chosen value). -/
def orderValue (e : ElementId) (o : OrderChoice) : Option Value :=
  if e == "drug" then some (.code o.drug)
  else if e == "dose" then some (.qty o.doseTenths o.unit)
  else if e == "doseUnit" || e == "unit" then some (.code o.unit.name)
  else if e == "route" then some (.code o.route)
  else if e == "freq" || e == "frequency" then some (.code o.freq)
  else if e == "indication" || e == "abxIndication" then o.indication?.map .code
  else none

/-- Elements filled once per immunization (slot = index). -/
def immunizationElements : List ElementId := ["vaccine", "immunization", "cvx"]

/-- The text typed for a note section. -/
def noteText (sec : String) : String := sec ++ ": reviewed, see plan."

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
    if el.id == weightElement then weightKgGoal facts
    else if el.id == "refillDecision" then choices.refill?.map .code
    else if el.id == "disposition" then choices.disposition?.map .code
    else if choices.noteSections.contains el.id then some (.text (noteText el.id))
    else match med? with
      | some m => orderValue el.id m
      | none => none

/-- A placeholder for "any accepted value" goals (what the simulated clinician
types when the scenario fixes no value). -/
def placeholder (facts : Facts) (user : User) : ValueKind → Value
  | .quantity u => .qty 10 u
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
    | .W4 => if ch.administer.isEmpty then [] else ["administerMed"]
    | .W5 => orders ++ (if ch.immunizations.isEmpty then [] else ["recordImmunization"]) ++ note
    | .W6 =>
      orders ++ (if ch.noteSections.contains "opNote" then ["signOpNote"] else []) ++
        (if ch.disposition? == some "discharge" then ["discharge"] else []) ++
        (if (ch.noteSections.filter (· != "opNote")).isEmpty then [] else ["signNote"])
    | .W7 => if ch.refill?.isSome then ["approveRefill"] else []
  cand.filter fun c => (sp.commit? c).isSome

/-! ## Required values -/

/-- A state with the chosen order lines (drugs on slots 0, 1, …) and the given
extra captured values, used to evaluate `When` conditions and alert keys. -/
def hypothetical (orders : List OrderChoice) (extra : List ValueGoal) : State :=
  let drugs : List Captured := (List.range orders.length).zip orders |>.map fun (i, o) =>
    { element := drugElement, slot := i, value := .code o.drug, byHuman := true, confirmed := true }
  let others : List Captured := extra.filterMap fun g =>
    if g.element == drugElement then none else
    g.value?.map fun v =>
      { element := g.element, slot := g.slot?.getD 0, value := v, byHuman := true, confirmed := true }
  { screen := "", history := [], captured := drugs ++ others, receipts := [], acked := []
    commits := [], expanded := [], tabSel := [], currentSlot := 0, clock := 0 }

/-- The value goals one entry requirement creates. -/
def entryGoals (facts : Facts) (user : User) (choices : TaskChoices) (med? : Option OrderChoice)
    (orders : List OrderChoice) (hyp : State) (el : ElementSpec) (rq : EntryReq) : List ValueGoal :=
  let lines := (List.range orders.length).zip orders
  if orderElements.contains el.id && !orders.isEmpty then
    lines.filterMap fun (i, o) =>
      if (rq.perOrderLine && !lineMatches facts rq.when o.drug) ||
         (!rq.perOrderLine && !whenHolds facts hyp rq.when) then none
      else some { element := el.id, slot? := some i, value? := orderValue el.id o, commit := rq.commit }
  else if rq.perOrderLine then
    lines.filterMap fun (i, o) =>
      if lineMatches facts rq.when o.drug then
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

/-- Replace values that the element kind can never accept by "any value", and
say why. -/
def checkFit (sp : Spec) (facts : Facts) (user : User) (g : ValueGoal) : ValueGoal × List String :=
  match g.value?, sp.element? g.element with
  | some v, some el =>
    if valueSatisfies facts user el.kind v then (g, [])
    else ({ g with value? := none },
          [s!"choice for {g.element} does not fit the spec ({repr v}); using any accepted value"])
  | _, none => (g, [s!"element {g.element} is not in the spec"])
  | none, _ => (g, [])

/-- **The goals of one episode.** `orders` are the order lines (empty for an
administration); `med?` is the medication given (W4). `facts` must already be
the episode's facts (e.g. `medToGive?` set for W4). -/
def deriveGoals (sp : Spec) (facts : Facts) (user : User) (wf : Workflow) (choices : TaskChoices)
    (orders : List OrderChoice) (med? : Option OrderChoice) : Goals :=
  let commits := taskCommits sp wf choices
  let hyp0 := hypothetical orders []
  let raw := commits.flatMap fun c =>
    (sp.entries.filter (·.commit == c)).flatMap fun rq =>
      match sp.element? rq.element with
      | some el => entryGoals facts user choices med? orders hyp0 el rq
      | none => []
  let checked := (dedupGoals raw).map (checkFit sp facts user)
  let values := checked.map (·.1)
  let hyp := hypothetical orders values
  let acks := sp.alerts.flatMap fun al =>
    if al.tier == .interruptive && commits.contains al.commit then
      (alertKeys facts hyp al.cond).map (al.id, ·)
    else []
  let missing := if commits.isEmpty then [s!"no commit in spec {sp.version} for workflow {repr wf}"] else []
  { commits, values, expectedAcks := acks, problems := missing ++ checked.flatMap (·.2) }

/-- The episodes of a task: one per medication for W4 (each with
`medToGive?` set), otherwise one. Each is `(facts, orders, med?)`. -/
def episodes (facts : Facts) (wf : Workflow) (ch : TaskChoices) :
    List (Facts × List OrderChoice × Option OrderChoice) :=
  match wf with
  | .W4 => ch.administer.map fun m => ({ facts with medToGive? := some m.drug }, [], some m)
  | _ => [(facts, ch.orders, none)]

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
  | some el => s.captured.any (capturedMeets facts user el g)
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
