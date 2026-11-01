import type { RunData } from "./data";

export type Effort = { clicks: number; keystrokes: number; klmSeconds: number };
export interface WorkloadIteration {
  version: number;
  days: number[];
  tasks: number;
  completed: number;
  unclassified: number;
  workflows: {
    workflow: string;
    tasks: number;
    completed: number;
    mean: Effort;
  }[];
  total: Effort | null;
}

/** Pool recorded tasks within a workflow, then sum workflow means (one task per workflow).
 * Never sum daily volumes, invent missing versions, or substitute predicted savings.
 */
export function workloadAt(
  run: RunData,
  persona: string,
  version: number,
): WorkloadIteration {
  const days = run.days.filter(
    (d) => d.persona === persona && d.programVersion === version,
  );
  const groups = new Map<
    string,
    {
      clicks: number;
      keystrokes: number;
      klmSeconds: number;
      tasks: number;
      completed: number;
    }
  >();
  let unclassified = 0;
  for (const day of days)
    for (const task of day.tasks) {
      const workflow = /(?:^|-)(W[1-7])(?:-|$)/.exec(task.task)?.[1];
      if (!workflow) {
        unclassified++;
        continue;
      }
      const sum = groups.get(workflow) ?? {
        clicks: 0,
        keystrokes: 0,
        klmSeconds: 0,
        tasks: 0,
        completed: 0,
      };
      sum.clicks += task.clicks;
      sum.keystrokes += task.keystrokes;
      sum.klmSeconds += task.klmDeciSec / 10;
      sum.tasks++;
      sum.completed += Number(task.completed);
      groups.set(workflow, sum);
    }
  const workflows = [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([workflow, sum]) => ({
      workflow,
      tasks: sum.tasks,
      completed: sum.completed,
      mean: {
        clicks: sum.clicks / sum.tasks,
        keystrokes: sum.keystrokes / sum.tasks,
        klmSeconds: sum.klmSeconds / sum.tasks,
      },
    }));
  return {
    version,
    days: days.map((d) => d.day),
    unclassified,
    tasks: workflows.reduce((n, w) => n + w.tasks, 0),
    completed: workflows.reduce((n, w) => n + w.completed, 0),
    workflows,
    total: workflows.length
      ? workflows.reduce(
          (n, w) => ({
            clicks: n.clicks + w.mean.clicks,
            keystrokes: n.keystrokes + w.mean.keystrokes,
            klmSeconds: n.klmSeconds + w.mean.klmSeconds,
          }),
          { clicks: 0, keystrokes: 0, klmSeconds: 0 },
        )
      : null,
  };
}

export function versionsFor(run: RunData, persona: string) {
  return [...run.programs.keys()]
    .flatMap((path) => {
      const match = new RegExp(`^programs/${persona}/v(\\d+)\\.json$`).exec(
        path,
      );
      return match ? [Number(match[1])] : [];
    })
    .sort((a, b) => a - b);
}
