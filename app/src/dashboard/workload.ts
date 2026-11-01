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
  canonical?: Effort | null;
  savings?: Effort | null;
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
    (d) => d.persona === persona && d.programVersion === version && (!run.manifest.measurementProtocol || d.day % 2 === 0),
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
  const canonicalGroups = new Map<string,{clicks:number;keystrokes:number;klmSeconds:number;n:number}>();
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
      sum.tasks++;
      sum.completed += Number(task.completed);
      const baseline = run.baselines?.find((b) => b.persona === persona && b.day === day.day)?.tasks.find((b) => b.task === task.task);
      if (!task.completed || (run.manifest.measurementProtocol && !baseline?.completed)) {groups.set(workflow,sum);continue;}
      if (baseline) {
        const b = canonicalGroups.get(workflow) ?? {clicks:0,keystrokes:0,klmSeconds:0,n:0};
        b.clicks+=baseline.clicks; b.keystrokes+=baseline.keystrokes; b.klmSeconds+=baseline.klmDeciSec/10; b.n++;
        canonicalGroups.set(workflow,b);
      }
      sum.clicks += task.clicks;
      sum.keystrokes += task.keystrokes;
      sum.klmSeconds += task.klmDeciSec / 10;
      groups.set(workflow, sum);
    }
  const workflows = [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([workflow, sum]) => ({
      workflow,
      tasks: sum.tasks,
      completed: sum.completed,
      mean: {
        clicks: sum.clicks / Math.max(1,canonicalGroups.get(workflow)?.n ?? sum.completed),
        keystrokes: sum.keystrokes / Math.max(1,canonicalGroups.get(workflow)?.n ?? sum.completed),
        klmSeconds: sum.klmSeconds / Math.max(1,canonicalGroups.get(workflow)?.n ?? sum.completed),
      },
    }));
  const canonical = canonicalGroups.size ? [...canonicalGroups.values()].reduce((a,b)=>({clicks:a.clicks+b.clicks/b.n,keystrokes:a.keystrokes+b.keystrokes/b.n,klmSeconds:a.klmSeconds+b.klmSeconds/b.n}),{clicks:0,keystrokes:0,klmSeconds:0}) : null;
  const actual = workflows.reduce((a,w)=>({clicks:a.clicks+w.mean.clicks,keystrokes:a.keystrokes+w.mean.keystrokes,klmSeconds:a.klmSeconds+w.mean.klmSeconds}),{clicks:0,keystrokes:0,klmSeconds:0});
  return {
    canonical, savings: canonical ? {clicks:canonical.clicks-actual.clicks,keystrokes:canonical.keystrokes-actual.keystrokes,klmSeconds:canonical.klmSeconds-actual.klmSeconds}:null,
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
  return (run.files ?? [...run.programs.keys()])
    .flatMap((path) => {
      const match = new RegExp(`^programs/${persona}/v(\\d+)\\.json$`).exec(
        path,
      );
      return match ? [Number(match[1])] : [];
    })
    .sort((a, b) => a - b);
}
