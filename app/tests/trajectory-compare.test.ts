import { withData } from "./data";
// @vitest-environment node
import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import {
  comparisonOptions,
  defaultComparison,
  comparisonMetrics,
} from "../src/dashboard/trajectory-compare";
import {
  trajectoryIndexSchema,
  trajectorySchema,
} from "../src/dashboard/trajectories-data";
withData("runs/core-10day-live/trajectories").describe("archive-backed tests", () => {
  let options: ReturnType<typeof comparisonOptions>;
  beforeAll(async () => {
  const index = trajectoryIndexSchema.parse(
    JSON.parse(
      await readFile(
        new URL("../../runs/core-10day-live/trajectories/index.json", import.meta.url),
        "utf8",
      ),
    ),
  );
  options = comparisonOptions(
    index.tasks.filter((task) => task.workflow === "W4"),
  );
  });
  describe("recorded trajectory comparison", () => {
    it("prefers the newest saved same-task baseline", () => {
      const recorded = options.find(o => o.entry.persona === 'P3');
      if(!recorded)throw Error('Missing recorded trajectory');
      const baseline = {...recorded, key: recorded.key + ':baseline', source: 'baseline' as const};
      recorded.task = {...recorded.task, baseline: {...recorded.task, simulationSeed: 1}};
      const pair = defaultComparison([recorded, baseline], "paired");
      expect(pair?.right.key).toBe(recorded.key);
      expect(pair?.left.key).toBe(baseline.key);
      expect(pair?.left.entry.patient.syntheaId).toBe(pair?.right.entry.patient.syntheaId);
    });
    it("chooses earliest rev 0 and the latest day on the newest revision", () => {
      const pair = defaultComparison(options, "cross-day");
      expect(pair?.left.entry.programVersion).toBe(0);
      expect(pair?.left.entry.day).toBe(1);
      expect(pair?.right.entry.programVersion).toBe(4);
      expect(pair?.right.entry.day).toBe(10);
    });
    it("prefers matching scheduled choices in the earliest day", () => {
      const candidate = options.find(
        (option) =>
          option.source === "recorded" &&
          option.entry.day === 1 &&
          !option.key.endsWith("001"),
      );
      const current = defaultComparison(options, "cross-day")?.right;
      if (!candidate || !current) throw new Error("Missing archive fixture");
      const signatures = new Map([
        [candidate.key, "same choices"],
        [current.key, "same choices"],
      ]);
      expect(defaultComparison(options, "cross-day", signatures)?.left.key).toBe(
        candidate.key,
      );
    });
    it("honors revision entry points and preserves unavailable pixels", async () => {
      expect(
        defaultComparison(options, "cross-day", new Map(), undefined, 2)?.right
          .entry.programVersion,
      ).toBe(2);
      const option = options[0];
      if (!option) throw new Error("Missing archive fixture");
      const task = trajectorySchema.parse(
        JSON.parse(
          await readFile(
            new URL(
              `../../runs/core-10day-live/trajectories/${option.entry.file}`,
              import.meta.url,
            ),
            "utf8",
          ),
        ),
      );
      const entry = {...option.entry, metrics: {...option.entry.metrics, scrollPx: undefined, mouseTravelPx: undefined}};
      expect(comparisonMetrics(task, entry)).toEqual({
        clicks: 18,
        scrolls: 12,
        keys: 40,
        screens: 5,
        scrollPx: null,
        mouseTravelPx: null,
      });
    });
  });

});
