/** Isolated service process shared by the app and browser draft regressions. */
import { randomUUID } from 'node:crypto';
import { host } from './helpers.ts';
import { migrate } from '../src/store.ts';
import { draftsFixture } from './drafts-fixture.ts';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const f = draftsFixture(`live-drafts-${randomUUID()}`);
const a = await host(process.env.DATABASE_URL, f.config);
let stopping = false;
async function close() {
  if (stopping) return;
  stopping = true;
  for (const table of ['commit_requests', 'commit_sessions', 'commit_events', 'commit_streams'])
    await a.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [f.config.tenant]);
  await a.close();
}
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { void close(); });
try {
  await migrate(a.db);
  for (const patient of f.patients) await a.store.importPatient(patient);
  process.stdout.write(JSON.stringify({ base: a.base, token: f.actor.token, spec: f.spec, program: f.program,
    directory: await a.store.directory(f.actor) }) + '\n');
} catch (error) { await close(); throw error; }
