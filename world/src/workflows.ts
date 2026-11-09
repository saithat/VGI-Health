/** Wave-3 workflow phases. All phase/service times and routing choices here
 * are declared scenarios; sources S8–S13 provide structure only. */
import type { WorkflowPlan } from "./schema";
export function workflowPlan(kind: WorkflowPlan["kind"], owner: string,
  delegateTo?: string): WorkflowPlan {
  return {kind, owner, ...(delegateTo ? {delegateTo} : {}), delegateAccepted: true,
    phaseMs: 5000, responseWaitMs: ["refill", "pharmacy", "prescription"].includes(kind) ? 60000 : 0};
}

import type { OrderChoice, Task } from "./schema";
/** One declared compound task: inspection precedes cancellation, a replacement
 * order or a documented override. Replacement/override still run all Lean guards.
 * No probability of bypassing a guard exists. */
export function compoundAlert(task: Task, resolution: "inspect" | "cancel" | "alternative" | "override",
  alternative?: OrderChoice, rationale = "scenario: clinician reviewed risk and documented monitoring/follow-up"): Task {
  if (resolution === "alternative" && !alternative) throw new Error("alternative order required");
  return {...task, workflowPlan: workflowPlan("alert", task.persona),
    choices:{...task.choices,
      orders: resolution === "cancel" ? [] : resolution === "alternative" && alternative ? [alternative] : task.choices.orders,
      noteSections:[...new Set([...task.choices.noteSections, "hpi", "assessmentPlan"])]},
    todayResources:[...task.todayResources, {resourceType:"DetectedIssue", id:`${task.id}-alert-decision`,
      status:"final", code:{text:resolution}, patient:{reference:`Patient/${task.patientId}`},
      detail:`Scenario alert resolution: ${resolution}; rationale: ${rationale}; original orders: ${JSON.stringify(task.choices.orders)}`} ]};
}
