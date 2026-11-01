// @vitest-environment node
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRun } from "../src/dashboard/data";
import { workloadAt, versionsFor } from "../src/dashboard/workload";

const root = resolve(import.meta.dirname, "../../runs/run1-P3");
const files = (await readdir(root, { recursive: true })).filter((f) =>
  f.endsWith(".json"),
);
const run = await loadRun("run1-P3", files, async (path) =>
  JSON.parse(
    await readFile(resolve(root, path.replace("/runs/run1-P3/", "")), "utf8"),
  ),
);
describe("simulated realistic workload", () => {
  it("uses every recorded program version and pools tasks across its days", () => {
    expect(versionsFor(run, "P3")).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    const point = workloadAt(run, "P3", 7);
    const tasks = run.days
      .filter((d) => d.programVersion === 7)
      .flatMap((d) => d.tasks);
    expect(point.days).toEqual([9, 10]);
    expect(point.tasks).toBe(89);
    expect(point.workflows.map((w) => w.workflow)).toEqual(["W4"]);
    expect(point.total?.clicks).toBeCloseTo(
      tasks.reduce((n, t) => n + t.clicks, 0) / 89,
    );
    expect(point.total?.klmSeconds).toBeCloseTo(
      tasks.reduce((n, t) => n + t.klmDeciSec, 0) / 890,
    );
    expect(workloadAt(run, "P3", 99).total).toBeNull();
    expect(workloadAt(run, "P1", 0).total).toBeNull();
  });
  it("sums workflow means, not workload volume, and accounts for incomplete tasks", () => {
    const day = run.days[0];
    const task = day?.tasks[0];
    if (!day || !task) throw new Error("Missing fixture");
    const sample = {
      ...run,
      days: [
        {
          ...day,
          programVersion: 0,
          tasks: [
            {
              ...task,
              task: "d01-P3-W1-001",
              clicks: 2,
              keystrokes: 4,
              klmDeciSec: 100,
              completed: true,
            },
            {
              ...task,
              task: "d01-P3-W4-001",
              clicks: 10,
              keystrokes: 6,
              klmDeciSec: 200,
              completed: true,
            },
            {
              ...task,
              task: "d01-P3-W4-002",
              clicks: 20,
              keystrokes: 8,
              klmDeciSec: 400,
              completed: false,
            },
            { ...task, task: "unclassified", clicks: 999, completed: false },
          ],
        },
      ],
    };
    expect(workloadAt(sample, "P3", 0)).toMatchObject({
      tasks: 3,
      completed: 2,
      unclassified: 1,
      total: { clicks: 12, keystrokes: 10, klmSeconds: 30 },
    });
  });
  it("loads exact data independently: realistic savings can change with a flat expert minimum", () => {
    const exact = run.complexity?.personas.find((p) => p.persona === "P3");
    expect(exact?.iterations.find((i) => i.version === 3)?.total.clicks).toBe(
      exact?.iterations.find((i) => i.version === 4)?.total.clicks,
    );
    expect(workloadAt(run, "P3", 3).total?.klmSeconds).not.toBe(
      workloadAt(run, "P3", 4).total?.klmSeconds,
    );
    expect(run.manifest.ehr.mode).toBe("real");
  });
});
