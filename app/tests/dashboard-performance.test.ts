import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { withData } from "./data";
import { createJsonCache } from "../src/browser/json-cache";
import { geometrySliceFile, sliceGeometry } from "../scripts/geometry-slice";
import { pointerTravel } from "../src/metrics/geometry";
import {
  trajectorySchema,
  replayGeometrySchema,
} from "../src/dashboard/trajectories-data";
import { trajectoryIndexSchema } from "../src/dashboard/trajectories-data";
import {
  comparisonOptions,
  defaultComparison,
  pairedTask,
} from "../src/dashboard/trajectory-compare";
import {
  clickSavings,
  controlKey,
  filterTrajectories,
  noAgentMetrics,
} from "../src/dashboard/trajectory-filter";

afterEach(() => vi.unstubAllGlobals());
describe("shared JSON cache", () => {
  it("coalesces concurrent requests, shares dashboard/browser responses, expires, and retries failures", async () => {
    let now = 0;
    const cache = createJsonCache(2, () => now);
    const load = vi.fn().mockResolvedValue({ version: 1 });
    const read = (url: string) => cache(url, load);
    const [a, b] = await Promise.all([
      read("/runs/a/index.json"),
      read("/runs/a/index.json"),
    ]);
    expect(a).toBe(b);
    expect(load).toHaveBeenCalledTimes(1);
    now = 29999;
    expect(await read("/runs/a/index.json")).toBe(a);
    now = 30001;
    await read("/runs/a/index.json");
    expect(load).toHaveBeenCalledTimes(2);
    load.mockRejectedValueOnce(new Error("503"));
    await expect(read("/build.json")).rejects.toThrow("503");
    await read("/build.json");
    expect(load).toHaveBeenCalledTimes(4);
    await read("/catalog.json");
    await read("/runs/a/index.json");
    expect(load).toHaveBeenCalledTimes(6);
  });
});
const root = resolve(import.meta.dirname, "../../runs/core-10day");
// The recorded run is archive data (see README "Data"); its tests skip without it.
const run = withData("runs/core-10day/trajectories/index.json");
async function loadIndex() {
  return trajectoryIndexSchema.parse(
    JSON.parse(await readFile(join(root, "trajectories/index.json"), "utf8")),
  );
}
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing test fixture");
  return value;
}
const filters = {
  day: "",
  workflow: "",
  revision: "",
  completed: "",
  search: "",
  sort: "recorded",
};
run.it("filters incomplete tasks, searches ids, sorts costs, and excludes incomplete or unlike comparisons", async () => {
  const index = await loadIndex();
  const incomplete = filterTrajectories(
    index.tasks,
    { ...filters, completed: "false" },
    new Map(),
  );
  expect(incomplete).toHaveLength(11);
  expect(comparisonOptions(incomplete)).toEqual([]);
  const first = required(index.tasks[0]);
  expect(
    filterTrajectories(
      index.tasks,
      { ...filters, search: first.id },
      new Map(),
    ).map((t) => t.id),
  ).toEqual([first.id]);
  const sorted = filterTrajectories(
    index.tasks,
    { ...filters, sort: "clicks-desc" },
    new Map(),
  );
  expect(required(sorted[0]).metrics.clicks).toBe(
    Math.max(...index.tasks.map((t) => t.metrics.clicks)),
  );
  const options = comparisonOptions(index.tasks);
  const pair = required(defaultComparison(options, "cross-day") ?? undefined);
  expect(pair.left.entry.workflow).toBe(pair.right.entry.workflow);
  expect(pair.left.entry.persona).toBe(pair.right.entry.persona);
  expect(pair.left.entry.completed && pair.right.entry.completed).toBe(true);
  const fakeBaseline = {
    ...first,
    simulationSeed: 1,
    completed: false,
    metrics: { ...first.metrics, completed: false },
  };
  expect(pairedTask({ ...first, baseline: fakeBaseline })).toBe(false);
  expect(
    comparisonOptions([{ ...first, baseline: fakeBaseline }]),
  ).toHaveLength(1);
});
run.it("matches no-agent outcomes by persona/day/id and never reports savings for incomplete arms", async () => {
  const index = await loadIndex();
  const day = JSON.parse(
    await readFile(join(root, "no-agent/days/day-01/P1.json"), "utf8"),
  );
  const controls = noAgentMetrics([day]);
  const task = required(index.tasks[0]);
  expect(controls.get(controlKey(task))?.task).toBe(task.id);
  expect(controls.get(controlKey({ ...task, day: 2 }))).toBeUndefined();
  expect(
    clickSavings(task, { ...task.metrics, clicks: task.metrics.clicks * 2 }),
  ).toBe(50);
  expect(clickSavings(task, { ...task.metrics, completed: false })).toBeNull();
  expect(clickSavings({ ...task, completed: false }, task.metrics)).toBeNull();
});
describe("geometry slices", () => {
  run.it("preserves every prefix's measured pointer/scroll result across workflows and days", async () => {
    const index = await loadIndex();
    const tasks = [
      required(index.tasks[0]),
      required(index.tasks.find((t) => t.day === 3 && t.workflow === "W1")),
      required(index.tasks.find((t) => !t.completed)),
    ];
    for (const entry of tasks) {
      const task = trajectorySchema.parse(
        JSON.parse(
          await readFile(join(root, "trajectories", entry.file), "utf8"),
        ),
      );
      const program = JSON.parse(
        await readFile(resolve(root, "../..", entry.programPath), "utf8"),
      );
      const { contentHash } = await import("../src/core/buildBinding");
      const hash = await contentHash(program);
      const atlas = replayGeometrySchema.parse(
        JSON.parse(
          await readFile(join(root, "geometry", `${hash}.json`), "utf8"),
        ),
      );
      const slice = sliceGeometry(atlas, task);
      expect(slice.programHash).toBe(atlas.programHash);
      expect(slice.componentsSha256).toBe(atlas.componentsSha256);
      expect(slice.appSha256).toBe(atlas.appSha256);
      expect(JSON.stringify(slice).length).toBeLessThan(
        JSON.stringify(atlas).length / 5,
      );
      for (let count = 1; count <= task.trace.length; count++)
        expect(pointerTravel(task.trace.slice(0, count), slice)).toEqual(
          pointerTravel(task.trace.slice(0, count), atlas),
        );
    }
  });
  it("uses disk cache, coalesces, invalidates changed inputs, rejects traversal and wrong hashes", async () => {
    const temp = await mkdtemp(join(tmpdir(), "dashboard-slice-"));
    try {
      const hash = "a".repeat(64);
      await mkdir(join(temp, "geometry"));
      await mkdir(join(temp, "trajectories/tasks"), { recursive: true });
      const atlas = {
        schemaVersion: 1,
        programHash: hash,
        appSha256: "app",
        viewport: { width: 1440, height: 900 },
        source: "chromium",
        states: [],
      };
      const task = {
        schemaVersion: 1,
        id: "d01-P1-W1-001",
        trace: [],
        nativeMismatch: null,
        context: {
          programPath: "programs/p.json",
          specPath: "releases/s.json",
          fixtureFile: "fixtures/f.json",
          user: { id: "P1", role: "physician" },
          startMin: 0,
          today: "2026-11-02",
          resources: [],
          segments: [
            {
              start: 0,
              end: 0,
              facts: {},
              seed: { kind: "init", clock: 0 },
              goalsMet: true,
            },
          ],
        },
      };
      await writeFile(
        join(temp, "geometry", `${hash}.json`),
        JSON.stringify(atlas),
      );
      await writeFile(
        join(temp, "trajectories/tasks/t.json"),
        JSON.stringify(task),
      );
      const [a, b] = await Promise.all([
        geometrySliceFile(temp, hash, "tasks/t.json"),
        geometrySliceFile(temp, hash, "tasks/t.json"),
      ]);
      expect(a).toBe(b);
      expect(await geometrySliceFile(temp, hash, "tasks/t.json")).toBe(a);
      await writeFile(
        join(temp, "trajectories/tasks/t.json"),
        JSON.stringify({ ...task, id: "d02-P1-W1-001" }),
      );
      expect(await geometrySliceFile(temp, hash, "tasks/t.json")).not.toBe(a);
      await writeFile(
        join(temp, "geometry", `${hash}.json`),
        JSON.stringify({ ...atlas, appSha256: "updated" }),
      );
      const c = await geometrySliceFile(temp, hash, "tasks/t.json");
      expect(JSON.parse(await readFile(c, "utf8")).appSha256).toBe("updated");
      await expect(geometrySliceFile(temp, hash, "../t.json")).rejects.toThrow(
        "Invalid",
      );
      await writeFile(
        join(temp, "geometry", `${hash}.json`),
        JSON.stringify({ ...atlas, programHash: "wrong" }),
      );
      await expect(
        geometrySliceFile(temp, hash, "tasks/t.json"),
      ).rejects.toThrow("identity");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
