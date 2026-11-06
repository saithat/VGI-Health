/** Additive dev realm migration. Never deletes/recreates the realm, replaces
 * existing passwords, or changes existing clinical persona roles. */
import { readFile, writeFile, chmod, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const envPath = new URL('../../.env', import.meta.url);
let env = await readFile(envPath, 'utf8');
const value = key => process.env[key] ?? env.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1];
let adminPassword = value('KEYCLOAK_ADMIN_PASSWORD');
if (!adminPassword) throw new Error('KEYCLOAK_ADMIN_PASSWORD required');
let password = value('KEYCLOAK_4WEST_PASSWORD');
if (!password) {
  password = randomBytes(32).toString('hex');
  env += `\nKEYCLOAK_4WEST_PASSWORD=${password}\n`;
  await writeFile(envPath, env, { mode: 0o600 }); await chmod(envPath, 0o600);
}
const base = process.env.KEYCLOAK_URL ?? 'http://localhost:18180';
const adminRealm = new URL((await fetch(`${base}/admin/`)).url).pathname.split('/')[2];
if (!adminRealm) throw new Error('Cannot discover the local administrative realm');
const response = await fetch(`${base}/realms/${adminRealm}/protocol/openid-connect/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'password', client_id: 'admin-cli', username: 'vgi-admin', password: adminPassword }) });
if (!response.ok) throw new Error(`Dev admin login failed (${response.status})`);
const { access_token: token } = await response.json();
async function api(path, method = 'GET', body) {
  const r = await fetch(`${base}/admin/realms/vgi${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!r.ok) throw new Error(`Keycloak ${method} ${path}: ${r.status}`);
  return r.status === 204 || r.status === 201 ? undefined : r.json();
}
const realm = JSON.parse(await readFile(new URL('vgi-realm.json', import.meta.url), 'utf8'));
const roleNames = ['bed-manager', 'charge-nurse', 'admitting-clerk'];
const roles = await api('/roles');
for (const name of roleNames) if (!roles.some(r => r.name === name)) await api('/roles', 'POST', { name });
let groups = await api('/groups');
if (!groups.some(g => g.name === '4-west-rn')) { await api('/groups', 'POST', { name: '4-west-rn' }); groups = await api('/groups'); }
const group = groups.find(g => g.name === '4-west-rn');
const rn = await api('/roles/rn');
await api(`/groups/${group.id}/role-mappings/realm`, 'POST', [rn]);
const clients = await api('/clients?clientId=vgi-mar');
const client = clients[0]; if (!client) throw new Error('Existing vgi-mar client missing');
const template = realm.clients[0];
await api(`/clients/${client.id}`, 'PUT', { ...client, redirectUris: [...new Set([...client.redirectUris, ...template.redirectUris])], webOrigins: [...new Set([...client.webOrigins, ...template.webOrigins])] });
const mappers = await api(`/clients/${client.id}/protocol-mappers/models`);
if (!mappers.some(m => m.name === 'units')) await api(`/clients/${client.id}/protocol-mappers/models`, 'POST', template.protocolMappers.find(m => m.name === 'units'));
// Units are an administrator-managed profile attribute. Without this profile
// declaration Keycloak drops the attribute; users must never edit their scope.
const profile = await api('/users/profile');
const unitAttribute = { name: 'units', displayName: 'Units', multivalued: true,
  permissions: { view: ['admin', 'user'], edit: ['admin'] }, validations: { length: { min: 1, max: 64 } } };
await api('/users/profile', 'PUT', { ...profile,
  attributes: [...profile.attributes.filter(a => a.name !== 'units'), unitAttribute] });
const subjects = {};
for (const user of realm.users.filter(u => u.attributes?.units)) {
  let [existing] = await api(`/users?username=${encodeURIComponent(user.username)}&exact=true`);
  if (!existing) {
    await api('/users', 'POST', { ...user, groups: undefined, credentials: [{ type: 'password', value: password, temporary: false }] });
    [existing] = await api(`/users?username=${encodeURIComponent(user.username)}&exact=true`);
  }
  subjects[user.username] = existing.id;
  // Preserve unrelated attributes/roles and all existing passwords.
  await api(`/users/${existing.id}`, 'PUT', { ...existing, attributes: { ...existing.attributes, units: ['4-west'] } });
  if (user.groups?.length) await api(`/users/${existing.id}/groups/${group.id}`, 'PUT');
  for (const name of user.realmRoles) await api(`/users/${existing.id}/role-mappings/realm`, 'POST', [await api(`/roles/${name}`)]);
}
const manifest = value('KEYCLOAK_SUBJECTS') ?? resolve(fileURLToPath(new URL('../../', import.meta.url)), value('COMMIT_DATA_DIR') ?? '.cache/commit', 'keycloak-subjects.json');
await mkdir(dirname(manifest), { recursive: true });
await writeFile(manifest, JSON.stringify(subjects, null, 2), { mode: 0o600 });
console.log(`Operator subject bindings: ${manifest}`);
console.log('Dev ADT roles, 4 West RN group/users, unit claims and redirects provisioned. Existing passwords retained.');
