import { withData } from "./data";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  loadRunSummary,
  loadRunDetails,
  programAt,
} from "../src/dashboard/data";
import { versionsFor } from "../src/dashboard/workload";

describe("dashboard loading budget", () => {
  withData("runs/core-10day-live").it("keeps paired/control measurements in the summary and hydrates original source for one persona", async () => {
    const recorded = JSON.parse(
      await readFile(
        resolve(import.meta.dirname, "../../runs/core-10day-live/days/day-01/P3.json"),
        "utf8",
      ),
    );
    const source = JSON.parse(
      await readFile(
        resolve(import.meta.dirname, "../../runs/core-10day-live/programs/P3/v0.json"),
        "utf8",
      ),
    );
    const thin = { ...recorded, trace: [] };
    const run = await loadRunSummary("sample", async () => ({
      manifest: {
        runId: "sample",
        days: 1,
        personas: ["P3"],
        ehr: { mode: "real" },
      },
      records: [],
      days: [thin],
      baselines: [thin],
      noAgentDays: [thin],
      complexity: null,
      files: [
        "programs/P3/v0.json",
        "programs/P3/v0.source.json",
        "programs/P1/v0.json",
        "baselines/day-01/P3.json",
      ],
    }));
    expect(run.baselines?.[0]?.tasks).toEqual(run.days[0]?.tasks);
    expect(run.noAgentDays?.[0]?.trace).toEqual([]);
    const paths: string[] = [];
    const detail = await loadRunDetails(run, "P3", async (path) => {
      paths.push(path);
      return {
        ...source,
        id: path.endsWith(".source.json") ? "original-source" : "compiled",
      };
    });
    expect(paths).toEqual([
      "/runs/sample/programs/P3/v0.json",
      "/runs/sample/programs/P3/v0.source.json",
    ]);
    expect(detail.programs.get("programs/P3/v0.json")?.id).toBe("compiled");
    expect(programAt(detail, "P3", 0).id).toBe("original-source");
    expect(run.programs.size).toBe(0);
  });
  it("loads one summary and lists versions without fetching programs, traces or replay contexts", async () => {
    const calls: string[] = [];
    const run = await loadRunSummary("sample", async (path) => {
      calls.push(path);
      return {
        manifest: {
          runId: "sample",
          days: 1,
          personas: ["P3"],
          ehr: { mode: "real" },
        },
        records: [],
        days: [],
        complexity: null,
        files: [
          "programs/P3/v0.json",
          "programs/P3/v1.json",
          "programs/P1/v0.json",
          "replay.json",
        ],
      };
    });
    expect(calls).toEqual(["/runs/sample/summary.json"]);
    expect(versionsFor(run, "P3")).toEqual([0, 1]);
    expect(run.programs.size).toBe(0);
    expect(run.replay).toBeNull();
  });
  it("rejects a summary for another run", async () => {
    await expect(
      loadRunSummary("sample", async () => ({
        manifest: {
          runId: "wrong",
          days: 1,
          personas: [],
          ehr: { mode: "real" },
        },
        records: [],
        days: [],
        complexity: null,
        files: [],
      })),
    ).rejects.toThrow("another run");
  });
  withData("runs/core-10day-live").it("hydrates the selected persona's day traces only when details open", async () => {
    const recorded = JSON.parse(
      await readFile(
        resolve(import.meta.dirname, "../../runs/core-10day-live/days/day-01/P3.json"),
        "utf8",
      ),
    );
    const run = await loadRunSummary("core-10day-live", async () => ({
      manifest: {
        runId: "core-10day-live",
        days: 1,
        personas: ["P3"],
        ehr: { mode: "real" },
      },
      records: [],
      days: [{ ...recorded, trace: [] }],
      complexity: null,
      files: ["days/day-01/P3.json", "days/day-01/P1.json"],
    }));
    const paths: string[] = [];
    const detail = await loadRunDetails(run, "P3", async (path) => {
      paths.push(path);
      return recorded;
    });
    expect(paths).toEqual(["/runs/core-10day-live/days/day-01/P3.json"]);
    expect(run.days[0]?.trace).toEqual([]);
    expect(detail.days[0]?.trace.length).toBeGreaterThan(0);
  });
  it("keeps already hydrated test runs without additional I/O", async () => {
    const run = {
      manifest: {
        runId: "sample",
        days: 1,
        personas: [],
        ehr: { mode: "real" as const },
      },
      records: [],
      days: [],
      programs: new Map(),
      certs: new Map(),
      complexity: null,
      replay: null,
    };
    expect(
      await loadRunDetails(run, "P3", async () => {
        throw new Error("unexpected request");
      }),
    ).toBe(run);
  });
});
