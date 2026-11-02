import Ehr.Sim.Goals
import Ehr.Specs.V1

namespace Ehr.Check.Tests
open Ehr Ehr.Sim Ehr.Specs.V1

/-- Every denial choice keeps its task commit, regardless of its other choices. -/
theorem core_denial_task_commits (ch : TaskChoices) (deny : ch.refill? = some "deny") :
    taskCommits (specForProfile .core) .W7 ch = ["denyRefill"] := by
  have present : ((specForProfile .core).commit? "denyRefill").isSome = true := by decide
  simp [taskCommits, deny, present]

#guard taskCommits specV1 .W7 { refill? := some "deny" } == ["denyRefill"]
#guard ((specForProfile .core).entries.filter (·.commit == "denyRefill")) ==
  [Specs.Rules.Federal.entrie121, Specs.Rules.Federal.entrie122]
#guard (specForProfile .core).elements == elements
#guard (specForProfile .core).commits.drop commits.length == [Specs.Rules.Federal.denyRefill]

#print axioms core_denial_task_commits
end Ehr.Check.Tests
