import Ehr.Proofs.RuntimeDrafts

/-! One patient's unsigned work across workspace navigation. While a
patient's chart is open the work is in `State.captured` and `State.acked`;
while it is closed it is in the patient's stored draft. `sessionCaptured` and
`sessionAcked` name the work wherever it is. `CallShape` gives the exact cases
of an API call of a program with patient selection, and the session theorems
follow case by case. They hold for every API state, with no reachability or
checker premise. Every definition and theorem here is a new specification for
owner review, outside Comparator. -/

namespace Ehr.Runtime
open Ehr Props

/-- New specification for owner review: the captures of patient `pid` in the
signed-in session: those of the open chart if it is that patient's, otherwise
those of the patient's stored draft. -/
def sessionCaptured (pid : String) (s : State) : List Captured :=
  if Workspace.chart? s = some pid then s.captured else (Workspace.draft s pid).captured

/-- New specification for owner review: the alert acknowledgments of patient
`pid` in the signed-in session: those of the open chart if it is that
patient's, otherwise those of the patient's stored draft. -/
def sessionAcked (pid : String) (s : State) : List (AlertId × String) :=
  if Workspace.chart? s = some pid then s.acked else (Workspace.draft s pid).acked

/-- In the patient's open chart the session work is the chart's. -/
theorem session_open {pid : String} {t : State} (h : Workspace.chart? t = some pid) :
    sessionAcked pid t = t.acked ∧ sessionCaptured pid t = t.captured := by
  simp only [sessionAcked, sessionCaptured, h, ↓reduceIte, and_self]

/-- Outside the patient's chart the session work is the stored draft's. -/
theorem session_closed {pid : String} {t : State} (h : Workspace.chart? t ≠ some pid) :
    sessionAcked pid t = (Workspace.draft t pid).acked ∧
      sessionCaptured pid t = (Workspace.draft t pid).captured := by
  simp only [sessionAcked, sessionCaptured, h, ↓reduceIte, and_self]

/-- New specification for owner review: the state after a lookup query: only
the query of the patient-selection context changes. -/
def withQuery (b : State) (q : String) : State :=
  { b with patientContext? := some { (b.patientContext?.getD {}) with query := q } }

/-- New specification for owner review: the state after leaving `b` for the
workspace context `ctx`: an empty workspace state with the clock of `b` and
the draft store after saving the chart of `b`, if it holds one. -/
def afterLeaving (sp : Spec) (p : Program) (b : State) (ctx : PatientContext) : State :=
  { Workspace.init p with
    clock := b.clock, patientDrafts? := Workspace.save sp b, patientContext? := some ctx }

/-- New specification for owner review: the cases of one API call of a
program with patient selection, relative to the effective input
`Workspace.bind … s`. -/
inductive CallShape (sp : Spec) (p : Program) (f : Facts) (u : User) (s : State) (e : Event)
    (t : State) : Prop
  /-- The effective input is returned, up to the critical workflow fields: a
  refused or ignored event, or one the critical-result handler took. -/
  | handled (h : ∃ c d, t = withCritical (Workspace.bind sp p f u s) c d)
  /-- One human interpreter step in a bound chart. On a hydrating call the
  event is not an acknowledgment or a commit click. -/
  | core (hb : Workspace.bound f (Workspace.bind sp p f u s) = true)
      (hload : Workspace.hydrates sp p f u s = true →
        loadingEvent p (Workspace.bind sp p f u s) e = false)
      (h : t = (step sp p f u .human (Workspace.bind sp p f u s) e).1)
  /-- A lookup query while no patient is selected. -/
  | query (q : String)
      (hq : ((Workspace.bind sp p f u s).patientContext?.bind (·.patient?)).isNone = true)
      (h : t = withQuery (Workspace.bind sp p f u s) q)
  /-- Workspace navigation without an open popup: the chart, if any, is left
  and saved as its patient's draft. -/
  | leave (ctx : PatientContext) (hc : ctx.bound? = none)
      (hp : (Workspace.bind sp p f u s).popup? = none)
      (h : t = afterLeaving sp p (Workspace.bind sp p f u s) ctx)

/-- The cases of `Workspace.step`. -/
theorem workspace_cases (sp p f u s e) :
    CallShape sp p f u s e (Workspace.step sp p f u s e).1 := by
  unfold Workspace.step
  cases e <;> dsimp only
  all_goals
    repeat' first
    | exact .handled ⟨(Workspace.bind sp p f u s).criticalResults?,
        (Workspace.bind sp p f u s).criticalDrafts?, rfl⟩
    | exact .core (by simp_all) (by simp_all [loadingEvent]) rfl
    | exact .query _ (by assumption) rfl
    | exact .leave _ rfl (by simp_all) rfl
    | split

/-- New specification for owner review: **the cases of one API call** of a
program with patient selection. -/
theorem call_shape (i : StepInput) (henabled : Workspace.enabled i.program = true) :
    CallShape i.spec i.program i.facts i.user i.state i.event (runStep i).state := by
  cases hb : Workspace.bound i.facts i.state
  · simpa only [runStep, henabled, hb, Bool.not_false, Bool.and_self, ↓reduceIte,
      Option.getD_none] using workspace_cases i.spec i.program i.facts i.user i.state i.event
  · cases hh : CriticalRuntime.handle i.facts i.user i.state i.event with
    | none =>
      simpa only [runStep, henabled, hb, Bool.not_true, Bool.and_false, Bool.false_eq_true,
        ↓reduceIte, hh, Option.getD_none] using
        workspace_cases i.spec i.program i.facts i.user i.state i.event
    | some out =>
      refine .handled ⟨out.1.criticalResults?, out.1.criticalDrafts?, ?_⟩
      rw [bind_of_bound i.spec i.program i.facts i.user i.state hb]
      simp only [runStep, henabled, hb, Bool.not_true, Bool.and_false, Bool.false_eq_true,
        ↓reduceIte, hh, Option.getD_some]
      exact critical_frame _ _ _ _ _ hh

/-- A context that is not bound holds no chart. -/
theorem chart_unbound {t : State} {ctx : PatientContext} (ht : t.patientContext? = some ctx)
    (hc : ctx.bound? = none) : Workspace.chart? t = none := by
  simp only [Workspace.chart?, ht, Option.bind_some, hc]
  cases ctx.patient? <;> simp

/-- A state without a selected patient holds no chart. -/
theorem chart_unselected {t : State}
    (h : (t.patientContext?.bind (·.patient?)).isNone = true) : Workspace.chart? t = none := by
  cases hc : t.patientContext? with
  | none => simp only [Workspace.chart?, hc, Option.bind_none]
  | some c =>
    have hp : c.patient? = none := by simpa [hc] using h
    simp [Workspace.chart?, hc, hp]

section Cases
variable {sp : Spec} {p : Program} {f : Facts} {u : User} {b t : State} (pid : String)

/-- A returned effective input keeps every patient's session work. -/
theorem session_handled (h : ∃ c d, t = withCritical b c d) :
    sessionAcked pid t = sessionAcked pid b ∧ sessionCaptured pid t = sessionCaptured pid b := by
  obtain ⟨c, d, rfl⟩ := h
  exact ⟨rfl, rfl⟩

/-- A lookup query, made while no patient is selected, keeps every patient's
session work. -/
theorem session_query (q : String)
    (hq : (b.patientContext?.bind (·.patient?)).isNone = true) (h : t = withQuery b q) :
    sessionAcked pid t = sessionAcked pid b ∧ sessionCaptured pid t = sessionCaptured pid b := by
  have ht : (t.patientContext?.bind (·.patient?)).isNone = true := by
    rw [h]
    cases hc : b.patientContext? with
    | none => simp [withQuery, hc]
    | some c =>
      have hp : c.patient? = none := by simpa [hc] using hq
      simp [withQuery, hc, hp]
  have hb : Workspace.chart? b ≠ some pid := by rw [chart_unselected hq]; nofun
  have htc : Workspace.chart? t ≠ some pid := by rw [chart_unselected ht]; nofun
  rw [(session_closed htc).1, (session_closed htc).2, (session_closed hb).1,
    (session_closed hb).2, h]
  exact ⟨rfl, rfl⟩

/-- New specification for owner review: leaving a chart keeps every
patient's unsigned session work: the chart's unsigned captures and all
acknowledgments become its patient's stored draft, and the other drafts are unchanged. -/
theorem session_leave (ctx : PatientContext) (hc : ctx.bound? = none)
    (h : t = afterLeaving sp p b ctx) :
    sessionAcked pid t = sessionAcked pid b ∧
    (∀ x, x ∈ sessionCaptured pid t ↔ x ∈ sessionCaptured pid b ∧
      (Workspace.chart? b = some pid → Workspace.signedEntry sp b x = false)) := by
  have hch : Workspace.chart? t ≠ some pid := by
    rw [chart_unbound (t := t) (ctx := ctx) (by rw [h]; rfl) hc]
    nofun
  have hd : Workspace.draft t pid = lookup ((Workspace.save sp b).getD []) pid := by
    rw [h]
    rfl
  rw [(session_closed hch).1, (session_closed hch).2, hd]
  by_cases hb : Workspace.chart? b = some pid
  · rw [save_self sp b pid hb, (session_open hb).1, (session_open hb).2]
    exact ⟨rfl, fun x => by simp [Workspace.unsigned, List.mem_filter, hb]⟩
  · rw [save_ne sp b pid hb, (session_closed hb).1, (session_closed hb).2]
    exact ⟨rfl, fun x => by simp [hb]⟩

/-- An interpreter step keeps the chart's patient and every stored draft. -/
theorem session_core (e : Event) (h : t = (step sp p f u .human b e).1) :
    Workspace.chart? t = Workspace.chart? b ∧ Workspace.draft t pid = Workspace.draft b pid := by
  subst h
  exact ⟨chart_of_context (step_context ..), by simp only [draft_lookup, step_drafts]⟩

end Cases

/-- New specification for owner review: **hydration keeps every patient's
session work that it restores.** The acknowledgments are kept exactly. Every
restorable stored capture is in the hydrated chart, and every capture of the
hydrated chart is a stored one or a prefill of the fresh chart. -/
theorem session_bind (sp p f u s) (pid : String) :
    sessionAcked pid (Workspace.bind sp p f u s) = sessionAcked pid s ∧
    (∀ x ∈ sessionCaptured pid s, Workspace.restorable sp u x = true →
      x ∈ sessionCaptured pid (Workspace.bind sp p f u s)) ∧
    (∀ x ∈ sessionCaptured pid (Workspace.bind sp p f u s),
      x ∈ sessionCaptured pid s ∨ ∃ first, x ∈ (chart ⟨sp, p, f, u⟩ first).captured) := by
  rcases bind_hydrates sp p f u s with h | ⟨id, first, c, h⟩
  · rw [h]
    exact ⟨rfl, fun _ hx _ => hx, fun _ hx => Or.inl hx⟩
  · have hs : Workspace.chart? s ≠ some pid := by
      rw [h.unheld]
      nofun
    rw [(session_closed hs).1, (session_closed hs).2]
    by_cases hp : pid = id
    · subst hp
      rw [(session_open h.chart).1, (session_open h.chart).2, h.eq]
      exact ⟨rfl, fun x hx hr => restore_keeps hx hr,
        fun x hx => (restore_mem hx).elim (fun hc => Or.inr ⟨first, hc⟩) (fun hd => Or.inl hd.1)⟩
    · have hb : Workspace.chart? (Workspace.bind sp p f u s) ≠ some pid := by
        rw [h.chart]
        exact fun hq => hp (Option.some.inj hq).symm
      have hd : Workspace.draft (Workspace.bind sp p f u s) pid = Workspace.draft s pid := by
        rw [h.eq]
        exact others_ne s hp
      rw [(session_closed hb).1, (session_closed hb).2, hd]
      exact ⟨rfl, fun _ hx _ => hx, fun _ hx => Or.inl hx⟩

/-- Hydration keeps every other patient's stored draft and empties the
hydrated patient's. -/
theorem draft_bind (sp p f u s) (pid : String) :
    Workspace.draft (Workspace.bind sp p f u s) pid = Workspace.draft s pid ∨
    Workspace.draft (Workspace.bind sp p f u s) pid =
      { patient := pid, captured := [], acked := [] } := by
  rcases bind_hydrates sp p f u s with h | ⟨id, first, c, h⟩
  · rw [h]
    exact Or.inl rfl
  · by_cases hp : pid = id
    · subst hp
      right
      rw [h.eq]
      change lookup ((Workspace.others s pid).getD []) pid = _
      rw [others_getD, lookup_filter_self]
    · left
      rw [h.eq]
      exact others_ne s hp

section Call
variable (i : StepInput) (henabled : Workspace.enabled i.program = true) (pid : String)
include henabled

/-- New specification for owner review: what one API call does to a
patient's stored draft. It is the draft after hydration, or, when the call
leaves that patient's chart, exactly the chart's unsigned captures and acknowledgments. -/
theorem draft_call :
    Workspace.draft (runStep i).state pid =
      Workspace.draft (Workspace.bind i.spec i.program i.facts i.user i.state) pid ∨
    (Workspace.chart? (Workspace.bind i.spec i.program i.facts i.user i.state) = some pid ∧
      Workspace.draft (runStep i).state pid =
        { patient := pid,
          captured := Workspace.unsigned i.spec (Workspace.bind i.spec i.program i.facts i.user i.state),
          acked := (Workspace.bind i.spec i.program i.facts i.user i.state).acked }) := by
  cases call_shape i henabled with
  | handled hs =>
    obtain ⟨_, _, hs⟩ := hs
    rw [hs]
    exact Or.inl rfl
  | query q _ hs =>
    rw [hs]
    exact Or.inl rfl
  | core _ _ hs => exact Or.inl (session_core pid i.event hs).2
  | leave ctx _ _ hs =>
    rw [hs]
    by_cases hb : Workspace.chart? (Workspace.bind i.spec i.program i.facts i.user i.state) = some pid
    · exact Or.inr ⟨hb, save_self i.spec _ pid hb⟩
    · exact Or.inl (save_ne i.spec _ pid hb)

/-- New specification for owner review: **where stored draft entries come
from.** After any API call, a capture or an acknowledgment in a patient's
stored draft was already stored for that patient, or the call left that
patient's hydrated chart and the entry was in the chart (the effective input).
Nothing else writes the store. -/
theorem draft_origin :
    (∀ x ∈ (Workspace.draft (runStep i).state pid).captured,
      x ∈ (Workspace.draft i.state pid).captured ∨
        (Workspace.chart? (inputState i) = some pid ∧ x ∈ (inputState i).captured)) ∧
    (∀ a ∈ (Workspace.draft (runStep i).state pid).acked,
      a ∈ (Workspace.draft i.state pid).acked ∨
        (Workspace.chart? (inputState i) = some pid ∧ a ∈ (inputState i).acked)) := by
  have hin : inputState i = Workspace.bind i.spec i.program i.facts i.user i.state := by
    simp only [inputState, henabled, ↓reduceIte]
  rw [hin]
  rcases draft_call i henabled pid with h | ⟨hc, h⟩
  · rw [h]
    rcases draft_bind i.spec i.program i.facts i.user i.state pid with hb | hb
    · rw [hb]
      exact ⟨fun _ hx => Or.inl hx, fun _ ha => Or.inl ha⟩
    · rw [hb]
      exact ⟨fun _ hx => absurd hx List.not_mem_nil, fun _ ha => absurd ha List.not_mem_nil⟩
  · rw [h]
    exact ⟨fun _ hx => Or.inr ⟨hc, (List.mem_filter.mp hx).1⟩, fun _ ha => Or.inr ⟨hc, ha⟩⟩

/-- New specification for owner review: **acknowledgments are kept across
workspace navigation.** For a program with patient selection and every API
call, each patient's session acknowledgments are kept, and they change only by
an `ack` event. This is the form of property 11's persistence clause and of
property 5's acknowledgment clause that holds across leaving and reopening a
chart. -/
theorem session_acks :
    (∀ a ∈ sessionAcked pid i.state, a ∈ sessionAcked pid (runStep i).state) ∧
    (sessionAcked pid (runStep i).state ≠ sessionAcked pid i.state → ∃ a, i.event = .ack a) := by
  have hbind := (session_bind i.spec i.program i.facts i.user i.state pid).1
  have same (h : sessionAcked pid (runStep i).state =
      sessionAcked pid (Workspace.bind i.spec i.program i.facts i.user i.state)) :
      (∀ a ∈ sessionAcked pid i.state, a ∈ sessionAcked pid (runStep i).state) ∧
      (sessionAcked pid (runStep i).state ≠ sessionAcked pid i.state → ∃ a, i.event = .ack a) := by
    rw [h, hbind]
    exact ⟨fun _ ha => ha, fun hn => absurd rfl hn⟩
  cases call_shape i henabled with
  | handled h => exact same (session_handled pid h).1
  | query q hq h => exact same (session_query pid q hq h).1
  | leave ctx hc _ h => exact same (session_leave pid ctx hc h).1
  | core _ _ h =>
    obtain ⟨hch, hd⟩ := session_core pid i.event h
    by_cases hb : Workspace.chart? (Workspace.bind i.spec i.program i.facts i.user i.state) = some pid
    · rw [(session_open (hch.trans hb)).1, ← hbind, (session_open hb).1, h]
      exact ⟨(Check.interruptsOnce_at ⟨i.spec, i.program, i.facts, i.user⟩ _ .human i.event).1,
        fun hn => ((Check.onlyHumanCommitsAndAcks_at ⟨i.spec, i.program, i.facts, i.user⟩ _
          .human i.event).2 hn).2⟩
    · exact same (by rw [(session_closed (hch ▸ hb)).1, (session_closed hb).1, hd])

/-- New specification for owner review: **confirmed human entries are kept
across workspace navigation.** For a program with patient selection and every
API call whose event is not an entry and not a macro click at the effective
input, each patient's confirmed session captures that hydration restores
(`Workspace.restorable`) are kept, or are signed entries in the chart
being left. This is the form of property 2's retention
clause that holds across leaving and reopening a chart. Prefilled values are
not restorable: hydration computes them again. -/
theorem session_captures (hentry : ∀ cid v, i.event ≠ .enter cid v)
    (hmacro : ∀ cid, i.event = .click cid →
      clickedMacro? i.spec i.program i.facts (inputState i) cid = none ∨
        (inputState i).popup?.isSome) :
    ∀ x ∈ sessionCaptured pid i.state, x.confirmed = true →
      Workspace.restorable i.spec i.user x = true →
      x ∈ sessionCaptured pid (runStep i).state ∨
        (Workspace.chart? (inputState i) = some pid ∧
          Workspace.signedEntry i.spec (inputState i) x = true) := by
  intro x hx hconf hr
  have hin : inputState i = Workspace.bind i.spec i.program i.facts i.user i.state := by
    simp only [inputState, henabled, ↓reduceIte]
  rw [hin] at hmacro
  have hb := (session_bind i.spec i.program i.facts i.user i.state pid).2.1 x hx hr
  cases call_shape i henabled with
  | handled h => exact Or.inl (by rw [(session_handled pid h).2]; exact hb)
  | query q hq h => exact Or.inl (by rw [(session_query pid q hq h).2]; exact hb)
  | leave ctx hc _ h =>
    by_cases hs : Workspace.chart? (inputState i) = some pid ∧
        Workspace.signedEntry i.spec (inputState i) x = true
    · exact Or.inr hs
    · left
      apply ((session_leave pid ctx hc h).2 x).mpr
      refine ⟨hb, fun hchart => ?_⟩
      cases he : Workspace.signedEntry i.spec (Workspace.bind i.spec i.program i.facts i.user i.state) x
      · rfl
      · exact (hs (by simpa only [hin] using And.intro hchart he)).elim
  | core _ _ h =>
    obtain ⟨hch, hd⟩ := session_core pid i.event h
    by_cases hc : Workspace.chart? (Workspace.bind i.spec i.program i.facts i.user i.state) = some pid
    · left
      rw [(session_open (hch.trans hc)).2, h]
      rw [(session_open hc).2] at hb
      exact Check.enteredOnce_at ⟨i.spec, i.program, i.facts, i.user⟩ _ .human i.event hentry
        (fun _ => hmacro) x hb hconf
    · left
      rw [(session_closed (hch ▸ hc)).2, hd]
      rw [(session_closed hc).2] at hb
      exact hb

end Call

#print axioms session_open
#print axioms session_closed
#print axioms workspace_cases
#print axioms call_shape
#print axioms chart_unbound
#print axioms chart_unselected
#print axioms session_handled
#print axioms session_query
#print axioms session_leave
#print axioms session_core
#print axioms session_bind
#print axioms draft_bind
#print axioms draft_call
#print axioms draft_origin
#print axioms session_acks
#print axioms session_captures
end Ehr.Runtime
