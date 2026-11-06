import { withData } from "./data";
// @vitest-environment node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect } from "vitest";
import { recheckRevision } from "../scripts/recheck-revision";
const digest = async (file: string) =>
  createHash("sha256")
    .update(await readFile(resolve("..", file)))
    .digest("hex");
describe("real native check-only history", () => {
  withData("runs/core-10day-live").it("checks a current baseline and an old revision without changing recorded artifacts", async () => {
    const files = [
      "releases/v3/personas/P1.json",
      "runs/core-10day-live/programs/P3/v0.json",
      "runs/core-10day-live/manifest.json",
      "runs/core-10day-live/decisions/night-05/P3.json",
    ];
    const before = await Promise.all(files.map(digest));
    const baseline = await recheckRevision(files[0] ?? "", "P1");
    expect(baseline).toEqual({
      release: "v3",
      checkOnly: true,
      verdict: "ok",
      reason: null,
    });
    const old = await recheckRevision(files[1] ?? "", "P3");
    expect(old.checkOnly).toBe(true);
    expect(old.verdict).not.toBe("ok");
    expect(await Promise.all(files.map(digest))).toEqual(before);
  }, 60000);
  withData("fixtures", "programs", "runs").it("refuses arbitrary files, another persona and authored mock revisions", async () => {
    await expect(recheckRevision("../../etc/passwd", "P3")).rejects.toThrow(
      "Choose a recorded revision",
    );
    await expect(
      recheckRevision("releases/v3/personas/P1.json", "P3"),
    ).rejects.toThrow("Choose a recorded revision");
    await expect(
      recheckRevision("runs/mock/programs/P3/v1.json", "P3"),
    ).rejects.toThrow("Choose a recorded revision");
  }, 60000);
});
