/** Isolated service process shared by the app and browser draft regressions. */
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { host } from './helpers.ts';
import { migrate } from '../src/store.ts';
import { draftsFixture } from './drafts-fixture.ts';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const f = draftsFixture(`live-drafts-${randomUUID()}`);
let now = Date.now();
const a = await host(process.env.DATABASE_URL, f.config, 0, () => now);
// Test-only process controls; no HTTP route can mutate clocks or streams.
process.on('message', message => {
  void (async () => {
    const { id, advanceMs, changePatient } = z.object({ id: z.number(), advanceMs: z.number().optional(), changePatient: z.string().optional() }).parse(message);
    if (advanceMs) now += advanceMs;
    if (changePatient) await a.db.query('UPDATE commit_streams SET version=version+1 WHERE tenant=$1 AND key=$2', [f.config.tenant, `patient:${changePatient}`]);
    process.send?.({ id });
  })();
});
let stopping = false;
async function close() {
  if (stopping) return;
  stopping = true;
  for (const table of ['commit_draft_checkpoints', 'commit_requests', 'commit_sessions', 'commit_events', 'commit_streams'])
    await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [f.config.tenant]);
  await a.close();
  if (process.connected) process.disconnect();
}
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { void close(); });
try {
  await migrate(a.db);
  for (const patient of f.patients) await a.store.importPatient(patient);
  process.stdout.write(JSON.stringify({ base: a.base, token: f.actor.token, spec: f.spec, program: f.program,
    directory: await a.store.directory(f.actor) }) + '\n');
} catch (error) { await close(); throw error; }
