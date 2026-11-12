import Ehr.Check.FeasibleCompletion

/-!
Kernel-checked counterexamples for Option D specification sub-choices:
1. Why the canonical-free required-commit set (`specRequiredCommitsFor`) cannot
   replace `requiredCommitsFor` when a spec declares role-permitted commits
   outside a program's workflow scope
   (`unusedWorkflow_completable_not_completableWhereFeasibleSpec`).
2. Why an unconstrained witness program in `CommitFeasible` can complete a task
   that no program satisfying `CatalogOnly` or `WritesOnly` (and hence no
   checker-accepted program in `AcceptedCommitFeasible`) can complete
   (`catalog_commitFeasible_not_acceptedCommitFeasible` and
   `linked_commitFeasible_not_acceptedCommitFeasible`).
-/

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-! ## 1. Canonical-free required-commit set vs. workflow-scoped programs -/

/-- New specification for owner review.
A one-screen witness program with a commit button for `"unused"`. -/
def unusedCommitWitness : Program :=
  { emptyProgram with
    screens := [{ id := "home", title := "Home", workflow := "shell",
                  components := [{ id := "banner", kind := .banner },
                                 { id := "btn", kind := .button (.commit "unused") }] }] }

/-- New specification for owner review.
Under `unusedWorkflowSpec`, commit `"unused"` is feasible at every `clock` via
`unusedCommitWitness`. -/
theorem unusedWorkflow_commitFeasible (clock : Nat) :
    CommitFeasible unusedWorkflowSpec Ehr.Examples.Tiny.facts Ehr.Examples.Tiny.user
      clock "unused" :=
  ⟨unusedCommitWitness, [.click "btn"], rfl, List.mem_singleton.mpr rfl⟩

/-- New specification for owner review.
No human event sequence can ever produce a commit in `emptyProgram` because
`emptyProgram` has no commit button on any screen (`OnlyHumanCommitsAndAcks`). -/
theorem emptyProgram_never_commits (sp : Spec) (facts : Facts) (user : User)
    (c : CommitId) (es : List Event) :
    c ∉ (Episode.afterHuman ⟨sp, emptyProgram, facts, user⟩
      (Episode.start ⟨sp, emptyProgram, facts, user⟩) es).commits := by
  intro hdone
  let ep : Episode := ⟨sp, emptyProgram, facts, user⟩
  have hinit : ep.start.commits = [] := (prefillScreen_frame _ _ _ _).1
  have hnot : c ∉ ep.start.commits := by simp [hinit]
  obtain ⟨s, e, hreach, hcap⟩ := newCommit_witness ep es ep.start .start c hnot hdone
  obtain ⟨_, cid, rfl, comp, hcomp, hkind⟩ :=
    (onlyHumanCommitsAndAcks ep s hreach .human e).1 c hcap
  change comp ∈ emptyProgram.compsOf s.screen at hcomp
  unfold Program.compsOf Program.screen? emptyProgram List.find? at hcomp
  dsimp at hcomp
  cases h : ("home" == s.screen) <;> rw [h] at hcomp
  · cases hcomp
  · cases hcomp with
    | head => cases hkind.2
    | tail _ h => cases h

/-- New specification for owner review.
`emptyProgram` satisfies `Completable` and `CompletableWhereFeasible` against
`unusedWorkflowSpec`, yet fails the canonical-free `CompletableWhereFeasibleSpec`
because `"unused"` is in `specRequiredCommitsFor` and is feasible. -/
theorem unusedWorkflow_completable_not_completableWhereFeasibleSpec :
    Completable unusedWorkflowSpec emptyProgram emptyProgram ∧
    CompletableWhereFeasible unusedWorkflowSpec emptyProgram emptyProgram ∧
    ¬ CompletableWhereFeasibleSpec unusedWorkflowSpec emptyProgram := by
  have hcomp : Completable unusedWorkflowSpec emptyProgram emptyProgram :=
    unusedWorkflow_self_satisfies.2.2.2.2.2.1
  refine ⟨hcomp, completable_imp_completableWhereFeasible _ _ _ hcomp, ?_⟩
  intro hspec
  have hscans : RecordAllowsScans unusedWorkflowSpec Ehr.Examples.Tiny.facts := by
    intro ⟨el, hel, _⟩
    simp [unusedWorkflowSpec, emptySpec] at hel
  have hreq : "unused" ∈ specRequiredCommitsFor unusedWorkflowSpec emptyProgram.role
      Ehr.Examples.Tiny.facts Ehr.Examples.Tiny.user := by decide
  have hnot : "unused" ∉ (Episode.start ⟨unusedWorkflowSpec, emptyProgram,
      Ehr.Examples.Tiny.facts, Ehr.Examples.Tiny.user⟩).commits := by decide
  obtain ⟨es, hdone⟩ := hspec Ehr.Examples.Tiny.facts Ehr.Examples.Tiny.user rfl hscans
    _ .start "unused" hreq hnot (unusedWorkflow_commitFeasible _)
  exact emptyProgram_never_commits unusedWorkflowSpec Ehr.Examples.Tiny.facts
    Ehr.Examples.Tiny.user "unused" es hdone

/-! ## 2. Unconstrained vs. checker-accepted witness programs in `CommitFeasible` -/

/-- New specification for owner review.
Design doc caution (Mechanism A — violating `CatalogOnly`): under
`unusedWorkflowSpec` (whose catalog omits `"button"`), `"unused"` is feasible
via an unconstrained witness (`CommitFeasible`), but no program accepted by
`check` can ever commit `"unused"` (`¬ AcceptedCommitFeasible`). -/
theorem catalog_commitFeasible_not_acceptedCommitFeasible (clock : Nat) :
    CommitFeasible unusedWorkflowSpec Ehr.Examples.Tiny.facts Ehr.Examples.Tiny.user clock "unused" ∧
    ¬ AcceptedCommitFeasible unusedWorkflowSpec Ehr.Examples.Tiny.facts Ehr.Examples.Tiny.user clock "unused" := by
  refine ⟨unusedWorkflow_commitFeasible clock, ?_⟩
  rintro ⟨p, es, _, hcheck, hdone⟩
  let ep : Episode := ⟨unusedWorkflowSpec, p, Ehr.Examples.Tiny.facts, Ehr.Examples.Tiny.user⟩
  have hcat : CatalogOnly unusedWorkflowSpec p := (accepted_wellFormed _ _ _ _ hcheck).1
  have hclock : ep.start.clock = 0 := init_clock _ _ _ _
  have hreach0 : Reachable ep { ep.start with clock := clock } := by
    have h : { ep.start with clock := clock } = { ep.start with clock := ep.start.clock + clock } := by
      simp [hclock]
    rw [h]
    exact Reachable.wait clock .start
  have hinit : ep.start.commits = [] := (prefillScreen_frame _ _ _ _).1
  have hnot : "unused" ∉ ({ ep.start with clock := clock } : State).commits := by
    change "unused" ∉ ep.start.commits
    simp [hinit]
  obtain ⟨s, e, hreach, hcap⟩ :=
    newCommit_witness ep es { ep.start with clock := clock } hreach0 "unused" hnot hdone
  obtain ⟨_, cid, rfl, comp, hcomp, hkind⟩ :=
    (onlyHumanCommitsAndAcks ep s hreach .human e).1 "unused" hcap
  change comp ∈ p.compsOf s.screen at hcomp
  unfold Program.compsOf at hcomp
  cases hscr : p.screen? s.screen with
  | none => simp [hscr] at hcomp
  | some scr =>
    simp only [hscr] at hcomp
    have hscrMem : scr ∈ p.screens := List.mem_of_find?_eq_some hscr
    have hall : (scr, comp) ∈ allComps p :=
      List.mem_flatMap.mpr ⟨scr, hscrMem, List.mem_map.mpr ⟨comp, hcomp, rfl⟩⟩
    have hmemCat := hcat (scr, comp) hall
    change kindName comp.kind ∈ ["banner", "alert"] at hmemCat
    rw [hkind.2] at hmemCat
    revert hmemCat
    decide

/-- New specification for owner review.
Spec for Mechanism B: `"target"` is an `autoLinked` element linked from `"src"`
whose `enteredBy` list is empty (`[]`), while `"src"` is entered by
`.physician`. Both `"field"` and `"button"` are in the catalog. -/
def linkedBypassSpec : Spec where
  version := "linked-bypass"
  elements := [
    { id := "src", label := "Source", kind := .flag,
      enteredBy := [.physician], prefill := .never,
      friction := .safety, fhirTarget := "" },
    { id := "target", label := "Target", kind := .flag,
      enteredBy := [], prefill := .autoLinked, linkedFrom? := some "src",
      friction := .safety, fhirTarget := "" }
  ]
  infos := [{ id := "patientBanner", label := "Patient banner", version := "" }]
  commits := [{ id := "sign", label := "Sign", roles := [.physician] }]
  entries := [{ commit := "sign", element := "target" }]
  reviews := []
  alerts := []
  design := { maxDepth := 2, minTextSize := 12, stabilityBudget := 0,
              landmarks := ["patientBanner"], catalog := ["banner", "field", "button"] }

/-- New specification for owner review.
Unconstrained witness program for `linkedBypassSpec`: enters `"src"` on `"s1"`,
navigates to `"s2"` where `"target"` is auto-prefilled as confirmed via
`.linked "src"` (bypassing `enteredBy`), and commits `"sign"`. -/
def linkedBypassWitness : Program where
  id := "linked-bypass-witness"
  version := 1
  owner := "witness"
  role := .physician
  specVersion := "linked-bypass"
  start := "s1"
  screens := [
    { id := "s1", title := "Step 1", workflow := "W1",
      components := [
        { id := "s1.banner", kind := .banner },
        { id := "s1.src", kind := .field "src" (.fixed 0) .none },
        { id := "s1.go", kind := .button (.goto "s2"), label := "Next" }
      ] },
    { id := "s2", title := "Step 2", workflow := "W1",
      components := [
        { id := "s2.banner", kind := .banner },
        { id := "s2.target", kind := .field "target" (.fixed 0) (.linked "src") },
        { id := "s2.sign", kind := .button (.commit "sign"), label := "Sign" }
      ] }
  ]
  macros := []

/-- New specification for owner review.
Design doc caution (Mechanism B — violating `WritesOnly`): under
`linkedBypassSpec`, `"sign"` is feasible at every `clock` via
`linkedBypassWitness` (`CommitFeasible`), yet no program satisfying `WritesOnly`
(and hence no checker-accepted program in `AcceptedCommitFeasible`) can ever
complete `"sign"`. -/
theorem linked_commitFeasible_not_acceptedCommitFeasible (clock : Nat) :
    CommitFeasible linkedBypassSpec Ehr.Examples.Tiny.facts Ehr.Examples.Tiny.user clock "sign" ∧
    ¬ AcceptedCommitFeasible linkedBypassSpec Ehr.Examples.Tiny.facts Ehr.Examples.Tiny.user clock "sign" := by
  refine ⟨⟨linkedBypassWitness, [.enter "s1.src" (.flag true), .click "s1.go", .click "s2.sign"],
    rfl, List.mem_singleton.mpr rfl⟩, ?_⟩
  rintro ⟨p, es, hrole, hcheck, hdone⟩
  let ep : Episode := ⟨linkedBypassSpec, p, Ehr.Examples.Tiny.facts, Ehr.Examples.Tiny.user⟩
  have hwrites : WritesAllowed ep := (accepted_writesOnly _ _ _ _ hcheck).2 _ _ hrole.symm
  have hclock : ep.start.clock = 0 := init_clock _ _ _ _
  have hreach0 : Reachable ep { ep.start with clock := clock } := by
    have h : { ep.start with clock := clock } = { ep.start with clock := ep.start.clock + clock } := by
      simp [hclock]
    rw [h]
    exact Reachable.wait clock .start
  have hinit : ep.start.commits = [] := (prefillScreen_frame _ _ _ _).1
  have hnot : "sign" ∉ ({ ep.start with clock := clock } : State).commits := by
    change "sign" ∉ ep.start.commits
    simp [hinit]
  obtain ⟨s, e, hreach, hcap⟩ :=
    newCommit_witness ep es { ep.start with clock := clock } hreach0 "sign" hnot hdone
  have hentry : EntryMetIn ep s { commit := "sign", element := "target" } :=
    commitCapturesAll ep s hreach .human e "sign" hcap
      { commit := "sign", element := "target" } (List.mem_singleton.mpr rfl) rfl
  obtain ⟨el, hel, hx⟩ := hentry
  obtain ⟨x, hxmem, hcounts, _⟩ := hx rfl
  obtain ⟨el', hel', hroleIn⟩ := (hwrites s hreach).1 x hxmem
  cases hel
  have hxeq : x.element = "target" := hcounts.1
  rw [hxeq] at hel'
  cases hel'
  cases hroleIn

#print axioms unusedWorkflow_commitFeasible
#print axioms emptyProgram_never_commits
#print axioms unusedWorkflow_completable_not_completableWhereFeasibleSpec
#print axioms catalog_commitFeasible_not_acceptedCommitFeasible
#print axioms linked_commitFeasible_not_acceptedCommitFeasible

end Ehr.Check
