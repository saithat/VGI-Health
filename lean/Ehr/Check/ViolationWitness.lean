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

#print axioms review_violation
end Ehr.Check
