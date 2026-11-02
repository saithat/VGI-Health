import Ehr.Check.Rules
import Ehr.Props.Examples

namespace Ehr.Check
open Ehr Ehr.Props

/-- Every cached row is the original open-reachability search at that ID. -/
theorem tableReach_eq (p : Program) (start : ScreenId) :
    tableReach p (openReachTable p) start = openReach p start := by
  unfold tableReach
  cases found : (openReachTable p).find? (fun entry => entry.1 == start) with
  | none => rfl
  | some entry =>
    have member := List.mem_of_find?_eq_some found
    have key : entry.1 = start := by simpa using List.find?_some found
    obtain ⟨scr, _, rfl⟩ := List.mem_map.mp member
    exact congrArg (openReach p) key

/-- Caching cannot change a completion verdict, even for malformed programs,
duplicate screen IDs, or an undeclared start ID. No rule is weakened. -/
theorem cached_completion_eq (sp : Spec) (p : Program) (c : CommitId) :
    completeForWithReach sp p c (tableReach p (openReachTable p)) = completeFor sp p c := by
  have same : tableReach p (openReachTable p) = openReach p := funext (tableReach_eq p)
  rw [same]
  rfl

open Ehr.Examples.Tiny Ehr.Props.Examples
example : completeForWithReach spec goodProgram "signOrders"
    (tableReach goodProgram (openReachTable goodProgram)) = completeFor spec goodProgram "signOrders" :=
  cached_completion_eq spec goodProgram "signOrders"

#print axioms tableReach_eq
#print axioms cached_completion_eq
end Ehr.Check
