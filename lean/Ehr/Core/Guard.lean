import Ehr.Core.Alerts

/-!
# The commit guard

A commit `c` happens only if, in the current state:
1. the user's role may perform `c` in this encounter;
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

/-- The info is shown on the current screen. -/
def infoShown (sp : Spec) (prog : Program) (facts : Facts) (s : State) (i : InfoId) : Bool :=
  let comps := prog.compsOf s.screen
  comps.any fun c => showsInfo i c.kind && layoutShown sp facts s comps c

/-- The drug has a weight-based dose range in the formulary. -/
def weightBasedDrug (d : String) : Bool :=
  match lookupDrug d with
  | some di => 0 < di.maxMgPerKgTenths
  | none => false

/-- A passive-alert target is a workflow, so renaming a screen does not evade it. -/
def AlertSpec.targetsScreen (a : AlertSpec) (sc : Screen) : Bool :=
  a.screens.contains sc.workflow

/-- A `When` condition holds now. -/
def whenHolds (facts : Facts) (s : State) : When → Bool
  | .clinical p => clinicalApplies facts s p
  | .always => true
  | .orderClass cls | .drugClass cls => (orderLines s).any (fun p => inClass p.2 cls)
  | .medClass cls =>
    match facts.medToGive? with
    | some d => inClass d cls
    | none => false
  | .highAlertMed => (drugsInPlay facts s).any isHighAlert
  | .abnormalResult => facts.abnormalResult
  | .encounter kind => encounterMatches facts.encounterKind? kind
  | .weightBased => (orderLines s).any (fun p => weightBasedDrug p.2)
  | .naloxoneRisk => (orderLines s).any (fun p => naloxoneLine facts s p.1 p.2)

/-- A `When` condition holds for one order line (slot, drug `d`), used by
per-order-line requirements. -/
def lineMatches (facts : Facts) (s : State) (w : When) (slot : Nat) (d : String) : Bool :=
  match w with
  | .clinical p => clinicalApplies facts s p
  | .always => true
  | .orderClass cls | .drugClass cls => inClass d cls
  | .medClass cls =>
    match facts.medToGive? with
    | some m => inClass m cls
    | none => false
  | .highAlertMed => isHighAlert d
  | .abnormalResult => facts.abnormalResult
  | .encounter kind => encounterMatches facts.encounterKind? kind
  | .weightBased => weightBasedDrug d
  | .naloxoneRisk => naloxoneLine facts s slot d

/-- A captured value meets a requirement for element `el`: confirmed, valid,
and entered by a human if the element is human-only. -/
def capturedSatisfies (facts : Facts) (user : User) (el : ElementSpec) (x : Captured) : Bool :=
  x.confirmed && valueSatisfies facts user el.kind x.value && (!needsHuman el || x.byHuman)

/-- The value equals an allowed string parsed using the element's kind.
No constraint permits every value; an empty allowed list permits none.
Quantity parsing preserves the required unit; normal validity still applies. -/
def entryValueAllowed (el : ElementSpec) (allowed : Option (List String)) (v : Value) : Bool :=
  match allowed with
  | none => true
  | some values => values.any fun a => parseValue el.kind a == some v

/-- Some captured value for `el` meets the requirement and its value constraint,
on slot `slot` (or on any slot if `slot = none`). All checks use the same capture. -/
def hasGoodEntry (facts : Facts) (user : User) (s : State) (el : ElementSpec)
    (slot : Option Nat) (allowed : Option (List String) := none) : Bool :=
  s.captured.any fun x =>
    x.element == el.id && (match slot with | some n => x.slot == n | none => true) &&
      capturedSatisfies facts user el x && entryValueAllowed el allowed x.value

/-- A value is non-empty: a non-empty code, text, or user; a checked flag; or
any quantity. -/
def Value.nonEmpty : Value → Bool
  | .qty _ _ => true
  | .code c => !c.isEmpty
  | .text t => !t.isEmpty
  | .flag b => b
  | .user u => !u.isEmpty

/-- An attestation is a valid, confirmed human capture by an authorized role. -/
def humanWaiverMet (sp : Spec) (facts : Facts) (user : User) (s : State)
    (waiver : Option ElementId) : Bool :=
  waiver.any fun id => (sp.element? id).any fun el =>
    el.enteredBy.contains user.role && s.captured.any fun x =>
      x.element == id && x.byHuman && x.confirmed && x.value.nonEmpty &&
      valueSatisfies facts user el.kind x.value

/-- Only scalar text/flag attestations can be waived. Units, cosigns and per-line
captures always keep their direct checks. -/
def entryWaiver (sp : Spec) (facts : Facts) (user : User) (s : State) (rq : EntryReq) : Bool :=
  !rq.perOrderLine && (sp.element? rq.element).any (fun el => match el.kind with
    | .text | .flag => true | _ => false) && humanWaiverMet sp facts user s rq.waivedBy?

/-- An entry requirement is met. Per-order-line: every order line matching
`when` has a good entry on its slot. Otherwise: if `when` holds, some slot has
a good entry. An element missing from the spec is never met. -/
def entryDirectMet (sp : Spec) (facts : Facts) (user : User) (s : State) (rq : EntryReq) : Bool :=
  match sp.element? rq.element with
  | none => false
  | some el =>
    if rq.perOrderLine then
      (orderLines s).all fun p => !lineMatches facts s rq.when p.1 p.2 || hasGoodEntry facts user s el (some p.1) rq.allowed?
    else
      !whenHolds facts s rq.when || hasGoodEntry facts user s el none rq.allowed?

/-- An entry is directly captured or replaced by its declared human attestation. -/
def entryMet (sp : Spec) (facts : Facts) (user : User) (s : State) (rq : EntryReq) : Bool :=
  entryWaiver sp facts user s rq || entryDirectMet sp facts user s rq

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

/-- The declared cosign route is available to this role. -/
def encounterRouteAvailable (sp : Spec) (role : Role) (rule : EncounterRoleRule) : Bool :=
  rule.cosign?.any fun id => (sp.element? id).any fun el =>
    el.enteredBy.contains role && el.kind == .cosign && el.humanOnly

/-- A permitted route exists, possibly requiring an attending response. -/
def commitRolePossible (sp : Spec) (facts : Facts) (user : User) (c : CommitId) : Bool :=
  roleOk sp user c && (sp.commit? c).any fun cs => (cs.encounterRoles?.getD []).all fun rule =>
    !encounterMatches facts.encounterKind? rule.encounter || rule.roles.contains user.role ||
      encounterRouteAvailable sp user.role rule

/-- Matching restrictions require either the user's own role or a human cosign. -/
def encounterRolesOk (sp : Spec) (facts : Facts) (user : User) (s : State) (c : CommitId) : Bool :=
  (sp.commit? c).any fun cs => (cs.encounterRoles?.getD []).all fun rule =>
    !encounterMatches facts.encounterKind? rule.encounter || rule.roles.contains user.role ||
      (encounterRouteAvailable sp user.role rule && humanWaiverMet sp facts user s rule.cosign?)

/-- The ordinary role and the encounter's own-signature or cosign route both hold. -/
def commitRoleOk (sp : Spec) (facts : Facts) (user : User) (s : State) (c : CommitId) : Bool :=
  roleOk sp user c && encounterRolesOk sp facts user s c

/-- The first matching encounter restriction without a completed permitted route. -/
def encounterRoleFailure? (sp : Spec) (facts : Facts) (user : User) (s : State)
    (c : CommitId) : Option EncounterRoleRule :=
  (sp.commit? c).bind fun cs => (cs.encounterRoles?.getD []).find? fun rule =>
    encounterMatches facts.encounterKind? rule.encounter && !rule.roles.contains user.role &&
      !(encounterRouteAvailable sp user.role rule && humanWaiverMet sp facts user s rule.cosign?)

/-- A requirement scoped to a forbidden encounter never applies to this role.
Other conditions remain conservatively relevant. Unknown commits are not exempt. -/
def entryRelevantForRole (sp : Spec) (role : Role) (rq : EntryReq) : Bool :=
  match rq.when with
  | .encounter kind => (sp.commit? rq.commit).all fun cs =>
      cs.encounterRoleAllowed (some kind) role
  | _ => true

/-- All entry requirements for `c` are met. -/
def entriesOk (sp : Spec) (facts : Facts) (user : User) (s : State) (c : CommitId) : Bool :=
  sp.entries.all fun rq => rq.commit != c || entryMet sp facts user s rq

/-- All review requirements for `c` are met. -/
def reviewsOk (sp : Spec) (prog : Program) (facts : Facts) (s : State) (c : CommitId) : Bool :=
  sp.reviews.all fun rq => rq.commit != c || reviewMet sp prog facts s rq

/-- Guard items 1–3: role, entries, reviews. -/
def guardBase (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (c : CommitId) : Bool :=
  commitRoleOk sp facts user s c && entriesOk sp facts user s c && reviewsOk sp prog facts s c &&
    extraGuard sp prog facts s c

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
    let mine := s.captured.filter fun x => x.element == el.id &&
      (!rq.perOrderLine || (orderLines s).any fun p =>
        x.slot == p.1 && lineMatches facts s rq.when p.1 p.2 &&
          !hasGoodEntry facts user s el (some p.1) rq.allowed?)
    let unitHint := match el.kind with
      | .quantity u => s!" (must be in {u.name})"
      | _ => ""
    if mine.isEmpty then s!"entry required: {el.id}"
    else if mine.all (fun x => !x.confirmed) then s!"confirm required: {el.id}"
    else if mine.any (fun x => x.confirmed && !valueSatisfies facts user el.kind x.value) then
      s!"invalid value: {el.id}{unitHint}"
    else if mine.any (fun x => x.confirmed && !entryValueAllowed el rq.allowed? x.value) then
      s!"value not allowed: {el.id} (allowed: {", ".intercalate (rq.allowed?.getD [])})"
    else if needsHuman el then s!"human entry required: {el.id}"
    else s!"entry required: {el.id}"

/-- Why `guardBase` fails, in words (the first failing item). -/
def guardReason (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (c : CommitId) : String :=
  if !roleOk sp user c then s!"role: {user.role.name} may not perform {c}"
  else if let some rule := encounterRoleFailure? sp facts user s c then rule.reason
  else if !validationsOk sp facts s then "value validation failed"
  else if !defaultsOk sp prog then "required default missing or incorrect"
  else if !displaysOk sp prog facts s c then "structured display or action label required"
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
      | none =>
        match (obligationViews sp facts s).find? (fun o => o.commit == c && o.status != .met) with
        | some o => s!"obligation: {o.requirement} ({reprStr o.status})"
        | none => if extraGuard sp prog facts s c then "guard" else "additional commit contract"

end Ehr
