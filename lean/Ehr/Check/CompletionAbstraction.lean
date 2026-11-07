import Ehr.Check.CompletionModel
import Ehr.Props.Properties

/-!
The proof obligations for transferring an AG EF certificate to property 6.
Forward simulation must cover *all* actors/events and arbitrary waiting.
Recovery needs the opposite direction: every abstract recovery edge must lift
to actual human events. Forward simulation alone is unsound for EF.
-/
namespace Ehr.Check.CompletionModel
open Ehr Ehr.Props Ehr.Sim.Certificate
variable {α ε β : Type}

/-- A finite model may forget data only after supplying these proofs.
The concrete state is not restricted to sampled values or a search policy. -/
structure EpisodeAbstraction (ep : Episode) (commit : CommitId) (g : Graph α ε) where
  project : State → α
  event : ∀ s actor e, ∃ es n,
    Run g (project s) es (project (ep.next actor s e)) n
  wait : ∀ s d, ∃ es n,
    Run g (project s) es (project { s with clock := s.clock + d }) n
  recover : ∀ s e, e ∈ g.moves (project s) → ∃ es,
    project (ep.afterHuman s es) = g.next (project s) e
  complete : ∀ s, g.goal (project s) = true → commit ∈ s.commits

variable {ep : Episode} {c : CommitId} {g : Graph α ε}

theorem project_reachable (a : EpisodeAbstraction ep c g) {s : State}
    (h : Reachable ep s) : ∃ es n, Run g (a.project ep.start) es (a.project s) n := by
  induction h with
  | start => exact ⟨[], 0, .nil _⟩
  | @step s actor e _ ih =>
    obtain ⟨xs, n, path⟩ := ih
    obtain ⟨ys, m, edge⟩ := a.event s actor e
    exact ⟨xs ++ ys, n + m, run_append path edge⟩
  | @wait s d _ ih =>
    obtain ⟨xs, n, path⟩ := ih
    obtain ⟨ys, m, edge⟩ := a.wait s d
    exact ⟨xs ++ ys, n + m, run_append path edge⟩

theorem lift_recovery (a : EpisodeAbstraction ep c g) {xs : List ε} :
    ∀ {s t n}, Run g (a.project s) xs t n →
      ∃ es, a.project (ep.afterHuman s es) = t := by
  induction xs with
  | nil =>
    intro s t n run
    cases run
    exact ⟨[], rfl⟩
  | cons e xs ih =>
    intro s t n run
    cases run with
    | cons he tail =>
      obtain ⟨es, edge⟩ := a.recover s e he
      rw [← edge] at tail
      obtain ⟨rest, goal⟩ := ih tail
      refine ⟨es ++ rest, ?_⟩
      simpa only [Episode.afterHuman, runAll, List.foldl_append] using goal

/-- Full property-6 conclusion for an episode, without narrowing Reachable.
The abstraction obligations are explicit; a finite list of example entries
does not discharge them. -/
theorem accepted_episode_complete [DecidableEq α] {ep : Episode} {c : CommitId}
    {g : Graph α ε} (a : EpisodeAbstraction ep c g) {v : Candidate α}
    (h : accept g (a.project ep.start) v = true) :
    ∀ s, Reachable ep s → ∃ es, c ∈ (ep.afterHuman s es).commits := by
  intro s hs
  obtain ⟨xs, n, run⟩ := project_reachable a hs
  obtain ⟨repair, t, m, path, goal⟩ := accepted_AG_EF h run
  obtain ⟨es, endState⟩ := lift_recovery a path
  exact ⟨es, a.complete _ (by rw [endState]; exact goal)⟩

/-- Quantification matches `Completable` exactly. A per-program adapter must
cover every permitted patient/user and each required commit, including waits.
No assumption of completability appears in the adapter interface. -/
theorem accepted_completable [DecidableEq α] (sp : Spec) (can p : Program)
    (model : ∀ (facts : Facts) (user : User), CommitId → Graph α ε)
    (abstraction : ∀ facts user, user.role = p.role → RecordAllowsScans sp facts →
      ∀ c ∈ requiredCommitsFor sp can p facts user,
        EpisodeAbstraction ⟨sp, p, facts, user⟩ c (model facts user c))
    (certificates : ∀ facts user, user.role = p.role → RecordAllowsScans sp facts →
      ∀ c, c ∈ requiredCommitsFor sp can p facts user → Candidate α)
    (accepted : ∀ facts user role scans c required,
      accept (model facts user c)
        ((abstraction facts user role scans c required).project
          (Episode.start ⟨sp, p, facts, user⟩))
        (certificates facts user role scans c required) = true) :
    Completable sp can p := by
  intro facts user role scans s reach c required _
  exact accepted_episode_complete (abstraction facts user role scans c required)
    (accepted facts user role scans c required) s reach

/-- Finite observations induce equivalence classes even on infinite value
domains. Preserving the observation vector preserves each listed guard.
This lemma alone is not a transition-system abstraction: relational guards,
prefills, alert keys, slots and time still require `EpisodeAbstraction`. -/
def observations (guards : List (β → Bool)) (v : β) : List Bool := guards.map (· v)

theorem observation_equivalence (guards : List (β → Bool)) {v w : β}
    (same : observations guards v = observations guards w) :
    ∀ guard ∈ guards, guard v = guard w := by
  induction guards with
  | nil => simp
  | cons guard guards ih =>
    simp only [observations, List.map_cons, List.cons.injEq] at same
    intro f hf
    rcases List.mem_cons.mp hf with rfl | hf
    · exact same.1
    · exact ih same.2 f hf

/-- All possible signatures are explicitly finite (at most 2^guard-count). -/
def signatures : Nat → List (List Bool)
  | 0 => [[]]
  | n + 1 => (signatures n).map (false :: ·) ++ (signatures n).map (true :: ·)

theorem observations_finite (guards : List (β → Bool)) (v : β) :
    observations guards v ∈ signatures guards.length := by
  induction guards with
  | nil => simp [observations, signatures]
  | cons guard guards ih =>
    cases h : guard v <;> simpa [observations, signatures, h] using ih

#print axioms accepted_episode_complete
#print axioms accepted_completable
#print axioms observation_equivalence
#print axioms observations_finite
end Ehr.Check.CompletionModel
