import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPopulation } from "../src/patients";
import { generateWorld } from "../src/world";
import { runFrozenWard } from "./frozen-ward";
import { dataReason } from "./data";
import { FIXTURE_INDEX } from "./helpers";

it("defaults to realistic workflows and retains an explicit legacy opt-out", () => {
  const patients = loadPopulation(FIXTURE_INDEX).patients;
  const realistic = generateWorld(7, 2, patients);
  expect(realistic.days).toEqual(generateWorld(7, 2, patients, undefined, {workflows:"realistic"}).days);
  const tasks = realistic.days.flatMap(d => Object.values(d.schedules).flatMap(s => s.tasks));
  expect(tasks.some(t => t.workflowPlan?.kind === "refill")).toBe(true);
  expect(tasks.some(t => t.choices.administer.some(o => o.administration?.windowStartMin != null))).toBe(true);
  expect(generateWorld(7, 2, patients, undefined, {workflows:"legacy"}).days).not.toEqual(realistic.days);
});

const missing = dataReason("fixtures/synthea/index.json", "runs/world/1/snapshot.json", "runs/world/2/snapshot.json",
  "runs/world/1-library-legacy/snapshot.json", "runs/world/2-library-legacy/snapshot.json");
describe.skipIf(Boolean(missing))(`frozen library snapshots${missing ? ` (${missing})` : ""}`, () => {
  it.each([1, 2])("matches realistic world %i and reproduces the preserved library output byte-for-byte in legacy mode", version => {
    const patients = loadPopulation(join(import.meta.dirname, "../../fixtures/synthea/index.json")).patients;
    const ward = version === 1 ? runFrozenWard : undefined;
    for (const legacy of [false, true]) {
      const run = generateWorld(1, 10, patients, legacy ? ward : undefined, legacy ? {workflows:"legacy"} : {});
      const actual = JSON.stringify({initial:run.initial,days:run.days}, null, 2) + "\n";
      const file = join(import.meta.dirname, `../../runs/world/${version}${legacy ? "-library-legacy" : ""}/snapshot.json`);
      expect(actual).toBe(readFileSync(file, "utf8"));
      if(legacy) expect(createHash("sha256").update(actual).digest("hex")).toBe(version === 1
        ? "cfe40be2d728de6b3c8c1c5310f5b2408854dc06a76ec1e24d8de1d01460e056"
        : "2347fd74c46c86e563f367567174374ce8ddeea7c81c5e8579bb1f47594af5a7");
    }
  });
});
