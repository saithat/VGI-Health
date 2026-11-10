import { join } from "node:path";
import { loadPopulation } from "../src/patients";
import type { DaySchedule, Persona, Task } from "../src/schema";
import { PERSONAS } from "../src/schema";
import { type WorldRun, generateWorld } from "../src/world";

export const FIXTURE_INDEX = join(__dirname, "fixtures", "index.json");
export const SYNTHEA_INDEX = join(__dirname, "../../fixtures/synthea/index.json");
export const DAYS = 10;

const cache = new Map<string, WorldRun>();

/** Generate (and cache) a 10-day run on the hand-written fixture population. */
export function run(seed: number, index = FIXTURE_INDEX): WorldRun {
  const key = `${index}:${seed}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const r = generateWorld(seed, DAYS, loadPopulation(index).patients, undefined, { workflows: "realistic" });
  cache.set(key, r);
  return r;
}

export function schedule(r: WorldRun, day: number, persona: Persona): DaySchedule {
  const d = r.days[day - 1];
  if (d === undefined) throw new Error(`no day ${day}`);
  return d.schedules[persona];
}

export function allTasks(r: WorldRun): Task[] {
  return r.days.flatMap((d) => PERSONAS.flatMap((p) => d.schedules[p].tasks));
}

export function stateOf(r: WorldRun, day: number) {
  if (day === 0) return r.initial;
  const d = r.days[day - 1];
  if (d === undefined) throw new Error(`no day ${day}`);
  return d.state;
}
