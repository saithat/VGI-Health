import Ehr.Check.StructuralWitness
import Ehr.Check.Graph

namespace Ehr.Check
open Ehr Ehr.Props

/-- One reachable shown signing button and one unmet review suffice. The
argument is proved with an abstract episode, so fixture computation is confined
to separate closed Boolean facts rather than elaboration of this proof. -/
theorem review_violation (ep : Episode) (prev : Option Program) (can : Program)
    (role : ep.user.role = ep.prog.role) (s : State) (reach : Reachable ep s)
    (cm : CommitId)
    (shown : (ep.prog.compsOf s.screen).any (fun c => c.kind == .button (.commit cm) &&
      compShown ep.spec ep.facts s (ep.prog.compsOf s.screen) c) = true)
    (rq : ReviewReq) (member : rq ∈ ep.spec.reviews) (same : rq.commit = cm)
    (noWaiver : rq.waivedBy? = none)
    (unmet : reviewMet ep.spec ep.prog ep.facts s rq = false) :
    ¬ Satisfies ep.spec prev can ep.prog := by
  intro hs
  have met := (hs.2.2.2.1 ep.facts ep.user role).2 s reach cm
    (commitButtonShown_of_any ep s cm shown) rq member same noWaiver
  have ht := (reviewMet_iff ep s rq).mpr met
  rw [unmet] at ht
  contradiction

/-- A closed screen set excludes every path to a screen outside it. -/
theorem outside_closed_no_depth (p : Program) (kept : List ScreenId)
    (closed : GotoClosed p kept) (start : p.start ∈ kept) (z : ScreenId)
    (outside : z ∉ kept) (n : Nat) : ¬ WithinClicks p n z := by
  rintro ⟨hops, path, _⟩
  exact outside (gotoPath_closed p kept closed path start)

/-- A required field confined to an unreachable screen violates property 1. -/
theorem required_unreachable_violation (sp : Spec) (prev : Option Program) (can p : Program)
    (cm : CommitId) (required : cm ∈ requiredCommits sp can p)
    (rq : EntryReq) (member : rq ∈ sp.entries) (same : rq.commit = cm) (z : ScreenId)
    (fields : (allComps p).all (fun sc => (fieldOf? sc.2.kind).all (fun f =>
      f.1 != rq.element || sc.1.id == z)) = true)
    (unreachable : ¬ WithinClicks p sp.design.maxDepth z) : ¬ Satisfies sp prev can p := by
  intro hs
  obtain ⟨sc, hc, ⟨f, hf, he⟩, depth⟩ := hs.1.2.2.2.2.1 cm required rq member same
  have here := List.all_eq_true.mp fields sc hc
  have field : fieldOf? sc.2.kind = some f := by simpa using hf
  simp only [field, Option.all_some, he, bne_self_eq_false, Bool.false_or, beq_iff_eq] at here
  exact unreachable (here ▸ depth)

/-- With no incoming goto and a different start, a screen has no goto path.
Unlike a large closed-set check, the finite witness inspects only goto targets. -/
theorem no_incoming_no_depth (p : Program) (z : ScreenId) (n : Nat) (start : p.start ≠ z)
    (edges : (allComps p).all (fun sc => (gotoOf? sc.2.kind).all (· != z)) = true) :
    ¬ WithinClicks p n z := by
  have avoids {a hops b} (path : GotoPath p a hops b) : a ≠ z → b ≠ z := by
    induction path with
    | here => exact id
    | @hop a b t rest edge path ih =>
      intro _
      obtain ⟨scr, hs, hid, c, hc, hk⟩ := edge
      have mem : (scr, c) ∈ allComps p := by
        simp only [allComps, List.mem_flatMap, List.mem_map]
        exact ⟨scr, hs, c, hc, rfl⟩
      have target := List.all_eq_true.mp edges (scr, c) mem
      have different : b ≠ z := by simpa [gotoOf?, hk] using target
      exact ih different
  rintro ⟨hops, path, _⟩
  exact avoids path start rfl

#print axioms review_violation
#print axioms outside_closed_no_depth
#print axioms required_unreachable_violation
end Ehr.Check
