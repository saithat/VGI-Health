import Ehr.Check.StructuralWitness
import Ehr.Canonical.BadPrograms

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical

/-- A component occurs on some screen. Local patch proofs need no equality
test on the other screens or evaluation of the program's macros. -/
def HasComponent (p : Program) (c : Component) : Prop :=
  ∃ s ∈ p.screens, c ∈ s.components

/-- Optional lookup visits only the prefix ending at the witness. In contrast,
proving a length bound first forces every unrelated component to be evaluated. -/
theorem getD_mem {α : Type} [Inhabited α] (xs : List α) (n : Nat)
    (present : xs[n]?.isSome = true) : xs[n]?.getD default ∈ xs := by
  cases h : xs[n]? with
  | none => simp [h] at present
  | some x =>
    simp only [Option.getD_some]
    exact List.mem_of_getElem? h

/-- One closed component lookup supplies its binding facts without repeating
reduction of the canonical screen for each projection. -/
theorem componentAt_facts (cs : List Component) (i : Nat) (id : CompId) (kind : Kind)
    (h : (cs[i]?).any (fun c => c.id == id && c.kind == kind) = true) :
    (cs[i]?.getD default).id = id ∧ (cs[i]?.getD default).kind = kind := by
  cases he : cs[i]? with
  | none => simp [he] at h
  | some c => simpa [he] using h

/-- A component occurrence supplies its screen/component pair in allComps. -/
theorem hasComponent_pair {p : Program} {c : Component} (h : HasComponent p c) :
    ∃ sc ∈ allComps p, sc.2 = c := by
  obtain ⟨s, hs, hc⟩ := h
  exact ⟨(s, c), List.mem_flatMap.mpr ⟨s, hs, List.mem_map.mpr ⟨c, hc, rfl⟩⟩, rfl⟩

/-- Persona projection preserves every authorized non-macro component,
independently of the size and contents of its macro library. -/
theorem hasComponent_forPersona (sp : Spec) (p : Program) (owner : String) (role : Role)
    (c : Component) (h : HasComponent (presetProgram owner p) c)
    (allowed : roleComponentAllowed sp role c = true) (nonmacro : macroOf? c.kind = none) :
    HasComponent (forPersona sp p owner role) c := by
  obtain ⟨s, hs, hc⟩ := h
  unfold HasComponent forPersona
  refine ⟨_, List.mem_map.mpr ⟨_, List.mem_map.mpr ⟨s, hs, rfl⟩, rfl⟩, ?_⟩
  apply List.mem_filter.mpr
  refine ⟨List.mem_filter.mpr ⟨hc, allowed⟩, ?_⟩
  cases hk : c.kind <;> simp_all [macroOf?]

/-- Updating a screen retains a component when the update retains every occurrence. -/
theorem hasComponent_updateScreen (p : Program) (id : ScreenId) (f : Screen → Screen)
    (c : Component) (h : HasComponent p c)
    (kept : ∀ s, c ∈ s.components → c ∈ (f s).components) :
    HasComponent (p.updateScreen id f) c := by
  obtain ⟨s, hs, hc⟩ := h
  refine ⟨_, List.mem_map.mpr ⟨s, hs, rfl⟩, ?_⟩
  split <;> simp_all

/-- Inserting components after an ID retains every existing component. -/
theorem insertAfter_keeps (s : Screen) (id : CompId) (extra : List Component)
    (c : Component) (h : c ∈ s.components) : c ∈ (s.insertAfter id extra).components := by
  apply List.mem_flatMap.mpr
  refine ⟨c, h, ?_⟩
  split <;> simp

/-- Dropping another component ID retains this component. -/
theorem dropComp_keeps (s : Screen) (id : CompId) (c : Component)
    (h : c ∈ s.components) (different : c.id ≠ id) : c ∈ (s.dropComp id).components := by
  exact List.mem_filter.mpr ⟨h, by simpa using different⟩

/-- Changing seed metadata or appending a macro does not change screens. -/
theorem hasComponent_seed (n : Nat) (p : Program) (c : Component)
    (h : HasComponent p c) : HasComponent (Bad.seed n p) c := h

/-- Adding a macro leaves every existing component occurrence intact. -/
theorem hasComponent_addMacro (p : Program) (m : Macro) (c : Component)
    (h : HasComponent p c) : HasComponent (p.addMacro m) c := h

/-- A list-building fold retains an item already emitted or later encountered. -/
theorem foldl_retains {α : Type} (f : α × List Component → Component → α × List Component)
    (c : Component)
    (keep : ∀ a x, c ∈ a.2 → c ∈ (f a x).2)
    (add : ∀ a, c ∈ (f a c).2) :
    ∀ (xs : List Component) (a : α × List Component), c ∈ a.2 ∨ c ∈ xs → c ∈ (xs.foldl f a).2 := by
  intro xs
  induction xs with
  | nil => intro a h; exact h.resolve_right (by simp)
  | cons x xs ih =>
    intro a h
    apply ih
    rcases h with old | fresh
    · exact Or.inl (keep a x old)
    · rcases List.mem_cons.mp fresh with rfl | rest
      · exact Or.inl (add a)
      · exact Or.inr rest

/-- Signature construction retains a field whose id is not an identity id. -/
theorem signature_keeps_field (s : Screen) (c : Component) (member : c ∈ s.components)
    (e : ElementId) (slot : Slot) (pf : Prefill) (kind : c.kind = .field e slot pf)
    (kept : (s.components.filter (fun x => match x.kind with
      | .field "patientIdReentry" _ _ => true | _ => false)).any (·.id == c.id) = false) :
    c ∈ (Blueprint.signature s).components := by
  unfold Blueprint.signature
  dsimp only
  split
  · exact member
  · apply foldl_retains (c := c)
    · intro a x old
      split <;> (try split) <;> simp_all
    · intro a
      simp [kind]
    · exact Or.inr (List.mem_filter.mpr ⟨member, by rw [Bool.not_eq_true']; exact kept⟩)

/-- Related-care deduplication retains ordinary fields exactly. -/
theorem relatedLinks_keeps_field (source : List Screen) (s : Screen) (cs : List Component)
    (c : Component) (member : c ∈ cs) (e : ElementId) (slot : Slot) (pf : Prefill)
    (kind : c.kind = .field e slot pf)
    (legal : c.id ≠ cid s.id "legalNav") (feature : c.id ≠ cid s.id "featureNavigation") :
    c ∈ Blueprint.relatedLinks source s cs := by
  unfold Blueprint.relatedLinks
  apply List.mem_filter.mpr
  constructor
  · apply foldl_retains (c := c)
    · intro a x old
      split <;> (repeat' split) <;> simp_all <;> split <;> simp_all
    · intro a
      simp [kind]
    · exact Or.inr member
  · simp [legal, feature]

theorem signature_id (s : Screen) : (Blueprint.signature s).id = s.id := by
  unfold Blueprint.signature
  dsimp only
  split <;> rfl

theorem signature_workflow (s : Screen) : (Blueprint.signature s).workflow = s.workflow := by
  unfold Blueprint.signature
  dsimp only
  split <;> rfl

/-- Artifact folding retains an ordinary source field on its retained host,
without evaluating unrelated artifact bodies. -/
theorem blueprint_keeps_field (source : List Screen) (s : Screen) (c : Component)
    (screen : s ∈ source) (host : (Blueprint.host s.id == s.id) = true)
    (member : c ∈ s.components) (e : ElementId) (slot : Slot) (pf : Prefill)
    (kind : c.kind = .field e slot pf)
    (identity : (s.components.filter (fun x => match x.kind with
      | .field "patientIdReentry" _ _ => true | _ => false)).any (·.id == c.id) = false)
    (shell : Blueprint.isShellCopy s c = false)
    (navParent : c.parent? ≠ some (cid s.id "nav"))
    (legal : c.id ≠ cid s.id "legalNav") (feature : c.id ≠ cid s.id "featureNavigation") :
    ∃ out ∈ Blueprint.screens source, c ∈ out.components := by
  have signature := signature_keeps_field s c member e slot pf kind identity
  have clean : c ∈ Blueprint.clean (Blueprint.signature s) := by
    unfold Blueprint.clean
    apply List.mem_map.mpr
    refine ⟨c, List.mem_filter.mpr ⟨signature, ?_⟩, ?_⟩
    · simpa only [Blueprint.isShellCopy, signature_id, signature_workflow,
        Bool.not_eq_true'] using shell
    · simp [Blueprint.route, signature_id, navParent, kind]
  have related := relatedLinks_keeps_field source s _ c clean e slot pf kind legal feature
  refine ⟨_, List.mem_map.mpr ⟨s, List.mem_filter.mpr ⟨screen, host⟩, rfl⟩, ?_⟩
  by_cases foot : Blueprint.footer s c
  · exact List.mem_append_right _ (List.mem_filter.mpr ⟨related, foot⟩)
  · apply List.mem_append_left
    apply List.mem_append_left
    exact List.mem_filter.mpr ⟨related, by simpa using foot⟩

/-- The source-list argument of the actual canonical constructor, before folding. -/
def canonicalSource : List Screen :=
  let base := [home] ++ W1.screens ++ W2.screens ++ W3.screens ++
    W4.screens ++ W5.screens ++ W6.screens ++ W7.screens
  if Specs.ruleProfile == .full then Features.screens (Rules.screens base) else base.map CorePlacements.augment

/-- Alerts and link annotation retain a field with no declared source/link. -/
theorem canonical_keeps_plain_field (c : Component)
    (member : ∃ s ∈ Blueprint.screens canonicalSource, c ∈ s.components)
    (e : ElementId) (slot : Slot) (pf : Prefill) (kind : c.kind = .field e slot pf)
    (el : ElementSpec) (lookup : Specs.V1.specV1.element? e = some el)
    (noLink : el.linkedFrom? = none) (noRecord : el.recordFact? = none) :
    HasComponent canonicalV1 c := by
  obtain ⟨s, hs, hc⟩ := member
  refine ⟨_, List.mem_map.mpr ⟨_, List.mem_append_left _ (List.mem_map.mpr ⟨s, hs, rfl⟩), rfl⟩, ?_⟩
  apply Canonical.Density.augment_keeps
  have split : c ∈ s.components.take 1 ∨ c ∈ s.components.drop 1 := by
    rw [← List.mem_append, List.take_append_drop]
    exact hc
  have kept : c ∈ (withRequiredReviews s).components := by
    rcases split with h | h
    · exact List.mem_append_left _ (List.mem_append_left _ h)
    · exact List.mem_append_right _ h
  apply List.mem_map.mpr
  refine ⟨c, List.mem_append_left _ kept, ?_⟩
  change (match c.kind with
    | .field eid sl _ => match Specs.V1.specV1.element? eid with
      | some el => match el.linkedFrom? with
        | some src => if el.prefill == .autoLinked then {c with kind := .field eid sl (.linked src)} else c
        | none => match el.recordFact? with
          | some fact => if el.prefill == .recordConfirm then {c with kind := .field eid sl (.fromRecord fact)} else c
          | none => c
      | none => c
    | _ => c) = c
  simp [kind, lookup, noLink, noRecord]

end Ehr.Check
