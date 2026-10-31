/**
 * FAKE world generator (tests / offline smoke runs only). Writes the assumed
 * world layout (see src/world.ts) with five personas and small schedules.
 * Task ids embed the day (`d03-P1-t02`) so tests can detect any leak of
 * validation/test-day data into prompts.
 */
import path from 'node:path';
import type { DaySchedule, PersonaParams, Task, Workflow } from '../schema.js';
import { pad2, rng, writeJson } from '../util.js';

export const FAKE_PERSONAS: PersonaParams[] = [
  { id: 'P1', role: 'physician', keyboardShare: 80, reviewsAllergiesEarly: true, scansSidebar: true, backtrackRate: 60, searchWhenBuried: true, overrideRate: 700 },
  { id: 'P2', role: 'physician', keyboardShare: 20, reviewsAllergiesEarly: false, scansSidebar: false, backtrackRate: 30, searchWhenBuried: false, overrideRate: 850 },
  { id: 'P3', role: 'rn', keyboardShare: 10, reviewsAllergiesEarly: true, scansSidebar: true, backtrackRate: 90, searchWhenBuried: false, overrideRate: 400 },
  { id: 'P4', role: 'np', keyboardShare: 50, reviewsAllergiesEarly: true, scansSidebar: false, backtrackRate: 40, searchWhenBuried: true, overrideRate: 500 },
  { id: 'P5', role: 'surgeon', keyboardShare: 30, reviewsAllergiesEarly: false, scansSidebar: false, backtrackRate: 20, searchWhenBuried: false, overrideRate: 900 },
];

const MIX: Record<string, Workflow[]> = {
  P1: ['W1', 'W1', 'W1', 'W2', 'W7', 'W1', 'W7'],
  P2: ['W3', 'W3', 'W3', 'W3', 'W3'],
  P3: ['W4', 'W4', 'W4', 'W4', 'W4', 'W4'],
  P4: ['W5', 'W5', 'W5', 'W5'],
  P5: ['W6', 'W6', 'W1', 'W6'],
};

const DRUGS = [
  { drug: '723', classes: 'antibiotic' }, // amoxicillin
  { drug: '29046', classes: 'ace-inhibitor' }, // lisinopril
  { drug: '1191', classes: 'nsaid' }, // aspirin
  { drug: '5640', classes: 'nsaid' }, // ibuprofen
  { drug: '2193', classes: 'antibiotic' }, // cefazolin
];

export function fakeSchedule(day: number, persona: string, seed: number): DaySchedule {
  const r = rng(seed * 1000 + day * 10 + Number(persona.slice(1)));
  const load = day % 3 === 0 ? 'busy' : day % 3 === 1 ? 'normal' : 'quiet';
  // Scripted event (BRIEF 9): P1 covers urgent care on day 5.
  const base = persona === 'P1' && day === 5 ? ['W3', 'W3', 'W1', 'W3', 'W7'] satisfies Workflow[] : (MIX[persona] ?? ['W1']);
  const extra = load === 'busy' ? 2 : load === 'quiet' ? -1 : 0;
  const n = Math.max(2, base.length + extra);
  const tasks: Task[] = [];
  for (let i = 0; i < n; i++) {
    const workflow = base[i % base.length] ?? 'W1';
    const d = DRUGS[Math.floor(r() * DRUGS.length)] ?? DRUGS[0];
    tasks.push({
      id: `d${pad2(day)}-${persona}-t${pad2(i + 1)}`,
      day,
      persona,
      workflow,
      patientId: `pt-${persona}-${pad2(day)}-${i + 1}`,
      startMin: i * 25,
      choices: {
        orders: d ? [{ drug: d.drug, doseTenths: 5000, unit: 'mg', route: 'PO', freq: 'BID', prn: false }] : [],
        administer: [],
        ackResult: workflow === 'W2',
        ...(workflow === 'W7' ? { refill: 'approve' } : {}),
        ...(workflow === 'W3' ? { disposition: 'discharge' } : {}),
        immunizations: [],
        noteSections: [],
      },
      todayResources: [],
      interruptions: Math.floor(r() * 3),
    });
  }
  return { day, persona, load, tasks };
}

export async function writeFakeWorld(dir: string, opts: { seed?: number; days?: number; personas?: string[] } = {}): Promise<string> {
  const seed = opts.seed ?? 7;
  const days = opts.days ?? 10;
  const personas = FAKE_PERSONAS.filter((p) => !opts.personas || opts.personas.includes(p.id));
  await writeJson(path.join(dir, 'world.json'), {
    seed, days, personas: personas.map((p) => p.id), users: Object.fromEntries(personas.map((p) => [p.id, `user-${p.id.toLowerCase()}`])), fake: true,
  });
  for (const p of personas) await writeJson(path.join(dir, 'personas', `${p.id}.json`), p);
  for (let day = 1; day <= days; day++) {
    for (const p of personas) {
      await writeJson(path.join(dir, 'schedules', `day-${pad2(day)}`, `${p.id}.json`), fakeSchedule(day, p.id, seed));
    }
  }
  return dir;
}
