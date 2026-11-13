import Ehr.Check.FeasibleCompletion

/-!
Reachable-state `validationsOk` obstruction for general accepted programs under
`specV1`, `specV2`, and `specV3`: even with `CompletableWhereFeasible` and
`CompletableWhereAcceptedFeasible`, `check sp prev can p = .ok` does not imply
completion from every reachable state (`v1_v2_v3_not_acceptedCompletableWhereFeasible`).
In `v1TrapProg`, entering `"amoxicillin"`, `"mg"`, and `"insulin lispro"` on
order slot 1 on `"prep"` before navigating to `"inbox"` leaves an orphaned
`"doseUnit" = "mg"` on slot 1 that permanently falsifies `validationsOk`.
-/

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-- New specification for owner review.
Statement of the general feasibility-completion claim for `sp`: every program
accepted by `check` satisfies `CompletableWhereFeasible`. -/
def AcceptedCompletableWhereFeasible (sp : Spec) : Prop :=
  ∀ prev can p, check sp prev can p = .ok → CompletableWhereFeasible sp can p

/-- New specification for owner review.
Statement of the general accepted-witness feasibility-completion claim for `sp`:
every program accepted by `check` satisfies `CompletableWhereAcceptedFeasible`. -/
def AcceptedCompletableWhereAcceptedFeasible (sp : Spec) : Prop :=
  ∀ prev can p, check sp prev can p = .ok → CompletableWhereAcceptedFeasible sp can p

/-- New specification for owner review.
Patient record for the `v1TrapProg` counterexample (adds `medToGive?` to
`Ehr.Examples.Tiny.facts` so `RecordAllowsScans` holds under `specV1`–`specV3`). -/
def v1TrapFacts : Facts :=
  { Ehr.Examples.Tiny.facts with medToGive? := some "med-1" }

/-- New specification for owner review.
A two-screen physician program accepted by `check` under `specV1`, `specV2`,
and `specV3`. Screen `"prep"` has open fields for `"drug"` and `"doseUnit"` on
order slot 1 and navigates to `"inbox"`, which has all fields and panels
required by `"ackResult"` on slot 0. -/
def v1TrapProg : Program where
  id := "v1-trap"; version := 1; owner := "v1-trap"; role := .physician
  specVersion := "v1"; start := "prep"; macros := []
  screens := [
    { id := "prep", title := "Prepare", workflow := "W2", components := [
        { id := "prep.banner", kind := .banner },
        { id := "prep.drug", kind := .field "drug" (.fixed 1) .none },
        { id := "prep.doseUnit", kind := .field "doseUnit" (.fixed 1) .none },
        { id := "prep.go", kind := .button (.goto "inbox"), label := "Open inbox" } ] },
    { id := "inbox", title := "Inbox", workflow := "W2", components := [
        { id := "inbox.banner", kind := .banner },
        { id := "inbox.detail", kind := .panel "resultDetail" },
        { id := "inbox.trend", kind := .trend "resultTrend" },
        { id := "inbox.action", kind := .field "resultAction" (.fixed 0) .none },
        { id := "inbox.msg", kind := .field "patientMessage" (.fixed 0) .none },
        { id := "inbox.ack", kind := .button (.commit "ackResult"), label := "Acknowledge result" } ] } ]

/-- New specification for owner review.
The orphaned human-entered capture for `"doseUnit" = "mg"` on slot 1. -/
def trappedDoseUnit : Captured :=
  { element := "doseUnit", slot := 1, value := .code "mg",
    byHuman := true, confirmed := true, provenance? := none }

/-- New specification for owner review.
Invariant holding on `"inbox"` after the human enters `"amoxicillin"`, `"mg"`,
and `"insulin lispro"` on slot 1 on `"prep"` and navigates to `"inbox"`. -/
def InboxTrap (s : State) : Prop :=
  s.screen = "inbox" ∧
  trappedDoseUnit ∈ s.captured ∧
  (∀ x ∈ s.captured, x.element = "drug" → x.value = .code "insulin lispro") ∧
  (∀ x ∈ s.captured, x.provenance? = none)

private theorem linkedClosure_of_noProvenance {cap : List Captured}
    (hprov : ∀ y ∈ cap, y.provenance? = none) (source : ElementId) (fuel : Nat) :
    linkedClosure cap [source] fuel = [source] := by
  cases fuel with
  | zero => rfl
  | succ fuel =>
    have hnil : cap.filterMap (fun y =>
        if [source].any (fun e => y.provenance? == some ("linked:" ++ e))
        then some y.element else none) = [] :=
      List.filterMap_eq_nil_iff.mpr fun y hy => by simp [hprov y hy]
    unfold linkedClosure
    rw [hnil]
    rfl

private theorem linkedDependents_of_noProvenance {cap : List Captured}
    (hprov : ∀ y ∈ cap, y.provenance? = none) (source : ElementId) :
    linkedDependents cap source = [] := by
  simp [linkedDependents, linkedClosure_of_noProvenance hprov source]

private theorem setCaptured_preserves_trap {cap : List Captured} {xNew : Captured}
    (hunit : trappedDoseUnit ∈ cap)
    (hdrug : ∀ x ∈ cap, x.element = "drug" → x.value = .code "insulin lispro")
    (hprov : ∀ x ∈ cap, x.provenance? = none)
    (hneUnit : xNew.element ≠ "doseUnit") (hneDrug : xNew.element ≠ "drug")
    (hxProv : xNew.provenance? = none) :
    trappedDoseUnit ∈ setCaptured cap xNew ∧
    (∀ x ∈ setCaptured cap xNew, x.element = "drug" → x.value = .code "insulin lispro") ∧
    (∀ x ∈ setCaptured cap xNew, x.provenance? = none) := by
  have hdep : linkedDependents cap xNew.element = [] :=
    linkedDependents_of_noProvenance hprov xNew.element
  have hstored : storedCapture cap xNew = xNew := by
    have hany : cap.any (fun y => y.element == xNew.element && y.slot == xNew.slot &&
        y.provenance? == some "linked-source-changed") = false :=
      List.any_eq_false.mpr fun y hy => by simp [hprov y hy]
    have htag : cap.any (fun y => y.element == xNew.element && y.slot == xNew.slot &&
        y.provenance? == some reconcileTag) = false :=
      List.any_eq_false.mpr fun y hy => by simp [hprov y hy]
    unfold storedCapture; rw [htag, hdep, hany]; cases xNew; simp
  refine ⟨?_, ?_, ?_⟩
  · unfold setCaptured; rw [hdep]
    apply List.mem_append.mpr; left; apply List.mem_filter.mpr
    have hne : (trappedDoseUnit.element == xNew.element) = false :=
      beq_false_of_ne (Ne.symm (by simpa [trappedDoseUnit] using hneUnit))
    exact ⟨hunit, by simp [hne]⟩
  · intro x hx hxd
    unfold setCaptured at hx
    rcases List.mem_append.mp hx with hx | hx
    · exact hdrug x (List.mem_filter.mp hx).1 hxd
    · rw [hstored, List.mem_singleton] at hx; subst hx; exact False.elim (hneDrug hxd)
  · intro x hx
    unfold setCaptured at hx
    rcases List.mem_append.mp hx with hx | hx
    · exact hprov x (List.mem_filter.mp hx).1
    · rw [hstored, List.mem_singleton] at hx; subst hx; exact hxProv

private theorem mapConfirm_preserves_trap {cap : List Captured} {e : ElementId}
    (hunit : trappedDoseUnit ∈ cap)
    (hdrug : ∀ x ∈ cap, x.element = "drug" → x.value = .code "insulin lispro")
    (hprov : ∀ x ∈ cap, x.provenance? = none)
    (hneUnit : e ≠ "doseUnit") (hneDrug : e ≠ "drug") :
    trappedDoseUnit ∈ (cap.map fun x => if x.element == e && x.slot == 0 then { x with confirmed := true } else x) ∧
    (∀ x ∈ (cap.map fun x => if x.element == e && x.slot == 0 then { x with confirmed := true } else x),
      x.element = "drug" → x.value = .code "insulin lispro") ∧
    (∀ x ∈ (cap.map fun x => if x.element == e && x.slot == 0 then { x with confirmed := true } else x),
      x.provenance? = none) := by
  refine ⟨?_, ?_, ?_⟩
  · apply List.mem_map.mpr
    have hne : (trappedDoseUnit.element == e) = false :=
      beq_false_of_ne (Ne.symm (by simpa [trappedDoseUnit] using hneUnit))
    exact ⟨trappedDoseUnit, hunit, by simp [hne]⟩
  · intro x hx hxd
    obtain ⟨y, hy, hyx⟩ := List.mem_map.mp hx
    split at hyx
    · rename_i hcond
      have hye : y.element = e := beq_iff_eq.mp (Bool.and_eq_true_iff.mp hcond).1
      rw [← hyx] at hxd; exact False.elim (hneDrug (hye.symm.trans hxd))
    · rw [← hyx] at hxd ⊢; exact hdrug y hy hxd
  · intro x hx
    obtain ⟨y, hy, hyx⟩ := List.mem_map.mp hx
    split at hyx <;> (rw [← hyx]; exact hprov y hy)

private theorem inbox_comp_cases {c : Component} (h : c ∈ v1TrapProg.compsOf "inbox") :
    c.kind = .banner ∨ c.kind = .panel "resultDetail" ∨ c.kind = .trend "resultTrend" ∨
    c.kind = .field "resultAction" (.fixed 0) .none ∨
    c.kind = .field "patientMessage" (.fixed 0) .none ∨
    c.kind = .button (.commit "ackResult") := by
  revert c; decide

private theorem inbox_clickedMacro_none (sp : Spec) (f : Facts) (s : State)
    (hscr : s.screen = "inbox") (cid : CompId) :
    clickedMacro? sp v1TrapProg f s cid = none := by
  unfold clickedMacro? shownComp?; rw [hscr]
  cases hfind : (v1TrapProg.compsOf "inbox").find?
      (fun c => c.id == cid && compShown sp f s (v1TrapProg.compsOf "inbox") c) with
  | none => rfl
  | some c =>
    rcases inbox_comp_cases (List.mem_of_find?_eq_some hfind) with hk | hk | hk | hk | hk | hk <;>
      simp [hk]

/-- New specification for owner review.
Every human step from an `InboxTrap` state in `v1TrapProg` preserves `InboxTrap`. -/
theorem inboxTrap_step (sp : Spec) (f : Facts) (u : User)
    (hact : (sp.element? "resultAction").map ElementSpec.linkedFrom? = some none)
    (hmsg : (sp.element? "patientMessage").map ElementSpec.linkedFrom? = some none)
    {s : State} (htrap : InboxTrap s) (e : Event) :
    InboxTrap (step sp v1TrapProg f u .human s e).1 := by
  obtain ⟨hscr, hunit, hdrug, hprov⟩ := htrap
  have hstep : step sp v1TrapProg f u .human s e = stepCore sp v1TrapProg f u .human s e := by
    cases e with
    | click cid =>
      have hm := inbox_clickedMacro_none sp f s hscr cid
      cases s.popup? <;> simp [step, hm]
    | _ => rfl
  rw [hstep]; unfold stepCore; split
  · exact ⟨hscr, hunit, hdrug, hprov⟩
  · cases e with
    | click cid =>
      simp only [stepEvent]; split
      · exact ⟨hscr, hunit, hdrug, hprov⟩
      · rename_i c hc
        have hmem : c ∈ v1TrapProg.compsOf "inbox" := by
          unfold shownComp? at hc; rw [hscr] at hc; exact List.mem_of_find?_eq_some hc
        rcases inbox_comp_cases hmem with hk | hk | hk | hk | hk | hk
        · simp only [clickCore, hk]; exact ⟨hscr, hunit, hdrug, hprov⟩
        · simp only [clickCore, hk]; exact ⟨hscr, hunit, hdrug, hprov⟩
        · simp only [clickCore, hk]; exact ⟨hscr, hunit, hdrug, hprov⟩
        · simp only [clickCore, hk]; exact ⟨hscr, hunit, hdrug, hprov⟩
        · simp only [clickCore, hk]; exact ⟨hscr, hunit, hdrug, hprov⟩
        · simp only [clickCore, hk, clickCommit]
          repeat' (first | exact ⟨hscr, hunit, hdrug, hprov⟩ | split)
    | enter cid v =>
      simp only [stepEvent, enterCore]; split
      · rw [reconcileCore_idle _ _ _ _ _ _ (fun x hx => by simp [hprov x hx])]
        exact ⟨hscr, hunit, hdrug, hprov⟩
      · rename_i c hc
        have hmem : c ∈ v1TrapProg.compsOf "inbox" := by
          unfold shownComp? at hc; rw [hscr] at hc; exact List.mem_of_find?_eq_some hc
        rcases inbox_comp_cases hmem with hk | hk | hk | hk | hk | hk
        · simp only [hk]; exact ⟨hscr, hunit, hdrug, hprov⟩
        · simp only [hk]; exact ⟨hscr, hunit, hdrug, hprov⟩
        · simp only [hk]; exact ⟨hscr, hunit, hdrug, hprov⟩
        · simp only [hk]; split
          · exact ⟨hscr, hunit, hdrug, hprov⟩
          · rename_i el hel; split
            · exact ⟨hscr, hunit, hdrug, hprov⟩
            · split
              · exact ⟨hscr, hunit, hdrug, hprov⟩
              · have hlf : el.linkedFrom? = none := by rw [hel] at hact; exact Option.some.inj hact
                exact ⟨hscr, setCaptured_preserves_trap hunit hdrug hprov
                  (by dsimp only; decide) (by dsimp only; decide) (by simp [hlf])⟩
        · simp only [hk]; split
          · exact ⟨hscr, hunit, hdrug, hprov⟩
          · rename_i el hel; split
            · exact ⟨hscr, hunit, hdrug, hprov⟩
            · split
              · exact ⟨hscr, hunit, hdrug, hprov⟩
              · have hlf : el.linkedFrom? = none := by rw [hel] at hmsg; exact Option.some.inj hmsg
                exact ⟨hscr, setCaptured_preserves_trap hunit hdrug hprov
                  (by dsimp only; decide) (by dsimp only; decide) (by simp [hlf])⟩
        · simp only [hk]; exact ⟨hscr, hunit, hdrug, hprov⟩
    | confirm cid =>
      simp only [stepEvent, confirmCore]; split
      · exact ⟨hscr, hunit, hdrug, hprov⟩
      · rename_i c hc
        have hmem : c ∈ v1TrapProg.compsOf "inbox" := by
          unfold shownComp? at hc; rw [hscr] at hc; exact List.mem_of_find?_eq_some hc
        rcases inbox_comp_cases hmem with hk | hk | hk | hk | hk | hk
        · simp only [hk]; exact ⟨hscr, hunit, hdrug, hprov⟩
        · simp only [hk]; exact ⟨hscr, hunit, hdrug, hprov⟩
        · simp only [hk]; exact ⟨hscr, hunit, hdrug, hprov⟩
        · simp only [hk]; split
          · exact ⟨hscr, hunit, hdrug, hprov⟩
          · split
            · exact ⟨hscr, hunit, hdrug, hprov⟩
            · split
              · exact ⟨hscr, mapConfirm_preserves_trap (e := "resultAction")
                  hunit hdrug hprov (by decide) (by decide)⟩
              · exact ⟨hscr, hunit, hdrug, hprov⟩
        · simp only [hk]; split
          · exact ⟨hscr, hunit, hdrug, hprov⟩
          · split
            · exact ⟨hscr, hunit, hdrug, hprov⟩
            · split
              · exact ⟨hscr, mapConfirm_preserves_trap (e := "patientMessage")
                  hunit hdrug hprov (by decide) (by decide)⟩
              · exact ⟨hscr, hunit, hdrug, hprov⟩
        · simp only [hk]; exact ⟨hscr, hunit, hdrug, hprov⟩
    | ack a => simp only [stepEvent, ackCore]; repeat' (first | exact ⟨hscr, hunit, hdrug, hprov⟩ | split)
    | selectTab cid idx => simp only [stepEvent, selectTabCore]; repeat' (first | exact ⟨hscr, hunit, hdrug, hprov⟩ | split)
    | scroll z => simp only [stepEvent]; split <;> exact ⟨hscr, hunit, hdrug, hprov⟩
    | search q => simp only [stepEvent]; split <;> exact ⟨hscr, hunit, hdrug, hprov⟩

/-- New specification for owner review.
In any `InboxTrap` state, `validationsOk` is `false` whenever
`sp.element? "doseUnit" = some Specs.V1.doseUnit`. -/
theorem inboxTrap_validationsOk_false (sp : Spec) (f : Facts) {s : State}
    (hdoseUnit : sp.element? "doseUnit" = some Specs.V1.doseUnit) (htrap : InboxTrap s) :
    validationsOk sp f s = false := by
  obtain ⟨_, hunit, hdrug, _⟩ := htrap
  have hduValid : doseUnitValueValid s 1 (.code "mg") = false := by
    unfold doseUnitValueValid doseUnitsAt doseDrug?
    cases hfilt : s.captured.filter (fun x => x.slot == 1 && x.element == drugElement) with
    | nil => rfl
    | cons x rest =>
      cases rest with
      | nil =>
        have hmem : x ∈ s.captured.filter (fun x => x.slot == 1 && x.element == drugElement) := by
          simp [hfilt]
        obtain ⟨hxCap, hxCond⟩ := List.mem_filter.mp hmem
        have hxElem : x.element = "drug" := beq_iff_eq.mp (Bool.and_eq_true_iff.mp hxCond).2
        have hxVal : x.value = .code "insulin lispro" := hdrug x hxCap hxElem
        dsimp only; rw [hxVal]; decide
      | cons y tail => rfl
  apply Bool.eq_false_iff.mpr; intro hok
  have hmemEl : Specs.V1.doseUnit ∈ sp.elements := List.mem_of_find?_eq_some hdoseUnit
  have hallEl := List.all_eq_true.mp hok Specs.V1.doseUnit hmemEl
  have hallCap := List.all_eq_true.mp hallEl trappedDoseUnit hunit
  simp [trappedDoseUnit, Specs.V1.doseUnit] at hallCap
  unfold elementValueValid at hallCap; dsimp at hallCap
  rw [hduValid] at hallCap; cases hallCap

/-- New specification for owner review.
No human event sequence from an `InboxTrap` state with `"ackResult" ∉ s.commits`
can ever commit `"ackResult"` when `sp.element? "doseUnit" = some Specs.V1.doseUnit`. -/
theorem inboxTrap_never_commits (sp : Spec) (f : Facts) (u : User)
    (hdoseUnit : sp.element? "doseUnit" = some Specs.V1.doseUnit)
    (hact : (sp.element? "resultAction").map ElementSpec.linkedFrom? = some none)
    (hmsg : (sp.element? "patientMessage").map ElementSpec.linkedFrom? = some none)
    {s : State} (htrap : InboxTrap s) (hnot : "ackResult" ∉ s.commits) (es : List Event) :
    "ackResult" ∉ (runAll sp v1TrapProg f u .human s es).commits := by
  induction es generalizing s with
  | nil => exact hnot
  | cons e es ih =>
    have hnext : "ackResult" ∉ (step sp v1TrapProg f u .human s e).1.commits := by
      intro hmem
      have hguard := T0_extra_contract sp v1TrapProg f u .human s e "ackResult" hnot hmem
      unfold extraGuard at hguard
      have hval := inboxTrap_validationsOk_false sp f hdoseUnit htrap
      cases h : sp.commit? "ackResult" <;> simp [h, hval] at hguard
    exact ih (inboxTrap_step sp f u hact hmsg htrap e) hnext

/-- New specification for owner review.
Event trace on `v1TrapProg` that enters `"amoxicillin"`, `"mg"`, and
`"insulin lispro"` on slot 1 on `"prep"` and navigates to `"inbox"`. -/
def trapSetupEvents : List Event :=
  [.enter "prep.drug" (.code "amoxicillin"), .enter "prep.doseUnit" (.code "mg"),
   .enter "prep.drug" (.code "insulin lispro"), .click "prep.go"]

/-- New specification for owner review.
Episode for `v1TrapProg` under `sp` on `v1TrapFacts`. -/
abbrev v1TrapEp (sp : Spec) : Episode := ⟨sp, v1TrapProg, v1TrapFacts, Ehr.Examples.Tiny.user⟩

/-- New specification for owner review.
Under any spec `sp` that accepts `v1TrapProg`, includes `Specs.V1.doseUnit`,
and allows `v1TrapProg` to commit `"ackResult"` from `{ start with clock := sTrap.clock }`
via the 4-step inbox trace, `v1TrapProg` fails `CompletableWhereAcceptedFeasible`. -/
theorem v1TrapProg_not_completableWhereAcceptedFeasible (sp : Spec)
    (hcheck : check sp none v1TrapProg v1TrapProg = .ok)
    (hdoseUnit : sp.element? "doseUnit" = some Specs.V1.doseUnit)
    (hact : (sp.element? "resultAction").map ElementSpec.linkedFrom? = some none)
    (hmsg : (sp.element? "patientMessage").map ElementSpec.linkedFrom? = some none)
    (hreq : "ackResult" ∈ requiredCommitsFor sp v1TrapProg v1TrapProg v1TrapFacts Ehr.Examples.Tiny.user)
    (hfeas : "ackResult" ∈ ((v1TrapEp sp).afterHuman
      { (v1TrapEp sp).start with clock := ((v1TrapEp sp).afterHuman (v1TrapEp sp).start trapSetupEvents).clock }
      [.click "prep.go", .enter "inbox.action" (.code "reviewed"),
       .enter "inbox.msg" (.text "ok"), .click "inbox.ack"]).commits)
    (htrapInit : InboxTrap ((v1TrapEp sp).afterHuman (v1TrapEp sp).start trapSetupEvents))
    (hnotInit : "ackResult" ∉ ((v1TrapEp sp).afterHuman (v1TrapEp sp).start trapSetupEvents).commits) :
    ¬ CompletableWhereAcceptedFeasible sp v1TrapProg v1TrapProg := by
  intro hcomp
  let ep := v1TrapEp sp
  let sTrap := ep.afterHuman ep.start trapSetupEvents
  have hreach : Reachable ep sTrap :=
    .step .human (.click "prep.go") (.step .human (.enter "prep.drug" (.code "insulin lispro"))
      (.step .human (.enter "prep.doseUnit" (.code "mg"))
        (.step .human (.enter "prep.drug" (.code "amoxicillin")) .start)))
  have hscans : RecordAllowsScans sp v1TrapFacts := fun _ => rfl
  have hacc : AcceptedCommitFeasible sp v1TrapFacts Ehr.Examples.Tiny.user sTrap.clock "ackResult" :=
    ⟨v1TrapProg, [.click "prep.go", .enter "inbox.action" (.code "reviewed"),
      .enter "inbox.msg" (.text "ok"), .click "inbox.ack"], rfl, hcheck, hfeas⟩
  obtain ⟨es, hdone⟩ := hcomp v1TrapFacts Ehr.Examples.Tiny.user rfl hscans sTrap hreach "ackResult" hreq hnotInit hacc
  exact inboxTrap_never_commits sp v1TrapFacts Ehr.Examples.Tiny.user hdoseUnit hact hmsg htrapInit hnotInit es hdone

set_option maxRecDepth 16384 in
/-- New specification for owner review.
Kernel-checked counterexample under `specV1`: `v1TrapProg` is accepted by
`check`, yet fails `CompletableWhereAcceptedFeasible` and
`CompletableWhereFeasible`. -/
theorem v1_accepted_not_completableWhereAcceptedFeasible :
    check Specs.V1.specV1 none v1TrapProg v1TrapProg = .ok ∧
    ¬ CompletableWhereAcceptedFeasible Specs.V1.specV1 v1TrapProg v1TrapProg ∧
    ¬ CompletableWhereFeasible Specs.V1.specV1 v1TrapProg v1TrapProg := by
  have hcheck : check Specs.V1.specV1 none v1TrapProg v1TrapProg = .ok := by decide
  have hnotAcc : ¬ CompletableWhereAcceptedFeasible Specs.V1.specV1 v1TrapProg v1TrapProg :=
    v1TrapProg_not_completableWhereAcceptedFeasible Specs.V1.specV1 hcheck
      rfl rfl rfl (by decide) (by decide)
      ⟨rfl, by decide, by decide, by decide⟩ (by decide)
  exact ⟨hcheck, hnotAcc, fun h => hnotAcc (completableWhereFeasible_imp_completableWhereAcceptedFeasible _ _ _ h)⟩

set_option maxRecDepth 16384 in
/-- New specification for owner review.
`AcceptedCompletableWhereFeasible` and `AcceptedCompletableWhereAcceptedFeasible`
are false for `specV1`, `specV2`, and `specV3`. -/
theorem v1_v2_v3_not_acceptedCompletableWhereFeasible :
    ¬ AcceptedCompletableWhereFeasible Specs.V1.specV1 ∧
    ¬ AcceptedCompletableWhereAcceptedFeasible Specs.V1.specV1 ∧
    ¬ AcceptedCompletableWhereFeasible Specs.V2.specV2 ∧
    ¬ AcceptedCompletableWhereAcceptedFeasible Specs.V2.specV2 ∧
    ¬ AcceptedCompletableWhereFeasible Specs.V3.specV3 ∧
    ¬ AcceptedCompletableWhereAcceptedFeasible Specs.V3.specV3 := by
  have hv1 := v1_accepted_not_completableWhereAcceptedFeasible
  have hv2Check : check Specs.V2.specV2 none v1TrapProg v1TrapProg = .ok := by decide
  have hv2Acc : ¬ CompletableWhereAcceptedFeasible Specs.V2.specV2 v1TrapProg v1TrapProg :=
    v1TrapProg_not_completableWhereAcceptedFeasible Specs.V2.specV2 hv2Check
      rfl rfl rfl (by decide) (by decide)
      ⟨rfl, by decide, by decide, by decide⟩ (by decide)
  have hv3Check : check Specs.V3.specV3 none v1TrapProg v1TrapProg = .ok := by decide
  have hv3Acc : ¬ CompletableWhereAcceptedFeasible Specs.V3.specV3 v1TrapProg v1TrapProg :=
    v1TrapProg_not_completableWhereAcceptedFeasible Specs.V3.specV3 hv3Check
      rfl rfl rfl (by decide) (by decide)
      ⟨rfl, by decide, by decide, by decide⟩ (by decide)
  refine ⟨fun h => hv1.2.2 (h none v1TrapProg v1TrapProg hv1.1),
          fun h => hv1.2.1 (h none v1TrapProg v1TrapProg hv1.1),
          fun h => hv2Acc (completableWhereFeasible_imp_completableWhereAcceptedFeasible _ _ _
            (h none v1TrapProg v1TrapProg hv2Check)),
          fun h => hv2Acc (h none v1TrapProg v1TrapProg hv2Check),
          fun h => hv3Acc (completableWhereFeasible_imp_completableWhereAcceptedFeasible _ _ _
            (h none v1TrapProg v1TrapProg hv3Check)),
          fun h => hv3Acc (h none v1TrapProg v1TrapProg hv3Check)⟩

#print axioms inboxTrap_step
#print axioms inboxTrap_validationsOk_false
#print axioms inboxTrap_never_commits
#print axioms v1TrapProg_not_completableWhereAcceptedFeasible
#print axioms v1_accepted_not_completableWhereAcceptedFeasible
#print axioms v1_v2_v3_not_acceptedCompletableWhereFeasible

end Ehr.Check
