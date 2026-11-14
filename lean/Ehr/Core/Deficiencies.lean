import Ehr.Core.Workspace
import Ehr.Commit.Adt
import Ehr.Proofs.T0
import Ehr.Proofs.RuntimeDrafts

/-!
# Signing deficiencies and order reconciliation

New specification for owner review (`docs/design/chart-timing.md` sections 3 and 4).

1. **Deficiencies.** A clinician's deficiency list is computed from the same
   `temporalStatus` the interpreter uses, over the commits the clinician's role
   performs, plus the clinician's saved unsigned drafts. A draft's deadline is
   its commit's temporal deadline when it has one, otherwise
   `DesignRules.unsignedDraftMinutes` after the draft was saved (local policy,
   default 1440). The list adds no rule semantics.
2. **Reconciliation.** A saved draft carries the patient's ADT stamp. When the
   chart is opened again after a transfer, its unsigned order lines are tagged
   `reconcileTag` and every order-entry commit is refused until a human decides
   keep, change or discontinue for each line (`reconcileCore`). After a
   discharge, inpatient order lines are not restored; they are returned for
   provenance and listed to their author as discarded at discharge.
-/

namespace Ehr.Deficiencies

open Ehr

/-! ## ADT stamps and draft reconciliation -/

/-- New specification for owner review: the patient's ADT position when a draft
was saved or a chart is opened. `revision` is the patient-scoped ADT event
ordinal and `encounter` the admission ordinal (`Ehr.Commit.Adt.Patient`). -/
structure AdtStamp where
  revision : Nat
  encounter : Nat
  admitted : Bool
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

/-- New specification for owner review: the stamp of a native ADT patient record. -/
def AdtStamp.ofPatient (p : Commit.Adt.Patient) : AdtStamp :=
  { revision := p.revision, encounter := p.encounter, admitted := p.admitted }

/-- New specification for owner review: what happened to the patient between
saving a draft and opening the chart again. -/
inductive Movement
  | unchanged | transfer | discharge
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

/-- New specification for owner review: classify the ADT change. Only drafts
saved during an admission are inpatient drafts. The encounter ended when the
patient is no longer admitted or a different admission is current (discharge,
cancelled admission, or discharge and readmission). Any other ADT event in the
same admission (transfer, swap, bed assignment, cancelled transfer or cancelled
discharge) moved the patient and counts as a transfer. Unknown stamps change
nothing. -/
def movement (saved current : Option AdtStamp) : Movement :=
  match saved, current with
  | some a, some b =>
    if !a.admitted then .unchanged
    else if !b.admitted || b.encounter != a.encounter then .discharge
    else if b.revision != a.revision then .transfer
    else .unchanged
  | _, _ => .unchanged

/-- New specification for owner review: the draft to restore. After a transfer
its order-line captures are tagged `reconcileTag`; after a discharge they are
removed. Other captures and acknowledgments are unchanged. -/
def reconcileDraft (sp : Spec) (d : PatientDraft) : Movement → PatientDraft
  | .unchanged => d
  | .transfer => { d with captured := d.captured.map fun x =>
      if isOrderLineElement sp x.element then { x with provenance? := some reconcileTag } else x }
  | .discharge => { d with captured := d.captured.filter fun x => !isOrderLineElement sp x.element }

/-- New specification for owner review: the order-line captures a discharge
keeps out of the chart. They remain in provenance and on the author's list. -/
def discarded (sp : Spec) (d : PatientDraft) : Movement → List Captured
  | .discharge => d.captured.filter fun x => isOrderLineElement sp x.element
  | _ => []

/-- New specification for owner review: the directory state whose stored draft
of `pid` is reconciled for the movement. The host applies it, natively, to the
immutable checkpoint state before the chart session starts; Lean's own
hydration (`Workspace.bind`) then restores the reconciled draft unchanged. -/
def reconcileStore (sp : Spec) (s : State) (pid : String) (m : Movement) : State :=
  { s with patientDrafts? := s.patientDrafts?.map fun ds =>
      ds.map fun d => if d.patient == pid then reconcileDraft sp d m else d }

/-! ## Deficiency rows -/

/-- New specification for owner review: status of a deficiency. -/
inductive Status
  | pending | delinquent | discardedAtDischarge
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

/-- New specification for owner review: readable status. -/
def Status.label : Status → String
  | .pending => "Pending"
  | .delinquent => "Delinquent"
  | .discardedAtDischarge => "Discarded at discharge"

/-- New specification for owner review: what a row is about. -/
inductive Item
  /-- A temporal requirement of an unsigned commit. -/
  | requirement (id : String)
  /-- A saved unsigned draft, identified by its checkpoint. -/
  | draft (checkpoint : String)
  /-- Unsigned inpatient order lines not restored after a discharge. -/
  | discarded (checkpoint : String)
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

/-- New specification for owner review: one deficiency. `deadline?` is an epoch
minute when the deadline is measured in minutes from a known event. -/
structure Deficiency where
  clinician : UserId
  patient : String
  encounter : String
  commit : CommitId
  item : Item
  label : String
  deadline? : Option Int := none
  status : Status
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson, Lean.FromJson

/-- New specification for owner review: a saved unsigned draft of this clinician. -/
structure SavedDraft where
  checkpoint : String
  draft : PatientDraft
  /-- Epoch minute at which the checkpoint was saved. -/
  savedAt : Int
  /-- ADT stamp recorded with the draft, if any. -/
  adt? : Option AdtStamp := none
  deriving DecidableEq, Repr, Inhabited

/-- New specification for owner review: order lines a discharge kept out of a
chart, retained for their author. -/
structure DiscardedDraft where
  checkpoint : String
  encounter : String
  captured : List Captured
  deriving DecidableEq, Repr, Inhabited

/-- New specification for owner review: one patient's chart as the host reads
it for the list: current facts, the commits signed in the selected encounter,
the current ADT stamp, the clinician's saved drafts and discarded order lines. -/
structure ChartInput where
  patient : String
  encounter : String := ""
  facts : Facts
  commits : List CommitId := []
  adt? : Option AdtStamp := none
  drafts : List SavedDraft := []
  discards : List DiscardedDraft := []
  deriving DecidableEq, Repr, Inhabited

deriving instance Lean.ToJson, Lean.FromJson for SavedDraft, DiscardedDraft, ChartInput

/-- New specification for owner review: the state the list evaluates
obligations in: the record's signed commits and nothing captured. -/
def chartState (r : ChartInput) : State :=
  { screen := "", history := [], captured := [], receipts := [], acked := [],
    commits := r.commits, expanded := [], tabSel := [], currentSlot := 0, clock := 0 }

/-- New specification for owner review: the commits whose work is outstanding
for this clinician in `r`: performed by the role and not signed. -/
def openCommits (sp : Spec) (u : User) (r : ChartInput) : List CommitSpec :=
  sp.commits.filter fun cs => cs.roles.contains u.role && !r.commits.contains cs.id

/-- New specification for owner review: the epoch-minute deadline of a temporal
requirement whose anchor is known and whose deadline is in minutes. -/
def requirementDeadline (r : ChartInput) (rq : TemporalReq) : Option Int :=
  match eventTime r.facts (chartState r) rq.anchor true, rq.metric with
  | some a, .minutes => some (a + rq.deadline)
  | _, _ => none

/-- New specification for owner review: the status of a requirement on the
list. Overdue is delinquent; missing after its anchor event is pending. A
requirement whose anchor has not happened, or that is met or invalid, is not
listed. -/
def requirementStatus (r : ChartInput) (rq : TemporalReq) : Option Status :=
  match temporalStatus r.facts (chartState r) rq with
  | .overdue => some .delinquent
  | .missing =>
    if (eventTime r.facts (chartState r) rq.anchor true).isSome then some .pending else none
  | _ => none

/-- New specification for owner review: rows for the temporal requirements of `cs`. -/
def requirementRows (u : User) (r : ChartInput) (cs : CommitSpec) : List Deficiency :=
  (cs.temporal?.getD []).filterMap fun rq => (requirementStatus r rq).map fun st =>
    { clinician := u.id, patient := r.patient, encounter := r.encounter, commit := cs.id,
      item := .requirement rq.id, label := rq.id, deadline? := requirementDeadline r rq,
      status := st }

/-- New specification for owner review: a draft holds work for `cs`: a human
capture of an element that an entry requirement of `cs` names. -/
def draftFor (sp : Spec) (cs : CommitSpec) (d : PatientDraft) : Bool :=
  d.captured.any fun x => x.byHuman && sp.entries.any (fun rq => rq.commit == cs.id && rq.element == x.element)

/-- New specification for owner review: deadline and status of a saved draft of
`cs`. With a temporal requirement, the first one's deadline and status apply:
the draft is delinquent once that requirement is overdue. Otherwise the deadline
is `unsignedDraftMinutes` after saving (local policy), against the facts' clock. -/
def draftDeadline (sp : Spec) (r : ChartInput) (cs : CommitSpec) (sd : SavedDraft) :
    Option Int × Status :=
  match cs.temporal?.getD [] with
  | rq :: _ =>
    (requirementDeadline r rq,
      if temporalStatus r.facts (chartState r) rq == .overdue then .delinquent else .pending)
  | [] =>
    let due := sd.savedAt + Int.ofNat sp.design.unsignedDraftMinutes
    (some due, match epochNow r.facts (chartState r) with
      | some now => if due < now then .delinquent else .pending
      | none => .pending)

/-- New specification for owner review: the label of a draft row. -/
def draftLabel (sp : Spec) (cs : CommitSpec) (m : Movement) : String :=
  "Unsigned draft: " ++ cs.label ++
    (if m == .transfer && isOrderCommit sp cs.id then " (needs reconciliation)" else "")

/-- New specification for owner review: rows for saved drafts of `cs`. A draft
whose order lines a discharge removed still lists its other unsigned work. -/
def draftRows (sp : Spec) (u : User) (r : ChartInput) (cs : CommitSpec) : List Deficiency :=
  r.drafts.filterMap fun sd =>
    let m := movement sd.adt? r.adt?
    if draftFor sp cs (reconcileDraft sp sd.draft m) && sd.draft.patient == r.patient then
      some { clinician := u.id, patient := r.patient, encounter := r.encounter, commit := cs.id,
             item := .draft sd.checkpoint, label := draftLabel sp cs m,
             deadline? := (draftDeadline sp r cs sd).1, status := (draftDeadline sp r cs sd).2 }
    else none

/-- New specification: discarded-order notices expire only after the 30-day
record-completion deadline (42 CFR 482.24(c)(4)(viii)). Use actual, current,
patient/encounter-bound discharge evidence; unknown timing keeps the notice.
The exact deadline is inclusive. Provenance is never removed. -/
def discardWithinDeadline (r : ChartInput) (dd : DiscardedDraft) : Bool :=
  if r.patient != r.facts.patientId || r.encounter != dd.encounter ||
      r.facts.episodeId? != some dd.encounter then true else
  match eventTime r.facts (chartState r)
      { event := "discharge", artifactKey := "completeMedicalRecord" } false,
      epochNow r.facts (chartState r) with
  | some discharged, some now => now ≤ discharged + 30 * 24 * 60
  | _, _ => true

/-- New specification: rows for order lines discarded at discharge, listed
under each open order-entry commit of the role until their completion deadline. -/
def discardRows (sp : Spec) (u : User) (r : ChartInput) (cs : CommitSpec) : List Deficiency :=
  if isOrderCommit sp cs.id then
    r.discards.filterMap fun dd =>
      if dd.captured.isEmpty || !discardWithinDeadline r dd then none else
      some { clinician := u.id, patient := r.patient, encounter := dd.encounter, commit := cs.id,
             item := .discarded dd.checkpoint,
             label := "Unsigned orders discarded at discharge (" ++ toString dd.captured.length ++ " entries)",
             status := .discardedAtDischarge }
  else []

/-- New specification for owner review: all rows for one chart. -/
def chartDeficiencies (sp : Spec) (u : User) (r : ChartInput) : List Deficiency :=
  (openCommits sp u r).flatMap fun cs =>
    requirementRows u r cs ++ draftRows sp u r cs ++ discardRows sp u r cs

/-- New specification for owner review: **the clinician's deficiency list.** -/
def deficiencies (sp : Spec) (u : User) (records : List ChartInput) : List Deficiency :=
  records.flatMap (chartDeficiencies sp u)

/-! ## Work-list rendering -/

/-- New specification for owner review: two digits. -/
def pad2 (n : Nat) : String := if n < 10 then "0" ++ toString n else toString n

/-- New specification for owner review: an epoch minute as UTC date and time (proleptic Gregorian calendar).
Times before 1970 are shown as minutes. -/
def utcText (m : Int) : String :=
  if m < 0 then toString m ++ " min" else
  let t := m.toNat
  let z := t / 1440 + 719468
  let era := z / 146097
  let doe := z - era * 146097
  let yoe := (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
  let doy := doe - (365 * yoe + yoe / 4 - yoe / 100)
  let mp := (5 * doy + 2) / 153
  let day := doy - (153 * mp + 2) / 5 + 1
  let month := if mp < 10 then mp + 3 else mp - 9
  let year := yoe + era * 400 + (if month ≤ 2 then 1 else 0)
  toString year ++ "-" ++ pad2 month ++ "-" ++ pad2 day ++ " " ++
    pad2 ((t % 1440) / 60) ++ ":" ++ pad2 (t % 60) ++ " UTC"

#guard utcText 0 == "1970-01-01 00:00 UTC"
#guard utcText 29384640 == "2025-11-14 00:00 UTC"
#guard utcText 29385581 == "2025-11-14 15:41 UTC"
#guard utcText 26355600 == "2020-02-10 12:00 UTC"

/-- New specification for owner review: a row of the workspace work list. -/
def toRow (names : List PatientChoice) (d : Deficiency) : PatientListRow :=
  { patient := d.patient
    fields := [
      ("Patient", ((names.find? (·.id == d.patient)).map (·.name)).getD d.patient),
      ("Item", d.label),
      ("Due", (d.deadline?.map utcText).getD "No deadline"),
      ("Status", d.status.label)]
    source? := if d.encounter.isEmpty then none else some ("Encounter/" ++ d.encounter) }

/-- New specification for owner review: the workspace activity listing the
clinician's deficiencies. Opening a row opens that patient's chart. -/
def activity (names : List PatientChoice) (rows : List Deficiency) : PatientActivity :=
  { info := "deficiencies", title := "Deficiencies", rows := rows.map (toRow names) }

/-! ## Section 3: completeness and soundness -/

private theorem mem_open {sp : Spec} {u : User} {r : ChartInput} {cs : CommitSpec}
    (hcs : cs ∈ sp.commits) (hrole : u.role ∈ cs.roles) (hopen : cs.id ∉ r.commits) :
    cs ∈ openCommits sp u r := by
  simp only [openCommits, List.mem_filter, Bool.and_eq_true, Bool.not_eq_true',
    List.contains_eq_mem, decide_eq_true_eq, decide_eq_false_iff_not]
  exact ⟨hcs, hrole, hopen⟩

/-- New specification for owner review: **completeness (overdue).** Every
overdue temporal requirement of an unsigned commit the clinician's role
performs is listed as delinquent for that patient, encounter and commit. -/
theorem overdue_listed (sp : Spec) (u : User) (records : List ChartInput)
    (r : ChartInput) (hr : r ∈ records) (cs : CommitSpec) (hcs : cs ∈ sp.commits)
    (hrole : u.role ∈ cs.roles) (hopen : cs.id ∉ r.commits)
    (rq : TemporalReq) (hrq : rq ∈ cs.temporal?.getD [])
    (hover : temporalStatus r.facts (chartState r) rq = .overdue) :
    ∃ d ∈ deficiencies sp u records, d.clinician = u.id ∧ d.patient = r.patient ∧
      d.encounter = r.encounter ∧ d.commit = cs.id ∧ d.item = .requirement rq.id ∧
      d.status = .delinquent := by
  refine ⟨{
      clinician := u.id, patient := r.patient, encounter := r.encounter, commit := cs.id,
      item := .requirement rq.id, label := rq.id, deadline? := requirementDeadline r rq,
      status := .delinquent }, ?_, rfl, rfl, rfl, rfl, rfl, rfl⟩
  simp only [deficiencies, chartDeficiencies, List.mem_flatMap]
  refine ⟨r, hr, cs, mem_open hcs hrole hopen, ?_⟩
  simp only [List.mem_append]
  left; left
  simp only [requirementRows, List.mem_filterMap]
  exact ⟨rq, hrq, by simp [requirementStatus, hover]⟩

/-- New specification for owner review: **completeness (started).** A
requirement of such a commit whose anchor event happened and whose subject is
still missing is listed as pending. -/
theorem missing_listed (sp : Spec) (u : User) (records : List ChartInput)
    (r : ChartInput) (hr : r ∈ records) (cs : CommitSpec) (hcs : cs ∈ sp.commits)
    (hrole : u.role ∈ cs.roles) (hopen : cs.id ∉ r.commits)
    (rq : TemporalReq) (hrq : rq ∈ cs.temporal?.getD [])
    (hmiss : temporalStatus r.facts (chartState r) rq = .missing)
    (hanchor : (eventTime r.facts (chartState r) rq.anchor true).isSome = true) :
    ∃ d ∈ deficiencies sp u records, d.patient = r.patient ∧ d.commit = cs.id ∧
      d.item = .requirement rq.id ∧ d.status = .pending := by
  refine ⟨{
      clinician := u.id, patient := r.patient, encounter := r.encounter, commit := cs.id,
      item := .requirement rq.id, label := rq.id, deadline? := requirementDeadline r rq,
      status := .pending }, ?_, rfl, rfl, rfl, rfl⟩
  simp only [deficiencies, chartDeficiencies, List.mem_flatMap]
  refine ⟨r, hr, cs, mem_open hcs hrole hopen, ?_⟩
  simp only [List.mem_append]
  left; left
  simp only [requirementRows, List.mem_filterMap]
  exact ⟨rq, hrq, by simp [requirementStatus, hmiss, hanchor]⟩

/-- New specification for owner review: **completeness (drafts).** Every saved
draft of the patient that still holds human work for an unsigned commit of the
role, after reconciliation for the ADT movement, is listed. -/
theorem draft_listed (sp : Spec) (u : User) (records : List ChartInput)
    (r : ChartInput) (hr : r ∈ records) (cs : CommitSpec) (hcs : cs ∈ sp.commits)
    (hrole : u.role ∈ cs.roles) (hopen : cs.id ∉ r.commits)
    (sd : SavedDraft) (hsd : sd ∈ r.drafts) (hpat : sd.draft.patient = r.patient)
    (hwork : draftFor sp cs (reconcileDraft sp sd.draft (movement sd.adt? r.adt?)) = true) :
    ∃ d ∈ deficiencies sp u records, d.patient = r.patient ∧ d.commit = cs.id ∧
      d.item = .draft sd.checkpoint := by
  refine ⟨{
      clinician := u.id, patient := r.patient, encounter := r.encounter, commit := cs.id,
      item := .draft sd.checkpoint, label := draftLabel sp cs (movement sd.adt? r.adt?),
      deadline? := (draftDeadline sp r cs sd).1, status := (draftDeadline sp r cs sd).2 }, ?_, rfl, rfl, rfl⟩
  simp only [deficiencies, chartDeficiencies, List.mem_flatMap]
  refine ⟨r, hr, cs, mem_open hcs hrole hopen, ?_⟩
  simp only [List.mem_append]
  left; right
  simp only [draftRows, List.mem_filterMap]
  exact ⟨sd, hsd, by simp [hwork, hpat]⟩

/-- New specification for owner review: **completeness (discharge).** Order
lines a discharge kept out of the author's chart are listed to that author as
discarded at discharge, under every unsigned order-entry commit of the role.
Specification change: listing is bounded by the 30-day discharge deadline;
unknown timing retains the notice. -/
theorem discard_listed (sp : Spec) (u : User) (records : List ChartInput)
    (r : ChartInput) (hr : r ∈ records) (cs : CommitSpec) (hcs : cs ∈ sp.commits)
    (hrole : u.role ∈ cs.roles) (hopen : cs.id ∉ r.commits) (horder : isOrderCommit sp cs.id = true)
    (dd : DiscardedDraft) (hdd : dd ∈ r.discards) (hne : dd.captured ≠ [])
    (hbound : discardWithinDeadline r dd = true) :
    ∃ d ∈ deficiencies sp u records, d.clinician = u.id ∧ d.patient = r.patient ∧
      d.item = .discarded dd.checkpoint ∧ d.status = .discardedAtDischarge := by
  refine ⟨{
      clinician := u.id, patient := r.patient, encounter := dd.encounter, commit := cs.id,
      item := .discarded dd.checkpoint,
      label := "Unsigned orders discarded at discharge (" ++ toString dd.captured.length ++ " entries)",
      status := .discardedAtDischarge }, ?_, rfl, rfl, rfl, rfl⟩
  simp only [deficiencies, chartDeficiencies, List.mem_flatMap]
  refine ⟨r, hr, cs, mem_open hcs hrole hopen, ?_⟩
  simp only [List.mem_append]
  right
  simp only [discardRows, horder, ↓reduceIte, List.mem_filterMap]
  exact ⟨dd, hdd, by simp [hne, hbound]⟩

/-- New specification for owner review: **soundness.** Every listed item
belongs to a chart in the input, to the signed-in clinician, and to a commit of
the spec that the clinician's role performs and that is not signed in that
chart. -/
theorem listed_unsigned (sp : Spec) (u : User) (records : List ChartInput)
    (d : Deficiency) (hd : d ∈ deficiencies sp u records) :
    ∃ r ∈ records, d.patient = r.patient ∧ d.clinician = u.id ∧ d.commit ∉ r.commits ∧
      ∃ cs ∈ sp.commits, cs.id = d.commit ∧ u.role ∈ cs.roles := by
  simp only [deficiencies, chartDeficiencies, List.mem_flatMap] at hd
  obtain ⟨r, hr, cs, hcs, hd⟩ := hd
  simp only [openCommits, List.mem_filter, Bool.and_eq_true, Bool.not_eq_true',
    List.contains_eq_mem, decide_eq_true_eq, decide_eq_false_iff_not] at hcs
  have h : d.patient = r.patient ∧ d.clinician = u.id ∧ d.commit = cs.id := by
    simp only [List.mem_append] at hd
    rcases hd with (hd | hd) | hd
    · simp only [requirementRows, List.mem_filterMap, Option.map_eq_some_iff] at hd
      obtain ⟨_, _, _, _, rfl⟩ := hd
      exact ⟨rfl, rfl, rfl⟩
    · simp only [draftRows, List.mem_filterMap] at hd
      obtain ⟨sd, _, hsd⟩ := hd
      split at hsd
      · simp only [Option.some.injEq] at hsd
        subst hsd; exact ⟨rfl, rfl, rfl⟩
      · simp at hsd
    · unfold discardRows at hd
      split at hd
      · simp only [List.mem_filterMap] at hd
        obtain ⟨dd, _, hdd⟩ := hd
        split at hdd
        · simp at hdd
        · simp only [Option.some.injEq] at hdd
          subst hdd; exact ⟨rfl, rfl, rfl⟩
      · simp at hd
  obtain ⟨hp, hc, hcommit⟩ := h
  exact ⟨r, hr, hp, hc, hcommit ▸ hcs.2.2, cs, hcs.1, hcommit.symm, hcs.2.1⟩

/-! ## Section 4: reconciliation at transfer and discharge -/

/-- New specification for owner review: the stored draft of `pid` after
reconciling the store is the reconciled draft. -/
theorem draft_reconcileStore (sp : Spec) (s : State) (pid : String) (m : Movement) :
    Workspace.draft (reconcileStore sp s pid m) pid = reconcileDraft sp (Workspace.draft s pid) m := by
  unfold Workspace.draft reconcileStore
  cases s.patientDrafts? with
  | none => cases m <;> rfl
  | some ds =>
    simp only [Option.map_some, Option.getD_some]
    induction ds with
    | nil => cases m <;> rfl
    | cons d ds ih =>
      by_cases h : d.patient = pid
      · have hp : (reconcileDraft sp d m).patient = pid := by cases m <;> simpa [reconcileDraft] using h
        simp [h, hp]
      · have hne : (d.patient == pid) = false := by simpa using h
        simp only [List.map_cons, hne, Bool.false_eq_true, ↓reduceIte, List.find?_cons]
        exact ih

private theorem restore_has {sp : Spec} {u : User} {t : State} {d : PatientDraft} {x : Captured}
    (hx : x ∈ d.captured) (hr : Workspace.restorable sp u x = true) :
    x ∈ (Workspace.restore sp u t d).captured := by
  simp only [Workspace.restore, Workspace.restored, List.mem_append, List.mem_filter]
  exact Or.inr ⟨hx, hr⟩

/-- New specification for owner review: **after a transfer, every restorable
order line of the saved draft is in the reopened chart, tagged as needing
reconciliation.** Stated for the hydration `Workspace.bind` performs
(`Ehr.Runtime.Hydrated`) on the store the host reconciled. -/
theorem transfer_restores_tagged (sp : Spec) (p : Program) (f : Facts) (u : User)
    (s : State) (pid first : String) (c : PatientContext)
    (hh : Runtime.Hydrated sp p f u (reconcileStore sp s pid .transfer) pid first c)
    (x : Captured) (hx : x ∈ (Workspace.draft s pid).captured)
    (horder : isOrderLineElement sp x.element = true)
    (hr : Workspace.restorable sp u x = true) :
    { x with provenance? := some reconcileTag } ∈
      (Workspace.bind sp p f u (reconcileStore sp s pid .transfer)).captured := by
  rw [hh.eq]
  show _ ∈ (Workspace.restore sp u _ (Workspace.draft (reconcileStore sp s pid .transfer) pid)).captured
  rw [draft_reconcileStore]
  apply restore_has
  · simp only [reconcileDraft, List.mem_map]
    exact ⟨x, hx, by simp [horder]⟩
  · simpa [Workspace.restorable] using hr

/-- New specification for owner review: **no order-entry commit while a line
awaits reconciliation.** From any state with a tagged capture, no event by any
actor adds an order-entry commit. -/
theorem pending_blocks_orders (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) (c : CommitId)
    (hpending : reconcilePending s = true) (horder : isOrderCommit sp c = true)
    (hnew : c ∉ s.commits) :
    c ∉ (step sp prog facts user actor s e).1.commits := by
  intro hafter
  have hguard := Proofs.T0_commit_needs_guard sp prog facts user actor s e c hnew hafter
  have hextra := ((Proofs.commitGuard_iff sp prog facts user s c).mp hguard).2.2.2.2
  unfold extraGuard at hextra
  cases hcs : sp.commit? c with
  | none => simp [hcs] at hextra
  | some cs =>
    simp only [hcs, Bool.and_eq_true] at hextra
    have hsign := hextra.1.1.1.1.1
    simp only [signingHasOrder, Bool.and_eq_true, Bool.or_eq_true, Bool.not_eq_true'] at hsign
    rcases hsign.2 with h | h
    · rw [horder] at h; contradiction
    · rw [hpending] at h; contradiction

/-- New specification for owner review: **after a transfer, no restored order
line can be signed without a decision.** If the saved draft holds a restorable
order line, the reopened chart refuses every order-entry commit; the tag is
removed only by the human per-line decision (`reconcileCore_ok`,
`reconcileCore_macro`), and re-entering a value keeps it (`reentry_keeps_tag`). -/
theorem transfer_needs_decision (sp : Spec) (p : Program) (f : Facts) (u : User)
    (s : State) (pid first : String) (c : PatientContext)
    (hh : Runtime.Hydrated sp p f u (reconcileStore sp s pid .transfer) pid first c)
    (x : Captured) (hx : x ∈ (Workspace.draft s pid).captured)
    (horder : isOrderLineElement sp x.element = true)
    (hr : Workspace.restorable sp u x = true)
    (actor : Actor) (e : Event) (cm : CommitId) (hcm : isOrderCommit sp cm = true)
    (hnew : cm ∉ (Workspace.bind sp p f u (reconcileStore sp s pid .transfer)).commits) :
    cm ∉ (step sp p f u actor (Workspace.bind sp p f u (reconcileStore sp s pid .transfer)) e).1.commits := by
  refine pending_blocks_orders _ _ _ _ _ _ _ _ ?_ hcm hnew
  apply List.any_eq_true.mpr
  exact ⟨_, transfer_restores_tagged sp p f u s pid first c hh x hx horder hr, by simp⟩

/-- New specification for owner review: re-entering a value on a line that
awaits reconciliation keeps the tag; only the explicit decision removes it. -/
theorem reentry_keeps_tag (l : List Captured) (x : Captured)
    (h : l.any (fun y => y.element == x.element && y.slot == x.slot &&
      y.provenance? == some reconcileTag) = true) :
    (storedCapture l x).provenance? = some reconcileTag := by
  simp [storedCapture, h]

/-- New specification for owner review: **after a discharge, no inpatient order
line is restored.** Every order-line capture of the reopened chart is one the
fresh chart itself holds (a record prefill); none comes from the saved draft. -/
theorem discharge_restores_no_orders (sp : Spec) (p : Program) (f : Facts) (u : User)
    (s : State) (pid first : String) (c : PatientContext)
    (hh : Runtime.Hydrated sp p f u (reconcileStore sp s pid .discharge) pid first c)
    (x : Captured)
    (hx : x ∈ (Workspace.bind sp p f u (reconcileStore sp s pid .discharge)).captured)
    (horder : isOrderLineElement sp x.element = true) :
    x ∈ (Runtime.chart ⟨sp, p, f, u⟩ first).captured := by
  rw [hh.eq] at hx
  change x ∈ (Workspace.restore sp u _ (Workspace.draft (reconcileStore sp s pid .discharge) pid)).captured at hx
  rw [draft_reconcileStore] at hx
  simp only [Workspace.restore, Workspace.restored, reconcileDraft, List.mem_append,
    List.mem_filter] at hx
  rcases hx with ⟨hx, _⟩ | ⟨⟨_, hk⟩, _⟩
  · exact hx
  · simp [horder] at hk

/-- New specification for owner review: the discharge keeps exactly the removed
order lines for provenance: the restored draft and the discarded lines together
are the saved draft's captures. -/
theorem discharge_keeps_provenance (sp : Spec) (d : PatientDraft) (x : Captured)
    (hx : x ∈ d.captured) :
    x ∈ (reconcileDraft sp d .discharge).captured ∨ x ∈ discarded sp d .discharge := by
  by_cases h : isOrderLineElement sp x.element = true
  · exact Or.inr (List.mem_filter.mpr ⟨hx, h⟩)
  · exact Or.inl (List.mem_filter.mpr ⟨hx, by simpa using h⟩)

#print axioms overdue_listed
#print axioms missing_listed
#print axioms draft_listed
#print axioms discard_listed
#print axioms listed_unsigned
#print axioms draft_reconcileStore
#print axioms transfer_restores_tagged
#print axioms pending_blocks_orders
#print axioms transfer_needs_decision
#print axioms reentry_keeps_tag
#print axioms discharge_restores_no_orders
#print axioms discharge_keeps_provenance
#print axioms reconcileCore_ok
#print axioms reconcileCore_macro

end Ehr.Deficiencies
