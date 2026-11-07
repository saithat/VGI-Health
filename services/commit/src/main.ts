import { configSchema, required } from './types.ts';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { pool, Store } from './store.ts';
import { Lean } from './lean.ts';
import { Notifications, server } from './http.ts';

const config = configSchema.parse(JSON.parse(await readFile(required(process.env.COMMIT_CONFIG), 'utf8')));
if (config.oidc && process.env.KEYCLOAK_JWKS_URL) config.oidc.jwksUrl = process.env.KEYCLOAK_JWKS_URL;
const url = required(process.env.DATABASE_URL);
if (!url) throw new Error('DATABASE_URL is required');
const db = pool(url);
const lean = new Lean(resolve(process.env.EHR_BIN ?? '../../lean/.lake/build/bin/ehr'));
const notifications = new Notifications(url);
await notifications.start();
const app = server(new Store(db, lean, config), notifications);
app.http.listen(Number(process.env.PORT ?? 8090), process.env.HOST ?? '127.0.0.1', () => {
  process.stdout.write(`Commit service listening on ${JSON.stringify(app.http.address())}\n`);
});
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => {
  if (stopping) return;
  stopping = true;
  await app.close();
  await notifications.close();
  lean.close();
  await db.end();
});
