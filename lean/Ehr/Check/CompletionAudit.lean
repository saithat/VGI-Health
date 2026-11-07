import Ehr.Check.CompletionAbstraction
import Ehr.Check.CompletionScenarioTests
import Ehr.Check.InteractionRules

/-! Complete axiom audit for the completion-checker lane's new theorems. -/
open Ehr.Check.CompletionModel
#print axioms closed_at
#print axioms descending_at
#print axioms run_closed
#print axioms recovery
#print axioms accepted_AG_EF
#print axioms accepted_no_dead_end
#print axioms run_append
#print axioms accepted_edges
#print axioms project_reachable
#print axioms lift_recovery
#print axioms accepted_episode_complete
#print axioms accepted_completable
#print axioms observation_equivalence
#print axioms observations_finite
#print axioms losing_never_goal
#print axioms rejected_trap
#print axioms check_accepted
#print axioms check_rejected
#print axioms scenario_next
#print axioms scenario_map
#print axioms scenario_lift
#print axioms scenario_replays
#print axioms accepted_scenario
#print axioms rejected_scenario
#print axioms Tests.repaired_certificate_accepts
#print axioms Tests.micro_recovery
#print axioms Tests.micro_trap_certificate
#print axioms Tests.micro_trap
#print axioms Ehr.Check.InteractionRules.interruptive_before_commit
#print axioms Ehr.Check.InteractionRules.prefill_keeps_entries
#print axioms Ehr.Check.InteractionRules.prefill_screen_keeps_entries
#print axioms Ehr.Check.InteractionRules.back_keeps_entries
#print axioms Ehr.Check.InteractionRules.back_keeps_commits
