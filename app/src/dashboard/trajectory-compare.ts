import type { Program } from "../../../agent/src/schema";
import { fieldCaption, sectionCaption } from "../ehr/ui/clinical-display";
import type { RevisionChange } from "../browser/revision-diff";
import type { TrajectoryEntry } from "./trajectories-data";
import { eventTarget, type Trajectory } from "./trajectory-replay";

export const workflowNames: Record<string, string> = {
  W1: "Clinic visit",
  W2: "Results & inbox",
  W3: "ED evaluation & disposition",
  W4: "MAR administration & nursing assessment",
  W5: "Pediatric visit",
  W6: "Surgical care",
  W7: "Medication refills",
};
export type ComparisonKind = "paired" | "cross-day";
export type ReplayEntry =
  TrajectoryEntry | NonNullable<TrajectoryEntry["baseline"]>;
export interface CompareOption {
  key: string;
  entry: ReplayEntry;
  source: "recorded" | "baseline";
  task: TrajectoryEntry;
}
export function comparisonOptions(tasks: TrajectoryEntry[]): CompareOption[] {
  return tasks
    .filter((task) => task.completed && task.metrics.completed)
    .flatMap((task) => [
      { key: task.id, entry: task, source: "recorded" as const, task },
      ...(task.baseline?.completed &&
      task.baseline.metrics.completed &&
      task.baseline.workflow === task.workflow
        ? [
            {
              key: `${task.id}:baseline`,
              entry: task.baseline,
              source: "baseline" as const,
              task,
            },
          ]
        : []),
    ]);
}
export const pairedTask = (task: TrajectoryEntry) =>
  Boolean(
    task.completed &&
    task.metrics.completed &&
    task.baseline?.completed &&
    task.baseline.metrics.completed &&
    task.baseline.workflow === task.workflow &&
    task.baseline.persona === task.persona &&
    task.baseline.id === task.id &&
    task.baseline.day === task.day &&
    task.baseline.patient.syntheaId === task.patient.syntheaId,
  );
export function defaultComparison(
  options: CompareOption[],
  kind: ComparisonKind,
  choices: ReadonlyMap<string, string> = new Map(),
  day?: number,
  revision?: number,
) {
  let candidates = options.filter((option) => option.source === "recorded");
  if (kind === "paired")
    candidates = candidates.filter((option) => pairedTask(option.task));
  if (
    revision !== undefined &&
    candidates.some((option) => option.entry.programVersion === revision)
  )
    candidates = candidates.filter(
      (option) => option.entry.programVersion === revision,
    );
  if (
    day !== undefined &&
    candidates.some((option) => option.entry.day === day)
  )
    candidates = candidates.filter((option) => option.entry.day === day);
  const right = [...candidates].sort(
    (a, b) =>
      b.entry.programVersion - a.entry.programVersion ||
      b.entry.day - a.entry.day ||
      a.key.localeCompare(b.key),
  )[0];
  if (!right) return null;
  if (kind === "paired") {
    const left = options.find(
      (option) => option.key === `${right.key}:baseline`,
    );
    return left ? { left, right } : null;
  }
  const recorded = options.filter(
    (option) =>
      option.source === "recorded" &&
      option.entry.workflow === right.entry.workflow &&
      option.entry.persona === right.entry.persona,
  );
  const baseline = recorded.filter(
    (option) => option.entry.programVersion === 0,
  );
  const pool = baseline.length ? baseline : recorded;
  const firstDay = Math.min(...pool.map((option) => option.entry.day));
  const score = (option: CompareOption) =>
    (choices.has(option.key) &&
    choices.get(option.key) === choices.get(right.key)
      ? 100
      : 0) +
    (option.entry.patient.syntheaId === right.entry.patient.syntheaId
      ? 10
      : 0) +
    (option.key.split("-").at(-1) === right.key.split("-").at(-1) ? 1 : 0);
  const left = pool
    .filter((option) => option.entry.day === firstDay)
    .sort((a, b) => score(b) - score(a) || a.key.localeCompare(b.key))[0];
  return left ? { left, right } : null;
}
export function optionLabel(option: CompareOption) {
  return `Day ${option.entry.day} · rev ${option.entry.programVersion} · ${option.entry.release} · ${option.entry.id}${option.source === "baseline" ? " · baseline control" : ""}`;
}
export function comparisonMetrics(task: Trajectory, entry: ReplayEntry) {
  const ops = task.trace.flatMap((event) => event.ops);
  return {
    clicks: ops.filter((op) => op === "click").length,
    scrolls: ops.filter((op) => op === "scroll").length,
    scrollPx: entry.metrics.scrollPx ?? null,
    mouseTravelPx: entry.metrics.mouseTravelPx ?? null,
    keys: ops.filter((op) => op === "key").length,
    screens: new Set(task.trace.map((event) => event.screen)).size,
  };
}

/** Link a readable structural change to the pre-event screen on each side. */
export function changeMoment(
  change: RevisionChange,
  programs: Program[],
  left: Trajectory,
  right: Trajectory,
) {
  const screens = new Set<string>();
  const targets = new Set<string>();
  for (const program of programs)
    for (const screen of program.screens) {
      const title = sectionCaption(screen.title);
      if (
        change.label.startsWith(title) ||
        change.before === title ||
        change.after === title
      ) {
        screens.add(screen.id);
        for (const component of screen.components) {
          if (
            component.label &&
            change.label.includes(fieldCaption(component.label))
          )
            targets.add(component.id);
        }
      }
      for (const macro of program.macros)
        if (change.label === `Quick action: ${macro.label}`) {
          for (const component of screen.components)
            if (
              JSON.stringify(component.kind).includes(JSON.stringify(macro.id))
            ) {
              screens.add(screen.id);
              targets.add(component.id);
            }
        }
    }
  if (change.label === "Landing activity")
    programs.forEach((program) => screens.add(program.start));
  const find = (task: Trajectory) => {
    const direct = task.trace.findIndex((event) =>
      targets.has(eventTarget(event.event) ?? ""),
    );
    return direct >= 0
      ? direct
      : task.trace.findIndex((event) => screens.has(event.screen));
  };
  const l = find(left),
    r = find(right);
  if (l < 0 && r < 0) return null;
  const corresponding = (
    source: Trajectory,
    index: number,
    target: Trajectory,
  ) => {
    for (const event of source.trace.slice(index)) {
      const id = eventTarget(event.event);
      const found = id
        ? target.trace.findIndex((other) => eventTarget(other.event) === id)
        : -1;
      if (found >= 0) return found;
    }
    return 0;
  };
  return {
    leftObserved: l >= 0,
    rightObserved: r >= 0,
    left: l >= 0 ? l : corresponding(right, r, left),
    right: r >= 0 ? r : corresponding(left, l, right),
  };
}
