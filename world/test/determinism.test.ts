import { describe, expect, it } from "vitest";
import { loadPopulation } from "../src/patients";
import { generateWorld } from "../src/world";
import { FIXTURE_INDEX } from "./helpers";

describe("determinism", () => {
  const patients = loadPopulation(FIXTURE_INDEX).patients;

  it("same seed gives byte-identical schedules and states", () => {
    const a = generateWorld(1, 10, patients);
    const b = generateWorld(1, 10, loadPopulation(FIXTURE_INDEX).patients);
    expect(JSON.stringify(a.days)).toBe(JSON.stringify(b.days));
    expect(JSON.stringify(a.initial)).toBe(JSON.stringify(b.initial));
  });

  it("different seeds give different worlds", () => {
    const a = generateWorld(1, 3, patients);
    const b = generateWorld(2, 3, patients);
    expect(JSON.stringify(a.days.map((d) => d.schedules))).not.toBe(JSON.stringify(b.days.map((d) => d.schedules)));
  });

  it("day d does not depend on how many days are generated", () => {
    const short = generateWorld(3, 4, patients);
    const long = generateWorld(3, 8, patients);
    expect(JSON.stringify(short.days)).toBe(JSON.stringify(long.days.slice(0, 4)));
  });

  it("each day is seeded from the previous world state", () => {
    const r = generateWorld(1, 3, patients);
    const seeds = r.days.map((d) => d.state.daySeed);
    expect(new Set(seeds).size).toBe(3);
    for (const d of r.days) expect(d.state.prevStateHash).toMatch(/^[0-9a-f]{14}$/);
  });

  it("does not mutate the input population", () => {
    const before = JSON.stringify(patients);
    generateWorld(5, 2, patients);
    expect(JSON.stringify(patients)).toBe(before);
  });
});
