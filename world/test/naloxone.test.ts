import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getString } from "../src/json";
import { naloxoneEvidence, withNaloxoneResponses } from "../src/naloxone";
import type { DaySchedule } from "../src/schema";
import { allTasks, FIXTURE_INDEX, run, SYNTHEA_INDEX } from "./helpers";
import { dataReason } from "./data";

const root = resolve(import.meta.dirname, "../..");
const nativeInput = process.env.VGI_NALOXONE_BIN ?? join(root, "lean/.lake/build/bin/ehr.rsp");
const spec = join(root, "releases/v1/spec.json");

for (const index of [FIXTURE_INDEX, SYNTHEA_INDEX]) {
  const missing = dataReason(index, nativeInput);
  describe.skipIf(Boolean(missing))(`native naloxone eligibility (${index})${missing ? ` (${missing})` : ""}`, () => {
    it("gives every required task its own answer, and maps acceptance to prescription and education", () => {
      const dir = mkdtempSync(join(tmpdir(), "naloxone-"));
      let required = 0;
      const responses = new Set<string>();
      try {
        // Check every task in all five personas on the first two generated
        // days, including ED once orders, surgical facility orders and refills.
        for (const day of run(1, index).days.slice(0, 2)) for (const schedule of Object.values(day.schedules)) {
          const path = join(dir, "schedule.json");
          writeFileSync(path, JSON.stringify(schedule));
          const before = naloxoneEvidence(spec, path, index);
          const finalized = withNaloxoneResponses(schedule, before, 1);
          expect(withNaloxoneResponses(schedule, before, 1)).toEqual(finalized);
          writeFileSync(path, JSON.stringify(finalized));
          const after = naloxoneEvidence(spec, path, index);
          expect(after.map(r => r.required)).toEqual(before.map(r => r.required));
          for (const [i, row] of after.entries()) {
            const task = finalized.tasks[i];
            if (task === undefined) throw new Error(`missing task ${row.task}`);
            const observations = task.todayResources.filter(r => getString(r, "code", "coding", 0, "code") === "naloxoneOffer");
            expect(observations.length, row.task).toBe(row.required ? 1 : 0);
            if (!row.required) continue;
            required++;
            expect(["accepted", "declined"], row.task).toContain(row.response);
            if (row.response === null) throw new Error(`missing response ${row.task}`);
            responses.add(row.response);
            const documentation = row.documentation;
            expect(documentation).toContainEqual(["naloxoneOffer", {code: {c: row.response === "accepted" ? "prescribed" : "offered-declined"}}]);
            expect(documentation).toContainEqual(["naloxoneEducation", {flag: {b: true}}]);
          }
        }
        expect(required).toBeGreaterThan(0);
        expect(responses).toEqual(new Set(["accepted", "declined"]));
      } finally { rmSync(dir, { recursive: true, force: true }); }
    }, 120_000);
  });
}

it("refuses missing, duplicate or surplus native evidence", () => {
  const task = allTasks(run(1))[0];
  if (task === undefined) throw new Error("missing fixture task");
  const schedule: DaySchedule = {day: 1, persona: task.persona, load: "normal", tasks: [task]};
  const row = {task: task.id, required: true, response: null, currentMedClasses: [], lines: [], documentation: []};
  expect(() => withNaloxoneResponses(schedule, [], 1)).toThrow();
  expect(() => withNaloxoneResponses(schedule, [row, row], 1)).toThrow();
  expect(() => withNaloxoneResponses(schedule, [{...row, task: "other"}], 1)).toThrow();
});

it("finalizes CLI schedules, aliases and continuous horizons with the same answers", (context) => {
  // The CLI's list context draws extra patients from the local synthetic hospital, as in cli.test.ts.
  const reason = dataReason("fixtures/synthetic-hospital", nativeInput);
  if (reason) context.skip(reason);
  const dir = mkdtempSync(join(tmpdir(), "naloxone-cli-"));
  try {
    execFileSync(join(root, "world/node_modules/.bin/tsx"), [join(root, "world/src/cli.ts"),
      "--fixtures", FIXTURE_INDEX, "--days", "1", "--seed", "1", "--case-mix", "legacy",
      "--note-text", "legacy", "--adt", "off", "--out", dir, "--quiet"],
      { cwd: root, stdio: "pipe", timeout: 120_000 });
    const read = (file: string) => JSON.parse(readFileSync(join(dir, file), "utf8"));
    expect(read("manifest.json").naloxoneProtocol).toBe("native-task-goals-v1");
    for (const p of ["P1", "P2", "P3", "P4", "P5"]) {
      const schedule = read(`day-1-${p}.json`);
      expect(read(`schedules/day-01/${p}.json`)).toEqual(schedule);
      expect(read(`horizon-${p}.json`).tasks).toEqual(schedule.tasks);
      const rows = naloxoneEvidence(spec, join(dir, `day-1-${p}.json`), dir);
      expect(rows.filter(row => row.required).every(row => row.response !== null && ["accepted", "declined"].includes(row.response))).toBe(true);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}, 120_000);
