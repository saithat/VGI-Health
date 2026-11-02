/** Isolated real service for the browser suite. No test-only HTTP routes. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { configSchema, importSchema } from '../src/types.ts';
import { migrate } from '../src/store.ts';
import { host } from './helpers.ts';
const dir = process.argv[2];
const config = configSchema.parse(JSON.parse(await readFile(resolve(dir, 'mar-config.json'), 'utf8')));
config.tenant = `mar-e2e-${randomUUID()}`;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const service = await host(process.env.DATABASE_URL, config, 8091);
let stopping = false;
async function close() {
  if (stopping) return;
  stopping = true;
  for (const table of ['commit_mar_cosigns', 'commit_events', 'commit_requests', 'commit_sessions', 'commit_streams'])
    await service.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [config.tenant]);
  await service.close();
}
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { void close(); });
try {
  await migrate(service.db);
  await service.store.importPatient(importSchema.parse(JSON.parse(await readFile(resolve(dir, 'mar-patient.json'), 'utf8'))));
  process.stdout.write('MAR_E2E_READY\n');
} catch (e) { await close(); throw e; }
