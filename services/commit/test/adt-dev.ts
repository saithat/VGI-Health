/** Synthetic 4 West/ADT provisioning inputs. Charts/config live only in scratch. */
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { fixture, patient } from './helpers.ts';
import { configSchema } from '../src/types.ts';
const dir = resolve(process.argv[2] ?? process.env.TMPDIR!);
execFileSync(process.execPath, ['--experimental-strip-types', fileURLToPath(new URL('mar-dev.ts', import.meta.url)), dir], { env: process.env });
const config = JSON.parse(await readFile(resolve(dir, 'mar-config.json'), 'utf8'));
config.tenant = process.env.ADT_TENANT ?? 'adt-4west-dev';
config.units = { '4-west': { name: '4 West', marOnService: true }, '5-east': { name: '5 East', marOnService: false } };
config.adt = { patients: ['mar-patient', 'adt-patient'], beds: [{ id: 401, unit: '4-west' }, { id: 402, unit: '4-west' }] };
config.releases.nurse.workflows.dose.mar.unit = '4-west';
const subjects = JSON.parse(await readFile(process.env.KEYCLOAK_SUBJECTS ?? new URL('../../../.cache/commit/keycloak-subjects.json', import.meta.url), 'utf8'));
for (const [n, name, role, adtRoles] of [
  [101, '4west-rn1', 'rn', []], [102, '4west-rn2', 'rn', []],
  [201, 'bed-manager', 'bedManager', ['bedManager']], [202, 'charge-4west', 'rn', ['chargeNurse']],
  [203, 'admitting-clerk', 'admittingClerk', ['admittingClerk']],
] as const) config.actors.push({ subject: subjects[name], user: { id: name, role }, modelId: n,
  patients: ['mar-patient', 'adt-patient'], units: ['4-west'], adtRoles });
await writeFile(resolve(dir, 'adt-config.json'), JSON.stringify(configSchema.parse(config), null, 2));
await writeFile(resolve(dir, 'adt-patient.json'), JSON.stringify(patient(await fixture(), 'adt-patient', 2), null, 2));
console.log(`Synthetic ADT/4 West inputs: ${dir}`);
