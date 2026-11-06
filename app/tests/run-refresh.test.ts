import { afterEach, expect, it, vi } from "vitest";
import { watchRun } from "../src/dashboard/run-refresh";
import type { RunData } from "../src/dashboard/data";
const data = (status: string, day: number): RunData => ({
  manifest: {
    runId: "live",
    status,
    days: 3,
    daysCompleted: day,
    personas: ["P1"],
    ehr: { mode: "fake" },
  },
  records: [],
  days: [],
  programs: new Map(),
  certs: new Map(),
  replay: null,
  complexity: null,
});
afterEach(() => vi.useRealTimers());
it("refreshes a running run without reloading and stops when it finishes", async () => {
  vi.useFakeTimers();
  const load = vi
    .fn()
    .mockResolvedValueOnce(data("running", 1))
    .mockResolvedValueOnce(data("running", 2))
    .mockResolvedValueOnce(data("completed", 3));
  const update = vi.fn(),
    failed = vi.fn();
  const stop = watchRun("live", update, failed, load);
  await vi.advanceTimersByTimeAsync(0);
  expect(update.mock.calls[0]?.[0].manifest.daysCompleted).toBe(1);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(update.mock.calls[1]?.[0].manifest.daysCompleted).toBe(2);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(update.mock.calls[2]?.[0].manifest.daysCompleted).toBe(3);
  await vi.advanceTimersByTimeAsync(90_000);
  expect(load).toHaveBeenCalledTimes(3);
  expect(failed).not.toHaveBeenCalled();
  stop();
});
it("keeps finished recordings static and cancels stale replies on run switch", async () => {
  vi.useFakeTimers();
  const update = vi.fn();
  const load = vi.fn().mockResolvedValue(data("completed", 3));
  watchRun("live", update, vi.fn(), load);
  await vi.advanceTimersByTimeAsync(120_000);
  expect(load).toHaveBeenCalledTimes(1);
  let resolve!: (run: RunData) => void;
  const pending = new Promise<RunData>((r) => {
    resolve = r;
  });
  const stopped = vi.fn();
  const cancel = watchRun("other", stopped, vi.fn(), () => pending);
  cancel();
  resolve(data("running", 1));
  await vi.advanceTimersByTimeAsync(0);
  expect(stopped).not.toHaveBeenCalled();
});
it("retries transient reads without overlapping requests or discarding the prior update", async () => {
  vi.useFakeTimers();
  const load = vi
    .fn()
    .mockResolvedValueOnce(data("running", 1))
    .mockRejectedValueOnce(new Error("transient"))
    .mockResolvedValueOnce(data("completed", 2));
  const update = vi.fn(),
    failed = vi.fn();
  watchRun("live", update, failed, load);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(update).toHaveBeenCalledTimes(2);
  expect(failed).toHaveBeenCalledTimes(1);
  expect(load).toHaveBeenCalledTimes(3);
});

it("coalesces slow evidence across ticks and preserves the latest terminal status", async () => {
  vi.useFakeTimers();
  const first = {
    ...data("running", 1),
    files: ["conformance.json"],
    manifest: { ...data("running", 1).manifest, prefixKey: "same" },
  };
  const finished = {
    ...first,
    manifest: { ...first.manifest, status: "completed" },
  };
  const load = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(finished),
    update = vi.fn();
  let resolve!: (run: RunData) => void;
  const pending = new Promise<RunData>((r) => {
    resolve = r;
  });
  const evidence = vi.fn(() => pending);
  watchRun("live", update, vi.fn(), load, 30_000, evidence);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(evidence).toHaveBeenCalledTimes(1);
  resolve({ ...first, ruleConformance: null });
  await vi.advanceTimersByTimeAsync(0);
  expect(update.mock.calls.at(-1)?.[0].manifest.status).toBe("completed");
});
