import { configSchema, maybeObj, maybeObjs, obj, objs, str, type Obj } from './types.ts';
import { z } from 'zod';

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { initialPatients, localReleases } from './bootstrap.ts';

import { pool, Store, migrate } from './store.ts';
import { AdtStore } from './adt.ts';
import { Lean } from './lean.ts';
const args = process.argv.slice(2);
const value = (key: string) => args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
const dir = resolve(process.env.COMMIT_DATA_DIR ?? '.cache/commit');
const patients = await initialPatients({ hospital: args.includes('--hospital') || process.env.SYNTHETIC_HOSPITAL === '1',
  world: value('--world'), day: Number(value('--day') ?? 1) });
const roles = ['physician','physician','rn','rn','np','surgeon'];
const personas = ['P1','P2','P3','RN2','P4','P5'];
const ids = patients.map(p => p.patient);
const releases = await localReleases();
const marProgram = structuredClone(obj(releases['P3-baseline']).program);
obj(marProgram).patientSelection = false;
const workflows: Record<string, unknown> = {};
let order = 0;
for (const p of patients) for (const e of objs(p.bundle.entry)) {
  const r = e.resource;
  if (obj(r).resourceType !== 'MedicationRequest' || obj(r).status !== 'active' || !maybeObj(obj(r).encounter)?.reference) continue;
  const times = z.array(z.string()).parse(maybeObj(maybeObjs(obj(r).dosageInstruction)?.[0]?.timing)?.event ?? []);
  if (!times.length) continue;
  const key = order++;
  for (const [n, scheduledTime] of times.entries()) workflows[`dose-${key}-${n}`] = { commit: 'administerMed', commits: ['chartAssessment'],
    shared: { kind: 'dose', order: key, occurrence: Math.floor(Date.parse(scheduledTime) / 60000) },
    mar: { unit: '4-west', patient: p.patient, medicationRequest: obj(r).id, encounter: str(obj(obj(r).encounter).reference).slice(10), scheduledTime } };
}
if (Object.keys(workflows).length) releases.mar = { spec: obj(releases.P3).spec, program: marProgram, workflows };
const bedResources = new Map<string, unknown>();
const boardPatients = patients.filter(p => objs(objs(p.bundle.entry)).some((e: Obj) => obj(e.resource).resourceType === 'Encounter' && ['IMP','EMER'].includes(String(maybeObj(obj(e.resource).class)?.code)) && ['in-progress','arrived','triaged'].includes(String(obj(e.resource).status)) && maybeObjs(maybeObj(obj(e.resource).meta)?.tag)?.length)).map(p => p.patient);
for (const p of patients) for (const e of objs(p.bundle.entry)) if (obj(e.resource).resourceType === 'Location' && maybeObjs(maybeObj(obj(e.resource).physicalType)?.coding)?.some((c: Obj) => c.code === 'bd')) bedResources.set(str(obj(e.resource).id), e.resource);
const beds = [...bedResources.keys()].sort().map((resource, i) => ({ id: i+1, resource, unit: '4-west' }));
if (boardPatients.length > 64 || beds.length > 64) throw new Error('Dated board exceeds the bounded ADT deployment; partition units explicitly');
const subjects = JSON.parse(await readFile(process.env.KEYCLOAK_SUBJECTS ?? resolve(dir, 'keycloak-subjects.json'), 'utf8'));
const operators = [
  ['4west-rn1','rn',[]], ['4west-rn2','rn',[]], ['bed-manager','bedManager',['bedManager']], ['charge-4west','rn',['chargeNurse']], ['admitting-clerk','admittingClerk',['admittingClerk']],
].map(([name, role, adtRoles], i) => ({ subject: subjects[String(name)], user: { id: name, role }, adtRoles, modelId: i+101, patients: ids, units: ['4-west'] }));
const config = configSchema.parse({ tenant: process.env.COMMIT_TENANT ?? 'local',
  oidc: { issuer: process.env.KEYCLOAK_ISSUER ?? 'http://localhost:18180/realms/vgi', audience: 'vgi-commit', clientId: 'vgi-mar',
    ...(process.env.KEYCLOAK_JWKS_URL ? { jwksUrl: process.env.KEYCLOAK_JWKS_URL } : {}) },
  units: { '4-west': { name: 'Hospital', marOnService: true } },
  ...(boardPatients.length && beds.length ? { adt: { patients: boardPatients, beds } } : {}),
  actors: [...personas.map((persona, n) => ({ subject: `00000000-0000-4000-8000-${String(n+1).padStart(12,'0')}`,
    persona, name: persona, user: { id: persona, role: roles[n] }, modelId: n+1, patients: ids, units: ['4-west'], adtRoles: persona === 'P2' ? ['admittingClerk'] : persona === 'P5' ? ['bedManager'] : [] })), ...operators], releases });
if (args.includes('--dry-run')) { process.stdout.write(`Validated ${patients.length} initial patient bundles and ${Object.keys(workflows).length} scheduled doses\n`); process.exit(0); }
await mkdir(dir, { recursive: true });
await writeFile(resolve(dir, 'config.json'), JSON.stringify(config), { mode: 0o600 });
const db = pool(process.env.DATABASE_URL ?? 'postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit');
const lean = new Lean(resolve(process.env.EHR_BIN ?? 'lean/.lake/build/bin/ehr'), 30_000);
try {
  await migrate(db);
  const store = new Store(db, lean, config);
  for (const p of patients) {
    if (args.includes('--verify-only')) {
      const row = await store.read(config.actors[0], p.patient, 2147483646);
      if (row.snapshot.importHash === undefined) throw new Error(`Missing baseline: ${p.patient}`);
    } else await store.importPatient(p);
  }
  if (config.adt && !args.includes('--verify-only')) await new AdtStore(store).provision();
  process.stdout.write(`Commit store: ${patients.length} patient baselines verified; config ${dir}/config.json\n`);
} finally { lean.close(); await db.end(); }
