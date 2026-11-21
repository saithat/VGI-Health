import Ehr.Check.PriorAuthSound
import Ehr.Render.WorkspaceProofs
import Ehr.Proofs.RuntimeEpisodeAccepted
import Ehr.Proofs.Runtime

namespace Ehr.Check
open Ehr Ehr.Props

/-- New specification for owner review. Each control is shown after real human
steps. The next leg works from any modal-free state at that endpoint, including
after the human enters a value or advances a line. Service navigation introduces
no new drug captures. -/
def CanVisit (sp : Spec) (p : Program) (f : Facts) (u : User) (wf : String)
    (service : Bool) (start : ScreenId) : List Kind → Prop
  | [] => True
  | k :: ks => ∀ s : State, s.screen = start → s.popup? = none →
    ∃ (events : List Event) (t : State) (c : Component), OkRun sp p f u s events t ∧
      t.popup? = none ∧ (p.screen? t.screen).map Screen.workflow = some wf ∧
      controlFits k c.kind ∧ shownComp? sp p f t c.id = some c ∧
      (itemView sp f t (p.compsOf t.screen) c).shown ∧
      (service = true → DrugFrame s t) ∧ CanVisit sp p f u wf service t.screen ks

private theorem destination_kind (p wf k z) (h : workflowDestination p wf k z) :
    ∃ actual, controlFits k actual ∧ priorAuthDestination p wf actual z := by
  cases look : p.screen? z with
  | none => simp [workflowDestination, look] at h
  | some scr =>
    simp only [workflowDestination, look, Option.any_some, Bool.and_eq_true, List.any_eq_true] at h
    obtain ⟨hw, c, hc, fits, shown⟩ := h
    exact ⟨c.kind, fits, by simpa [priorAuthDestination, look, hw] using
      (show ∃ x ∈ scr.components, x.kind = c.kind ∧
        contextShownAux scr.components (contextLayout scr.components x) (scr.components.length + 1) x
        from ⟨c, hc, rfl, shown⟩)⟩

theorem workflowPath_sound (sp p f u wf service start ks) (ids : IdsUnique p)
    (pass : workflowPath sp p wf service start ks)
    (ordinary : ∀ k ∈ ks, ∀ a popup, k ≠ .alert a popup) :
    CanVisit sp p f u wf service start ks := by
  induction ks generalizing start with
  | nil => trivial
  | cons k ks ih =>
    intro s here clear
    obtain ⟨row, hr, hk⟩ := List.any_eq_true.mp pass
    obtain ⟨⟨_, available⟩, tail⟩ := Bool.and_eq_true_iff.mp hk |>.imp_left Bool.and_eq_true_iff.mp
    obtain ⟨actual, fits, dest⟩ := destination_kind _ _ _ _ available
    have plain : ∀ a popup, actual ≠ .alert a popup := by
      rintro a popup rfl
      have ne := ordinary k (by simp) a popup
      cases k <;> simp_all [controlFits, showsInfo]
    obtain ⟨es, t, c, go, atDest, free, workflow, kind, lookup, shown, frame⟩ :=
      reach_control sp p f u wf actual start service ids row hr dest plain s here clear
    exact ⟨es, t, c, go, free, workflow, kind ▸ fits, lookup, shown, frame,
      atDest ▸ ih row.1 tail (fun x hx => ordinary x (by simp [hx]))⟩

private theorem checkedWorkflow (sp prev can p name msg test)
    (checked : check sp prev can p = .ok)
    (rule : workflowRule p name msg test ∈ rules sp prev can p) :
    ∀ scr ∈ p.screens, test scr = true :=
  List.all_eq_true.mp ((check_ok_iff sp prev can p).mp checked _ rule)

theorem accepted_serviceBundle (sp prev can p) (h : check sp prev can p = .ok)
    (scr : Screen) (hs : scr ∈ p.screens) (opt : serviceOptIn sp scr)
    (a : ScreenId) (origin : a = scr.id ∨ a = p.start ∨ a ∈ chartEntries p)
    (f u) : (p.compsOf a).all drugNeutral ∧
    CanVisit sp p f u scr.workflow true a (serviceControls sp) := by
  have ok := checkedWorkflow sp prev can p "serviceBundle" _ (serviceBundle sp p) h
    (by repeat' first | exact List.Mem.head _ | apply List.Mem.tail) scr hs
  simp only [serviceBundle, opt, Bool.not_true, Bool.false_or, List.all_eq_true] at ok
  have ha := ok a (by
    simpa using origin)
  refine ⟨(Bool.and_eq_true_iff.mp ha).1, workflowPath_sound _ _ _ _ _ _ _ _
    (accepted_structural _ _ _ _ h).2.2.1 (Bool.and_eq_true_iff.mp ha).2 ?_⟩
  intro k hk al popup eq
  subst k
  simp [serviceControls, List.mem_append] at hk

theorem accepted_identityReview (sp prev can p) (h : check sp prev can p = .ok)
    (scr : Screen) (hs : scr ∈ p.screens) (sel : p.patientSelection? = some true)
    (cm e) (pair : (cm, e) ∈ [("signOrders", "patientIdReentry"), ("administerMed", "wristbandScan")])
    (button : scr.components.any fun c => commitOf? c.kind == some cm)
    (f u) : (∀ s : State, p.screen? s.screen = some scr → infoShown sp p f s "allergyList") ∧
    ∃ slot, CanVisit sp p f u scr.workflow false scr.id [.field e slot .none] ∧
      ∀ a ∈ chartEntries p, CanVisit sp p f u scr.workflow false a [.field e slot .none, .button (.commit cm)] := by
  have ok := checkedWorkflow sp prev can p "patientIdentityReview" _ (identityReview sp p) h
    (by repeat' first | exact List.Mem.head _ | apply List.Mem.tail) scr hs
  simp only [identityReview, sel, bne_self_eq_false, Bool.false_or] at ok
  have applied := List.all_eq_true.mp ok (cm, e) pair
  simp only [button, Bool.not_true, Bool.false_or, Bool.and_eq_true, List.any_eq_true] at applied
  obtain ⟨⟨c, hc, hi⟩, slot, _, path, origins⟩ := applied
  constructor
  · intro s here
    simp only [infoShown, Program.compsOf, here, List.any_eq_true]
    exact ⟨c, hc, Bool.and_eq_true_iff.mpr ⟨hi.1,
      fixedShown_sound _ _ _ _ _ hi.2⟩⟩
  · refine ⟨slot, workflowPath_sound _ _ _ _ _ _ _ _ (accepted_structural _ _ _ _ h).2.2.1 path (by simp), ?_⟩
    intro a ha
    exact workflowPath_sound _ _ _ _ _ _ _ _ (accepted_structural _ _ _ _ h).2.2.1
      (List.all_eq_true.mp origins a ha) (by simp)

theorem accepted_medicationLines (sp prev can p) (h : check sp prev can p = .ok)
    (scr : Screen) (hs : scr ∈ p.screens)
    (dose : (sp.element? doseElement).any fun e => e.kind == .medicationDose)
    (button : scr.components.any fun c => commitOf? c.kind == some "signOrders") (f u) :
    CanVisit sp p f u scr.workflow false scr.id
      [.field drugElement .current .none, .field doseElement .current .none,
       .button .newOrderLine, .field drugElement .current .none, .field doseElement .current .none] := by
  have ok := checkedWorkflow sp prev can p "medicationLines" _ (medicationLines sp p) h
    (by repeat' first | exact List.Mem.head _ | apply List.Mem.tail) scr hs
  apply workflowPath_sound _ _ _ _ _ _ _ _ (accepted_structural _ _ _ _ h).2.2.1
  · exact (Bool.and_eq_true_iff.mp (by simpa [medicationLines, dose, button] using ok :
      (scr.components.all independentDose && _) = true)).2
  · simp

theorem accepted_criticalFollowThrough (sp prev can p) (h : check sp prev can p = .ok)
    (scr : Screen) (hs : scr ∈ p.screens) (a : AlertSpec) (ha : a ∈ sp.alerts)
    (crit : a.cond = .criticalResult)
    (display : scr.components.any fun c => (alertOf? c.kind).any fun pair => pair.1 == a.id)
    (f u) : CanVisit sp p f u scr.workflow false scr.id [.button (.commit a.commit)] := by
  have ok := checkedWorkflow sp prev can p "criticalFollowThrough" _ (criticalFollowThrough sp p) h
    (by repeat' first | exact List.Mem.head _ | apply List.Mem.tail) scr hs
  apply workflowPath_sound _ _ _ _ _ _ _ _ (accepted_structural _ _ _ _ h).2.2.1
  · simpa [crit, display] using List.all_eq_true.mp ok a ha
  · simp

/-- New specification for owner review. Binding a selected chart reloads its
review receipts from that source. Every restored human-only value belongs to
the selected patient's own draft. -/
theorem switched_review_source (E : Runtime.BoundEpisode) (hyd : E.Hydrates) :
    E.start.receipts = E.facts.receipts ∧
    ∀ x ∈ E.start.captured, ∀ el, E.spec.element? x.element = some el → HumanMustEnter el →
      x ∈ (Workspace.draft E.opened ((E.opened.patientContext?.bind (·.patient?)).getD "")).captured ∧
        x.byHuman = true ∧ x.confirmed = true := by
  obtain ⟨first, ctx, he⟩ := Runtime.start_eq E hyd
  rw [he]
  constructor
  · change (Runtime.chart E.toEpisode first).receipts = E.facts.receipts
    simp only [Runtime.chart, Episode.start, (Proofs.goTo_safe ..).receipts,
      init, (Proofs.prefillScreen_safe ..).receipts]
  · exact Runtime.restore_human (Runtime.chart_noHuman E.toEpisode first)

/-- New specification for owner review. Replacing a capture updates this
dose only. No value is inserted, removed or changed at another dose slot. -/
theorem correction_other_doses (xs : List Captured) (edit other : Captured)
    (same : other.element = edit.element) (line : other.slot ≠ edit.slot) :
    other ∈ setCaptured xs edit ↔ other ∈ xs := by
  have ne : other ≠ storedCapture xs edit := fun eq => line (by simpa [storedCapture] using congrArg Captured.slot eq)
  simp [setCaptured, same, line, ne]

/-- New specification for owner review. An actual successful add-line click
requires every applicable entry on the outgoing line, even after a correction. -/
theorem advance_requires_line (sp p f u s c) (kind : c.kind = .button .newOrderLine)
    (clicked : (clickCore sp p f u .human s c).2 = .ok)
    (drug : String) (line : (s.currentSlot, drug) ∈ orderLines s)
    (rq : EntryReq) (req : rq ∈ sp.entries) (per : rq.perOrderLine)
    (applies : lineMatches f s rq.when s.currentSlot drug) (el : ElementSpec)
    (declared : sp.element? rq.element = some el) :
    hasGoodEntry f u s el (some s.currentSlot) rq.allowed? := by
  have complete : currentLineComplete sp f u s := by
    cases ok : currentLineComplete sp f u s <;> simp_all [clickCore]
  have lines := (Bool.and_eq_true_iff.mp complete).2
  have all := List.all_eq_true.mp lines (s.currentSlot, drug) line
  simp only [bne_self_eq_false, Bool.false_or] at all
  simpa [per, applies, declared] using List.all_eq_true.mp all rq req

/-- New specification for owner review. On the deployed API, a later line
must satisfy its own requirements at signature regardless of earlier edits. -/
theorem signed_line_requires_own_capture (i : StepInput) (cm : CommitId)
    (before : cm ∉ i.state.commits) (after : cm ∈ (runStep i).state.commits)
    (rq : EntryReq) (req : rq ∈ i.spec.entries) (commit : rq.commit = cm)
    (per : rq.perOrderLine) (n : Nat) (drug : String)
    (line : (n, drug) ∈ orderLines (Runtime.inputState i))
    (applies : lineMatches i.facts (Runtime.inputState i) rq.when n drug)
    (el : ElementSpec) (declared : i.spec.element? rq.element = some el) :
    ∃ x ∈ (Runtime.inputState i).captured, x.element = el.id ∧ x.slot = n ∧ Proofs.EntryCaptureValid el rq x := by
  obtain ⟨hn, ha⟩ := Runtime.commit_core i cm before after
  exact Proofs.T0_entry_values_perLine _ _ _ _ _ _ _ _ hn ha rq req commit per n drug line applies el declared

/-- New specification for owner review. The accepted layout cannot use
the interpreter's cross-slot linked prefill for a dose on any screen. -/
theorem accepted_dose_no_copy (sp prev can p) (h : check sp prev can p = .ok)
    (dose : (sp.element? doseElement).any fun e => e.kind == .medicationDose)
    (scr : Screen) (hs : scr ∈ p.screens) (c : Component) (hc : c ∈ scr.components) (slot src) :
    c.kind ≠ .field doseElement slot (.linked src) := by
  have ok := checkedWorkflow sp prev can p "medicationLines" _ (medicationLines sp p) h
    (by repeat' first | exact List.Mem.head _ | apply List.Mem.tail) scr hs
  simp only [medicationLines, dose, Bool.not_true, Bool.false_or, Bool.and_eq_true] at ok
  intro kind
  simpa [independentDose, kind] using List.all_eq_true.mp ok.1 c hc

/-- New specification for owner review. A displayed, available, unresolved
ticket has a same-screen clinical action field before and after inbox completion. -/
theorem critical_action_shown (f : Facts) (u : User) (s : State) (ticket : Multi.Critical.Ticket)
    (member : ticket ∈ CriticalRuntime.tickets f { s with clock := 0 })
    (due : ticket.result.availableAt ≤ CriticalRuntime.now f { s with clock := 0 })
    (pending : ticket.resolution = none) :
    ∃ children, Render.UiNode.section ("critical:" ++ ticket.result.id) ticket.result.label children ∈
      Render.criticalNodes f u s ∧
      Render.UiNode.field ("critical.action:" ++ ticket.result.id) "Clinical action taken" "text"
        (some (CriticalRuntime.actionText s ticket.result.id)) none none false true true ∈ children := by
  simp only [Render.criticalNodes, List.mem_filterMap]
  refine ⟨_, ⟨ticket, member, by rw [ite_eq_right (Nat.not_lt.mpr due)]⟩, ?_⟩
  simp [pending, CriticalRuntime.actionText]

/-- New specification for owner review. Every successful medication signature
or administration requiring identity has confirmed human evidence for this
patient's identity or wristband in the state actually checked by runStep. -/
theorem commit_matches_patient (i : StepInput) (c : CommitId)
    (before : c ∉ i.state.commits) (after : c ∈ (runStep i).state.commits)
    (rq : EntryReq) (req : rq ∈ i.spec.entries) (commit : rq.commit = c)
    (whole : rq.perOrderLine = false) (applies : whenHolds i.facts (Runtime.inputState i) rq.when)
    (el : ElementSpec) (declared : i.spec.element? rq.element = some el)
    (identity : el.kind = .identity ∨ el.kind = .scan "wristband") :
    ∃ x ∈ (Runtime.inputState i).captured, x.element = el.id ∧ x.confirmed ∧ x.byHuman ∧
      x.value = (if el.kind == .identity then .text (identityText i.facts.identity) else .code i.facts.patientId) := by
  have guard := Runtime.T0_commit_needs_guard i c before after
  have met := ((Proofs.commitGuard_iff ..).mp guard).2.1 rq req commit
  obtain ⟨x, mem, elem, valid⟩ := Proofs.entryMet_witness _ _ _ _ _ _ declared whole applies met
  have human : needsHuman el := by rcases identity with h | h <;> simp [needsHuman, h]
  simp only [capturedSatisfies, human, Bool.not_true, Bool.false_or, Bool.and_eq_true] at valid
  refine ⟨x, mem, elem, valid.1.1, valid.2, ?_⟩
  have satisfies := valid.1.2
  rcases identity with h | h <;> cases v : x.value <;>
    simp_all [valueSatisfies, valueAccepted, scanMatches]

/-- New specification for owner review. The responsible clinician can enter
a ticket-specific action through the deployed API on the current bound chart. -/
theorem critical_document_action (i : StepInput) (ticket : Multi.Critical.Ticket) (text : String)
    (chart : (Workspace.enabled i.program && !Workspace.bound i.facts i.state) = false)
    (free : i.state.popup? = none)
    (event : i.event = .enter ("critical.action:" ++ ticket.result.id) (.text text))
    (lookup : (CriticalRuntime.tickets i.facts i.state).find?
      (fun t => "critical.action:" ++ ticket.result.id == "critical.action:" ++ t.result.id) = some ticket)
    (authorized : Multi.Critical.authorized ticket i.user.id) :
    (runStep i).result = .ok ∧
    CriticalRuntime.actionText (runStep i).state ticket.result.id = text := by
  simp [runStep, chart, CriticalRuntime.handle, event, lookup, free, authorized,
    CriticalRuntime.actionText, CriticalRuntime.setDraft]

#print axioms commit_matches_patient
#print axioms critical_document_action

#print axioms switched_review_source
#print axioms correction_other_doses
#print axioms advance_requires_line
#print axioms signed_line_requires_own_capture
#print axioms accepted_dose_no_copy
#print axioms critical_action_shown

#print axioms destination_kind
#print axioms workflowPath_sound
#print axioms checkedWorkflow
#print axioms accepted_serviceBundle
#print axioms accepted_identityReview
#print axioms accepted_medicationLines
#print axioms accepted_criticalFollowThrough
end Ehr.Check
