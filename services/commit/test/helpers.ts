import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { Lean } from '../src/lean.ts';
import { Store, pool } from '../src/store.ts';
import { Notifications, server } from '../src/http.ts';
import { configSchema, type Actor, type Config, type Obj } from '../src/types.ts';

export async function fixture() {
  if (!process.env.COMMIT_FIXTURE) throw new Error('Set COMMIT_FIXTURE to the output of test/Fixture.lean (see README)');
  return JSON.parse(await readFile(process.env.COMMIT_FIXTURE, 'utf8'));
}
export async function host(url: string, config: Config) {
  const db = pool(url);
  const lean = new Lean(resolve(process.env.EHR_BIN ?? '../../lean/.lake/build/bin/ehr'), 20_000);
  const store = new Store(db, lean, config);
  const notifications = new Notifications(url);
  await notifications.start();
  const app = server(store, notifications);
  app.http.listen(0, '127.0.0.1');
  await once(app.http, 'listening');
  const addr = app.http.address();
  assert.ok(addr && typeof addr !== 'string');
  const base = `http://127.0.0.1:${addr.port}`;
  return { db, lean, store, base, async close() { await app.close(); await notifications.close(); lean.close(); await db.end(); } };
}
export async function api(base: string, actor: Actor, path: string, body?: unknown) {
  const res = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${actor.token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: res.status, body: await res.json() as Obj };
}
export async function ready(base: string, actor: Actor, patient: string, release: string, workflow: string, events: Obj[]) {
  const opened = await api(base, actor, '/sessions', { patient, release, workflow });
  assert.equal(opened.status, 201, JSON.stringify(opened));
  let session = opened.body;
  for (const event of events) {
    const next = await api(base, actor, `/sessions/${session.sessionId}/events`, { revision: session.revision, event });
    assert.equal(next.status, 200, JSON.stringify(next));
    session = { ...session, ...next.body };
  }
  return session;
}
export function intent(s: Obj, requestId: string, event: Obj) {
  return { requestId, sessionId: s.sessionId, revision: s.revision, expectedVersion: s.version,
    ...(s.shared ? { expectedSharedVersion: s.shared.version } : {}), event };
}
export function patient(f: Obj, id: string, modelId: number, nurse = false) {
  const bundle = structuredClone(f.tiny.currentBundle);
  bundle.entry[0].resource.id = id;
  bundle.entry[1].resource.subject.reference = `Patient/${id}`;
  return { patient: id, modelId, bundle, context: { ...f.tiny.context,
    ...(nurse ? { medToGive: 'amoxicillin', encounterKind: 'inpatient' } : {}) } };
}
export function configuration(f: Obj, tenant: string, patients: string[]) {
  const actors: Actor[] = Array.from({ length: 32 }, (_, i) => ({
    token: `synthetic-only-actor-token-${String(i).padStart(3, '0')}`,
    user: { id: `actor-${i}`, role: i < 20 ? 'rn' : 'physician' }, modelId: i + 1, patients,
  }));
  return configSchema.parse({ tenant, actors, releases: {
    tiny: { spec: f.tiny.spec, program: f.tiny.program, workflows: { sign: { commit: 'signOrders' } } },
    nurse: { spec: f.hospitalSpec, program: f.nurseProgram, workflows: {
      dose: { commit: 'administerMed', shared: { kind: 'dose', order: 9, occurrence: 600 } },
      laterDose: { commit: 'administerMed', shared: { kind: 'dose', order: 9, occurrence: 960 } },
    } },
    admission: { spec: f.hospitalSpec, program: f.admissionProgram, workflows: {
      admit: { commit: 'disposition', shared: { kind: 'assignBed', bed: 42 } },
      release: { commit: 'disposition', shared: { kind: 'releaseBed', bed: 42 } },
      secondBed: { commit: 'disposition', shared: { kind: 'assignBed', bed: 43 } },
    } },
  } });
}
export const admissionEvents = (choice = 'admit') => [
  { enter: { comp: 'w3Disposition.dispositionChoice', value: { code: { c: choice } } } },
  { enter: { comp: 'w3Disposition.visitDiagnosis', value: { code: { c: 'R50.9' } } } },
  { enter: { comp: 'w3Disposition.dispositionCondition', value: { code: { c: 'stable' } } } },
];
export function adminEvents(f: Obj, patient: string) {
  return f.adminEvents.filter((e: Obj) => !e.enter?.comp.includes('.legal.')).map((e: Obj) =>
    e.enter?.comp === 'w4Admin.wristbandScan' ? { enter: { comp: e.enter.comp, value: { code: { c: patient } } } } : e);
}
export function shuffled<T>(items: T[], seed: number): T[] {
  const a = [...items]; let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    const j = (s >>> 0) % (i + 1); [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
