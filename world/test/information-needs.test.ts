import {expect, it} from "vitest";
import {withInformationData} from "../src/information-needs";
import {DayScheduleSchema, type Task} from "../src/schema";
import {run} from "./helpers";

it("adds dated patient-bound observations without mutating historical scenarios", () => {
  const day = run(7).days[0];
  if (day === undefined) throw new Error("missing day");
  for (const schedule of Object.values(day.schedules)) {
    const original = JSON.stringify(schedule);
    const enriched = {...schedule, tasks: schedule.tasks.map(withInformationData)};
    expect(DayScheduleSchema.safeParse(enriched).success).toBe(true);
    expect(JSON.stringify(schedule)).toBe(original);
    expect(enriched.tasks.map(t => t.choices)).toEqual(schedule.tasks.map(t => t.choices));
    for (const [i, task] of enriched.tasks.entries()) {
      const before = schedule.tasks[i];
      if (before === undefined) throw new Error("missing task");
      for (const resource of task.todayResources.slice(before.todayResources.length)) {
        expect(resource).toMatchObject({subject: {reference: `Patient/${task.patientId}`}});
      }
    }
  }
});

it("links bedside lookup data to its synthetic acute encounter", () => {
  const task: Task = {id: "fictional-dose", day: 1, persona: "P3", workflow: "W4", patientId: "fictional-patient", startMin: 120,
    choices: {orders: [], administer: [{drug: "lisinopril", doseTenths: 100, unit: "mg", route: "PO", freq: "daily", prn: false}], ackResult: false, immunizations: [], noteSections: []}, todayResources: [], interruptions: 0};
  const result = withInformationData(task);
  expect(result.todayResources).toEqual(expect.arrayContaining([
    expect.objectContaining({resourceType: "Encounter", id: "fictional-dose-information-encounter"}),
    expect.objectContaining({resourceType: "Observation", encounter: {reference: "Encounter/fictional-dose-information-encounter"}, valueQuantity: expect.objectContaining({value: 118, unit: "mmHg"})}),
  ]));
});
