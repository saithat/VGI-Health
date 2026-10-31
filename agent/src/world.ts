/**
 * World directory loader. ASSUMED layout (the world lane has not published
 * one yet; keep in sync with agent/STATUS.md):
 *
 *   runs/world/<seed>/world.json                 { seed, days, personas: ["P1",...], users?: {P1: "<userId>"} }
 *   runs/world/<seed>/personas/<P>.json          PersonaParams
 *   runs/world/<seed>/schedules/day-<NN>/<P>.json DaySchedule
 *   (patient bundles / facts: read by `ehr simulate --world <dir>` itself)
 *
 * Schedules for later days exist on disk because the world evolves
 * independently of the UI (BRIEF 8.3). The loop only hands them to the
 * simulator; days > d never reach a prompt at night d (BRIEF 8.4).
 */
import path from 'node:path';
import { z } from 'zod';
import { dayScheduleSchema, personaParamsSchema, type DaySchedule, type PersonaParams } from './schema.js';
import { pad2, readJson } from './util.js';

export const worldManifestSchema = z.object({
  seed: z.number().int(),
  days: z.number().int().positive(),
  personas: z.array(z.string()).min(1),
  users: z.record(z.string(), z.string()).optional(),
  fake: z.boolean().optional(),
});
export type WorldManifest = z.infer<typeof worldManifestSchema>;

export interface World {
  dir: string;
  manifest: WorldManifest;
  personas: Map<string, PersonaParams>;
  userId(persona: string): string;
  schedule(day: number, persona: string): Promise<DaySchedule | null>;
}

export async function loadWorld(dir: string): Promise<World> {
  const manifest = await readJson(path.join(dir, 'world.json'), worldManifestSchema);
  const personas = new Map<string, PersonaParams>();
  for (const id of manifest.personas) {
    personas.set(id, await readJson(path.join(dir, 'personas', `${id}.json`), personaParamsSchema));
  }
  const cache = new Map<string, DaySchedule | null>();
  return {
    dir,
    manifest,
    personas,
    userId: (persona) => manifest.users?.[persona] ?? persona,
    async schedule(day, persona) {
      const key = `${day}/${persona}`;
      if (!cache.has(key)) {
        const file = path.join(dir, 'schedules', `day-${pad2(day)}`, `${persona}.json`);
        try {
          cache.set(key, await readJson(file, dayScheduleSchema));
        } catch (e) {
          if (e instanceof Error && 'code' in e && e.code === 'ENOENT') cache.set(key, null);
          else throw e;
        }
      }
      return cache.get(key) ?? null;
    },
  };
}
