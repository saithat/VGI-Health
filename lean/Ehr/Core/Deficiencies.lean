import Ehr.Core.Workspace
import Ehr.Commit.Adt
import Ehr.Proofs.T0

/-!
# Clinician Signing Deficiencies and Order Reconciliation

New specification for owner review (`docs/design/chart-timing.md` §§3–4):
1. **Signing deficiencies**: computes a clinician's cross-record deficiency list
   (patient, encounter, item, deadline, pending/delinquent/discardedAtDischarge)
   from `temporalStatus` over commits performed by the clinician's role plus
   saved unsigned draft checkpoints (using the commit's temporal deadline if it
   has one, else `sp.design.unsignedDraftMinutes`, default 1440 minutes).
2. **Order reconciliation at transfer and discharge**: draft checkpoints record
   the patient's ADT revision. After an inpatient transfer, restored unsigned
   order drafts are marked `"Needs reconciliation"` and signing is blocked until
   an explicit human per-line decision (`keep`, `change`, or `discontinue`).
   After a discharge, unsigned inpatient order drafts are not restored; they
   remain in provenance and appear on the author's deficiency list as
   `discardedAtDischarge`.
-/

namespace Ehr.Deficiencies

open Ehr Ehr.Proofs

/-- New specification for owner review: status of a clinician signing deficiency. -/
inductive DeficiencyStatus
  | pending
  | delinquent
  | discardedAtDischarge
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

/-- New specification for owner review: human-readable label for a deficiency status. -/
def DeficiencyStatus.label : DeficiencyStatus → String
  | .pending => "Pending"
  | .delinquent => "Delinquent"
  | .discardedAtDischarge => "Discarded at discharge"

/-- New specification for owner review: kind of deficiency item (a temporal
requirement obligation or a saved unsigned draft checkpoint). -/
inductive DeficiencyKind
  | temporal (commit : CommitId) (requirement : String)
  | unsignedDraft (commit : CommitId) (checkpointId : String)
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

/-- New specification for owner review: one row of a clinician's signing deficiency list. -/
structure Deficiency where
  clinician : UserId
  patient : String
  patientName : String := ""
  encounter : String
  commit : CommitId
  item : String
  kind : DeficiencyKind
  deadline : Int
  metric : TimeMetric := .minutes
  deadlineMinute? : Option Int := none
  status : DeficiencyStatus
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

/-- New specification for owner review: explicit human per-line decision for a
restored unsigned order draft after an inpatient transfer. -/
inductive ReconcileDecision
  | keep
  | change
  | discontinue
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

/-- New specification for owner review: wire code for a transfer reconciliation decision. -/
def ReconcileDecision.code : ReconcileDecision → String
  | .keep => "keep"
  | .change => "change"
  | .discontinue => "discontinue"

/-- New specification for owner review: parse a transfer reconciliation decision code. -/
def ReconcileDecision.ofCode? : String → Option ReconcileDecision
  | "keep" => some .keep
  | "change" => some .change
  | "discontinue" => some .discontinue
  | _ => none

/-- New specification for owner review: a saved unsigned draft checkpoint with
the patient's ADT revision at save time. -/
structure DraftCheckpoint where
  id : String
  author : UserId
  patient : String
  encounter : String := ""
  encounterKind? : Option String := none
  adtRevision : Nat := 0
  savedAtMinute? : Option Int := none
  captured : List Captured := []
  acked : List (AlertId × String) := []
  discardedAtDischarge : Bool := false
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

/-- New specification for owner review: the underlying `PatientDraft` of a checkpoint. -/
def DraftCheckpoint.toPatientDraft (cp : DraftCheckpoint) : PatientDraft :=
  { patient := cp.patient, captured := cp.captured, acked := cp.acked }

/-- New specification for owner review: whether a checkpoint belongs to an inpatient encounter. -/
def isInpatientCheckpoint (cp : DraftCheckpoint) : Bool :=
  match cp.encounterKind? with
  | some "inpatient" | some "IMP" | none => true
  | _ => false

/-- New specification for owner review: whether the patient's ADT revision changed
since `cp` was saved because of an inpatient transfer. -/
def transferred (cp : DraftCheckpoint) (adt : Commit.Adt.Patient) : Bool :=
  adt.revision != cp.adtRevision && adt.admitted &&
    adt.last.map (·.kind) == some .transfer

/-- New specification for owner review: whether the patient's inpatient encounter
was discharged after `cp` was saved (or the checkpoint is already recorded as
discarded at discharge). -/
def discharged (cp : DraftCheckpoint) (adt : Commit.Adt.Patient) : Bool :=
  cp.discardedAtDischarge ||
    (adt.revision != cp.adtRevision &&
      (!adt.admitted || adt.last.map (·.kind) == some .discharge))

/-- New specification for owner review: captures restored from a draft checkpoint
given the patient's current ADT state.
- After a discharge of an inpatient encounter, unsigned order drafts (`isOrderElement`)
  are not restored.
- After a transfer, unsigned order drafts are restored marked `"Needs reconciliation"`.
- Otherwise, `Workspace.restored` captures are restored unchanged. -/
def restoredFromCheckpoint (sp : Spec) (u : User) (cp : DraftCheckpoint)
    (adt : Commit.Adt.Patient) : List Captured :=
  let base := Workspace.restored sp u cp.toPatientDraft
  if discharged cp adt && isInpatientCheckpoint cp then
    base.filter fun x => !isOrderElement sp x.element
  else if transferred cp adt then
    base.map fun x =>
      if isOrderElement sp x.element then
        { x with provenance? := some needsReconciliationProvenance }
      else x
  else base

/-- New specification for owner review: unsigned inpatient order captures that
were not restored because the encounter was discharged, kept in provenance. -/
def discardedOrderCaptures (sp : Spec) (u : User) (cp : DraftCheckpoint)
    (adt : Commit.Adt.Patient) : List Captured :=
  if discharged cp adt && isInpatientCheckpoint cp then
    (Workspace.restored sp u cp.toPatientDraft).filter fun x => isOrderElement sp x.element
  else []

/-- New specification for owner review: restore a draft checkpoint into a freshly
hydrated chart state, applying transfer reconciliation and discharge non-restoration. -/
def restoreCheckpoint (sp : Spec) (u : User) (fresh : State) (cp : DraftCheckpoint)
    (adt : Commit.Adt.Patient) : State :=
  let rest := restoredFromCheckpoint sp u cp adt
  { fresh with
    captured := fresh.captured.filter (fun y =>
      !rest.any (fun x => x.element == y.element && x.slot == y.slot)) ++ rest
    acked := cp.acked }

/-- New specification for owner review: record an explicit human per-line transfer
reconciliation decision (`keep`, `change`, or `discontinue`) on order line `slot`.
Only `Actor.human` may make the decision; macros and open alert popups are blocked. -/
def reconcileOrderLine (sp : Spec) (actor : Actor) (s : State) (slot : Nat)
    (decision : ReconcileDecision) : State × StepResult :=
  if s.popup?.isSome then (s, .blocked "popup: acknowledge the alert first")
  else match actor with
    | .«macro» => (s, .blocked "human only: order reconciliation")
    | .human =>
      let code := decision.code
      let entry : Captured := {
        element := orderReconcileElement
        slot := slot
        value := .code code
        byHuman := true
        confirmed := true
        provenance? := some ("reconciled:" ++ code)
      }
      let base : List Captured :=
        match decision with
        | .discontinue =>
          s.captured.filter fun (x : Captured) => !(x.slot == slot && isOrderElement sp x.element)
        | .keep | .change =>
          s.captured.map fun (x : Captured) =>
            if x.slot == slot && isOrderElement sp x.element &&
                x.provenance? == some needsReconciliationProvenance then
              { x with provenance? := some ("reconciled:" ++ code) }
            else x
      ({ s with captured := base.filter (fun y =>
          !(y.element == orderReconcileElement && y.slot == slot)) ++ [entry] }, .ok)

/-- New specification for owner review: parse a `"reconcile.line|<slot>"` control
event into `(slot, decision)`. -/
def reconcileControl? (e : Event) : Option (Nat × ReconcileDecision) :=
  match e with
  | .enter comp (.code raw) | .enter comp (.text raw) =>
    if comp.startsWith "reconcile.line|" then do
      let slot ← ((comp.drop 15).toString).toNat?
      let dec ← ReconcileDecision.ofCode? raw
      pure (slot, dec)
    else none
  | _ => none

/-- New specification for owner review: input for one patient encounter chart
when computing a clinician's signing deficiencies. -/
structure ChartDeficiencyInput where
  patient : String
  patientName : String := ""
  encounter : String
  facts : Facts
  state : State := default
  adt? : Option Commit.Adt.Patient := none
  checkpoints : List DraftCheckpoint := []
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

/-- New specification for owner review: the first commit in `sp` performed by
`role` whose entry requirements include `x.element`. -/
def draftCommit? (sp : Spec) (role : Role) (x : Captured) : Option CommitSpec :=
  sp.commits.find? fun cs =>
    cs.roles.contains role && sp.entries.any (fun rq => rq.commit == cs.id && rq.element == x.element)

/-- New specification for owner review: deadline `(amount, metric)` for a saved
unsigned draft of commit `cs`. Uses the commit's first temporal requirement
deadline if `cs` has one; otherwise uses `sp.design.unsignedDraftMinutes`
(default 1440 minutes, local policy). -/
def draftDeadline (sp : Spec) (cs : CommitSpec) : Int × TimeMetric :=
  match cs.temporal? with
  | some (rq :: _) => (rq.deadline, rq.metric)
  | _ => (Int.ofNat sp.design.unsignedDraftMinutes, .minutes)

/-- New specification for owner review: temporal deficiency items for one
unsigned commit `cs` of the clinician's role in chart `r`. -/
def temporalDeficienciesForCommit (user : User) (r : ChartDeficiencyInput)
    (cs : CommitSpec) : List Deficiency :=
  (cs.temporal?.getD []).filterMap fun rq =>
    let deadlineMin? := match eventTime r.facts r.state rq.anchor true, rq.metric with
      | some a, .minutes => some (a + rq.deadline)
      | _, _ => none
    match temporalStatus r.facts r.state rq with
    | .overdue =>
      some {
        clinician := user.id
        patient := r.patient
        patientName := r.patientName
        encounter := r.encounter
        commit := cs.id
        item := rq.id
        kind := .temporal cs.id rq.id
        deadline := rq.deadline
        metric := rq.metric
        deadlineMinute? := deadlineMin?
        status := .delinquent
      }
    | .missing =>
      some {
        clinician := user.id
        patient := r.patient
        patientName := r.patientName
        encounter := r.encounter
        commit := cs.id
        item := rq.id
        kind := .temporal cs.id rq.id
        deadline := rq.deadline
        metric := rq.metric
        deadlineMinute? := deadlineMin?
        status := .pending
      }
    | .met | .invalid => none

/-- New specification for owner review: default empty ADT patient state when
no ADT record is supplied. -/
def defaultAdtPatient (id : String := "") : Commit.Adt.Patient :=
  { id := id }

/-- New specification for owner review: saved unsigned draft deficiency items
for one unsigned commit `cs` of the clinician's role in chart `r`. -/
def checkpointDeficienciesForCommit (sp : Spec) (user : User)
    (r : ChartDeficiencyInput) (cs : CommitSpec) : List Deficiency :=
  let dl := (draftDeadline sp cs).1
  let metric := (draftDeadline sp cs).2
  let adt := r.adt?.getD (defaultAdtPatient r.patient)
  r.checkpoints.filterMap fun cp =>
    let mine := cp.author == user.id && cp.patient == r.patient &&
      cp.captured.any (fun x =>
        draftCommit? sp user.role x == some cs && !Workspace.signedEntry sp r.state x)
    let deadlineMin? := match cp.savedAtMinute?, metric with
      | some saved, .minutes => some (saved + dl)
      | _, _ => none
    let overdueByClock := match deadlineMin?, epochNow r.facts r.state with
      | some cutoff, some now => decide (cutoff < now)
      | _, _ => false
    let overdueByTemporal := (cs.temporal?.getD []).any fun rq =>
      temporalStatus r.facts r.state rq == .overdue
    let status : DeficiencyStatus :=
      if isOrderCommit sp cs.id && isInpatientCheckpoint cp && discharged cp adt then
        .discardedAtDischarge
      else if overdueByTemporal || overdueByClock then
        .delinquent
      else .pending
    if !mine then none
    else
      some {
        clinician := user.id
        patient := r.patient
        patientName := r.patientName
        encounter := if cp.encounter.isEmpty then r.encounter else cp.encounter
        commit := cs.id
        item := "Unsigned draft: " ++ cs.label
        kind := .unsignedDraft cs.id cp.id
        deadline := dl
        metric := metric
        deadlineMinute? := deadlineMin?
        status := status
      }

/-- New specification for owner review: all signing deficiencies for `user` in
one patient encounter chart `r`. Only unsigned commits (`cs.id ∉ r.state.commits`)
that `user.role` performs are included. -/
def chartDeficiencies (sp : Spec) (user : User) (r : ChartDeficiencyInput) : List Deficiency :=
  (sp.commits.filter fun cs => cs.roles.contains user.role && !r.state.commits.contains cs.id).flatMap
    fun cs => temporalDeficienciesForCommit user r cs ++ checkpointDeficienciesForCommit sp user r cs

/-- New specification for owner review: all signing deficiencies for `user`
across a list of patient encounter records. -/
def clinicianDeficiencies (sp : Spec) (user : User)
    (records : List ChartDeficiencyInput) : List Deficiency :=
  records.flatMap (chartDeficiencies sp user)

/-- New specification for owner review: format a deficiency row as a
`PatientListRow` for the workspace `"deficiencies"` activity. -/
def toPatientListRow (d : Deficiency) : PatientListRow :=
  let deadlineLabel := match d.metric with
    | .minutes => toString d.deadline ++ " min"
    | .businessDays cal => toString d.deadline ++ " business days (" ++ cal ++ ")"
  { patient := d.patient
    fields := [
      ("Patient", if d.patientName.isEmpty then d.patient else d.patientName),
      ("Encounter", d.encounter),
      ("Item", d.item),
      ("Deadline", deadlineLabel),
      ("Status", d.status.label)
    ]
    source? := if d.encounter.isEmpty then none else some ("Encounter/" ++ d.encounter) }

/-- New specification for owner review: workspace `PatientActivity` for a
clinician's deficiency list. -/
def deficiencyActivity (rows : List Deficiency) : PatientActivity :=
  { info := "deficiencies"
    title := "Deficiencies"
    rows := rows.map toPatientListRow }

/-! ## Proofs of the Four Specification Statements (§§3–4) -/

/-- Helper lemma: every deficiency in `temporalDeficienciesForCommit user r cs`
has `d.commit = cs.id`. New specification for owner review. -/
theorem temporalDeficienciesForCommit_commit (user : User) (r : ChartDeficiencyInput)
    (cs : CommitSpec) (d : Deficiency) (hd : d ∈ temporalDeficienciesForCommit user r cs) :
    d.commit = cs.id := by
  unfold temporalDeficienciesForCommit at hd
  rw [List.mem_filterMap] at hd
  rcases hd with ⟨rq, _, hsome⟩
  cases hst : temporalStatus r.facts r.state rq <;> simp only [hst, Option.some.injEq] at hsome
  · contradiction
  · rw [← hsome]
  · contradiction
  · rw [← hsome]

/-- Helper lemma: every deficiency in `checkpointDeficienciesForCommit sp user r cs`
has `d.commit = cs.id`. New specification for owner review. -/
theorem checkpointDeficienciesForCommit_commit (sp : Spec) (user : User)
    (r : ChartDeficiencyInput) (cs : CommitSpec) (d : Deficiency)
    (hd : d ∈ checkpointDeficienciesForCommit sp user r cs) :
    d.commit = cs.id := by
  unfold checkpointDeficienciesForCommit at hd
  rw [List.mem_filterMap] at hd
  rcases hd with ⟨cp, _, hsome⟩
  dsimp only at hsome
  split at hsome
  · contradiction
  · simp only [Option.some.injEq] at hsome
    rw [← hsome]

/-- New specification for owner review: **Theorem 1 — Deficiency completeness (§3).**
Every overdue obligation (`temporalStatus r.facts r.state rq = .overdue`) of an
unsigned commit performed by the clinician's role appears in
`clinicianDeficiencies sp user records` as a delinquent deficiency for that
patient, encounter, commit, and requirement. -/
theorem deficiencies_complete (sp : Spec) (user : User)
    (records : List ChartDeficiencyInput) (r : ChartDeficiencyInput) (hr : r ∈ records)
    (cs : CommitSpec) (hcs : cs ∈ sp.commits) (hrole : user.role ∈ cs.roles)
    (hunsigned : cs.id ∉ r.state.commits)
    (rq : TemporalReq) (hrq : rq ∈ cs.temporal?.getD [])
    (hoverdue : temporalStatus r.facts r.state rq = .overdue) :
    ∃ d ∈ clinicianDeficiencies sp user records,
      d.clinician = user.id ∧
      d.patient = r.patient ∧
      d.encounter = r.encounter ∧
      d.commit = cs.id ∧
      d.kind = .temporal cs.id rq.id ∧
      d.deadline = rq.deadline ∧
      d.status = .delinquent := by
  let deadlineMin? := match eventTime r.facts r.state rq.anchor true, rq.metric with
    | some a, .minutes => some (a + rq.deadline)
    | _, _ => none
  let d : Deficiency := {
    clinician := user.id
    patient := r.patient
    patientName := r.patientName
    encounter := r.encounter
    commit := cs.id
    item := rq.id
    kind := .temporal cs.id rq.id
    deadline := rq.deadline
    metric := rq.metric
    deadlineMinute? := deadlineMin?
    status := .delinquent
  }
  refine ⟨d, ?_, rfl, rfl, rfl, rfl, rfl, rfl, rfl⟩
  unfold clinicianDeficiencies
  rw [List.mem_flatMap]
  refine ⟨r, hr, ?_⟩
  unfold chartDeficiencies
  rw [List.mem_flatMap]
  refine ⟨cs, ?_, ?_⟩
  · rw [List.mem_filter]
    refine ⟨hcs, ?_⟩
    simp only [Bool.and_eq_true, Bool.not_eq_true', List.contains_eq_mem, decide_eq_true_eq,
      decide_eq_false_iff_not]
    exact ⟨hrole, hunsigned⟩
  · rw [List.mem_append]
    left
    unfold temporalDeficienciesForCommit
    rw [List.mem_filterMap]
    refine ⟨rq, hrq, ?_⟩
    simp [hoverdue, d, deadlineMin?]

/-- New specification for owner review: **Theorem 2a — Chart-level deficiency soundness (§3).**
No listed deficiency for chart `r` belongs to a commit signed in `r.state.commits`,
and every listed deficiency belongs to a commit performed by `user.role`. -/
theorem chartDeficiencies_sound (sp : Spec) (user : User) (r : ChartDeficiencyInput)
    (d : Deficiency) (hd : d ∈ chartDeficiencies sp user r) :
    d.commit ∉ r.state.commits ∧
      ∃ cs ∈ sp.commits, cs.id = d.commit ∧ user.role ∈ cs.roles := by
  unfold chartDeficiencies at hd
  rw [List.mem_flatMap] at hd
  rcases hd with ⟨cs, hcsFilter, hmem⟩
  rw [List.mem_filter] at hcsFilter
  rcases hcsFilter with ⟨hcsMem, hpred⟩
  simp only [Bool.and_eq_true, Bool.not_eq_true', List.contains_eq_mem, decide_eq_true_eq,
    decide_eq_false_iff_not] at hpred
  rw [List.mem_append] at hmem
  have hcommit : d.commit = cs.id := by
    rcases hmem with ht | hc
    · exact temporalDeficienciesForCommit_commit user r cs d ht
    · exact checkpointDeficienciesForCommit_commit sp user r cs d hc
  rw [hcommit]
  exact ⟨hpred.2, cs, hcsMem, rfl, hpred.1⟩

/-- New specification for owner review: **Theorem 2 — Deficiency soundness (§3).**
No item listed in `clinicianDeficiencies sp user records` belongs to a signed commit
in its chart (`d.commit ∉ r.state.commits`), and every listed item belongs to a
commit performed by the clinician's role. -/
theorem deficiencies_sound (sp : Spec) (user : User)
    (records : List ChartDeficiencyInput) (d : Deficiency)
    (hd : d ∈ clinicianDeficiencies sp user records) :
    ∃ r ∈ records, d ∈ chartDeficiencies sp user r ∧
      d.commit ∉ r.state.commits ∧
      ∃ cs ∈ sp.commits, cs.id = d.commit ∧ user.role ∈ cs.roles := by
  unfold clinicianDeficiencies at hd
  rw [List.mem_flatMap] at hd
  rcases hd with ⟨r, hr, hdChart⟩
  have hsound := chartDeficiencies_sound sp user r d hdChart
  exact ⟨r, hr, hdChart, hsound.1, hsound.2⟩

/-- Helper lemma: after a transfer (and not an inpatient discharge), every restorable
order capture in `cp` is restored into `restoredFromCheckpoint` marked with
`needsReconciliationProvenance`. New specification for owner review. -/
theorem restored_order_marked_needsReconciliation (sp : Spec) (u : User)
    (cp : DraftCheckpoint) (adt : Commit.Adt.Patient)
    (htransfer : transferred cp adt = true)
    (hnotDischarged : (discharged cp adt && isInpatientCheckpoint cp) = false)
    (x : Captured) (hx : x ∈ Workspace.restored sp u cp.toPatientDraft)
    (horder : isOrderElement sp x.element = true) :
    { x with provenance? := some needsReconciliationProvenance } ∈
      (restoreCheckpoint sp u fresh cp adt).captured := by
  unfold restoreCheckpoint restoredFromCheckpoint
  simp only [hnotDischarged, Bool.false_eq_true, ↓reduceIte, htransfer]
  rw [List.mem_append]
  right
  rw [List.mem_map]
  refine ⟨x, hx, ?_⟩
  simp [horder]

/-- New specification for owner review: **Theorem 3 — Transfer order reconciliation (§4).**
If a step of the interpreter adds an order-entry commit `c` (`isOrderCommit sp c = true`),
then every restored order draft capture `x ∈ s.captured` marked `"Needs reconciliation"`
already has an explicit, confirmed human per-line decision (`keep`, `change`, or
`discontinue`) on its order line `x.slot`. Consequently, after a transfer, no
restored order draft can be signed without a human per-line decision. -/
theorem transfer_reconcile_requiredBeforeSign (sp : Spec) (prog : Program) (facts : Facts)
    (user : User) (actor : Actor) (s : State) (e : Event) (c : CommitId)
    (horderCommit : isOrderCommit sp c = true)
    (hnew : c ∉ s.commits)
    (hafter : c ∈ (step sp prog facts user actor s e).1.commits)
    (x : Captured) (hx : x ∈ s.captured)
    (horderEl : isOrderElement sp x.element = true)
    (hreconcile : x.provenance? = some needsReconciliationProvenance) :
    hasLineReconcileDecision s x.slot = true ∧
      ∃ y ∈ s.captured, y.element = orderReconcileElement ∧ y.slot = x.slot ∧
        y.byHuman = true ∧ y.confirmed = true ∧ validReconcileDecision y.value = true := by
  have hguard := T0_commit_needs_guard sp prog facts user actor s e c hnew hafter
  have hextra := ((commitGuard_iff sp prog facts user s c).mp hguard).2.2.2.2
  unfold extraGuard at hextra
  cases hcs : sp.commit? c with
  | none => simp [hcs] at hextra
  | some cs =>
    simp only [hcs, Bool.and_eq_true] at hextra
    have hsign := hextra.1.1.1.1.1
    unfold signingHasOrder at hsign
    simp only [Bool.and_eq_true, Bool.or_eq_true, Bool.not_eq_true'] at hsign
    have hrec : orderDraftsReconciled sp s = true := by
      rcases hsign.2 with hnot | hok
      · rw [horderCommit] at hnot; contradiction
      · exact hok
    unfold orderDraftsReconciled at hrec
    have hline := List.all_eq_true.mp hrec x hx
    simp only [horderEl, hreconcile, beq_self_eq_true, Bool.and_self, Bool.not_true,
      Bool.false_or] at hline
    refine ⟨hline, ?_⟩
    unfold hasLineReconcileDecision at hline
    rcases List.any_eq_true.mp hline with ⟨y, hy, hypred⟩
    simp only [Bool.and_eq_true, beq_iff_eq] at hypred
    exact ⟨y, hy, hypred.1.1.1.1, hypred.1.1.1.2, hypred.1.1.2, hypred.1.2, hypred.2⟩

/-- New specification for owner review: **Corollary of Theorem 3 — Immediate post-transfer block.**
Immediately after `restoreCheckpoint` across an inpatient transfer, if the checkpoint
contains a restorable order capture `x` and no human reconciliation decision has been
made for `x.slot`, no order-entry commit `c` can be signed by any event. -/
theorem transfer_blocks_order_sign_until_decision (sp : Spec) (prog : Program) (facts : Facts)
    (user : User) (actor : Actor) (fresh : State) (cp : DraftCheckpoint)
    (adt : Commit.Adt.Patient) (e : Event) (c : CommitId)
    (htransfer : transferred cp adt = true)
    (hnotDischarged : (discharged cp adt && isInpatientCheckpoint cp) = false)
    (horderCommit : isOrderCommit sp c = true)
    (x : Captured) (hx : x ∈ Workspace.restored sp u cp.toPatientDraft)
    (horderEl : isOrderElement sp x.element = true)
    (hnoDecision : hasLineReconcileDecision (restoreCheckpoint sp u fresh cp adt) x.slot = false)
    (hnew : c ∉ (restoreCheckpoint sp u fresh cp adt).commits) :
    c ∉ (step sp prog facts user actor (restoreCheckpoint sp u fresh cp adt) e).1.commits := by
  intro hafter
  have hmem := restored_order_marked_needsReconciliation sp u cp adt htransfer hnotDischarged x hx horderEl (fresh := fresh)
  have hdec := (transfer_reconcile_requiredBeforeSign sp prog facts user actor
    (restoreCheckpoint sp u fresh cp adt) e c horderCommit hnew hafter
    { x with provenance? := some needsReconciliationProvenance } hmem horderEl rfl).1
  rw [hnoDecision] at hdec
  contradiction

/-- New specification for owner review: **Theorem 4 — Discharge non-restoration (§4).**
After a discharge of an inpatient encounter, no inpatient order draft capture
(`isOrderElement sp x.element = true`) is restored from the checkpoint, and if the
fresh chart has no order captures, the resulting state after `restoreCheckpoint`
contains no order captures at all. -/
theorem discharge_no_inpatient_order_restored (sp : Spec) (u : User) (fresh : State)
    (cp : DraftCheckpoint) (adt : Commit.Adt.Patient)
    (hdischarged : discharged cp adt = true)
    (hinpatient : isInpatientCheckpoint cp = true) :
    (∀ x ∈ restoredFromCheckpoint sp u cp adt, isOrderElement sp x.element = false) ∧
    ((∀ y ∈ fresh.captured, isOrderElement sp y.element = false) →
      ∀ x ∈ (restoreCheckpoint sp u fresh cp adt).captured, isOrderElement sp x.element = false) := by
  have hrest : ∀ x ∈ restoredFromCheckpoint sp u cp adt, isOrderElement sp x.element = false := by
    intro x hx
    unfold restoredFromCheckpoint at hx
    simp only [hdischarged, hinpatient, Bool.and_self, ↓reduceIte, List.mem_filter,
      Bool.not_eq_true'] at hx
    exact hx.2
  refine ⟨hrest, ?_⟩
  intro hfresh x hx
  unfold restoreCheckpoint at hx
  rw [List.mem_append] at hx
  rcases hx with h1 | h2
  · rw [List.mem_filter] at h1
    exact hfresh x h1.1
  · exact hrest x h2

/-- New specification for owner review: after a discharge, an author's unsigned
inpatient order draft checkpoint is listed on the author's deficiency list with
status `.discardedAtDischarge`. -/
theorem discharge_inpatient_order_listed_discarded (sp : Spec) (user : User)
    (r : ChartDeficiencyInput) (cs : CommitSpec) (hcs : cs ∈ sp.commits)
    (hrole : user.role ∈ cs.roles) (hunsigned : cs.id ∉ r.state.commits)
    (horderCommit : isOrderCommit sp cs.id = true)
    (cp : DraftCheckpoint) (hcp : cp ∈ r.checkpoints)
    (hauthor : cp.author = user.id) (hpat : cp.patient = r.patient)
    (hinpatient : isInpatientCheckpoint cp = true)
    (hdischarged : discharged cp (r.adt?.getD (defaultAdtPatient r.patient)) = true)
    (x : Captured) (hx : x ∈ cp.captured)
    (hdraftCommit : draftCommit? sp user.role x = some cs)
    (hnotSignedEntry : Workspace.signedEntry sp r.state x = false) :
    ∃ d ∈ chartDeficiencies sp user r,
      d.clinician = user.id ∧
      d.patient = r.patient ∧
      d.commit = cs.id ∧
      d.kind = .unsignedDraft cs.id cp.id ∧
      d.status = .discardedAtDischarge := by
  let dl := (draftDeadline sp cs).1
  let metric := (draftDeadline sp cs).2
  let deadlineMin? := match cp.savedAtMinute?, metric with
    | some saved, .minutes => some (saved + dl)
    | _, _ => none
  let d : Deficiency := {
    clinician := user.id
    patient := r.patient
    patientName := r.patientName
    encounter := if cp.encounter.isEmpty then r.encounter else cp.encounter
    commit := cs.id
    item := "Unsigned draft: " ++ cs.label
    kind := .unsignedDraft cs.id cp.id
    deadline := dl
    metric := metric
    deadlineMinute? := deadlineMin?
    status := .discardedAtDischarge
  }
  refine ⟨d, ?_, rfl, rfl, rfl, rfl, rfl⟩
  unfold chartDeficiencies
  rw [List.mem_flatMap]
  refine ⟨cs, ?_, ?_⟩
  · rw [List.mem_filter]
    refine ⟨hcs, ?_⟩
    simp only [Bool.and_eq_true, Bool.not_eq_true', List.contains_eq_mem, decide_eq_true_eq,
      decide_eq_false_iff_not]
    exact ⟨hrole, hunsigned⟩
  · rw [List.mem_append]
    right
    unfold checkpointDeficienciesForCommit
    rw [List.mem_filterMap]
    refine ⟨cp, hcp, ?_⟩
    have hhas : (cp.captured.any fun y =>
        draftCommit? sp user.role y == some cs && !Workspace.signedEntry sp r.state y) = true := by
      apply List.any_eq_true.mpr
      refine ⟨x, hx, ?_⟩
      simp [hdraftCommit, hnotSignedEntry]
    simp [hauthor, hpat, hhas, horderCommit, hinpatient, hdischarged, d, dl, metric, deadlineMin?]

#print axioms temporalDeficienciesForCommit_commit
#print axioms checkpointDeficienciesForCommit_commit
#print axioms deficiencies_complete
#print axioms chartDeficiencies_sound
#print axioms deficiencies_sound
#print axioms restored_order_marked_needsReconciliation
#print axioms transfer_reconcile_requiredBeforeSign
#print axioms transfer_blocks_order_sign_until_decision
#print axioms discharge_no_inpatient_order_restored
#print axioms discharge_inpatient_order_listed_discarded

end Ehr.Deficiencies
