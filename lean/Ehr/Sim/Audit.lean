import Ehr.Sim.IntegrationTests
import Ehr.Sim.TaskMinimumTests
import Ehr.Sim.FactsTests

/-! Axiom audit for every named simulator theorem. -/

#print axioms Ehr.Sim.withHistory_twice
#print axioms Ehr.Sim.withHistory_self
#print axioms Ehr.Sim.forget_withHistory
#print axioms Ehr.Sim.layout_history
#print axioms Ehr.Sim.shownComp_history
#print axioms Ehr.Sim.infoShown_history
#print axioms Ehr.Sim.guardBase_history
#print axioms Ehr.Sim.guardReason_history
#print axioms Ehr.Sim.resolveSlot_history
#print axioms Ehr.Sim.hasEntry_history
#print axioms Ehr.Sim.prefillRecord_history
#print axioms Ehr.Sim.orderLines_history
#print axioms Ehr.Sim.withHistory_captured
#print axioms Ehr.Sim.withHistory_screen
#print axioms Ehr.Sim.withHistory_popup
#print axioms Ehr.Sim.withHistory_slot
#print axioms Ehr.Sim.withHistory_commits
#print axioms Ehr.Sim.popupCandidates_history
#print axioms Ehr.Sim.alertsAcked_history
#print axioms Ehr.Sim.prefillField_history
#print axioms Ehr.Sim.prefillFold_history
#print axioms Ehr.Sim.prefillScreen_history
#print axioms Ehr.Sim.compsOf_mem
#print axioms Ehr.Sim.shown_not_back
#print axioms Ehr.Sim.goTo_history
#print axioms Ehr.Sim.clickCore_history
#print axioms Ehr.Sim.enterCore_history
#print axioms Ehr.Sim.confirmCore_history
#print axioms Ehr.Sim.selectTab_history
#print axioms Ehr.Sim.stepCore_history
#print axioms Ehr.Sim.eq_withHistory
#print axioms Ehr.Sim.lift_history
#print axioms Ehr.Sim.macroValue_history
#print axioms Ehr.Sim.macroStep_history
#print axioms Ehr.Sim.runMacro_congr
#print axioms Ehr.Sim.clickedMacro_history
#print axioms Ehr.Sim.safeEvent_history
#print axioms Ehr.Sim.step_history
#print axioms Ehr.Sim.scroll_state
#print axioms Ehr.Sim.search_state
#print axioms Ehr.Sim.Certificate.lookup_mem
#print axioms Ehr.Sim.Certificate.closed_at
#print axioms Ehr.Sim.Certificate.below_nonGoal
#print axioms Ehr.Sim.Certificate.lower_bound
#print axioms Ehr.Sim.Certificate.replay_run
#print axioms Ehr.Sim.Certificate.exact_of_accept
#print axioms Ehr.Sim.T9_certifiedSearch
#print axioms Ehr.Sim.fullMoves_safe
#print axioms Ehr.Sim.searchMoves_subset
#print axioms Ehr.Sim.searchMoves_safe
#print axioms Ehr.Sim.searchMoves_history
#print axioms Ehr.Sim.done_history
#print axioms Ehr.Sim.weight_history
#print axioms Ehr.Sim.next_forget
#print axioms Ehr.Sim.abstract_run
#print axioms Ehr.Sim.real_run
#print axioms Ehr.Sim.real_run_replays
#print axioms Ehr.Sim.T9_minimum_real
#print axioms Ehr.Sim.T9_minimum
#print axioms Ehr.Sim.MinClicksTests.microSatisfiable

#print axioms Ehr.Sim.Certificate.search_sound
#print axioms Ehr.Sim.Certificate.map_run
#print axioms Ehr.Sim.Certificate.lift_run
#print axioms Ehr.Sim.taskNorm_twice
#print axioms Ehr.Sim.taskNorm_index
#print axioms Ehr.Sim.taskNorm_state
#print axioms Ehr.Sim.taskContext_norm
#print axioms Ehr.Sim.taskDone_norm
#print axioms Ehr.Sim.taskMoves_norm
#print axioms Ehr.Sim.taskWeight_norm
#print axioms Ehr.Sim.task_ui_safe
#print axioms Ehr.Sim.task_reset_requires_goal
#print axioms Ehr.Sim.taskStep_norm
#print axioms Ehr.Sim.T9_taskSearch
#print axioms Ehr.Sim.T9_jointMinimum

/- History invariance for the five current core feature groups. -/
#print axioms Ehr.Sim.clinicalEval_history
#print axioms Ehr.Sim.clinicalApplies_history
#print axioms Ehr.Sim.validationHolds_history
#print axioms Ehr.Sim.elementValueValid_history
#print axioms Ehr.Sim.validationsOk_history
#print axioms Ehr.Sim.epochNow_history
#print axioms Ehr.Sim.eventTime_history
#print axioms Ehr.Sim.temporalStatus_history
#print axioms Ehr.Sim.expiryStatus_history
#print axioms Ehr.Sim.alertKeys_history
#print axioms Ehr.Sim.alertHolds_history
#print axioms Ehr.Sim.whenHolds_history
#print axioms Ehr.Sim.lineMatches_history
#print axioms Ehr.Sim.entryMet_history
#print axioms Ehr.Sim.entryReason_history
#print axioms Ehr.Sim.payloadFieldMet_history
#print axioms Ehr.Sim.payloadComplete_history
#print axioms Ehr.Sim.displaysOk_history
#print axioms Ehr.Sim.extraGuard_history
#print axioms Ehr.Sim.obligationViews_history

#print axioms Ehr.Sim.valueGoalMet_history
