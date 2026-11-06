// @vitest-environment node
import { describe, expect, it } from "vitest";
import { selectDefaultRun, type RecordedRun } from "../scripts/runs-plugin";

const run = (
  id: string,
  overrides: Partial<RecordedRun> = {},
): RecordedRun => ({
  id,
  files: [],
  real: id !== "mock",
  days: 10,
  createdAt: "2026-10-31T12:00:00Z",
  replayable: true,
  ...overrides,
});
describe("default recorded demo", () => {
  it("prefers a real replay to authored data and skips incomplete real runs", () => {
    expect(selectDefaultRun([run("mock"), run("real", { days: 2 })], "")).toBe(
      "real",
    );
    expect(
      selectDefaultRun(
        [run("mock"), run("unstarted", { days: 0, replayable: false })],
        "",
      ),
    ).toBe("mock");
  });
  it("chooses the newest real recording before recording length", () => {
    expect(
      selectDefaultRun(
        [
          run("short", { days: 2 }),
          run("older"),
          run("latest", { createdAt: "2026-11-01T00:00:00Z" }),
        ],
        "",
      ),
    ).toBe("latest");
  });
  it("prefers a newer short real run to an older long one", () => {
    expect(
      selectDefaultRun(
        [
          run("long", { days: 10 }),
          run("newest", { days: 2, createdAt: "2026-11-01T00:00:00Z" }),
          run("mock", { createdAt: "2026-12-01T00:00:00Z" }),
        ],
        "",
      ),
    ).toBe("newest");
  });
  it("shows an empty prefix when a new real run has no completed day yet", () => {
    expect(
      selectDefaultRun([run("starting", { days: 0, replayable: false })], ""),
    ).toBe("starting");
  });
  it("honors explicit overrides and fails for unavailable recordings", () => {
    expect(selectDefaultRun([run("real"), run("mock")], "mock")).toBe("mock");
    expect(() => selectDefaultRun([run("mock")], "missing")).toThrow(
      "not a replayable recorded run",
    );
    expect(() => selectDefaultRun([], "")).toThrow(
      "No replayable recorded runs",
    );
  });
});

it("keeps generated day digests out of clinician result collections", async () => {
  const { isDayResultFile } = await import("../src/browser/run-files");
  for (const scope of ["days", "baselines", "no-agent/days"]) {
    expect(isDayResultFile(`${scope}/day-01/P3.json`)).toBe(true);
    expect(isDayResultFile(`${scope}/day-01/digest.json`)).toBe(false);
  }
  expect(isDayResultFile("manifest.json")).toBe(false);
});
