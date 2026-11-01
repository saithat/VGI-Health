import Ehr.Canonical.Rules

namespace Ehr.Canonical.CorePlacements

/-- W7 denial uses the same screen, action and fields as the full catalog. -/
def placements : List (ScreenId × CommitId × List ElementId) :=
  [("w7Decision", "denyRefill", ["refillDecision", "refillDenyReason"])]

/-- Reuse the two base inputs and insert the denial action before approval. -/
def augment (s : Screen) : Screen :=
  let additions := (placements.filter (·.1 == s.id)).flatMap fun (_, k, elements) =>
    (elements.filterMap fun e =>
      if Rules.hasField s e then none else
        some (field s.id ("legal." ++ e) e
          ((Specs.V1.specV1.element? e).map (·.label) |>.getD e))) ++
    (if Rules.hasCommit s k then [] else
      [commitBtn s.id k ((Specs.V1.specV1.commit? k).map (·.label) |>.getD k)])
  let before := s.components.takeWhile fun c => match c.kind with
    | .button (.commit _) => false | _ => true
  { s with components := before ++ additions ++ s.components.drop before.length }

end Ehr.Canonical.CorePlacements
