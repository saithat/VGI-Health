import Ehr.Sem.Board

/-! The board's view graph includes global modal ownership, physical exposure and
scoped interpreter events. Reachability is conditional on measured exposure;
it does not identify an inert background offer with an actionable control. -/
namespace Ehr.Sem.Board
open Ehr Render

structure BoardView where
  sessions : List Session
  moment : String → Moment
  rail : Exposure

/-- One deliberate view interaction. Physical steps cannot write clinical state;
event steps are exactly the scoped board dispatcher, including modal blocking.
Physical edges require supplied measured-transition evidence; equal clinical state
alone does not establish an arbitrary exposure jump or a one-step discovery bound. -/
inductive ViewStep (physicalEdge : BoardView → BoardView → Prop) : BoardView → BoardView → Prop
  | physical {a b} (measured : physicalEdge a b) (same : b.sessions = a.sessions) : ViewStep physicalEdge a b
  | event {a b} (patient : String) (event : Event)
      (next : b.sessions = dispatch a.sessions patient event) : ViewStep physicalEdge a b

def Ready (v : BoardView) (patient id : String) : Prop :=
  blockedByOther v.sessions patient = false ∧
    ∃ s ∈ v.sessions, s.patient = patient ∧ ∃ label role reason key,
      Perceives (meaning (screen s)) (v.moment patient) (.action id label role true reason key)

def ReachAction (physicalEdge : BoardView → BoardView → Prop) (bound : Nat) (v : BoardView) (patient id : String) : Prop :=
  ∃ n ≤ bound, ∃ target, Within (ViewStep physicalEdge) n v target ∧ Ready target patient id

/-- A control in an inert pane is never ready, even at an exposed local moment. -/
theorem modal_blocks_background (v : BoardView) (patient id : String)
    (blocked : blockedByOther v.sessions patient = true) : ¬ Ready v patient id := by
  intro ready
  simp [Ready, blocked] at ready

/-- Zero discovery cost requires both actual exposure and global interaction authority. -/
theorem ready_now (physicalEdge : BoardView → BoardView → Prop) (v patient id) (h : Ready v patient id) : ReachAction physicalEdge 0 v patient id :=
  ⟨0, Nat.le_refl _, v, .refl _, h⟩

/-- Explicit finite view witnesses give the bound, rather than borrowing the
single-session event-completion theorem as a physical bound. -/
theorem reachable_action (physicalEdge : BoardView → BoardView → Prop) (n bound : Nat) (v target : BoardView) (patient id : String)
    (cost : n ≤ bound) (path : Within (ViewStep physicalEdge) n v target) (ready : Ready target patient id) :
    ReachAction physicalEdge bound v patient id := ⟨n, cost, target, path, ready⟩

theorem view_step_valid (physicalEdge : BoardView → BoardView → Prop) (a b : BoardView) (step : ViewStep physicalEdge a b)
    (h : valid a.sessions = true) : valid b.sessions = true := by
  cases step with
  | physical measured same => simpa [same] using h
  | event patient event next => simpa [next] using dispatch_valid a.sessions patient event h

theorem view_trace_valid (physicalEdge : BoardView → BoardView → Prop) (a b : BoardView) (n : Nat) (path : Within (ViewStep physicalEdge) n a b)
    (h : valid a.sessions = true) : valid b.sessions = true := by
  revert h
  induction path with
  | refl => exact id
  | @step n a middle b edge rest ih =>
    intro h
    exact ih (view_step_valid physicalEdge a middle edge h)

/-- Every ready offer belongs to the same source Patient.id on both facts and
display. The identifying banner comes from this source's encoded ordinary screen. -/
theorem ready_source (v : BoardView) (patient id : String) (h : valid v.sessions = true)
    (ready : Ready v patient id) :
    ∃ s ∈ v.sessions, s.patient = patient ∧
      s.input.facts.sourcePatientId? = some patient ∧ s.input.display.sourcePatientId? = some patient ∧
      decodePane (pane s) = some (patient, meaning (screen s)) := by
  obtain ⟨_, s, hs, hp, _⟩ := ready
  obtain ⟨hf, hd⟩ := bound_identity s (valid_binding v.sessions h s hs)
  refine ⟨s, hs, hp, ?_, ?_, ?_⟩
  · simpa [hp] using hf
  · simpa [hp] using hd
  · simpa [hp] using encoded_meaning s

/-- No background clinical effect can occur through a modal-blocked route. -/
theorem blocked_no_effect (sessions : List Session) (patient : String) (event : Event)
    (h : blockedByOther sessions patient = true) : dispatch sessions patient event = sessions := by
  simp [dispatch, h]

def run (sessions : List Session) (events : List (String × Event)) : List Session :=
  events.foldl (fun current e => dispatch current e.1 e.2) sessions

/-- Arbitrary interleavings of other patients' events retain the whole protected
session, including receipts, captures and acknowledgments, over the complete trace. -/
theorem untouched_trace (sessions : List Session) (events : List (String × Event)) (patient : String)
    (other : ∀ e ∈ events, patient ≠ e.1) :
    (run sessions events).filter (fun s => s.patient == patient) =
      sessions.filter (fun s => s.patient == patient) := by
  induction events generalizing sessions with
  | nil => rfl
  | cons e rest ih =>
    have tail : ∀ x ∈ rest, patient ≠ x.1 := fun x hx => other x (List.mem_cons_of_mem _ hx)
    change (run (dispatch sessions e.1 e.2) rest).filter _ = _
    rw [ih _ tail]
    exact other_sessions_exact sessions e.1 patient e.2 (other e List.mem_cons_self)

/-- Clinical rail coverage and all-moment exposure compose with the actual board
view graph, including lookup/return, acknowledgment, scroll and focus steps. -/
theorem view_urgency (physicalEdge : BoardView → BoardView → Prop) (initial : BoardView)
    (layout : ∀ n target, Within (ViewStep physicalEdge) n initial target →
      ∀ d ∈ target.sessions.flatMap demands,
        target.rail.railViewport d ∧ target.rail.railLegible d ∧ target.rail.railUnoccluded d) :
    ∀ n target, Within (ViewStep physicalEdge) n initial target → ∀ s ∈ target.sessions,
      ∀ rule ∈ s.input.spec.alerts, Specs.AlertUrgency.tier rule.id = some .urgent →
      (∃ key, key ∈ alertKeys s.input.facts s.input.state rule.cond) →
      ∃ d : UiBoardDemand, d.patient = s.patient ∧ d.alertId = rule.id ∧ UrgentPerceived target.sessions target.rail d :=
  continuous_cross_patient_urgency (ViewStep physicalEdge) (·.sessions) (·.rail) initial layout

/-- Observe the actual emitted rail in the patient's semantic namespace. -/
def railFacts (ds : List UiBoardDemand) (patient : String) : List Fact :=
  (ds.filter fun d => d.patient == patient).map fun d => .alert d.alertId d.label d.severity

def railScreen (node : UiNode) (patient : String) : Screen :=
  ⟨railFacts (match node with | .board ds _ => ds | _ => []) patient, none⟩

def railMoment (m : Exposure) (patient : String) : Moment :=
  ⟨fun f => ∃ d, d.patient = patient ∧ f = .alert d.alertId d.label d.severity ∧ m.railViewport d,
   fun f => ∃ d, d.patient = patient ∧ f = .alert d.alertId d.label d.severity ∧ m.railLegible d,
   fun f => ∃ d, d.patient = patient ∧ f = .alert d.alertId d.label d.severity ∧ m.railUnoccluded d⟩

/-- Rail evidence entails the existing Perceives predicate, with unchanged alert
identity, label and severity and an explicit patient namespace. -/
theorem render_rail_perceived (sessions : List Session) (m : Exposure) (d : UiBoardDemand)
    (h : UrgentPerceived sessions m d) :
    Perceives (railScreen (render sessions) d.patient) (railMoment m d.patient)
      (.alert d.alertId d.label d.severity) := by
  obtain ⟨hd, hv, hl, hu⟩ := h
  refine ⟨?_, ⟨d, rfl, rfl, hv⟩, ⟨d, rfl, rfl, hl⟩, ⟨d, rfl, rfl, hu⟩⟩
  change Fact.alert d.alertId d.label d.severity ∈
    ((sessions.flatMap demands).filter fun x => x.patient == d.patient).map
      (fun x => Fact.alert x.alertId x.label x.severity)
  exact List.mem_map.mpr ⟨d, List.mem_filter.mpr ⟨hd, by simp⟩, rfl⟩

/-- The ordinary constructor satisfies the existing urgency predicate rather
than treating mere demand membership as perception. -/
theorem render_rail_urgent_visible (sessions : List Session) (m : Exposure) (patient : String)
    (layout : ∀ d ∈ sessions.flatMap demands,
      m.railViewport d ∧ m.railLegible d ∧ m.railUnoccluded d) :
    UrgentVisible (railScreen (render sessions) patient) (railMoment m patient)
      (railFacts (sessions.flatMap demands) patient) := by
  intro f hf
  obtain ⟨d, hd, rfl⟩ := List.mem_map.mp hf
  obtain ⟨hd, hp⟩ := List.mem_filter.mp hd
  have same : d.patient = patient := by simpa using hp
  simpa [same] using render_rail_perceived sessions m d ⟨hd, layout d hd⟩

/-- Every clinically active urgent rule is perceived over the actual board graph,
including foreign modal and physical transitions justified by the view adapter. -/
theorem view_semantic_urgency (physicalEdge : BoardView → BoardView → Prop) (initial : BoardView)
    (layout : ∀ n target, Within (ViewStep physicalEdge) n initial target →
      ∀ d ∈ target.sessions.flatMap demands,
        target.rail.railViewport d ∧ target.rail.railLegible d ∧ target.rail.railUnoccluded d) :
    ∀ n target, Within (ViewStep physicalEdge) n initial target → ∀ s ∈ target.sessions,
      ∀ rule ∈ s.input.spec.alerts, Specs.AlertUrgency.tier rule.id = some .urgent →
      (∃ key, key ∈ alertKeys s.input.facts s.input.state rule.cond) →
      ∃ d : UiBoardDemand, d.patient = s.patient ∧ d.alertId = rule.id ∧
        Perceives (railScreen (render target.sessions) d.patient) (railMoment target.rail d.patient)
          (.alert d.alertId d.label d.severity) := by
  intro n target path s hs rule hr hu ha
  obtain ⟨d, hp, hi, hd⟩ := view_urgency physicalEdge initial layout n target path s hs rule hr hu ha
  exact ⟨d, hp, hi, render_rail_perceived target.sessions target.rail d hd⟩

#print axioms render_rail_perceived
#print axioms render_rail_urgent_visible
#print axioms view_semantic_urgency

#print axioms modal_blocks_background
#print axioms ready_now
#print axioms reachable_action
#print axioms view_step_valid
#print axioms view_trace_valid
#print axioms ready_source
#print axioms blocked_no_effect
#print axioms untouched_trace
#print axioms view_urgency
end Ehr.Sem.Board
