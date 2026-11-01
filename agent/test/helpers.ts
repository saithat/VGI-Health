import { mkdtemp } from 'node:fs/promises';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { EhrClient } from '../src/ehr.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { writeFakeWorld } from '../src/fake/world.js';
import { llmRecordSchema, type LlmRecord } from '../src/backends/recording.js';

export async function tmp(prefix: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), `agent-test-${prefix}-`));
}

export async function fakeWorld(days: number): Promise<string> {
  const dir = await tmp('world');
  return writeFakeWorld(dir, { days, seed: 7 });
}

export const LEAK_MARKER = 'LEAKCHECK-day-';

/**
 * Fake ehr whose every DayResult carries a marker complaint naming its day.
 * Complaints flow into train summaries, so a marker for day k appearing in a
 * night-d prompt with k > d would be a validation/test leak.
 */
export function markingEhr(): EhrClient {
  const inner = createFakeEhr();
  return {
    ...inner,
    async simulate(input) {
      const res = await inner.simulate(input);
      return { ...res,tasks:res.tasks.map(t=>({...t,scrollPx:t.scrolls*100,mouseTravelPx:1000})), complaints: [...res.complaints, `${LEAK_MARKER}${input.schedule.day}`] };
    },
  };
}

export function readLlmRecords(runDir: string): LlmRecord[] {
  const out: LlmRecord[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = path.join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.json') && !name.endsWith('.request.json') && !name.endsWith('.error.json')) out.push(llmRecordSchema.parse(JSON.parse(readFileSync(p, 'utf8'))));
    }
  };
  walk(path.join(runDir, 'llm'));
  return out;
}
