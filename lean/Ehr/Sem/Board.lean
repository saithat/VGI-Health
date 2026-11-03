import Ehr.Sem.TimelineProgram
import Ehr.Render.Api
import Ehr.Sem.BoardCritical
import Ehr.Render.PaneUrgency
import Ehr.Specs.AlertUrgency
import Ehr.Proofs.T2

/-! Patient-bound board execution. The board owns independent ordinary interpreter
sessions; it has no shared-dose/bed authority and performs no persistence. -/
namespace Ehr.Sem.Board
open Ehr Render

/-- Untagged legacy receipts are never imported by the board. The host must supply
patient/episode provenance; core still checks data version, time and reviewer role. -/
structure ScopedReceipt where
  patient : String
  episode : Option String
  receipt : Receipt
  deriving Lean.ToJson, Lean.FromJson, DecidableEq, Repr

structure Session where
  patient : String
  input : RenderInput
  receipts : List ScopedReceipt := []
  deriving Lean.ToJson, Lean.FromJson, DecidableEq, Repr

def ownReceipts (s : Session) : List Receipt :=
  (s.receipts.filter fun r => r.patient == s.patient && r.episode == s.input.facts.episodeId?).map (·.receipt)

/-- Sanitization is mandatory on every render and step, not a UI convention. -/
def prepared (s : Session) : RenderInput :=
  { s.input with
    facts := { s.input.facts with receipts := ownReceipts s },
    state := { s.input.state with receipts := ownReceipts s } }

def bound (s : Session) : Bool :=
  s.patient != "" && s.input.facts.sourcePatientId? == some s.patient &&
    s.input.display.sourcePatientId? == some s.patient

def valid (sessions : List Session) : Bool :=
  decide ((sessions.map (·.patient)).Nodup) && sessions.all bound

def screen (s : Session) : UiScreen := runRenderUi (prepared s)

def metadata (ui : UiScreen) : UiPaneMetadata :=
  { sourceLabels := ui.sourceLabels?.getD [], fieldSources := ui.fieldSources?.getD [],
    entryHints := ui.entryHints?.getD [], fieldChoices := ui.fieldChoices?.getD [],
    urgent? := ui.urgent?.map (fun ns => ns.filterMap stripAtom?) }

/-- Actual production strip payloads survive pane metadata without dropping a node. -/
theorem metadata_strip_exact (sp facts user state base) :
    ((metadata (withUrgentStrip sp facts user state base)).urgent?.getD []).map UiStripAtom.toNode =
      (withUrgentStrip sp facts user state base).urgent?.getD [] := by
  have exactNodes := pane_strip_exact sp facts user state base
  cases h : (withUrgentStrip sp facts user state base).urgent? <;>
    simpa [metadata, h] using exactNodes

#print axioms metadata_strip_exact

def encodeScreen (patient : String) (ui : UiScreen) : UiNode :=
  .patientPane patient ui.banner (metadata ui)
    (ui.workspace ++ ui.side ++ uiNavAtoms ui.nav) ui.modal.toList

def pane (s : Session) : UiNode := encodeScreen s.patient (screen s)

/-- Receipt sanitization changes no operand of a clinical alert predicate. -/
theorem prepared_clinicalEval (s : Session) (p : ClinicalPredicate) :
    clinicalEval (prepared s).facts (prepared s).state p = clinicalEval s.input.facts s.input.state p := by
  induction p <;> simp only [clinicalEval, *] <;> rfl

theorem prepared_alertKeys (s : Session) (cond : AlertCond) :
    alertKeys (prepared s).facts (prepared s).state cond = alertKeys s.input.facts s.input.state cond := by
  cases cond <;> simp only [alertKeys, prepared_clinicalEval] <;> rfl

#print axioms prepared_clinicalEval
#print axioms prepared_alertKeys

/-- Urgency is computed from clinical activity, including hidden and acknowledged
conditions. Passive demands stay passive and never introduce a modal. -/
def demands (s : Session) : List UiBoardDemand :=
  (s.input.spec.alerts.filter fun rule =>
    Specs.AlertUrgency.tier rule.id == some .urgent &&
      !(alertKeys s.input.facts s.input.state rule.cond).isEmpty).map fun rule =>
    { patient := s.patient, banner := uiClinicalBanner s.input.facts s.input.display, alertId := rule.id,
      label := uiLabel rule.label "Clinical alert",
      severity := match rule.tier with
        | .interruptive => "interruptive" | .passive => "passive" | .removable => "removable" }

/-- The rail and panes evaluate the same sanitized clinical state. The existing
raw-input presentation is definitionally receipt-independent, certified here. -/
theorem demands_prepared (s : Session) :
    demands s =
      ((prepared s).spec.alerts.filter fun rule =>
        Specs.AlertUrgency.tier rule.id == some .urgent &&
          !(alertKeys (prepared s).facts (prepared s).state rule.cond).isEmpty).map (fun rule =>
        { patient := s.patient, banner := uiClinicalBanner (prepared s).facts (prepared s).display,
          alertId := rule.id, label := uiLabel rule.label "Clinical alert",
          severity := match rule.tier with
            | .interruptive => "interruptive" | .passive => "passive" | .removable => "removable" }) := by
  simp only [prepared_alertKeys]
  rfl

#print axioms demands_prepared

def render (sessions : List Session) : UiNode :=
  .board (sessions.flatMap demands) (sessions.map pane)

theorem valid_nodup (sessions) (h : valid sessions = true) :
    (sessions.map (·.patient)).Nodup := by
  simp only [valid, Bool.and_eq_true, decide_eq_true_eq] at h
  exact h.1

theorem valid_binding (sessions) (h : valid sessions = true) (s) (hs : s ∈ sessions) :
    bound s = true := by
  simp only [valid, Bool.and_eq_true] at h
  exact List.all_eq_true.mp h.2 s hs

/-- A popup in any pane owns the board's interaction boundary. -/
def blockedByOther (sessions : List Session) (patient : String) : Bool :=
  match sessions.find? (fun s => (screen s).modal.isSome) with
  | none => false
  | some owner => owner.patient != patient

def advance (s : Session) (event : Event) : Session :=
  let i := prepared s
  let output := runStep {
    spec := i.spec, program := i.program, facts := i.facts,
    user := i.user, state := i.state, event }
  { s with
    input := { s.input with state := output.state },
    receipts := output.state.receipts.map fun r => ⟨s.patient, i.facts.episodeId?, r⟩ }

/-- Every event carries its patient; there is no ambient selected-patient state. -/
def dispatch (sessions : List Session) (patient : String) (event : Event) : List Session :=
  if !valid sessions || blockedByOther sessions patient then sessions else
    sessions.map fun s => if s.patient == patient then advance s event else s

theorem dispatch_valid (sessions : List Session) (patient : String) (e : Event)
    (h : valid sessions = true) : valid (dispatch sessions patient e) = true := by
  unfold dispatch
  split
  · exact h
  · have keys : (sessions.map (fun s => if s.patient == patient then advance s e else s)).map
        (·.patient) = sessions.map (·.patient) := by
      simp only [List.map_map]
      congr 1
      funext s
      dsimp only [Function.comp_apply]
      split <;> rfl
    have bindings : (sessions.map (fun s => if s.patient == patient then advance s e else s)).all bound =
        sessions.all bound := by
      simp only [List.all_map]
      congr 1
      funext s
      dsimp only [Function.comp_apply]
      split <;> rfl
    simp only [valid, keys, bindings]
    exact h

/-- The exact source-bound banner rendered for a commit's session. -/
theorem pane_banner (s : Session) :
    pane s = .patientPane s.patient (runRenderUi (prepared s)).banner (metadata (screen s))
      ((screen s).workspace ++ (screen s).side ++ uiNavAtoms (screen s).nav)
      (screen s).modal.toList := rfl

theorem receipt_scope (s : Session) (r : Receipt) (h : r ∈ ownReceipts s) :
    ∃ tagged ∈ s.receipts, tagged.patient = s.patient ∧
      tagged.episode = s.input.facts.episodeId? ∧ tagged.receipt = r := by
  obtain ⟨tagged, hm, he⟩ := List.mem_map.mp h
  obtain ⟨hm, hp⟩ := List.mem_filter.mp hm
  simp only [Bool.and_eq_true, beq_iff_eq] at hp
  exact ⟨tagged, hm, hp.1, hp.2, he⟩

theorem foreign_receipt_rejected (s : Session) (r : ScopedReceipt)
    (foreign : r.patient ≠ s.patient) :
    ownReceipts { s with receipts := [r] } = [] := by
  simp [ownReceipts, foreign]

theorem other_session_unchanged (sessions : List Session) (patient : String) (event : Event)
    (s : Session) (h : s ∈ sessions) (different : s.patient ≠ patient) :
    s ∈ dispatch sessions patient event := by
  unfold dispatch
  split
  · exact h
  · exact List.mem_map.mpr ⟨s, h, by simp [different]⟩

/-- Stronger than membership: projecting any other patient yields exactly the
same list of whole sessions, including state, receipts, captures and acknowledgments. -/
theorem other_sessions_exact (sessions : List Session) (patient other : String) (event : Event)
    (different : other ≠ patient) :
    (dispatch sessions patient event).filter (fun s => s.patient == other) =
      sessions.filter (fun s => s.patient == other) := by
  have mapExact : ∀ xs : List Session,
      (xs.map (fun s => if s.patient == patient then advance s event else s)).filter
        (fun s => s.patient == other) = xs.filter (fun s => s.patient == other) := by
    intro xs
    induction xs with
    | nil => rfl
    | cons s rest ih =>
      by_cases hs : s.patient = patient
      · simp only [List.map_cons, hs, beq_self_eq_true, ↓reduceIte]
        have identity : (advance s event).patient = s.patient := rfl
        simp only [List.filter_cons, identity, hs,
          beq_eq_false_iff_ne.mpr (Ne.symm different), Bool.false_eq_true, ↓reduceIte]
        exact ih
      · simp only [List.map_cons, beq_eq_false_iff_ne.mpr hs, Bool.false_eq_true, ↓reduceIte]
        simp only [List.filter_cons]
        rw [ih]
  unfold dispatch
  split
  · rfl
  · exact mapExact sessions

/-- Routed clinical execution is literally the ordinary interpreter on this pane's
sanitized input. Neither another pane's program nor its facts are arguments. -/
theorem advance_refines (s : Session) (e : Event) :
    (advance s e).input.state = (runStep {
      spec := (prepared s).spec, program := (prepared s).program,
      facts := (prepared s).facts, user := (prepared s).user,
      state := (prepared s).state, event := e }).state := rfl

/-- T0 is retained for ordinary bound clinical steps. Workspace lookup/hydration
remains the existing separate interpreter path and never borrows another session. -/
theorem clinical_commit_guard (s : Session) (e : Event) (c : CommitId)
    (ordinary : Workspace.enabled s.input.program = false)
    (before : c ∉ (prepared s).state.commits)
    (after : c ∈ (advance s e).input.state.commits) :
    commitGuard (prepared s).spec (prepared s).program (prepared s).facts
      (prepared s).user (prepared s).state c = true := by
  change c ∈ (runStep { spec := (prepared s).spec, program := (prepared s).program, facts := (prepared s).facts, user := (prepared s).user, state := (prepared s).state, event := e }).state.commits at after
  have ho : Workspace.enabled (prepared s).program = false := ordinary
  simp only [runStep, ho, Bool.false_and, Bool.false_eq_true, ↓reduceIte] at after
  cases hh : CriticalRuntime.handle (prepared s).facts (prepared s).user (prepared s).state e with
  | none =>
    simp only [hh, Option.getD_none] at after
    exact Proofs.T0_commit_needs_guard _ _ _ _ .human _ e c before after
  | some output =>
    simp only [hh, Option.getD_some] at after
    rw [critical_handle_commits _ _ _ _ _ hh] at after
    exact False.elim (before after)

/-- Same-patient version checks are still the original core checks. Foreign
patient/episode namespaces cannot contribute an accepted receipt value. -/
theorem foreign_review_inert (s : Session) (r : ScopedReceipt) (h : r.patient ≠ s.patient)
    (rq : ReviewReq) :
    reviewMet (prepared { s with receipts := [r] }).spec
      (prepared { s with receipts := [r] }).program
      (prepared { s with receipts := [r] }).facts
      (prepared { s with receipts := [r] }).state rq =
    reviewMet (prepared { s with receipts := [] }).spec
      (prepared { s with receipts := [] }).program
      (prepared { s with receipts := [] }).facts
      (prepared { s with receipts := [] }).state rq := by
  simp [prepared, ownReceipts, h]

/-- Workspace hydration may reset a session before the event. Every new clinical
commit is guarded at that exact hydrated state, including selection-enabled programs. -/
theorem workspace_commit_guard (sp : Spec) (p : Program) (f : Facts) (u : User)
    (s : State) (e : Event) (c : CommitId)
    (before : c ∉ (Workspace.bind sp p f u s).commits)
    (after : c ∈ (Workspace.step sp p f u s e).1.commits) :
    commitGuard sp p f u (Workspace.bind sp p f u s) c = true := by
  unfold Workspace.step at after
  cases e <;> dsimp only at after
  all_goals
    repeat' first
    | split at after
    | exact Proofs.T0_commit_needs_guard sp p f u .human _ _ c before after
    | exact False.elim (before after)
    | contradiction
    | (simp [Workspace.openPatient, Workspace.init] at after)

theorem bound_identity (s : Session) (h : bound s = true) :
    s.input.facts.sourcePatientId? = some s.patient ∧
      s.input.display.sourcePatientId? = some s.patient := by
  simp only [bound, Bool.and_eq_true, beq_iff_eq] at h
  exact ⟨h.1.2, h.2⟩

/-- A foreign receipt cannot change ANY guard, review predicate or interpreter
result: prepared input is exactly the same as if that receipt had not arrived. -/
theorem foreign_no_effect (s : Session) (r : ScopedReceipt) (h : r.patient ≠ s.patient) :
    prepared { s with receipts := [r] } = prepared { s with receipts := [] } := by
  simp [prepared, ownReceipts, h]

theorem advance_binding (s : Session) (e : Event) :
    bound (advance s e) = bound s := rfl

def eventResult (sessions : List Session) (patient : String) (event : Event) : StepResult :=
  if !valid sessions || blockedByOther sessions patient then .blocked "Acknowledge the board alert first" else
    match sessions.find? (fun s => s.patient == patient) with
    | none => .blocked "Unknown patient pane"
    | some s =>
      let i := prepared s
      (runStep {
        spec := i.spec, program := i.program, facts := i.facts,
        user := i.user, state := i.state, event }).result

/-- Independently decode the emitted node, preserving patient namespaces and
modal active regions. This observes the actual ordinary tree, not session data. -/
def decodePane : UiNode → Option (String × Screen)
  | .patientPane patient banner _ children modal => some (patient,
      ⟨.identity banner :: ((uiAtomsList children).map observe ++ [.information "patientBanner" [banner]]),
        if modal.isEmpty then none else some ((uiAtomsList modal).map observe)⟩)
  | _ => none

private theorem nav_atoms (nav) : uiAtomsList (uiNavAtoms nav) = uiNavAtoms nav := by
  induction nav with
  | nil => simp [uiNavAtoms, uiAtomsList]
  | cons pair rest ih =>
    rcases pair with ⟨title, entries⟩
    simp only [uiNavAtoms, List.flatMap_cons, uiAtomsList_append] at ih ⊢
    rw [ih]
    congr 1
    induction entries with
    | nil => simp [uiAtomsList]
    | cons pair rest ih => simp [uiAtomsList, uiAtoms, ih]

/-- Exact meaning equality for any encoded ordinary screen. -/
theorem encodeScreen_meaning (patient : String) (ui : UiScreen) :
    decodePane (encodeScreen patient ui) = some (patient, meaning ui) := by
  simp only [encodeScreen, decodePane, uiAtomsList_append, nav_atoms]
  cases hm : ui.modal <;>
    simp [meaning, baseAtoms, uiAtomsList, uiAtoms, uiBannerAtom, observe, hm]

/-- Exact meaning equality for the encoded pane, including all child multiplicity,
real navigation events, banner fields and foreground atoms. -/
theorem encoded_meaning (s : Session) :
    decodePane (pane s) = some (s.patient, meaning (screen s)) :=
  encodeScreen_meaning _ _

def decodeBoard : UiNode → List (String × Screen)
  | .board _ children => children.filterMap decodePane
  | _ => []

theorem encoded_board (sessions : List Session) :
    (sessions.map pane).filterMap decodePane = sessions.map (fun s => (s.patient, meaning (screen s))) := by
  induction sessions with
  | nil => rfl
  | cons s rest ih => simp [encoded_meaning, ih]

theorem render_meaning (sessions : List Session) :
    decodeBoard (render sessions) = sessions.map (fun s => (s.patient, meaning (screen s))) :=
  encoded_board sessions

/-- All per-patient predicates transport through the actual constructor. -/
theorem encoded_predicate (s : Session) (P : Screen → Prop) :
    (∃ patient view, decodePane (pane s) = some (patient, view) ∧ P view) ↔
      P (meaning (screen s)) := by
  simp only [encoded_meaning, Option.some.injEq, Prod.mk.injEq]
  constructor
  · rintro ⟨patient, view, ⟨hp, hv⟩, h⟩
    exact hv ▸ h
  · intro h
    exact ⟨s.patient, meaning (screen s), ⟨rfl, rfl⟩, h⟩

/-- Patient-tagged semantics. Equal component/alert IDs in different panes remain
different facts; modality is resolved within a pane, with a separate global rail. -/
def paneMeaning (s : Session) : String × Screen := (s.patient, meaning (screen s))

def meaningOf (sessions : List Session) : List (String × Screen) := sessions.map paneMeaning

def PerceivesIn (s : Session) (moment : Moment) (fact : Fact) : Prop :=
  Perceives (meaning (screen s)) moment fact

/-- Board placement preserves each patient's complete ordinary screen semantics. -/
theorem pane_predicate (s : Session) (P : Screen → Prop) :
    P (paneMeaning s).2 ↔ P (meaning (runRenderUi (prepared s))) := Iff.rfl

theorem pane_perception (s m f) :
    PerceivesIn s m f ↔ Perceives (meaning (runRenderUi (prepared s))) m f := Iff.rfl

theorem pane_reachability (s edge bound moment id) :
    ActionWithin (paneMeaning s).2 edge bound moment id ↔
      ActionWithin (meaning (runRenderUi (prepared s))) edge bound moment id := Iff.rfl

/-- Exposure carries separate evidence for the global rail, never pane clipping
or the unrelated modal's active region. It is required at every reached moment. -/
structure Exposure where
  railViewport : UiBoardDemand → Prop
  railLegible : UiBoardDemand → Prop
  railUnoccluded : UiBoardDemand → Prop

def UrgentPerceived (sessions : List Session) (m : Exposure) (d : UiBoardDemand) : Prop :=
  d ∈ sessions.flatMap demands ∧ m.railViewport d ∧ m.railLegible d ∧ m.railUnoccluded d

/-- Covers ALL active urgent conditions, not just warnings present in a screen. -/
theorem active_urgent_in_rail (s : Session) (rule : AlertSpec)
    (member : rule ∈ s.input.spec.alerts)
    (urgent : Specs.AlertUrgency.tier rule.id = some .urgent)
    (active : ∃ key, key ∈ alertKeys s.input.facts s.input.state rule.cond) :
    ∃ d ∈ demands s, d.patient = s.patient ∧ d.alertId = rule.id := by
  refine ⟨_, List.mem_map.mpr ⟨rule, List.mem_filter.mpr ⟨member, ?_⟩, rfl⟩, rfl, rfl⟩
  simp only [urgent, beq_self_eq_true, Bool.true_and, Bool.not_eq_true', List.isEmpty_eq_false_iff]
  obtain ⟨key, hk⟩ := active
  intro empty
  simp [empty] at hk

/-- Cross-patient urgency through every interpreter/view transition. A view edge
may scroll/focus another pane or introduce an unrelated modal. Only the rail's
three measured exposure conditions are hypotheses, not clinical coverage. -/
theorem continuous_cross_patient_urgency {α : Type} (edge : α → α → Prop)
    (sessions : α → List Session) (exposure : α → Exposure) (initial : α)
    (layout : ∀ n target, Within edge n initial target →
      ∀ d ∈ (sessions target).flatMap demands,
        (exposure target).railViewport d ∧ (exposure target).railLegible d ∧
          (exposure target).railUnoccluded d) :
    ∀ n target, Within edge n initial target → ∀ s ∈ sessions target,
      ∀ rule ∈ s.input.spec.alerts, Specs.AlertUrgency.tier rule.id = some .urgent →
      (∃ key, key ∈ alertKeys s.input.facts s.input.state rule.cond) →
      ∃ d, d.patient = s.patient ∧ d.alertId = rule.id ∧
        UrgentPerceived (sessions target) (exposure target) d := by
  intro n target reach s hs rule hr hu ha
  obtain ⟨d, hd, hp, hi⟩ := active_urgent_in_rail s rule hr hu ha
  have hm : d ∈ (sessions target).flatMap demands := List.mem_flatMap.mpr ⟨s, hs, hd⟩
  exact ⟨d, hp, hi, hm, layout n target reach d hm⟩

namespace Examples
open Ehr.Examples.Tiny Ehr.Examples.TinyTests

def receiptSession (patient owner : String) : Session :=
  let f := { factsWithReceipt 3 with sourcePatientId? := some patient }
  let display : Display := { Display.empty with
    sourcePatientId? := some patient,
    banner := { Display.empty.banner with name := patient, mrn := patient } }
  let input : RenderInput := { spec, program, facts := f, display, user, state := atSignWith f }
  { patient, input, receipts := f.receipts.map fun r => ⟨owner, f.episodeId?, r⟩ }

theorem own_receipt_commits :
    "signOrders" ∈ (advance (receiptSession "A" "A") (.click "signButton")).input.state.commits := by decide

theorem foreign_receipt_blocks :
    "signOrders" ∉ (advance (receiptSession "B" "A") (.click "signButton")).input.state.commits := by decide

theorem two_patients_valid : valid [receiptSession "A" "A", receiptSession "B" "B"] = true := by decide

#print axioms own_receipt_commits
#print axioms foreign_receipt_blocks
#print axioms two_patients_valid
end Examples

#print axioms render_meaning
#print axioms encodeScreen_meaning
#print axioms dispatch_valid
#print axioms valid_nodup
#print axioms valid_binding
#print axioms foreign_review_inert
#print axioms bound_identity
#print axioms foreign_no_effect
#print axioms advance_binding
#print axioms workspace_commit_guard
#print axioms encoded_meaning
#print axioms encoded_board
#print axioms encoded_predicate
#print axioms pane_banner
#print axioms receipt_scope
#print axioms foreign_receipt_rejected
#print axioms other_session_unchanged
#print axioms other_sessions_exact
#print axioms advance_refines
#print axioms clinical_commit_guard
#print axioms pane_predicate
#print axioms pane_perception
#print axioms pane_reachability
#print axioms active_urgent_in_rail
#print axioms continuous_cross_patient_urgency
end Ehr.Sem.Board
