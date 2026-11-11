import Ehr.Proofs.RuntimeEpisodeAccepted

/-! The per-patient draft store (`State.patientDrafts?`). The interpreter step
never changes it; only `Workspace.bind`, `Workspace.openPatient` and
`Workspace.showList` write it. Lookup lemmas for the store after leaving a
chart and after hydration, and the exact case split of `Workspace.bind`.
Every definition and theorem here is a new specification for owner review,
outside Comparator. -/

namespace Ehr.Runtime
open Ehr

/-- Prefilling one field keeps the draft store. -/
theorem prefillField_drafts (sp facts s comp) :
    (prefillField sp facts s comp).patientDrafts? = s.patientDrafts? := by
  unfold prefillField
  repeat' (first | rfl | split | dsimp only)

/-- Prefilling a list of fields keeps the draft store. -/
theorem prefillFold_drafts (sp : Spec) (facts : Facts) (cs : List Component) (s : State) :
    (cs.foldl (prefillField sp facts) s).patientDrafts? = s.patientDrafts? := by
  induction cs generalizing s with
  | nil => rfl
  | cons comp cs ih => exact (ih _).trans (prefillField_drafts sp facts s comp)

/-- Prefilling a screen keeps the draft store. -/
theorem prefillScreen_drafts (sp prog facts s) :
    (prefillScreen sp prog facts s).patientDrafts? = s.patientDrafts? :=
  prefillFold_drafts sp facts _ s

/-- Navigation to a screen keeps the draft store. -/
theorem goTo_drafts (sp prog facts s target) :
    (goTo sp prog facts s target).1.patientDrafts? = s.patientDrafts? := by
  unfold goTo
  split
  · rfl
  · exact prefillScreen_drafts sp prog facts _

/-- Back navigation keeps the draft store. -/
theorem goBack_drafts (sp prog facts s) :
    (goBack sp prog facts s).1.patientDrafts? = s.patientDrafts? := by
  unfold goBack
  split
  · rfl
  · exact prefillScreen_drafts sp prog facts _

/-- A click on a shown component keeps the draft store. -/
theorem clickCore_drafts (sp prog facts user actor s comp) :
    (clickCore sp prog facts user actor s comp).1.patientDrafts? = s.patientDrafts? := by
  unfold clickCore clickCommit clickAlert markReviewed requestPriorAuth
  repeat' (first
    | rfl
    | exact goTo_drafts ..
    | exact goBack_drafts ..
    | exact prefillScreen_drafts sp prog facts _
    | split
    | dsimp only)

/-- One event without macros keeps the draft store. -/
theorem stepCore_drafts (sp prog facts user actor s e) :
    (stepCore sp prog facts user actor s e).1.patientDrafts? = s.patientDrafts? := by
  unfold stepCore
  split
  · rfl
  · cases e <;> simp only [stepEvent]
    case click cid =>
      split
      · rfl
      · exact clickCore_drafts ..
    case selectTab cid idx => unfold selectTabCore; repeat' (first | rfl | split | dsimp only)
    case enter cid v => unfold enterCore; repeat' (first | rfl | split | dsimp only)
    case confirm cid => unfold confirmCore; repeat' (first | rfl | split | dsimp only)
    case ack a => unfold ackCore; repeat' (first | rfl | split | dsimp only)
    all_goals split <;> rfl

/-- One macro step keeps the draft store. -/
theorem macroStep_drafts (sp prog facts user s st) :
    (macroStep sp prog facts user s st).1.patientDrafts? = s.patientDrafts? := by
  cases st with
  | setValue cid str => exact stepCore_drafts ..
  | click cid => exact stepCore_drafts ..
  | goto target =>
    simp only [macroStep]
    split
    · rfl
    · exact goTo_drafts ..

/-- A macro run keeps the draft store. -/
theorem runMacro_drafts (sp prog facts user) (steps : List MacroStep) (i s) :
    (runMacro sp prog facts user i s steps).1.patientDrafts? = s.patientDrafts? := by
  induction steps generalizing i s with
  | nil => rfl
  | cons st steps ih =>
    have ht := macroStep_drafts sp prog facts user s st
    unfold runMacro
    split
    · rename_i t he
      rw [he] at ht
      exact (ih _ _).trans ht
    · rename_i t r hr he
      rw [he] at ht
      exact ht

/-- New specification for owner review: the interpreter step never changes
the per-patient draft store, for either actor and every event. -/
theorem step_drafts (sp prog facts user actor s e) :
    (step sp prog facts user actor s e).1.patientDrafts? = s.patientDrafts? := by
  unfold step
  split
  · split
    · exact runMacro_drafts ..
    · exact stepCore_drafts ..
  · exact stepCore_drafts ..

/-- The draft of one patient in a list of drafts; empty when absent. -/
def lookup (l : List PatientDraft) (pid : String) : PatientDraft :=
  (l.find? (·.patient == pid)).getD { patient := pid, captured := [], acked := [] }

/-- `Workspace.draft` is `lookup` in the state's store. -/
theorem draft_lookup (s : State) (pid : String) :
    Workspace.draft s pid = lookup (s.patientDrafts?.getD []) pid := rfl

/-- The store without one patient's draft, as a list. -/
theorem others_getD (s : State) (id : String) :
    (Workspace.others s id).getD [] = (s.patientDrafts?.getD []).filter (·.patient != id) := by
  unfold Workspace.others
  dsimp only
  split
  · rename_i h
    exact (List.isEmpty_iff.mp h).symm
  · rfl

/-- Removing one patient's draft does not change the search for another's. -/
theorem find_filter_ne (l : List PatientDraft) {pid id : String} (h : pid ≠ id) :
    (l.filter (·.patient != id)).find? (·.patient == pid) = l.find? (·.patient == pid) := by
  rw [List.find?_filter]
  congr 1
  funext a
  by_cases hp : a.patient = pid
  · simp [hp, h]
  · simp [hp]

/-- Removing one patient's draft keeps every other patient's draft. -/
theorem lookup_filter_ne (l : List PatientDraft) {pid id : String} (h : pid ≠ id) :
    lookup (l.filter (·.patient != id)) pid = lookup l pid := by
  simp only [lookup, find_filter_ne l h]

/-- After removing one patient's draft, that patient has none. -/
theorem lookup_filter_self (l : List PatientDraft) (id : String) :
    lookup (l.filter (·.patient != id)) id = { patient := id, captured := [], acked := [] } := by
  have hnone : (l.filter (·.patient != id)).find? (·.patient == id) = none := by
    simp [List.find?_eq_none]
  simp only [lookup, hnone, Option.getD_none]

/-- New specification for owner review: hydration keeps every other
patient's stored draft. -/
theorem others_ne (s : State) {pid id : String} (h : pid ≠ id) :
    lookup ((Workspace.others s id).getD []) pid = Workspace.draft s pid := by
  rw [others_getD, lookup_filter_ne _ h, draft_lookup]

/-- New specification for owner review: leaving a hydrated chart stores
exactly its captures and acknowledgments as that patient's draft. -/
theorem save_self (s : State) (id : String) (h : Workspace.chart? s = some id) :
    lookup ((Workspace.save s).getD []) id =
      { patient := id, captured := s.captured, acked := s.acked } := by
  unfold Workspace.save
  rw [h]
  dsimp only
  split
  · rename_i he
    simp only [Bool.and_eq_true, List.isEmpty_iff] at he
    rw [others_getD, lookup_filter_self, he.1, he.2]
  · have hnone : ((s.patientDrafts?.getD []).filter (·.patient != id)).find? (·.patient == id) =
        none := by simp [List.find?_eq_none]
    simp [lookup, others_getD, List.find?_append, hnone]

/-- New specification for owner review: leaving a chart keeps every other
patient's stored draft, and leaving without a hydrated chart keeps them all. -/
theorem save_ne (s : State) (pid : String) (h : Workspace.chart? s ≠ some pid) :
    lookup ((Workspace.save s).getD []) pid = Workspace.draft s pid := by
  unfold Workspace.save
  cases hc : Workspace.chart? s with
  | none => rfl
  | some id =>
    have hne : pid ≠ id := fun hq => h (hc.trans (congrArg some hq.symm))
    dsimp only
    split
    · exact others_ne s hne
    · have hd : (id == pid) = false := beq_eq_false_iff_ne.mpr (Ne.symm hne)
      simp only [lookup, draft_lookup, others_getD, List.find?_append, find_filter_ne _ hne,
        List.find?_cons, hd, List.find?_nil, Option.or_none, Option.getD_some]

/-- A chart bound to the facts' patient is a hydrated chart. -/
theorem bound_chart (f : Facts) (s : State) (h : Workspace.bound f s = true) :
    ∃ id, Workspace.chart? s = some id := by
  cases hc : s.patientContext? with
  | none => simp [Workspace.bound, hc] at h
  | some c =>
    simp only [Workspace.bound, hc, Bool.and_eq_true, beq_iff_eq] at h
    cases hp : c.patient? with
    | none => simp [hp] at h
    | some id => exact ⟨id, by simp [Workspace.chart?, hc, hp, ← h.1.2]⟩

/-- Which patient's chart a state holds depends only on its patient context. -/
theorem chart_of_context {s t : State} (h : s.patientContext? = t.patientContext?) :
    Workspace.chart? s = Workspace.chart? t := by
  simp only [Workspace.chart?, h]

/-- New specification for owner review: `Workspace.bind` hydrates the chart
of patient `id` from `s`. The input holds no chart, the call is a hydrating
call, and the result is the fresh chart on screen `first` with that patient's
stored draft restored and taken out of the store. -/
structure Hydrated (sp : Spec) (p : Program) (f : Facts) (u : User) (s : State)
    (id : String) (first : ScreenId) (c : PatientContext) : Prop where
  /-- `id` is the patient selected in `s`. -/
  selected : s.patientContext?.bind (·.patient?) = some id
  /-- `s` holds no hydrated chart. -/
  unheld : Workspace.chart? s = none
  /-- The call hydrates. -/
  hydrates : Workspace.hydrates sp p f u s = true
  /-- The new context selects `id`. -/
  patient : c.patient? = some id
  /-- The new context is bound to `id`. -/
  bound : c.bound? = some id
  /-- The hydrated chart. -/
  eq : Workspace.bind sp p f u s =
    { Workspace.restore sp u (chart ⟨sp, p, f, u⟩ first) (Workspace.draft s id) with
      clock := s.clock, patientContext? := some c, patientDrafts? := Workspace.others s id }

/-- New specification for owner review: **the exact cases of hydration.**
`Workspace.bind` returns its input, or it hydrates (`Hydrated`). -/
theorem bind_hydrates (sp p f u s) :
    Workspace.bind sp p f u s = s ∨ ∃ id first c, Hydrated sp p f u s id first c := by
  cases hc : s.patientContext? with
  | none => exact Or.inl (by simp only [Workspace.bind, hc])
  | some c =>
    by_cases h1 : (c.patient?.isNone || c.patient? != f.sourcePatientId? ||
        Workspace.patient? f (c.patient?.getD "") == none) = true
    · exact Or.inl (by simp only [Workspace.bind, hc, h1, ↓reduceIte])
    · by_cases h2 : (c.bound? == c.patient?) = true
      · exact Or.inl (by simp only [Workspace.bind, hc, h1, h2, Bool.false_eq_true, ↓reduceIte])
      · have hb : Workspace.bind sp p f u s =
            { Workspace.restore sp u
                (chart ⟨sp, p, f, u⟩ (if p.screens.any (·.id == "chartSummary") then "chartSummary"
                  else c.target?.getD p.start)) (Workspace.draft s (c.patient?.getD "")) with
              clock := s.clock, patientContext? := some { c with bound? := c.patient? },
              patientDrafts? := Workspace.others s (c.patient?.getD "") } := by
          simp only [Workspace.bind, hc, h1, h2, ↓reduceIte, Bool.false_eq_true]
          rfl
        have hne : c.bound? ≠ c.patient? := by simpa using h2
        have hch : Workspace.chart? s = none := by
          simp only [Workspace.chart?, hc, Option.bind_some, (Bool.not_eq_true _).mp h2,
            Bool.and_false, Bool.false_eq_true, ↓reduceIte]
        have hsrc : c.patient? = f.sourcePatientId? := by
          simp only [Bool.or_eq_true, not_or] at h1
          simpa using h1.1.2
        have hunbound : Workspace.bound f s = false := by
          simp only [Workspace.bound, hc, beq_eq_false_iff_ne.mpr (Ne.symm hne), Bool.and_false,
            Bool.false_and]
        cases hp : c.patient? with
        | none => simp [hp] at h1
        | some id =>
          have hbound : Workspace.bound f (Workspace.bind sp p f u s) = true := by
            rw [hb]
            simp [Workspace.bound, ← hsrc, hp]
          have hy : Workspace.hydrates sp p f u s = true := by
            simp only [Workspace.hydrates, hunbound, hbound, Bool.not_false, Bool.and_self]
          refine Or.inr ⟨id,
            (if p.screens.any (·.id == "chartSummary") then "chartSummary" else c.target?.getD p.start),
            { c with bound? := some id },
            ⟨by simp only [hc, Option.bind_some, hp], hch, hy, hp, rfl, ?_⟩⟩
          rw [hb, hp]
          rfl

/-- New specification for owner review: a hydrating call hydrates. -/
theorem hydrates_hydrated (sp p f u s) (hy : Workspace.hydrates sp p f u s = true) :
    ∃ id first c, Hydrated sp p f u s id first c := by
  rcases bind_hydrates sp p f u s with h | h
  · simp only [Workspace.hydrates, h, Bool.and_eq_true, Bool.not_eq_true'] at hy
    rw [hy.1] at hy
    exact absurd hy.2 (by decide)
  · exact h

/-- The hydrated chart is the chart of the selected patient. -/
theorem Hydrated.chart {sp p f u s id first c} (h : Hydrated sp p f u s id first c) :
    Workspace.chart? (Workspace.bind sp p f u s) = some id := by
  simp [Workspace.chart?, h.eq, h.patient, h.bound]

/-- The draft that hydration restores is the selected patient's. -/
theorem Hydrated.pending {sp p f u s id first c} (h : Hydrated sp p f u s id first c) :
    pending s = Workspace.draft s id := by
  simp only [Runtime.pending, h.selected, Option.getD_some]

#print axioms prefillField_drafts
#print axioms prefillFold_drafts
#print axioms prefillScreen_drafts
#print axioms goTo_drafts
#print axioms goBack_drafts
#print axioms clickCore_drafts
#print axioms stepCore_drafts
#print axioms macroStep_drafts
#print axioms runMacro_drafts
#print axioms step_drafts
#print axioms draft_lookup
#print axioms others_getD
#print axioms find_filter_ne
#print axioms lookup_filter_ne
#print axioms lookup_filter_self
#print axioms others_ne
#print axioms save_self
#print axioms save_ne
#print axioms bound_chart
#print axioms chart_of_context
#print axioms bind_hydrates
#print axioms hydrates_hydrated
#print axioms Hydrated.chart
#print axioms Hydrated.pending
end Ehr.Runtime
