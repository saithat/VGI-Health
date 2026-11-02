import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { configSchema, importSchema } from './types.ts';
import { migrate, pool, Store } from './store.ts';
import { Lean } from './lean.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const db = pool(url);
const lean = new Lean(resolve(process.env.EHR_BIN ?? '../../lean/.lake/build/bin/ehr'));
try {
  if (process.argv[2] === 'migrate') await migrate(db);
  else if (process.argv[2] === 'import' && process.argv[3]) {
    const config = configSchema.parse(JSON.parse(await readFile(process.env.COMMIT_CONFIG!, 'utf8')));
    const patient = importSchema.parse(JSON.parse(await readFile(process.argv[3], 'utf8')));
    await new Store(db, lean, config).importPatient(patient);
  } else throw new Error('usage: manage.ts migrate | import patient.json');
} finally { lean.close(); await db.end(); }
