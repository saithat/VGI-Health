/** Add dev secrets without replacing another lane's .env keys. Never print them. */
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const path = new URL('../../.env', import.meta.url);
let env = await readFile(path, 'utf8').catch(e => { if (e.code === 'ENOENT') return ''; throw e; });
for (const key of ['KEYCLOAK_ADMIN_PASSWORD', 'KEYCLOAK_PERSONA_PASSWORD', 'KEYCLOAK_4WEST_PASSWORD']) {
  if (!new RegExp(`^${key}=.+$`, 'm').test(env)) env += `\n${key}=${randomBytes(32).toString('hex')}\n`;
}
await writeFile(path, env, { mode: 0o600 });
await chmod(path, 0o600);
process.stdout.write('Dev secrets ready in the untracked .env. Existing values preserved.\n');

for (const [key, value] of Object.entries({ DATABASE_URL: 'postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit', COMMIT_BASE_URL: 'http://127.0.0.1:18090', COMMIT_INTERNAL_URL: 'http://127.0.0.1:18090', KEYCLOAK_ISSUER: 'http://localhost:18180/realms/vgi', VITE_KEYCLOAK_ISSUER: 'http://localhost:18180/realms/vgi' })) {
  if (!new RegExp(`^${key}=.+$`, 'm').test(env)) env += `\n${key}=${value}\n`;
}
await writeFile(path, env, { mode: 0o600 });
