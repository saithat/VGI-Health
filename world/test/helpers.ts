import { join } from "node:path";
import { loadPopulation } from "../src/patients";
import type { DaySchedule, Persona, Task } from "../src/schema";
import { PERSONAS } from "../src/schema";
import { type WorldRun, generateWorld } from "../src/world";

export const FIXTURE_INDEX = join(__dirname, "fixtures", "index.json");
export const DAYS = 10;

const cache = new Map<number, WorldRun>();

/** Generate (and cache) a 10-day run on the hand-written fixture population. */
export function run(seed: number): WorldRun {
  const hit = cache.get(seed);
  if (hit !== undefined) return hit;
  const r = generateWorld(seed, DAYS, loadPopulation(FIXTURE_INDEX).patients);
  cache.set(seed, r);
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
