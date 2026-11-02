import Ehr.Sem.Trace
import Ehr.Specs.AlertUrgency
import Ehr.Specs.PhysicalBounds

/-! Continuous urgency, with clinical activity independent of rendered presence.
The restricted render proofs cover current modal and inline presentations under
explicit layout evidence at EVERY reachable view moment. They do not establish
that every active condition has a presentation, or certify browser geometry. -/
namespace Ehr.Sem
open Ehr Render

/-- Acknowledgment alone does not resolve a clinical condition. -/
def AlertActive (cx : Ctx) (rule : AlertSpec) : Prop :=
  ∃ key, key ∈ alertKeys cx.facts cx.s rule.cond

/-- An urgent condition can be conveyed inline or by its own labeled boundary.
The modal alternative requires its enabled acknowledgment as well as its title. -/
def UrgentDemand (cx : Ctx) (m : Moment) (rule : AlertSpec) : Prop :=
  AlertShown (meaning (rendered cx)) m rule.id (uiLabel rule.label "Clinical alert") (match rule.tier with | .interruptive => "interruptive" | .passive => "passive" | .removable => "removable") ∨
    ModalAck (meaning (rendered cx)) m rule.id

/-- All clinically active urgent rules, including conditions omitted from the tree. -/
def UrgencyAt (cx : Ctx) (m : Moment) : Prop :=
  ∀ rule ∈ cx.sp.alerts, Specs.AlertUrgency.tier rule.id = some .urgent →
    AlertActive cx rule → UrgentDemand cx m rule

/-- View reachability includes scroll/focus/zoom without an interpreter event.
State reachability separately quantifies all interpreter events and clock steps.
This strengthens initial-moment checking; n=0 is only one of the cases. -/
def ContinuousUrgency (ep : Props.Episode) (disp : Display)
    (edge : View → View → Prop) (initialMoment : State → Moment) : Prop :=
  Props.Always ep fun s =>
    ∀ n target, Within edge n
      ⟨meaning (renderUi ep.spec ep.prog ep.facts disp ep.user s), initialMoment s⟩ target →
      ∀ rule ∈ ep.spec.alerts, Specs.AlertUrgency.tier rule.id = some .urgent →
        AlertActive { sp := ep.spec, prog := ep.prog, facts := ep.facts, disp, user := ep.user, s } rule →
        (AlertShown target.screen target.moment rule.id (uiLabel rule.label "Clinical alert") (match rule.tier with | .interruptive => "interruptive" | .passive => "passive" | .removable => "removable") ∨
          ModalAck target.screen target.moment rule.id)

/-- Layout evidence for a pinned atom: actual geometry at every view moment.
Screen equality excludes navigation to a different presentation; the full
ContinuousUrgency obligation above does not exclude those transitions. -/
def Pinned (s : Screen) (edge : View → View → Prop) (initial : Moment) (f : Fact) : Prop :=
  ∀ n target, Within edge n ⟨s, initial⟩ target →
    target.screen = s ∧ target.moment.inViewport f ∧
      target.moment.legible f ∧ target.moment.unoccluded f

/-- Membership comes from render proofs; Pinned supplies only layout evidence. -/
theorem pinned_perception (s edge initial f) (present : Perceives s exposed f)
    (layout : Pinned s edge initial f) :
    ∀ n target, Within edge n ⟨s, initial⟩ target → Perceives target.screen target.moment f := by
  intro n target reach
  obtain ⟨same, viewport, legible, clear⟩ := layout n target reach
  exact ⟨same ▸ present.1, viewport, legible, clear⟩

/-- Current interruptive renderUi presentation: title AND ack stay perceivable
through every reachable moment while this boundary remains active and pinned. -/
theorem render_modal_continuous (cx : Ctx) (rule : AlertSpec) (key : String)
    (popup : cx.v.popup? = some (rule.id, key)) (lookup : cx.sp.alert? rule.id = some rule)
    (interruptive : rule.tier = .interruptive) (edge : View → View → Prop) (initial : Moment)
    (titleLayout : Pinned (meaning (rendered cx)) edge initial
      (.attention rule.id (uiLabel rule.label "Clinical alert")))
    (ackLayout : Pinned (meaning (rendered cx)) edge initial
      (.action rule.id "Acknowledge" "ack" true none none)) :
    ∀ n target, Within edge n ⟨meaning (rendered cx), initial⟩ target →
      ModalAck target.screen target.moment rule.id := by
  have structural := D4_semantic cx rule.id key rule popup lookup interruptive
  have modal := D4_interruptive_modal cx rule.id key rule popup lookup interruptive
  have title : Perceives (meaning (rendered cx)) exposed
      (.attention rule.id (uiLabel rule.label "Clinical alert")) := by
    simp [Perceives, active, meaning, rendered, modal, uiAtoms, observe, exposed]
  intro n target reach
  have same := (ackLayout n target reach).1
  refine ⟨?_, pinned_perception _ _ _ _ structural.2.1 ackLayout n target reach,
    uiLabel rule.label "Clinical alert", uiLabel_nonempty _ _ (by decide),
    pinned_perception _ _ _ _ title titleLayout n target reach⟩
  rw [same]
  exact structural.1

/-- Current passive renderUi presentation: a shown inline item stays perceivable
at all reachable moments under a pinned, nonmodal layout. Urgency never turns
passive alerts into modals. No assertion that all urgent rules are passive. -/
theorem render_inline_continuous (cx : Ctx) (it : ItemView) (rule : AlertSpec) (popup : Bool)
    (member : it ∈ cx.v.items) (shown : it.shown = true)
    (kind : it.comp.kind = .alert rule.id popup) (lookup : cx.sp.alert? rule.id = some rule)
    (passive : rule.tier = .passive) (nonmodal : (rendered cx).modal = none)
    (edge : View → View → Prop) (initial : Moment)
    (layout : Pinned (meaning (rendered cx)) edge initial
      (.alert rule.id (uiLabel rule.label "Clinical alert") "passive")) :
    ∀ n target, Within edge n ⟨meaning (rendered cx), initial⟩ target →
      AlertShown target.screen target.moment rule.id (uiLabel rule.label "Clinical alert") "passive" :=
  pinned_perception _ _ _ _
    (D4_inline_semantic cx it rule.id popup rule member shown kind lookup passive nonmodal) layout

/-- The stated layout model for the two current alert presentations.
The witnesses are structural interpreter facts plus geometric pinning, not an
assumption of the desired Perceives/ContinuousUrgency conclusion. -/
inductive CurrentUrgentPresentation (cx : Ctx) (rule : AlertSpec)
    (edge : View → View → Prop) (initial : Moment) : Prop
  | modal (key : String)
      (popup : cx.v.popup? = some (rule.id, key))
      (lookup : cx.sp.alert? rule.id = some rule) (interruptive : rule.tier = .interruptive)
      (titleLayout : Pinned (meaning (rendered cx)) edge initial
        (.attention rule.id (uiLabel rule.label "Clinical alert")))
      (ackLayout : Pinned (meaning (rendered cx)) edge initial
        (.action rule.id "Acknowledge" "ack" true none none))
  | inline (it : ItemView) (popup : Bool)
      (member : it ∈ cx.v.items) (shown : it.shown = true)
      (kind : it.comp.kind = .alert rule.id popup) (lookup : cx.sp.alert? rule.id = some rule)
      (passive : rule.tier = .passive) (nonmodal : (rendered cx).modal = none)
      (layout : Pinned (meaning (rendered cx)) edge initial
        (.alert rule.id (uiLabel rule.label "Clinical alert") "passive"))

/-- renderUi satisfies continuous urgency for all reachable interpreter states
under the stated current-presentation layout model, over arbitrary view paths.
Establishing this model for ALL clinically active urgent conditions in today's
programs is open (acknowledgment, hidden items and other modals can obstruct it). -/
theorem render_continuous_urgency (ep : Props.Episode) (disp : Display)
    (edge : View → View → Prop) (initial : State → Moment)
    (model : ∀ s, Props.Reachable ep s → ∀ rule ∈ ep.spec.alerts,
      Specs.AlertUrgency.tier rule.id = some .urgent →
      AlertActive { sp := ep.spec, prog := ep.prog, facts := ep.facts, disp, user := ep.user, s } rule →
      CurrentUrgentPresentation
        { sp := ep.spec, prog := ep.prog, facts := ep.facts, disp, user := ep.user, s }
        rule edge (initial s)) :
    ContinuousUrgency ep disp edge initial := by
  intro s reachable n target reach rule member urgent active
  cases model s reachable rule member urgent active with
  | modal key popup lookup interruptive titleLayout ackLayout =>
      exact Or.inr (render_modal_continuous _ rule key popup lookup interruptive edge (initial s)
        titleLayout ackLayout n target reach)
  | inline it popup member shown kind lookup passive nonmodal layout =>
      have h := render_inline_continuous _ it rule popup member shown kind lookup passive nonmodal
        edge (initial s) layout n target reach
      exact Or.inl (by simpa [passive] using h)

/-- The current single modal cannot expose another alert, even at the abstract
fully exposed moment. Concurrent urgent conditions need a richer presentation;
pinning the one existing popup cannot discharge that coverage obligation. -/
theorem other_alert_blocked_by_modal (cx : Ctx) (front other : AlertSpec) (key : String) (m : Moment)
    (popup : cx.v.popup? = some (front.id, key)) (lookup : cx.sp.alert? front.id = some front)
    (interruptive : front.tier = .interruptive) (different : other.id ≠ front.id) :
    ¬ UrgentDemand cx m other := by
  have modal := D4_interruptive_modal cx front.id key front popup lookup interruptive
  simp [UrgentDemand, AlertShown, ModalAck, Perceives, active, meaning, rendered,
    modal, uiAtoms, observe, different]

/-- A distinct active urgent rule defeats the point obligation under the current
single-modal renderer, independently of viewport/contrast evidence. -/
theorem urgencyAt_obstructed_by_modal (cx : Ctx) (front other : AlertSpec) (key : String) (m : Moment)
    (popup : cx.v.popup? = some (front.id, key)) (lookup : cx.sp.alert? front.id = some front)
    (interruptive : front.tier = .interruptive) (different : other.id ≠ front.id)
    (member : other ∈ cx.sp.alerts) (urgent : Specs.AlertUrgency.tier other.id = some .urgent)
    (activeOther : AlertActive cx other) : ¬ UrgencyAt cx m := by
  intro h
  exact other_alert_blocked_by_modal cx front other key m popup lookup interruptive different
    (h other member urgent activeOther)

/-- The strengthened property includes the initial obligation. -/
theorem continuous_initial (ep disp edge initial) (h : ContinuousUrgency ep disp edge initial)
    (s : State) (reachable : Props.Reachable ep s) :
    UrgencyAt { sp := ep.spec, prog := ep.prog, facts := ep.facts, disp, user := ep.user, s } (initial s) := by
  exact h s reachable 0 _ (.refl _)

#print axioms pinned_perception
#print axioms render_modal_continuous
#print axioms render_inline_continuous
#print axioms render_continuous_urgency
#print axioms other_alert_blocked_by_modal
#print axioms urgencyAt_obstructed_by_modal
#print axioms continuous_initial
end Ehr.Sem
