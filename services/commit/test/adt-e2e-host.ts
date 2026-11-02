/** Real isolated ADT browser service; no test-only HTTP routes. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { configSchema, importSchema } from '../src/types.ts';
import { AdtStore } from '../src/adt.ts';
import { migrate } from '../src/store.ts';
import { host } from './helpers.ts';
const dir = process.argv[2];
const config = configSchema.parse(JSON.parse(await readFile(resolve(dir, 'adt-config.json'), 'utf8')));
config.tenant = `adt-e2e-${randomUUID()}`;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const service = await host(process.env.DATABASE_URL, config, 8091);
let stopping = false;
async function close() {
  if (stopping) return;
  stopping = true;
  for (const table of ['commit_mar_cosigns', 'commit_events', 'commit_requests', 'commit_sessions', 'commit_streams']) await service.db.query(`DELETE FROM ${table} WHERE tenant=$1`, [config.tenant]);
  await service.close();
}
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { void close(); });
try {
  await migrate(service.db);
  for (const file of ['mar-patient.json', 'adt-patient.json']) await service.store.importPatient(importSchema.parse(JSON.parse(await readFile(resolve(dir, file), 'utf8'))));
  await new AdtStore(service.store).provision();
  process.stdout.write('ADT_E2E_READY\n');
} catch (e) { await close(); throw e; }
