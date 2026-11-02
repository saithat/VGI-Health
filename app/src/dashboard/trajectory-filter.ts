import type { TrajectoryEntry } from "./trajectories-data";
import type { RunData } from "./data";
export type ControlMetrics = TrajectoryEntry["metrics"];
export const controlKey = (
  task: Pick<TrajectoryEntry, "persona" | "day" | "id">,
) => `${task.persona}/${task.day}/${task.id}`;
export function noAgentMetrics(days: RunData["noAgentDays"]) {
  const controls = new Map<string, ControlMetrics>();
  for (const day of days ?? [])
    for (const task of day.tasks)
      controls.set(`${day.persona}/${day.day}/${task.task}`, task);
  return controls;
}
/** Positive means fewer clicks than the recorded same-task no-agent arm. */
export function clickSavings(task: TrajectoryEntry, control?: ControlMetrics) {
  return task.completed && control?.completed && control.clicks > 0
    ? (100 * (control.clicks - task.metrics.clicks)) / control.clicks
    : null;
}
export interface TrajectoryFilters {
  day: string;
  workflow: string;
  revision: string;
  completed: string;
  search: string;
  sort: string;
}
export function filterTrajectories(
  tasks: TrajectoryEntry[],
  filters: TrajectoryFilters,
  controls: ReadonlyMap<string, ControlMetrics>,
) {
  const search = filters.search.toLowerCase();
  const result = tasks.filter(
    (task) =>
      (!filters.day || task.day === Number(filters.day)) &&
      (!filters.workflow || task.workflow === filters.workflow) &&
      (!filters.revision || task.programVersion === Number(filters.revision)) &&
      (!filters.completed ||
        task.completed === (filters.completed === "true")) &&
      `${task.id} ${task.workflow} ${task.patient.syntheaId}`
        .toLowerCase()
        .includes(search),
  );
  if (filters.sort === "clicks-desc")
    result.sort((a, b) => b.metrics.clicks - a.metrics.clicks);
  if (filters.sort === "clicks-asc")
    result.sort((a, b) => a.metrics.clicks - b.metrics.clicks);
  if (filters.sort === "scrolls-desc")
    result.sort((a, b) => b.metrics.scrolls - a.metrics.scrolls);
  if (filters.sort === "savings-desc")
    result.sort(
      (a, b) =>
        (clickSavings(b, controls.get(controlKey(b))) ?? -Infinity) -
        (clickSavings(a, controls.get(controlKey(a))) ?? -Infinity),
    );
  return result;
}
