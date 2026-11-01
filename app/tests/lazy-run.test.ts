import { describe, expect, it } from "vitest";
import { loadRunSummary, loadRunDetails } from "../src/dashboard/data";
import { versionsFor } from "../src/dashboard/workload";

describe("dashboard loading budget", () => {
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
