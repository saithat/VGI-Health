import Ehr.Core.Alerts

/-!
# The commit guard

A commit `c` happens only if, in the current state:
1. the user's role may perform `c`;
2. every entry requirement for `c` that applies is met: the element is
   captured, confirmed, valid (the right unit, a checked flag, a matching
   identity, a different cosigner, a matching scan), and, for a human-only
   element, entered by a human;
3. every review requirement for `c` that applies is met: the info is shown on
   the current screen, or (for `shownOrReceipt`) a valid receipt covers it;
4. every interruptive alert concerning `c` is acknowledged for each key.

Items 1–3 are `guardBase`; item 4 is `alertsAcked`. Theorem T0 says a commit
happens only when `commitGuard` (all four) holds.
-/

namespace Ehr

/-- A component's own "shown" test: layout visibility and, for an alert, its
condition holds (A2). `comps` are the components of the current screen. -/
def compShown (sp : Spec) (facts : Facts) (s : State) (comps : List Component)
    (c : Component) : Bool :=
  layoutShown sp facts s comps c &&
    match c.kind with
    | .alert a _ => alertHolds sp facts s a
    | _ => true

/-- The shown component with this ID on the current screen, if any. -/
def shownComp? (sp : Spec) (prog : Program) (facts : Facts) (s : State) (cid : CompId) :
    Option Component :=
  let comps := prog.compsOf s.screen
  comps.find? fun c => c.id == cid && compShown sp facts s comps c

/-- The component kind displays this info. -/
def showsInfo (i : InfoId) : Kind → Bool
  | .panel j | .table j | .trend j => j == i
  | .banner => i == bannerInfo
  | _ => false

/-- The info is shown on the current screen. -/
def infoShown (sp : Spec) (prog : Program) (facts : Facts) (s : State) (i : InfoId) : Bool :=
  let comps := prog.compsOf s.screen
  comps.any fun c => showsInfo i c.kind && layoutShown sp facts s comps c

/-- A `When` condition holds now. -/
def whenHolds (facts : Facts) (s : State) : When → Bool
  | .always => true
  | .orderClass cls => (orderLines s).any (fun p => inClass p.2 cls)
  | .medClass cls =>
    match facts.medToGive? with
    | some d => inClass d cls
    | none => false
  | .highAlertMed => (drugsInPlay facts s).any isHighAlert
  | .abnormalResult => facts.abnormalResult
  | .naloxoneRisk => (orderLines s).any (fun p => naloxoneLine facts s p.1 p.2)

/-- A `When` condition holds for one order line (slot, drug `d`), used by
per-order-line requirements. -/
def lineMatches (facts : Facts) (s : State) (w : When) (slot : Nat) (d : String) : Bool :=
  match w with
  | .always => true
  | .orderClass cls => inClass d cls
  | .medClass cls =>
    match facts.medToGive? with
    | some m => inClass m cls
    | none => false
  | .highAlertMed => isHighAlert d
  | .abnormalResult => facts.abnormalResult
  | .naloxoneRisk => naloxoneLine facts s slot d

/-- A captured value meets a requirement for element `el`: confirmed, valid,
and entered by a human if the element is human-only. -/
def capturedSatisfies (facts : Facts) (user : User) (el : ElementSpec) (x : Captured) : Bool :=
  x.confirmed && valueSatisfies facts user el.kind x.value && (!needsHuman el || x.byHuman)

/-- Some captured value for `el` meets the requirement, on slot `slot` (or on
any slot if `slot = none`). -/
def hasGoodEntry (facts : Facts) (user : User) (s : State) (el : ElementSpec)
    (slot : Option Nat) : Bool :=
  s.captured.any fun x =>
    x.element == el.id && (match slot with | some n => x.slot == n | none => true) &&
      capturedSatisfies facts user el x

/-- An entry requirement is met. Per-order-line: every order line matching
`when` has a good entry on its slot. Otherwise: if `when` holds, some slot has
a good entry. An element missing from the spec is never met. -/
def entryMet (sp : Spec) (facts : Facts) (user : User) (s : State) (rq : EntryReq) : Bool :=
  match sp.element? rq.element with
  | none => false
  | some el =>
    if rq.perOrderLine then
      (orderLines s).all fun p => !lineMatches facts s rq.when p.1 p.2 || hasGoodEntry facts user s el (some p.1)
    else
      !whenHolds facts s rq.when || hasGoodEntry facts user s el none

/-- A value is non-empty: a non-empty code, text, or user; a checked flag; or
any quantity. -/
def Value.nonEmpty : Value → Bool
  | .qty _ _ => true
  | .code c => !c.isEmpty
  | .text t => !t.isEmpty
  | .flag b => b
  | .user u => !u.isEmpty

/-- The waiver element was entered by a human in this episode, is confirmed,
and is non-empty. -/
def waived (s : State) : Option ElementId → Bool
  | some e => s.captured.any fun x => x.element == e && x.byHuman && x.confirmed && x.value.nonEmpty
  | none => false

/-- A review requirement is met: it does not apply; or the info is shown on
the current screen; or (for `shownOrReceipt`) a valid receipt covers it; or
its `waivedBy?` element was entered by a human (confirmed, non-empty). -/
def reviewMet (sp : Spec) (prog : Program) (facts : Facts) (s : State) (rq : ReviewReq) : Bool :=
  !whenHolds facts s rq.when || infoShown sp prog facts s rq.info ||
    (match rq.mode with
     | .shownOnCommit => false
     | .shownOrReceipt w roles => s.receipts.any (receiptValid sp facts (nowMin facts s) rq.info w roles)) ||
    waived s rq.waivedBy?

/-- The user's role may perform the commit (unknown commits: no). -/
def roleOk (sp : Spec) (user : User) (c : CommitId) : Bool :=
  match sp.commit? c with
  | some cs => cs.roles.contains user.role
  | none => false

/-- All entry requirements for `c` are met. -/
def entriesOk (sp : Spec) (facts : Facts) (user : User) (s : State) (c : CommitId) : Bool :=
  sp.entries.all fun rq => rq.commit != c || entryMet sp facts user s rq

/-- All review requirements for `c` are met. -/
def reviewsOk (sp : Spec) (prog : Program) (facts : Facts) (s : State) (c : CommitId) : Bool :=
  sp.reviews.all fun rq => rq.commit != c || reviewMet sp prog facts s rq

/-- Guard items 1–3: role, entries, reviews. -/
def guardBase (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (c : CommitId) : Bool :=
  roleOk sp user c && entriesOk sp facts user s c && reviewsOk sp prog facts s c

/-- The full commit guard: role, entries, reviews, and interruptive alerts
acknowledged. -/
def commitGuard (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (c : CommitId) : Bool :=
  guardBase sp prog facts user s c && alertsAcked sp facts s c

/-- Why an unmet entry requirement is unmet, in words. -/
def entryReason (sp : Spec) (facts : Facts) (user : User) (s : State) (rq : EntryReq) : String :=
  match sp.element? rq.element with
  | none => s!"entry required: unknown element {rq.element}"
  | some el =>
    let mine := s.captured.filter (·.element == el.id)
    let unitHint := match el.kind with
      | .quantity u => s!" (must be in {u.name})"
      | _ => ""
    if mine.isEmpty then s!"entry required: {el.id}"
    else if mine.all (fun x => !x.confirmed) then s!"confirm required: {el.id}"
    else if mine.any (fun x => x.confirmed && !valueSatisfies facts user el.kind x.value) then
      s!"invalid value: {el.id}{unitHint}"
    else if needsHuman el then s!"human entry required: {el.id}"
    else s!"entry required: {el.id}"

/-- Why `guardBase` fails, in words (the first failing item). -/
def guardReason (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (c : CommitId) : String :=
  if !roleOk sp user c then s!"role: {user.role.name} may not perform {c}"
  else
    match sp.entries.find? (fun rq => rq.commit == c && !entryMet sp facts user s rq) with
    | some rq => entryReason sp facts user s rq
    | none =>
      match sp.reviews.find? (fun rq => rq.commit == c && !reviewMet sp prog facts s rq) with
      | some rq => s!"review required: {rq.info} must be shown" ++
          (match rq.mode with
           | .shownOnCommit => ""
           | .shownOrReceipt _ _ => " or covered by a valid receipt") ++
          (match rq.waivedBy? with
           | some e => s!" (or a reason entered in {e})"
           | none => "")
      | none => "guard"

end Ehr
