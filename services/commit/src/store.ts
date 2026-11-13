import { Fault, clinicalPersona, digest, emptyShared, maybeObj, maybeObjs, num, obj, objs, required, sharedAction, sharedKey, str, type Actor, type Command, type Config, type Obj, type Patient, type Release, type Workflow } from './types.ts';
import { protocolTrace, type ProtocolTrace } from './protocol-trace.ts';
import { boardKeys, boardFrom, clinicalAction, normalizeAdtStream, projectAdt } from './clinical-adt.ts';
import { projectCommand, storedReviewReceipts } from './projection.ts';
import { z } from 'zod';
import pg, { type PoolClient } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { verifyScreens } from './screens.ts';
import { Lean } from './lean.ts';

const bedPhase = z.enum(['ready', 'occupied', 'dirty', 'cleaning']);

export function pool(url: string) {
  const p = new pg.Pool({ connectionString: url, max: 6, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10_000 });
  p.on('error', () => { /* individual queries fail; idle connections are discarded */ });
  return p;
}
export async function migrate(db: pg.Pool) {
  const dir = new URL('../migrations/', import.meta.url);
  const files = (await readdir(dir)).filter(f => /^\d+.*\.sql$/.test(f)).sort();
  await transaction(db, async c => {
    await c.query('SELECT pg_advisory_xact_lock(734592101)');
    await c.query('CREATE TABLE IF NOT EXISTS commit_migrations(name text PRIMARY KEY, hash text NOT NULL)');
    for (const name of files) {
      const sql = await readFile(new URL(name, dir), 'utf8');
      const existing = await c.query('SELECT hash FROM commit_migrations WHERE name=$1', [name]);
      if (existing.rowCount) {
        if (existing.rows[0].hash !== digest(sql)) throw new Error(`Migration changed: ${name}`);
        continue;
      }
      await c.query(sql);
      await c.query('INSERT INTO commit_migrations(name,hash) VALUES($1,$2)', [name, digest(sql)]);
    }
  });
}
export async function transaction<T>(db: pg.Pool, f: (c: PoolClient) => Promise<T>, trace?: ProtocolTrace): Promise<T> {
  const c = await db.connect();
  let broken = false;
  let commitStarted = false;
  try {
    await c.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    await c.query("SET LOCAL lock_timeout = '5s'");
    await c.query("SET LOCAL statement_timeout = '15s'");
    await c.query("SET LOCAL idle_in_transaction_session_timeout = '30s'");
    await c.query('SET LOCAL synchronous_commit = on');
    const out = await f(c);
    trace?.emit('commit-start');
    commitStarted = true;
    await c.query('COMMIT');
    trace?.emit('committed');
    return out;
  } catch (e) {
    try { await c.query('ROLLBACK'); } catch { broken = true; }
    trace?.emit('aborted', { uncertain: commitStarted });
    throw e;
  } finally { c.release(broken); }
}

/** This vector is evidence of the session's displayed snapshot, never authority
 * to replace the current snapshot read under the patient lock. */
export function versions(bundle: Obj) {
  if (bundle.resourceType !== 'Bundle' || bundle.type !== 'collection' || !Array.isArray(bundle.entry) ||
      maybeObjs(bundle.link)?.some((l: Obj) => l.relation === 'next')) throw new Fault(422, 'invalid_bundle');
  const vs = bundle.entry.map((e: Obj) => {
    const r = obj(e.resource);
    const version = maybeObj(r.meta)?.versionId;
    if (typeof r.resourceType !== 'string' || !/^[A-Za-z]+$/.test(r.resourceType) ||
        typeof r.id !== 'string' || !/^[A-Za-z0-9.-]{1,64}$/.test(r.id) ||
        typeof version !== 'string' || !/^[A-Za-z0-9.-]{1,64}$/.test(version)) throw new Fault(422, 'missing_resource_version');
    return { url: `${r.resourceType}/${r.id}`, version };
  });
  if (new Set(vs.map((v: Obj) => v.url)).size !== vs.length) throw new Fault(422, 'duplicate_resource');
  return vs;
}

/** Journal clock metadata is host-owned and is not part of Lean's Event codec. */
function clinicalEvent(event: Obj): Obj {
  return Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'entryEpochMinute'));
}

/** The patient's native ADT position, if the patient is on the bed board. */
export function adtStamp(snapshot: Obj): Obj | undefined {
  const adt = maybeObj(snapshot.adt);
  return adt ? { revision: num(adt.revision ?? 0), encounter: num(adt.encounter ?? 0), admitted: adt.admitted === true } : undefined;
}

/** Server-computed directory activities bound to a session, if any. */
function extraActivities(context: Obj) {
  return Array.isArray(context.extraActivities) ? { extraActivities: context.extraActivities } : {};
}

export function currentContext(context: Obj, time = Date.now()) {
  const now = new Date(time);
  return { ...context, today: now.toISOString().slice(0, 10), now: now.getUTCHours() * 60 + now.getUTCMinutes() };
}

export class Store {
  db: pg.Pool;
  lean: Lean;
  config: Config;
  private now: () => number;
  constructor(db: pg.Pool, lean: Lean, config: Config, now: () => number = Date.now) { this.db = db; this.lean = lean; this.config = config; this.now = now; }
  authorize(actor: Actor, patient: string) {
    if (!actor.patients.includes(patient)) throw new Fault(403, 'patient_forbidden');
  }
  async openEncounter(actor: Actor, input: { patient: string; expectedVersion: number; requestId: string }) {
    this.authorize(actor, input.patient);
    return transaction(this.db, async c => {
      const t = this.config.tenant;
      const hash = digest({ endpoint: 'encounter', input });
      await c.query('INSERT INTO commit_requests(tenant,actor,request_id,payload_hash) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING', [t, actor.user.id, input.requestId, hash]);
      const request = (await c.query('SELECT * FROM commit_requests WHERE tenant=$1 AND actor=$2 AND request_id=$3 FOR UPDATE', [t, actor.user.id, input.requestId])).rows[0];
      if (request.payload_hash !== hash) throw new Fault(409, 'idempotency_payload_conflict');
      if (request.outcome) return request.outcome;
      const p = await this.stream(c, `patient:${input.patient}`, true);
      const check = { patient: input.patient, bundle: p.snapshot.bundle, user: actor.user, version: p.version, expectedVersion: input.expectedVersion };
      const accepted = await this.lean.call('encounter-open', check);
      if (!accepted.accepted) throw new Fault(p.version !== input.expectedVersion ? 409 : 422, 'encounter_guard');
      const id = randomUUID();
      const resource = { resourceType: 'Encounter', id, meta: { versionId: '1' }, status: 'in-progress',
        class: { code: actor.persona === 'P2' ? 'EMER' : 'AMB' }, subject: { reference: `Patient/${input.patient}` },
        period: { start: new Date().toISOString() }, participant: [{ individual: { reference: `Practitioner/${actor.user.id}` } }] };
      const snapshot = { ...p.snapshot, bundle: { ...p.snapshot.bundle, entry: [...p.snapshot.bundle.entry, { resource }] } };
      const updated = await c.query('UPDATE commit_streams SET version=version+1,snapshot=$4 WHERE tenant=$1 AND key=$2 AND version=$3', [t, `patient:${input.patient}`, p.version, snapshot]);
      if (updated.rowCount !== 1) throw new Error('Encounter locked CAS failed');
      await c.query('INSERT INTO commit_events(tenant,stream,version,transaction_id,event) VALUES($1,$2,$3,$4,$5)', [t, `patient:${input.patient}`, p.version + 1, id, { kind: 'encounter', actor: actor.user.id, requestId: input.requestId, guard: { input: check, accepted }, resource }]);
      const outcome = { status: 201, body: resource };
      await c.query('UPDATE commit_requests SET outcome=$4,patient=$5 WHERE tenant=$1 AND actor=$2 AND request_id=$3', [t, actor.user.id, input.requestId, outcome, input.patient]);
      await c.query("SELECT pg_notify('vgi_commit', 'changed')");
      return outcome;
    });
  }
  private projectBeds(bundle: Obj, beds: Obj[]) {
    const states = new Map(beds.map(row => [Number(str(row.key).slice(4)), row.snapshot]));
    return { ...bundle, entry: objs(bundle.entry).map((e: Obj) => {
      const bed = this.config.adt?.beds.find(b => b.resource && b.resource === obj(e.resource).id && obj(e.resource).resourceType === 'Location');
      const state = bed ? states.get(bed.id) : undefined;
      return state ? { ...e, resource: { ...obj(e.resource), operationalStatus: { code: ({ ready: 'U', occupied: 'O', dirty: 'H', cleaning: 'C' } as const)[bedPhase.parse(obj(state).phase)] } } } : e;
    }) };
  }
  async directory(actor: Actor, db: pg.Pool | PoolClient = this.db) {
    // Filter in Postgres before decoding JSON. Loading every complete chart
    // just to paint the worklist needlessly multiplies memory by the cohort.
    const rows = await db.query(`SELECT DISTINCT ON (r->>'resourceType',r->>'id') r AS resource
      FROM commit_streams s CROSS JOIN LATERAL jsonb_array_elements(s.snapshot->'bundle'->'entry') e
      CROSS JOIN LATERAL (SELECT e->'resource' AS r) x
      WHERE s.tenant=$1 AND s.kind='patient' AND substring(s.key from 9)=ANY($2)
      AND (r->>'resourceType'=ANY($3) OR (r->>'resourceType'=ANY($4) AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(r->'meta'->'tag','[]'::jsonb)) tag
        WHERE tag->>'system'=ANY($5)))) ORDER BY r->>'resourceType',r->>'id',s.key`,
      [this.config.tenant, actor.patients, ['Patient','Practitioner','Organization','Location','List'],
        ['Appointment','Encounter','Task','ServiceRequest','Procedure','Communication'],
        ['urn:vgi:world:realism','https://vgi-health.example/fhir/sid/world']]);
    const beds = (await db.query("SELECT key,snapshot FROM commit_streams WHERE tenant=$1 AND kind='bed'", [this.config.tenant])).rows;
    return this.projectBeds({ resourceType: 'Bundle', type: 'collection', entry: rows.rows.map(row => ({ resource: row.resource })) }, beds);
  }
  async marDirectory(actor: Actor) {
    if (actor.user.role !== 'rn') throw new Fault(403, 'role_forbidden');
    const items = [];
    for (const [release, r] of Object.entries(this.config.releases)) for (const [workflow, w] of Object.entries(r.workflows)) {
      if (!w.mar || !actor.patients.includes(w.mar.patient)) continue;
      if (w.mar.unit && (!this.config.units?.[w.mar.unit]?.marOnService || !actor.units?.includes(w.mar.unit))) continue;
      const p = await this.read(actor, w.mar.patient, 2147483646);
      const resources = p.snapshot.bundle.entry.map((e: Obj) => obj(e.resource));
      const encounter = resources.find((r: Obj) => r.resourceType === 'Encounter' && r.id === required(w.mar).encounter);
      const order = resources.find((r: Obj) => r.resourceType === 'MedicationRequest' && r.id === required(w.mar).medicationRequest);
      // Directory availability is a read projection; the native MAR command
      // still rechecks the active order/episode under the patient lock.
      if (encounter?.status !== 'in-progress' || order?.status !== 'active') continue;
      items.push({ release, workflow, ...w.mar, version: p.version,
        patientResource: p.snapshot.bundle.entry.find((e: Obj) => obj(e.resource).resourceType === 'Patient')?.resource,
        order: p.snapshot.bundle.entry.find((e: Obj) => obj(e.resource).resourceType === 'MedicationRequest' && obj(e.resource).id === required(w.mar).medicationRequest)?.resource,
        administrations: p.snapshot.bundle.entry.filter((e: Obj) => obj(e.resource).resourceType === 'MedicationAdministration' &&
          maybeObj(obj(e.resource).request)?.reference === `MedicationRequest/${required(w.mar).medicationRequest}` &&
          maybeObjs(obj(e.resource).extension)?.some((extension: Obj) => {
            if (extension.url !== 'urn:vgi:scheduled-dose' || w.shared?.kind !== 'dose') return false;
            // Exact source identity routing only; status/consumption is reduced in Lean.
            const dose = JSON.parse(str(extension.valueString));
            return dose.patient === p.snapshot.modelId && dose.order === w.shared.order && dose.occurrence === w.shared.occurrence;
          })).map((e: Obj) => obj(e.resource)) });
    }
    return { items };
  }
  requireMarUnit(actor: Actor, w: Workflow) {
    const unit = w.mar?.unit;
    if (unit && (!this.config.units?.[unit]?.marOnService || !actor.units?.includes(unit)))
      throw new Fault(403, 'mar_unit_disabled_or_forbidden');
  }
  private requireMarBinding(snapshot: Obj, workflow: Pick<Workflow, 'shared' | 'mar'>) {
    if (workflow.mar && !objs((snapshot.marBindings ?? [])).some((b: Obj) => digest(b) === digest({ shared: workflow.shared, mar: workflow.mar })))
      throw new Fault(409, 'scheduled_binding_changed');
  }
  private async workflowContext(context: Obj, w: Pick<Workflow, 'shared' | 'mar'>, bundle: Obj, initial = false) {
    if (!w.mar) return currentContext(context, this.now());
    const resolved = currentContext({ ...context, encounterKind: 'inpatient', encounterId: obj(w.mar).encounter,
      record: [...z.array(z.tuple([z.string(), z.string()])).parse(context.record ?? []).filter(([k]) => !['selectedMedicationRequestId', 'selectedEncounterId'].includes(k)),
        ['selectedMedicationRequestId', obj(w.mar).medicationRequest], ['selectedEncounterId', obj(w.mar).encounter]] }, this.now());
    return this.lean.call(initial ? 'mar-import-context' : 'mar-context', { bundle, context: resolved, ...w.mar });
  }
  private release(name: string) {
    const release = this.config.releases[name];
    if (!Object.hasOwn(this.config.releases, name) || !release) throw new Fault(404, 'release_not_found');
    return release;
  }
  private async stream(c: Pick<PoolClient, 'query'>, key: string, lock = false) {
    const r = await c.query(`SELECT * FROM commit_streams WHERE tenant=$1 AND key=$2${lock ? ' FOR UPDATE' : ''}`,
      [this.config.tenant, key]);
    if (!r.rowCount) throw new Fault(404, 'stream_not_provisioned');
    return r.rows[0];
  }
  async importPatient(patient: Patient) {
    versions(patient.bundle);
    const patients = objs(patient.bundle.entry).filter((e: Obj) => obj(e.resource).resourceType === 'Patient');
    if (patients.length !== 1 || obj(patients[0].resource).id !== patient.patient) throw new Fault(422, 'patient_mismatch');
    await this.lean.call('facts', { bundle: patient.bundle, context: patient.context });
    const marBindings = Object.values(this.config.releases).flatMap(r => Object.values(r.workflows))
      .filter(w => w.mar?.patient === patient.patient).map(w => ({ shared: w.shared, mar: w.mar }));
    for (const binding of marBindings) await this.workflowContext(patient.context, binding, patient.bundle, true);
    const imported = { ...patient, marBindings, importHash: digest(patient) };
    return transaction(this.db, async c => {
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`${this.config.tenant}/${patient.patient}`]);
      const existing = await c.query('SELECT snapshot FROM commit_streams WHERE tenant=$1 AND key=$2', [this.config.tenant, `patient:${patient.patient}`]);
      if (existing.rowCount) {
        if (existing.rows[0].snapshot.importHash !== imported.importHash) throw new Fault(409, 'import_changed');
        return;
      }
      await c.query('INSERT INTO commit_streams(tenant,key,kind,version,snapshot) VALUES($1,$2,\'patient\',1,$3)',
        [this.config.tenant, `patient:${patient.patient}`, imported]);
      await c.query('INSERT INTO commit_events(tenant,stream,version,transaction_id,event) VALUES($1,$2,1,$3,$4)',
        [this.config.tenant, `patient:${patient.patient}`, randomUUID(), { kind: 'import', patient: imported }]);
      for (const r of Object.values(this.config.releases)) for (const w of Object.values(r.workflows)) {
        if (w.mar && w.mar.patient !== patient.patient) continue;
        const key = sharedKey(patient.patient, w);
        if (key) await c.query('INSERT INTO commit_streams(tenant,key,kind,snapshot) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
          [this.config.tenant, key, required(w.shared).kind === 'dose' ? 'dose' : 'bed', emptyShared()]);
      }
      await c.query("SELECT pg_notify('vgi_commit', 'changed')");
    });
  }
  async cosign(actor: Actor, input: { patient: string; release: string; workflow: string; expectedVersion: number }) {
    this.authorize(actor, input.patient);
    const w = this.release(input.release).workflows[input.workflow];
    if (actor.user.role !== 'rn' || !w?.mar || w.mar.patient !== input.patient) throw new Fault(403, 'role_forbidden');
    this.requireMarUnit(actor, w);
    return transaction(this.db, async c => {
      const p = await this.stream(c, `patient:${input.patient}`, true);
      this.requireMarBinding(p.snapshot, w);
      if (p.version !== input.expectedVersion) throw new Fault(409, 'version_conflict');
      await c.query(`INSERT INTO commit_mar_cosigns(tenant,patient,release_name,workflow,patient_version,signer,expires_at,release_hash)
        VALUES($1,$2,$3,$4,$5,$6,now()+interval '5 minutes',$7) ON CONFLICT (tenant,patient,release_name,workflow,patient_version,signer) DO UPDATE SET expires_at=EXCLUDED.expires_at,release_hash=EXCLUDED.release_hash`,
        [this.config.tenant, input.patient, input.release, input.workflow, p.version, actor.user.id, digest(this.release(input.release))]);
      return { cosigner: actor.user.id, version: p.version };
    });
  }
  async read(actor: Actor, patient: string, after = 0) {
    this.authorize(actor, patient);
    // Snapshot and suffix come from one MVCC statement (no torn read).
    const r = await this.db.query(`SELECT s.version,s.snapshot,
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('key', b.key, 'snapshot', b.snapshot)), '[]'::jsonb) FROM commit_streams b WHERE b.tenant=s.tenant AND b.kind='bed') AS beds,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('version', e.version, 'transactionId', e.transaction_id,
        'event', e.event) ORDER BY e.version) FROM (SELECT * FROM commit_events e WHERE e.tenant=s.tenant AND e.stream=s.key
        AND e.version>$3 AND e.version<=s.version ORDER BY e.version LIMIT 128) e), '[]'::jsonb) AS events
      FROM commit_streams s WHERE s.tenant=$1 AND s.key=$2`, [this.config.tenant, `patient:${patient}`, after]);
    if (!r.rowCount) throw new Fault(404, 'stream_not_provisioned');
    const row = r.rows[0];
    row.snapshot.bundle = this.projectBeds(row.snapshot.bundle, row.beds);
    delete row.beds;
    const board = this.config.adt;
    const fullBoardAccess = board && actor.adtRoles?.length && board.patients.every(p => actor.patients.includes(p)) &&
      board.beds.every(b => actor.units?.includes(b.unit));
    if (!fullBoardAccess) row.events = row.events.map((e: Obj) => !['adt', 'clinical-adt'].includes(str(obj(e.event).kind)) ? (obj(e.event).clinicalAdt ? { ...e, event: { ...obj(e.event), clinicalAdt: undefined, readVersions: { [`patient:${patient}`]: maybeObj(obj(e.event).readVersions)?.[`patient:${patient}`] } } } : e) : { ...e,
      event: { kind: obj(e.event).kind, actor: obj(e.event).actor, requestId: obj(e.event).requestId,
        command: { action: Object.keys(obj(obj(obj(e.event).input).command))[0] },
        patient: objs(obj(obj(obj(e.event).accepted).state).patients).find((p: Obj) => p.id === patient) } });
    return row;
  }
  async resource(actor: Actor, patient: string, type: string, id: string, version: string) {
    const current = await this.read(actor, patient, 2147483646);
    const found = current.snapshot.bundle.entry.find((e: Obj) => obj(e.resource).resourceType === type && obj(e.resource).id === id && maybeObj(obj(e.resource).meta)?.versionId === version)?.resource;
    if (found) return found;
    const rows = await this.db.query(`SELECT resource FROM commit_events e CROSS JOIN LATERAL jsonb_array_elements(
      COALESCE(e.event->'projection'->'changed','[]'::jsonb) ||
      CASE WHEN e.event->'resource' IS NOT NULL THEN jsonb_build_array(e.event->'resource') ELSE '[]'::jsonb END ||
      CASE WHEN e.event->'mar'->'accepted'->'resource' IS NOT NULL THEN jsonb_build_array(e.event->'mar'->'accepted'->'resource') ELSE '[]'::jsonb END) resource
      WHERE e.tenant=$1 AND e.stream=$2 AND resource->>'resourceType'=$3 AND resource->>'id'=$4 AND resource->'meta'->>'versionId'=$5 ORDER BY e.version DESC LIMIT 1`,
      [this.config.tenant, `patient:${patient}`, type, id, version]);
    if (!rows.rowCount) throw new Fault(404, 'resource_not_found');
    return rows.rows[0].resource;
  }
  async outcome(actor: Actor, requestId: string) {
    const r = await this.db.query('SELECT outcome,patient FROM commit_requests WHERE tenant=$1 AND actor=$2 AND request_id=$3',
      [this.config.tenant, actor.user.id, requestId]);
    if (!r.rowCount) throw new Fault(404, 'request_not_found');
    if (!r.rows[0].patient) throw new Fault(409, 'outcome_requires_reconciliation');
    this.authorize(actor, r.rows[0].patient);
    return r.rows[0].outcome;
  }
  async openSession(actor: Actor, input: { patient: string; release: string; workflow: string; expectedVersion?: number; encounter?: string; task?: string; bed?: string; checkpointId?: string; workspaceActivity?: string; deficiencyList?: string }) {
    this.authorize(actor, input.patient);
    const release = this.release(input.release);
    const w = release.workflows[input.workflow];
    if (!Object.hasOwn(release.workflows, input.workflow) || !w) throw new Fault(404, 'workflow_not_found');
    if (!['rn', 'physician', 'np', 'surgeon'].includes(actor.user.role)) throw new Fault(403, 'role_forbidden');
    this.requireMarUnit(actor, w);
    if (w.mar && (actor.user.role !== 'rn' || w.mar.patient !== input.patient)) throw new Fault(403, 'mar_scope_forbidden');
    return transaction(this.db, async c => {
      // A checkpoint was derived at departure. Its source patient/version
      // and short-lived command session are deliberately not consulted here.
      let workspaceState: Obj | undefined;
      let draftAdt: Obj = {};
      if (input.checkpointId) {
        const checkpoint = await c.query('SELECT workspace_state,release_hash,draft_adt FROM commit_draft_checkpoints WHERE tenant=$1 AND id=$2 AND actor=$3 AND auth_session=$4',
          [this.config.tenant, input.checkpointId, actor.user.id, this.draftScope(actor)]);
        if (!checkpoint.rowCount) throw new Fault(404, 'checkpoint_not_found');
        if (!w.project || !release.program.patientSelection || checkpoint.rows[0].release_hash !== digest(release))
          throw new Fault(409, 'checkpoint_release_mismatch');
        workspaceState = obj(checkpoint.rows[0].workspace_state);
        draftAdt = maybeObj(checkpoint.rows[0].draft_adt) ?? {};
      }
      let extra: Obj[] | undefined;
      if (input.deficiencyList) {
        const list = await c.query('SELECT activity FROM commit_deficiency_lists WHERE tenant=$1 AND id=$2 AND actor=$3 AND auth_session=$4',
          [this.config.tenant, input.deficiencyList, actor.user.id, this.draftScope(actor)]);
        if (!list.rowCount) throw new Fault(404, 'deficiency_list_not_found');
        if (!w.project || !release.program.patientSelection) throw new Fault(422, 'workspace_required');
        extra = [obj(list.rows[0].activity)];
      }
      const p = await this.stream(c, `patient:${input.patient}`, true);
      // The stamp the clinician sees in this chart; a later departure records it
      // with the saved draft. The native ADT reducer owns this state.
      const stamp = adtStamp(obj(p.snapshot));
      if (workspaceState && input.checkpointId) {
        // Native Lean reconciles only this patient's stored draft for the ADT
        // movement since it was saved; hydration then restores it unchanged.
        const saved = maybeObj(draftAdt[input.patient]);
        const reconciled = await this.lean.call('reconcile-store', { spec: release.spec, state: workspaceState, patient: input.patient,
          ...(saved ? { saved } : {}), ...(stamp ? { current: stamp } : {}) });
        workspaceState = obj(reconciled.state);
        const discarded = objs(reconciled.discarded ?? []);
        if (discarded.length) await c.query(`INSERT INTO commit_discarded_drafts(tenant,actor,checkpoint_id,patient,encounter_id,captured)
          VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT (tenant,checkpoint_id,patient) DO NOTHING`,
        [this.config.tenant, actor.user.id, input.checkpointId, input.patient, typeof saved?.encounterId === 'string' ? saved.encounterId : '', JSON.stringify(discarded)]);
      }
      this.requireMarBinding(obj(p.snapshot), w);
      const snapshot = obj(p.snapshot);
      let context: Obj = await this.workflowContext(obj(snapshot.context), w, obj(snapshot.bundle));
      if (w.project) {
        if (input.expectedVersion !== p.version) throw new Fault(409, 'version_conflict');
        if (input.release !== clinicalPersona(actor) && !input.release.startsWith(`${clinicalPersona(actor)}-`)) throw new Fault(403, 'release_forbidden');
        const resources = p.snapshot.bundle.entry.map((e: Obj) => obj(e.resource));
        const encounter = resources.find((r: Obj) => r.resourceType === 'Encounter' && r.id === (input.encounter ?? context.encounterId));
        if (!encounter || encounter.subject?.reference !== `Patient/${input.patient}`) throw new Fault(422, 'encounter_required');
        const task = input.task ? resources.find((r: Obj) => r.resourceType === 'Task' && r.id === input.task && maybeObj(r.for)?.reference === `Patient/${input.patient}`) : undefined;
        if (input.task && (!task || task.encounter?.reference && task.encounter.reference !== `Encounter/${encounter.id}`)) throw new Fault(422, 'task_mismatch');
        const bed = input.bed ? this.config.adt?.beds.find(b => b.resource === input.bed) : undefined;
        if (input.bed && !bed) throw new Fault(422, 'bed_not_configured');
        context = { ...context, receipts: storedReviewReceipts(p.snapshot.bundle, actor, new Date().toISOString()),
          directoryDate: p.snapshot.context.today, bed: bed?.id, encounterId: encounter.id, taskId: task?.id,
          record: [['viewerPersona', clinicalPersona(actor)], ['selectedEncounterId', encounter.id]] };
      }
      if (w.project && release.program.patientSelection) context = { ...context, draftScope: this.draftScope(actor),
        ...(stamp ? { adtStamp: stamp } : {}), ...(input.checkpointId ? { checkpointId: input.checkpointId } : {}),
        ...(extra ? { extraActivities: extra } : {}) };
      const directory = w.project ? await this.directory(actor) : undefined;
      const selection = w.project && release.program.patientSelection;
      const facts = await this.lean.call('facts', selection
        ? { bundle: directory, directoryOnly: true, context: { ...context, today: context.directoryDate ?? context.today }, ...extraActivities(context) }
        : { bundle: p.snapshot.bundle, context, ...(directory ? { worldContext: directory, ...extraActivities(context) } : {}) });
      let state = workspaceState ?? await this.lean.call('init', { ...release, facts: facts.facts, user: actor.user });
      if (input.workspaceActivity) {
        if (!selection) throw new Fault(422, 'workspace_required');
        const event = { click: { comp: input.workspaceActivity === 'lookup' ? 'workspace.lookup' : `workspace.activity|${input.workspaceActivity}` } };
        state = obj((await this.lean.call('step', { ...release, ...facts, user: actor.user, state, event })).state);
        if (maybeObj(state.patientContext)?.activity !== input.workspaceActivity)
          throw new Fault(422, 'workspace_activity_unavailable');
      }
      if (workspaceState || input.workspaceActivity) context = { ...context, workspaceState: state };
      const id = randomUUID();
      await c.query(`INSERT INTO commit_sessions(tenant,id,actor,patient,release_name,release_hash,workflow,base_version,context,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [this.config.tenant, id, actor.user.id, input.patient, input.release, digest(release), input.workflow, p.version, context, new Date(this.now())]);
      const key = sharedKey(input.patient, w);
      const resource = key ? await this.stream(c, key) : undefined;
      const boardRows = w.project && this.config.adt ? (await c.query('SELECT key,version FROM commit_streams WHERE tenant=$1 AND key=ANY($2) ORDER BY key COLLATE "C"', [this.config.tenant, boardKeys(this.config)])).rows : undefined;
      return { sessionId: id, revision: 0, version: p.version, state, facts: facts.facts,
        ...(boardRows ? { board: boardRows.map(r => ({ key: r.key, version: r.version })) } : {}),
        projection: facts, spec: release.spec, program: release.program, user: actor.user,
        ...(resource ? { shared: { key, version: resource.version, state: resource.snapshot } } : {}) };
    });
  }
  /** The signed-in clinician's deficiency list, computed by native Lean from
   * each chart's current facts, the commits signed in its encounter, this
   * login's latest saved drafts with their ADT stamps, and order lines a
   * discharge kept out of a chart. The list is stored so that a later session
   * paints exactly the activity the browser was shown. */
  async deficiencies(actor: Actor) {
    if (!['rn', 'physician', 'np', 'surgeon'].includes(actor.user.role)) throw new Fault(403, 'role_forbidden');
    const persona = clinicalPersona(actor);
    const release = this.config.releases[persona];
    if (!release) throw new Fault(404, 'release_not_found');
    const scope = this.draftScope(actor);
    const t = this.config.tenant;
    const latest = (await this.db.query(`SELECT id,workspace_state,draft_adt,created_at FROM commit_draft_checkpoints
      WHERE tenant=$1 AND actor=$2 AND auth_session=$3 ORDER BY created_at DESC, id DESC LIMIT 1`, [t, actor.user.id, scope])).rows[0];
    const drafts = latest ? objs(obj(latest.workspace_state).patientDrafts ?? []) : [];
    const stamps = latest ? maybeObj(latest.draft_adt) ?? {} : {};
    const discards = (await this.db.query(`SELECT checkpoint_id,patient,encounter_id,captured FROM commit_discarded_drafts
      WHERE tenant=$1 AND actor=$2 ORDER BY created_at, checkpoint_id`, [t, actor.user.id])).rows;
    const keys = (await this.db.query(`SELECT key FROM commit_streams WHERE tenant=$1 AND kind='patient' AND substring(key from 9)=ANY($2) ORDER BY key COLLATE "C"`,
      [t, actor.patients])).rows.map(r => str(r.key));
    const epochMinute = Math.floor(this.now() / 60_000);
    const records: Obj[] = [];
    for (const key of keys) {
      const patient = key.slice('patient:'.length);
      const row = (await this.db.query('SELECT snapshot FROM commit_streams WHERE tenant=$1 AND key=$2', [t, key])).rows[0];
      if (!row) continue;
      const snapshot = obj(row.snapshot);
      const projected = await this.lean.call('facts', { bundle: snapshot.bundle, context: currentContext(obj(snapshot.context ?? {})) });
      const facts = obj(projected.facts);
      // The service clock is the trusted time source for live charts.
      if (typeof facts.epochMinute !== 'number') facts.epochMinute = epochMinute;
      const encounter = typeof facts.episodeId === 'string' ? facts.episodeId
        : typeof maybeObj(snapshot.context)?.encounterId === 'string' ? str(obj(snapshot.context).encounterId) : '';
      const commits = (await this.db.query(`SELECT DISTINCT event->'guard'->'input'->>'commit' AS commit FROM commit_events
        WHERE tenant=$1 AND stream=$2 AND event->>'kind'='command' AND COALESCE(event->'session'->'context'->>'encounterId','')=$3
        AND event->'guard'->'input'->>'commit' IS NOT NULL`, [t, key, encounter])).rows.map(r => str(r.commit));
      const stamp = adtStamp(snapshot);
      records.push({ patient, encounter, facts, commits, ...(stamp ? { adt: stamp } : {}),
        drafts: drafts.filter((d: Obj) => d.patient === patient).map((draft: Obj) => ({
          checkpoint: str(latest.id), draft, savedAt: Math.floor(new Date(latest.created_at).getTime() / 60_000),
          ...(maybeObj(stamps[patient]) ? { adt: stamps[patient] } : {}) })),
        discards: discards.filter(d => d.patient === patient).map(d => ({ checkpoint: str(d.checkpoint_id), encounter: str(d.encounter_id), captured: d.captured })) });
    }
    const names = obj(obj(obj(await this.lean.call('facts', { bundle: await this.directory(actor), directoryOnly: true,
      context: currentContext({ receipts: [], record: [] }) })).facts).patientDirectory).patients;
    const computed = await this.lean.call('deficiencies', { spec: release.spec, user: actor.user, records, names: names ?? [] });
    const id = randomUUID();
    await this.db.query(`INSERT INTO commit_deficiency_lists(tenant,id,actor,auth_session,activity,deficiencies,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7)`, [t, id, actor.user.id, scope, computed.activity, JSON.stringify(computed.deficiencies), new Date(this.now())]);
    return { id, deficiencies: computed.deficiencies, activity: computed.activity };
  }
  private draftScope(actor: Actor) {
    // OIDC sid is stable across access-token refresh and changes on a new
    // login. Static-token test/prototype deployments use that credential's hash.
    if (this.config.oidc && !actor.loginSession) throw new Fault(403, 'login_session_required');
    return digest(this.config.oidc ? actor.loginSession : required(actor.token));
  }
  async checkpoint(actor: Actor, input: { sessionId: string; revision: number; event: Obj }) {
    const scope = this.draftScope(actor);
    const binding = [this.config.tenant, actor.user.id, scope, input.sessionId, input.revision, digest(input.event)];
    return transaction(this.db, async c => {
      // Recover a lost departure reply even after its source expires/changes.
      const existing = await c.query('SELECT id FROM commit_draft_checkpoints WHERE tenant=$1 AND actor=$2 AND auth_session=$3 AND source_session=$4 AND source_revision=$5 AND leave_hash=$6', binding);
      if (existing.rowCount) return { checkpointId: existing.rows[0].id };
      const { s, release, workflow } = await this.session(c, actor, input.sessionId);
      if (!workflow.project || !release.program.patientSelection || s.revision !== input.revision)
        throw new Fault(409, 'checkpoint_revision_mismatch');
      const p = await this.stream(c, `patient:${s.patient}`, true);
      if (s.base_version !== p.version) throw new Fault(409, 'version_conflict');
      const replay = await this.reconstruct(actor, release, p.snapshot, s, true);
      const state = obj((await this.lean.call('step', { ...replay.base, state: replay.state, event: input.event })).state);
      if (!state.patientContext || maybeObj(state.patientContext)?.patient || maybeObj(state.patientContext)?.bound)
        throw new Fault(422, 'checkpoint_requires_directory');
      // Each stored draft keeps the ADT stamp of the chart it was saved from:
      // this chart's stamp at session open, earlier drafts' stamps unchanged.
      const context = obj(s.context);
      const previous = typeof context.checkpointId === 'string'
        ? maybeObj((await c.query('SELECT draft_adt FROM commit_draft_checkpoints WHERE tenant=$1 AND id=$2 AND actor=$3',
          [this.config.tenant, context.checkpointId, actor.user.id])).rows[0]?.draft_adt) ?? {}
        : {};
      const drafted = new Set(objs(state.patientDrafts ?? []).map((d: Obj) => str(d.patient)));
      const draftAdt: Obj = Object.fromEntries(Object.entries(previous).filter(([patient]) => drafted.has(patient) && patient !== s.patient));
      if (drafted.has(s.patient) && maybeObj(context.adtStamp))
        draftAdt[s.patient] = { ...obj(context.adtStamp), ...(typeof context.encounterId === 'string' ? { encounterId: context.encounterId } : {}) };
      // The service clock dates the draft; the deficiency deadline counts from it.
      const inserted = await c.query(`INSERT INTO commit_draft_checkpoints(tenant,actor,auth_session,source_session,source_revision,leave_hash,id,release_hash,workspace_state,draft_adt,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (tenant,actor,auth_session,source_session,source_revision,leave_hash) DO NOTHING RETURNING id`,
      [...binding, randomUUID(), digest(release), state, draftAdt, new Date(this.now())]);
      if (inserted.rowCount) return { checkpointId: inserted.rows[0].id };
      return { checkpointId: (await c.query('SELECT id FROM commit_draft_checkpoints WHERE tenant=$1 AND actor=$2 AND auth_session=$3 AND source_session=$4 AND source_revision=$5 AND leave_hash=$6', binding)).rows[0].id };
    });
  }
  async renewSession(actor: Actor, id: string, revision: number) {
    return transaction(this.db, async c => {
      // Expired sessions still cannot commit or accept events. A new session
      // can reproduce their same server journal and screen interval only after
      // all actor, release, revision and current-patient version checks pass.
      const { s, release } = await this.session(c, actor, id, true);
      if (s.revision !== revision) throw new Fault(409, 'session_revision_conflict');
      const p = await this.stream(c, `patient:${s.patient}`, true);
      if (s.base_version !== p.version) throw new Fault(409, 'version_conflict');
      const { base, state } = await this.reconstruct(actor, release, p.snapshot, s, true);
      const next = randomUUID();
      await c.query(`INSERT INTO commit_sessions(tenant,id,actor,patient,release_name,release_hash,workflow,base_version,context,events,revision,screen_start,created_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [this.config.tenant, next, actor.user.id, s.patient, s.release_name, s.release_hash, s.workflow, s.base_version, s.context, JSON.stringify(s.events), s.revision, s.screen_start, new Date(this.now())]);
      return { sessionId: next, revision: s.revision, version: p.version, state,
        projection: { facts: base.facts, display: base.display } };
    });
  }
  private async session(c: PoolClient, actor: Actor, id: string, renewing = false) {
    const r = await c.query('SELECT * FROM commit_sessions WHERE tenant=$1 AND id=$2 AND actor=$3 FOR UPDATE',
      [this.config.tenant, id, actor.user.id]);
    if (!r.rowCount) throw new Fault(404, 'session_not_found');
    const s = r.rows[0];
    this.authorize(actor, s.patient);
    if (s.context.draftScope && s.context.draftScope !== this.draftScope(actor)) throw new Fault(404, 'session_not_found');
    if (!renewing && this.now() - new Date(s.created_at).getTime() > 5 * 60_000) throw new Fault(409, 'session_expired');
    const release = this.release(s.release_name);
    if (digest(release) !== s.release_hash) throw new Fault(409, 'release_changed');
    const workflow = release.workflows[str(s.workflow)];
    if (!workflow) throw new Fault(409, 'release_changed');
    this.requireMarUnit(actor, workflow);
    return { s, release, workflow };
  }
  private sourceBundle(bundle: Obj, context: Obj) {
    return context.taskId ? { ...bundle, entry: objs(bundle.entry).filter((e: Obj) => obj(e.resource).resourceType !== 'Task' || obj(e.resource).id === context.taskId) } : bundle;
  }
  private async reconstruct(actor: Actor, release: Release, patient: Obj, s: Obj, screens = false) {
    // Interaction previews may reuse native caches. Command screen comparison
    // always replays: cached state cannot establish the newly displayed steps.
    if (!screens && s.native_state && s.native_facts && s.native_display && s.native_version === s.base_version)
      return { base: { spec: release.spec, program: release.program, user: actor.user,
        facts: s.native_facts, display: s.native_display }, state: obj(s.native_state), frames: [] };
    const project = release.workflows[str(s.workflow)]?.project;
    const chart = this.sourceBundle(obj(obj(patient).bundle), obj(s.context));
    const directory = project ? await this.directory(actor) : undefined;
    const projection = await this.lean.call('facts', { bundle: chart, context: s.context,
      ...(directory ? { worldContext: { ...directory, entry: directory.entry.filter((e: Obj) =>
        !obj(s.context).taskId || obj(e.resource).resourceType !== 'Task' || maybeObj(obj(e.resource).for)?.reference !== `Patient/${patient.patient}` || obj(e.resource).id === obj(s.context).taskId) }, ...extraActivities(obj(s.context)) } : {}) });
    let base = { spec: release.spec, program: release.program, user: actor.user, facts: projection.facts, display: projection.display };
    const selection = project && obj(release.program).patientSelection;
    const workspace = selection ? await this.lean.call('facts', { bundle: directory, directoryOnly: true, context: { ...obj(s.context), today: obj(s.context).directoryDate ?? obj(s.context).today }, ...extraActivities(obj(s.context)) }) : undefined;
    if (workspace) base = { ...base, ...workspace };
    let state = maybeObj(obj(s.context).workspaceState) ?? await this.lean.call('init', base);
    const frames: { step: number; phase: 'ready' | 'loading'; hash: string }[] = [];
    const record = async (step: number, phase: 'ready' | 'loading') => {
      if (!screens || step < num(s.screen_start)) return;
      const rendered = await this.lean.call('render-screen', { ...base, state });
      frames.push({ step, phase, hash: createHash('sha256').update(str(rendered.canonical), 'utf8').digest('hex') });
    };
    await record(0, 'ready');
    for (const [index, event] of objs(s.events).entries()) {
      // Trusted host metadata is replayed, never re-read from the wall clock.
      if (Number.isSafeInteger(event.entryEpochMinute)) base = { ...base, facts: { ...obj(base.facts), epochMinute: event.entryEpochMinute } };
      const before = maybeObj(state.patientContext)?.patient;
      state = obj((await this.lean.call('step', { ...base, state, event: clinicalEvent(event) })).state);
      if (selection && maybeObj(state.patientContext)?.patient !== before) {
        if (maybeObj(state.patientContext)?.patient && obj(state.patientContext).patient !== patient.patient) throw new Fault(422, 'session_patient_mismatch');
        if (maybeObj(state.patientContext)?.patient) await record(index + 1, 'loading');
        base = { ...base, ...(maybeObj(state.patientContext)?.patient ? projection : workspace) };
        if (Number.isSafeInteger(event.entryEpochMinute)) base = { ...base, facts: { ...obj(base.facts), epochMinute: event.entryEpochMinute } };
        if (maybeObj(state.patientContext)?.patient) state = obj((await this.lean.call('step', { ...base, state, event: { scroll: { screen: state.screen } } })).state);
      }
      await record(index + 1, 'ready');
    }
    return { base, state, frames };
  }
  async event(actor: Actor, id: string, input: { revision: number; event: Obj }) {
    return transaction(this.db, async c => {
      const { s, release, workflow } = await this.session(c, actor, id);
      if (s.revision !== input.revision) throw new Fault(409, 'session_revision_conflict');
      const p = await this.stream(c, `patient:${s.patient}`, true);
      if (s.base_version !== p.version) throw new Fault(409, 'version_conflict');
      if (s.events.length >= 256) throw new Fault(422, 'session_event_limit');
      const replay = await this.reconstruct(actor, release, p.snapshot, s);
      // Discard caller metadata: the service owns every interaction timestamp.
      const event = { ...input.event, entryEpochMinute: Math.floor(this.now() / 60000) };
      const base = { ...replay.base, facts: { ...obj(replay.base.facts), epochMinute: event.entryEpochMinute } };
      const state = replay.state;
      const next = await this.lean.call('step', { ...base, state, event: clinicalEvent(event) });
      // Reject effects of the human event before chart hydration. Hydration can
      // restore this actor's already-persisted receipts from the locked chart;
      // those are not new reviews and must not prevent opening the patient.
      if (digest(obj(next.state).commits) !== digest(state.commits) || (workflow.project && digest(obj(next.state).receipts) !== digest(state.receipts))) throw new Fault(422, 'use_commit_endpoint');
      let cacheFacts: unknown = base.facts;
      let display = base.display;
      if (workflow.project && release.program.patientSelection && maybeObj(state.patientContext)?.patient !== maybeObj(obj(next.state).patientContext)?.patient) {
        const hydrated = await this.reconstruct(actor, release, p.snapshot, { ...s, native_state: null, events: [...s.events, event] });
        next.state = hydrated.state; cacheFacts = hydrated.base.facts; display = hydrated.base.display;
      }
      // Events have revision CAS; an uncertain response is recovered by opening a
      // new session and reviewing again, never by blindly replaying an event.
      await c.query('UPDATE commit_sessions SET events=$3,revision=revision+1,native_state=$4,native_facts=$5,native_version=$6,native_display=$7 WHERE tenant=$1 AND id=$2',
        [this.config.tenant, id, JSON.stringify([...s.events, event]), next.state, cacheFacts, p.version, display]);
      return { revision: s.revision + 1, ...next, state: obj(next.state), projection: { facts: cacheFacts, display } };
    });
  }
  async submit(actor: Actor, command: Command): Promise<{ status: number; body: Obj }> {
    const trace = protocolTrace(actor, command, this.config.tenant, this.config.adt);
    const result = await transaction(this.db, async c => {
      const t = this.config.tenant;
      const hash = digest(command);
      // Unique key serializes duplicate requests even across independent hosts.
      await c.query('INSERT INTO commit_requests(tenant,actor,request_id,payload_hash) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [t, actor.user.id, command.requestId, hash]);
      const request = (await c.query('SELECT * FROM commit_requests WHERE tenant=$1 AND actor=$2 AND request_id=$3 FOR UPDATE',
        [t, actor.user.id, command.requestId])).rows[0];
      trace?.emit('request-locked');
      if (request.payload_hash !== hash) throw new Fault(409, 'idempotency_payload_conflict');
      if (request.outcome) {
        if (!request.patient) throw new Fault(409, 'outcome_requires_reconciliation');
        this.authorize(actor, request.patient);
        trace?.emit('replay', { status: request.outcome.status, answer: digest(request.outcome) });
        return request.outcome;
      }
      const finish = async (status: number, body: Obj) => {
        const result = { status, body };
        trace?.emit('finish', { status, reason: body.reason, answer: digest(result) });
        await c.query('UPDATE commit_requests SET outcome=$4,patient=$5 WHERE tenant=$1 AND actor=$2 AND request_id=$3',
          [t, actor.user.id, command.requestId, result, s.patient]);
        return result;
      };
      const { s, release, workflow } = await this.session(c, actor, command.sessionId);
      const key = workflow.mar && command.commit && command.commit !== 'administerMed' ? undefined : sharedKey(s.patient, workflow);
      const placement = workflow.project && ['disposition','recordAdmission','discharge'].includes(command.commit ?? workflow.commit);
      const keys = [...new Set([`patient:${s.patient}`, ...(key ? [key] : []), ...(placement ? boardKeys(this.config) : [])])].sort();
      const streams = new Map<string, Obj>();
      trace?.emit('plan', { patient: trace.key(`patient:${s.patient}`), keys: keys.map(k => trace.key(k)),
        sessionVersion: s.base_version, sessionRevision: s.revision });
      for (const k of keys) {
        const stream = await this.stream(c, k, true);
        streams.set(k, placement && boardKeys(this.config).includes(k) ? normalizeAdtStream(stream) : stream);
        trace?.emit('lock', { key: trace.key(k) });
      }
      const p = required(streams.get(`patient:${s.patient}`));
      const resource = key ? required(streams.get(key)) : undefined;
      trace?.emit('read', { patient: trace.key(`patient:${s.patient}`),
        keys: keys.map(k => trace.key(k)),
        versions: keys.map(k => [trace.key(k), required(streams.get(k)).version]),
        baseline: keys.map(k => [trace.key(k), required(streams.get(k)).kind === 'patient' ? 1 : 0]),
        expected: keys.map(k => [trace.key(k), k === `patient:${s.patient}` ? command.expectedVersion :
          k === key ? command.expectedSharedVersion : command.expectedBoard?.find(v => v.key === k)?.version ?? required(streams.get(k)).version]),
        sessionVersion: s.base_version, sessionRevision: s.revision,
        ...(placement && this.config.adt ? { adtBoard: trace.board(boardFrom(this.config, streams).state),
          expectedBoard: command.expectedBoard?.map(v => ({ ...v, key: trace.key(v.key) })) } : {}),
        cacheVersion: s.native_version, cacheHit: Boolean(s.native_state && s.native_facts && s.native_version === s.base_version),
        ...(key ? { action: sharedAction(actor, { modelId: num(obj(p.snapshot).modelId) }, workflow) } : {}) });
      if (s.revision !== command.revision || s.base_version !== p.version || p.version !== command.expectedVersion ||
          (resource && resource.version !== command.expectedSharedVersion) || (!resource && command.expectedSharedVersion !== undefined))
        return finish(409, { outcome: 'conflict', reason: 'version_conflict', version: p.version });
      const { state, frames } = await this.reconstruct(actor, release, obj(obj(p).snapshot), s, true);
      const mismatch = verifyScreens(command, frames);
      trace?.emit('screens', { valid: !mismatch });
      const requireScreens = () => {
        if (!mismatch) return;
        trace?.emit('screen-refused');
        console.error(JSON.stringify({ diagnostic: 'screen_fingerprint_mismatch', requestId: command.requestId,
          release: s.release_name, releaseHash: s.release_hash, patientVersion: p.version, ...mismatch }));
        // Throw rolls back even the request reservation: corrected evidence may
        // retry the same ID, and no clinical event or projection is appended.
        throw new Fault(422, 'screen_fingerprint_mismatch');
      };
      const commit = command.commit ?? workflow.commit;
      if (commit !== workflow.commit && !workflow.commits?.includes(commit)) return finish(422, { outcome: 'rejected', reason: 'unsupported_command' });
      const signedAt = this.now();
      const requestInput = {
        spec: release.spec, program: release.program, user: actor.user, patient: s.patient,
        state, event: command.event, commit, currentBundle: this.sourceBundle(obj(obj(p.snapshot).bundle), s.context),
        factsVersions: versions(this.sourceBundle(obj(obj(p.snapshot).bundle), s.context)), context: currentContext(s.context, signedAt),
      };
      const decision = await this.lean.call(commit === 'markReviewed' && workflow.project ? 'review-check' : 'commit-check', requestInput);
      trace?.emit('native', { accept: Boolean(decision.accept), version: p.version });
      if (!decision.accept) {
        // A reordered journal can invalidate the guard as well as the display.
        // Report its screen fault; ordinary guard refusals remain unchanged.
        requireScreens();
        return finish(422, { outcome: 'rejected', reason: maybeObj(decision.reject)?.reason ?? 'invalid_decision' });
      }

      const transactionId = randomUUID();
      const selectedBed = command.bed ? this.config.adt?.beds.find(b => b.resource === command.bed)?.id : s.context.bed;
      if (command.bed && selectedBed === undefined) return finish(422, { outcome: 'rejected', reason: 'bed_not_configured' });
      let clinicalAdt: Obj | undefined;
      let clinicalInput: Obj | undefined;
      const actionKind = placement ? clinicalAction(commit, obj(obj(decision.accept).state)) : undefined;
      if (actionKind && this.config.adt?.patients.includes(s.patient) && (actionKind === 'admit' || maybeObj(obj(p.snapshot).adt)?.admitted)) {
        const board = boardFrom(this.config, streams);
        if (digest(board.versions) !== digest(command.expectedBoard)) return finish(409, { outcome: 'conflict', reason: 'version_conflict' });
        const role = actor.adtRoles?.find(r => actionKind === 'admit' || r !== 'admittingClerk');
        if (!role) return finish(403, { outcome: 'rejected', reason: 'adt_role_required' });
        if (actionKind === 'admit' && selectedBed === undefined) return finish(422, { outcome: 'rejected', reason: 'bed_required' });
        clinicalInput = { ...board, expected: command.expectedBoard, role,
          command: actionKind === 'admit' ? { admit: { patient: s.patient, bed: selectedBed } } : { discharge: { patient: s.patient } } };
        clinicalAdt = await this.lean.call('adt-commit', clinicalInput);
        trace?.emit('adt-decision', { input: trace.adtInput(clinicalInput), accept: !clinicalAdt.rejected,
          board: clinicalAdt.rejected ? undefined : trace.board(clinicalAdt.state) });
        if (clinicalAdt.rejected) return finish(422, { outcome: 'rejected', reason: clinicalAdt.rejected });
      } else if (actionKind === 'admit') return finish(422, { outcome: 'rejected', reason: 'patient_not_on_bed_board' });
      let projection: Obj | undefined;
      const projecting = workflow.project || workflow.mar && commit !== 'administerMed';
      if (projecting) {
        try { projection = projectCommand(obj(obj(p).snapshot), release, s.context, actor, commit, obj(obj(decision.accept).state), transactionId, clinicalAdt ? { state: obj(clinicalAdt.state), config: this.config, bed: selectedBed } : undefined, obj(decision.accept).entryTimes); }
        catch (error) { if (error instanceof Fault) return finish(error.status, { outcome: 'rejected', reason: error.message }); throw error; }
      }
      let mar: Obj | undefined;
      let marInput: Obj | undefined;
      if (workflow.mar && commit === 'administerMed') {
        this.requireMarUnit(actor, workflow);
        this.requireMarBinding(obj(obj(p).snapshot), workflow);
        if (actor.user.role !== 'rn' || workflow.shared?.kind !== 'dose') throw new Fault(403, 'role_forbidden');
        const capture = objs(obj(obj(decision.accept).state).captured).find((c: Obj) => c.element === 'highAlertCosign' && c.confirmed);
        if (capture) {
          const cosigner = maybeObj(maybeObj(capture.value)?.user)?.u;
          const consent = await c.query(`SELECT signer FROM commit_mar_cosigns WHERE tenant=$1 AND patient=$2 AND workflow=$3
            AND release_name=$4 AND patient_version=$5 AND signer=$6 AND expires_at>now() AND release_hash=$7`,
            [t, s.patient, s.workflow, s.release_name, p.version, cosigner, s.release_hash]);
          if (!cosigner || cosigner === actor.user.id || !consent.rowCount)
            return finish(422, { outcome: 'rejected', reason: 'An independent nurse must authenticate and cosign this dose version.' });
        }
        marInput = { state: obj(p.snapshot).mar ?? { shared: emptyShared(), events: [] }, version: p.version,
          expectedVersion: command.expectedVersion, actor: actor.modelId,
          dose: { patient: obj(p.snapshot).modelId, order: workflow.shared.order, occurrence: workflow.shared.occurrence },
          request: requestInput, medicationRequest: workflow.mar.medicationRequest, encounter: workflow.mar.encounter,
          time: new Date().toISOString(), resourceId: transactionId };
        mar = await this.lean.call('mar-commit', marInput);
        if (mar.rejected) {
          const consumed = mar.rejected === 'dose_already_administered';
          return finish(consumed ? 409 : 422, { outcome: consumed ? 'conflict' : 'rejected', reason: mar.rejected, version: p.version });
        }
      }
      let multi: Obj | undefined;
      let action: Obj | undefined;
      if (resource && (!mar || objs(mar.events).some((e: Obj) => e.administered))) {
        action = sharedAction(actor, { modelId: num(obj(p.snapshot).modelId) }, workflow);
        multi = await this.lean.call('multi-step', { state: resource.snapshot, action });
        if (!multi.changed) return finish(409, { outcome: 'conflict', reason: 'shared_guard' });
      }
      if (resource && !multi) multi = { state: resource.snapshot };
      requireScreens();
      const readVersions = Object.fromEntries(keys.map(k => [k, required(streams.get(k)).version]));
      // Retain the exact internal input and decision for independent replay.
      const event = { kind: 'command', actor: actor.user.id, requestId: command.requestId,
        releaseHash: s.release_hash, screens: command.screens, session: { id: s.id, revision: s.revision, context: s.context, events: s.events },
        readVersions, guard: { input: requestInput, decision },
        ...(projection ? { projection } : {}),
        ...(clinicalAdt ? { clinicalAdt: { input: clinicalInput, accepted: clinicalAdt } } : {}),
        ...(mar ? { mar: { input: marInput, accepted: mar } } : {}),
        ...(resource ? { shared: { key, before: resource.snapshot, action, after: required(multi).state } } : {}) };
      trace?.emit('stage');
      for (const k of keys) {
        const stream = required(streams.get(k));
        let snapshot = stream.snapshot;
        if (k === `patient:${s.patient}`) snapshot = { ...obj(p.snapshot),
          lastCommand: { transactionId, commit, state: obj(decision.accept).state },
          ...(projection ? { bundle: projection.bundle } : {}),
          ...(mar ? { mar: mar.state, bundle: { ...obj(obj(p.snapshot).bundle),
            entry: [...objs(obj(obj(p.snapshot).bundle).entry), { resource: mar.resource }] } } : {}) };
        if (k === key) snapshot = required(multi).state;
        if (clinicalAdt) snapshot = stream.kind === 'patient' ? { ...obj(snapshot),
          adt: objs(obj(clinicalAdt.state).patients).find((p: Obj) => `patient:${p.id}` === k),
          bundle: projectAdt(obj(snapshot), required(objs(obj(clinicalAdt.state).patients).find((p: Obj) => `patient:${p.id}` === k)), this.config, transactionId, new Date().toISOString(),
            { ...(k === `patient:${s.patient}` ? { encounterId: str(s.context.encounterId) } : {}) }) } : objs(obj(clinicalAdt.state).beds).find((b: Obj) => `bed:${b.id}` === k);
        if (k !== `patient:${s.patient}` && digest(snapshot) === digest(stream.snapshot)) continue;
        const updated = await c.query('UPDATE commit_streams SET version=version+1,snapshot=$4 WHERE tenant=$1 AND key=$2 AND version=$3 RETURNING version',
          [t, k, stream.version, snapshot]);
        if (!updated.rowCount) throw new Error('locked stream CAS failed');
        if (this.config.adt) trace?.emit('update', { key: trace.key(k) });
        await c.query('INSERT INTO commit_events(tenant,stream,version,transaction_id,event) VALUES($1,$2,$3,$4,$5)',
          [t, k, num(stream.version) + 1, transactionId, k === `patient:${s.patient}` ? event : k === key ? { kind: action ? 'shared' : 'shared-noop', readVersions, ...(action ? { action } : {}), state: required(multi).state } : { kind: 'clinical-adt', actor: actor.user.id, requestId: command.requestId, input: clinicalInput, accepted: clinicalAdt }]);
        trace?.emit('write', { key: trace.key(k), before: stream.version, after: num(stream.version) + 1, projection: digest(snapshot) });
      }
      if (projecting) await c.query('UPDATE commit_sessions SET base_version=$3,events=$4,screen_start=jsonb_array_length($4::jsonb),revision=revision+1,native_state=NULL,native_facts=NULL,native_version=NULL,native_display=NULL WHERE tenant=$1 AND id=$2',
        [t, s.id, p.version + 1, JSON.stringify([...s.events, { ...command.event, entryEpochMinute: Math.floor(signedAt / 60000) }])]);
      const refreshed = projecting ? await this.stream(c, `patient:${s.patient}`) : undefined;
      const screenProjection = projecting ? await this.lean.call('facts', {
        bundle: this.sourceBundle(required(refreshed).snapshot.bundle, s.context), context: s.context,
        ...(workflow.project ? { worldContext: await this.directory(actor, c), ...extraActivities(obj(s.context)) } : {}),
      }) : undefined;
      if (screenProjection) screenProjection.facts = { ...obj(screenProjection.facts), epochMinute: Math.floor(signedAt / 60000) };
      await c.query("SELECT pg_notify('vgi_commit', 'changed')");
      return finish(201, { outcome: 'persisted', transactionId, version: p.version + 1, revision: s.revision + 1,
        ...(clinicalAdt ? { board: boardKeys(this.config).map(key => ({ key, version: num(required(streams.get(key)).version) + (key === `patient:${s.patient}` || required(streams.get(key)).kind === 'bed' && digest(required(streams.get(key)).snapshot) !== digest(objs(obj(clinicalAdt.state).beds).find((b: Obj) => `bed:${b.id}` === key)) ? 1 : 0) })) } : {}),
        ...(projection ? { links: objs(projection.changed).map((r: Obj) => `/commit/patients/${s.patient}/resources/${r.resourceType}/${r.id}/${obj(r.meta).versionId}`) } : {}),
        ...(resource ? { sharedVersion: num(resource.version) + 1 } : {}), state: obj(decision.accept).state, ...(screenProjection ? { screenProjection } : {}), ...(mar ? { mar: mar.events } : {}) });
    }, trace);
    trace?.emit('respond', { status: result.status, answer: digest(result) });
    return result;

  }
}
