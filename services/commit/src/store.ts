import { boardKeys, boardFrom, clinicalAction, projectAdt } from './clinical-adt.ts';
import { projectCommand, storedReviewReceipts } from './projection.ts';
import pg, { type PoolClient } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Lean } from './lean.ts';
import { clinicalPersona, Fault, digest, emptyShared, sharedKey, sharedAction, type Actor, type Command, type Config, type Obj, type Patient } from './types.ts';

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
export async function transaction<T>(db: pg.Pool, f: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await db.connect();
  let broken = false;
  try {
    await c.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    await c.query("SET LOCAL lock_timeout = '5s'");
    await c.query("SET LOCAL statement_timeout = '15s'");
    await c.query("SET LOCAL idle_in_transaction_session_timeout = '30s'");
    await c.query('SET LOCAL synchronous_commit = on');
    const out = await f(c);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    try { await c.query('ROLLBACK'); } catch { broken = true; }
    throw e;
  } finally { c.release(broken); }
}

/** This vector is evidence of the session's displayed snapshot, never authority
 * to replace the current snapshot read under the patient lock. */
export function versions(bundle: Obj) {
  if (bundle.resourceType !== 'Bundle' || bundle.type !== 'collection' || !Array.isArray(bundle.entry) ||
      bundle.link?.some((l: Obj) => l.relation === 'next')) throw new Fault(422, 'invalid_bundle');
  const vs = bundle.entry.map((e: Obj) => {
    const r = e.resource;
    if (!r || !/^[A-Za-z]+$/.test(r.resourceType) || !/^[A-Za-z0-9.-]{1,64}$/.test(r.id ?? '') ||
        !/^[A-Za-z0-9.-]{1,64}$/.test(r.meta?.versionId ?? '')) throw new Fault(422, 'missing_resource_version');
    return { url: `${r.resourceType}/${r.id}`, version: r.meta.versionId as string };
  });
  if (new Set(vs.map((v: Obj) => v.url)).size !== vs.length) throw new Fault(422, 'duplicate_resource');
  return vs;
}

export function currentContext(context: Obj) {
  const now = new Date();
  return { ...context, today: now.toISOString().slice(0, 10), now: now.getUTCHours() * 60 + now.getUTCMinutes() };
}

export class Store {
  db: pg.Pool;
  lean: Lean;
  config: Config;
  constructor(db: pg.Pool, lean: Lean, config: Config) { this.db = db; this.lean = lean; this.config = config; }
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
    const states = new Map(beds.map(row => [Number(row.key.slice(4)), row.snapshot]));
    return { ...bundle, entry: bundle.entry.map((e: Obj) => {
      const bed = this.config.adt?.beds.find(b => b.resource && b.resource === e.resource.id && e.resource.resourceType === 'Location');
      const state = bed ? states.get(bed.id) : undefined;
      return state ? { ...e, resource: { ...e.resource, operationalStatus: { code: ({ ready: 'U', occupied: 'O', dirty: 'H', cleaning: 'C' } as Obj)[state.phase] } } } : e;
    }) };
  }
  async directory(actor: Actor) {
    // Filter in Postgres before decoding JSON. Loading every complete chart
    // just to paint the worklist needlessly multiplies memory by the cohort.
    const rows = await this.db.query(`SELECT DISTINCT ON (r->>'resourceType',r->>'id') r AS resource
      FROM commit_streams s CROSS JOIN LATERAL jsonb_array_elements(s.snapshot->'bundle'->'entry') e
      CROSS JOIN LATERAL (SELECT e->'resource' AS r) x
      WHERE s.tenant=$1 AND s.kind='patient' AND substring(s.key from 9)=ANY($2)
      AND (r->>'resourceType'=ANY($3) OR (r->>'resourceType'=ANY($4) AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(r->'meta'->'tag','[]'::jsonb)) tag
        WHERE tag->>'system'=ANY($5)))) ORDER BY r->>'resourceType',r->>'id',s.key`,
      [this.config.tenant, actor.patients, ['Patient','Practitioner','Organization','Location','List'],
        ['Appointment','Encounter','Task','ServiceRequest','Procedure','Communication'],
        ['urn:vgi:world:realism','https://vgi-health.example/fhir/sid/world']]);
    const beds = (await this.db.query("SELECT key,snapshot FROM commit_streams WHERE tenant=$1 AND kind='bed'", [this.config.tenant])).rows;
    return this.projectBeds({ resourceType: 'Bundle', type: 'collection', entry: rows.rows.map(row => ({ resource: row.resource })) }, beds);
  }
  async marDirectory(actor: Actor) {
    if (actor.user.role !== 'rn') throw new Fault(403, 'role_forbidden');
    const items = [];
    for (const [release, r] of Object.entries(this.config.releases)) for (const [workflow, w] of Object.entries(r.workflows)) {
      if (!w.mar || !actor.patients.includes(w.mar.patient)) continue;
      if (w.mar.unit && (!this.config.units?.[w.mar.unit]?.marOnService || !actor.units?.includes(w.mar.unit))) continue;
      const p = await this.read(actor, w.mar.patient, 2147483646);
      const resources = p.snapshot.bundle.entry.map((e: Obj) => e.resource);
      const encounter = resources.find((r: Obj) => r.resourceType === 'Encounter' && r.id === w.mar!.encounter);
      const order = resources.find((r: Obj) => r.resourceType === 'MedicationRequest' && r.id === w.mar!.medicationRequest);
      // Directory availability is a read projection; the native MAR command
      // still rechecks the active order/episode under the patient lock.
      if (encounter?.status !== 'in-progress' || order?.status !== 'active') continue;
      items.push({ release, workflow, ...w.mar, version: p.version,
        patientResource: p.snapshot.bundle.entry.find((e: Obj) => e.resource.resourceType === 'Patient')?.resource,
        order: p.snapshot.bundle.entry.find((e: Obj) => e.resource.resourceType === 'MedicationRequest' && e.resource.id === w.mar!.medicationRequest)?.resource,
        administrations: p.snapshot.bundle.entry.filter((e: Obj) => e.resource.resourceType === 'MedicationAdministration' &&
          e.resource.request?.reference === `MedicationRequest/${w.mar!.medicationRequest}` &&
          e.resource.extension?.some((extension: Obj) => {
            if (extension.url !== 'urn:vgi:scheduled-dose' || w.shared?.kind !== 'dose') return false;
            // Exact source identity routing only; status/consumption is reduced in Lean.
            const dose = JSON.parse(extension.valueString);
            return dose.patient === p.snapshot.modelId && dose.order === w.shared.order && dose.occurrence === w.shared.occurrence;
          })).map((e: Obj) => e.resource) });
    }
    return { items };
  }
  requireMarUnit(actor: Actor, w: Obj) {
    if (w.mar?.unit && (!this.config.units?.[w.mar.unit]?.marOnService || !actor.units?.includes(w.mar.unit)))
      throw new Fault(403, 'mar_unit_disabled_or_forbidden');
  }
  private requireMarBinding(snapshot: Obj, workflow: Obj) {
    if (workflow.mar && !(snapshot.marBindings ?? []).some((b: Obj) => digest(b) === digest({ shared: workflow.shared, mar: workflow.mar })))
      throw new Fault(409, 'scheduled_binding_changed');
  }
  private async workflowContext(context: Obj, w: Obj, bundle: Obj, initial = false) {
    if (!w.mar) return currentContext(context);
    const resolved = currentContext({ ...context, encounterKind: 'inpatient', encounterId: w.mar.encounter,
      record: [...(context.record ?? []).filter(([k]: string[]) => !['selectedMedicationRequestId', 'selectedEncounterId'].includes(k)),
        ['selectedMedicationRequestId', w.mar.medicationRequest], ['selectedEncounterId', w.mar.encounter]] });
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
    const patients = patient.bundle.entry.filter((e: Obj) => e.resource.resourceType === 'Patient');
    if (patients.length !== 1 || patients[0].resource.id !== patient.patient) throw new Fault(422, 'patient_mismatch');
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
          [this.config.tenant, key, w.shared!.kind === 'dose' ? 'dose' : 'bed', emptyShared()]);
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
    if (!fullBoardAccess) row.events = row.events.map((e: Obj) => !['adt', 'clinical-adt'].includes(e.event.kind) ? (e.event.clinicalAdt ? { ...e, event: { ...e.event, clinicalAdt: undefined, readVersions: { [`patient:${patient}`]: e.event.readVersions?.[`patient:${patient}`] } } } : e) : { ...e,
      event: { kind: e.event.kind, actor: e.event.actor, requestId: e.event.requestId, command: e.event.input.command,
        patient: e.event.accepted.state.patients.find((p: Obj) => p.id === patient) } });
    return row;
  }
  async resource(actor: Actor, patient: string, type: string, id: string, version: string) {
    const current = await this.read(actor, patient, 2147483646);
    const found = current.snapshot.bundle.entry.find((e: Obj) => e.resource.resourceType === type && e.resource.id === id && e.resource.meta?.versionId === version)?.resource;
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
  async openSession(actor: Actor, input: { patient: string; release: string; workflow: string; expectedVersion?: number; encounter?: string; task?: string; bed?: string }) {
    this.authorize(actor, input.patient);
    const release = this.release(input.release);
    const w = release.workflows[input.workflow];
    if (!Object.hasOwn(release.workflows, input.workflow) || !w) throw new Fault(404, 'workflow_not_found');
    if (!['rn', 'physician', 'np', 'surgeon'].includes(actor.user.role)) throw new Fault(403, 'role_forbidden');
    this.requireMarUnit(actor, w);
    if (w.mar && (actor.user.role !== 'rn' || w.mar.patient !== input.patient)) throw new Fault(403, 'mar_scope_forbidden');
    return transaction(this.db, async c => {
      // Hold the same row lock used by commits so session snapshot/version agree.
      const p = await this.stream(c, `patient:${input.patient}`, true);
      this.requireMarBinding(p.snapshot, w);
      let context: Obj = await this.workflowContext(p.snapshot.context, w, p.snapshot.bundle);
      if (w.project) {
        if (input.expectedVersion !== p.version) throw new Fault(409, 'version_conflict');
        if (input.release !== clinicalPersona(actor) && !input.release.startsWith(`${clinicalPersona(actor)}-`)) throw new Fault(403, 'release_forbidden');
        const resources = p.snapshot.bundle.entry.map((e: Obj) => e.resource);
        const encounter = resources.find((r: Obj) => r.resourceType === 'Encounter' && r.id === (input.encounter ?? context.encounterId));
        if (!encounter || encounter.subject?.reference !== `Patient/${input.patient}`) throw new Fault(422, 'encounter_required');
        const task = input.task ? resources.find((r: Obj) => r.resourceType === 'Task' && r.id === input.task && r.for?.reference === `Patient/${input.patient}`) : undefined;
        if (input.task && (!task || task.encounter?.reference && task.encounter.reference !== `Encounter/${encounter.id}`)) throw new Fault(422, 'task_mismatch');
        const bed = input.bed ? this.config.adt?.beds.find(b => b.resource === input.bed) : undefined;
        if (input.bed && !bed) throw new Fault(422, 'bed_not_configured');
        context = { ...context, receipts: storedReviewReceipts(p.snapshot.bundle, actor, new Date().toISOString()),
          directoryDate: p.snapshot.context.today, bed: bed?.id, encounterId: encounter.id, taskId: task?.id,
          record: [['viewerPersona', clinicalPersona(actor)], ['selectedEncounterId', encounter.id]] };
      }
      const facts = await this.lean.call('facts', { bundle: p.snapshot.bundle, context, ...(w.project ? { worldContext: await this.directory(actor) } : {}) });
      const state = await this.lean.call('init', { ...release, facts: facts.facts, user: actor.user });
      const id = randomUUID();
      await c.query(`INSERT INTO commit_sessions(tenant,id,actor,patient,release_name,release_hash,workflow,base_version,context)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [this.config.tenant, id, actor.user.id, input.patient, input.release, digest(release), input.workflow, p.version, context]);
      const key = sharedKey(input.patient, w);
      const resource = key ? await this.stream(c, key) : undefined;
      const boardRows = w.project && this.config.adt ? (await c.query('SELECT key,version FROM commit_streams WHERE tenant=$1 AND key=ANY($2) ORDER BY key COLLATE \"C\"', [this.config.tenant, boardKeys(this.config)])).rows : undefined;
      return { sessionId: id, revision: 0, version: p.version, state, facts: facts.facts,
        ...(boardRows ? { board: boardRows.map(r => ({ key: r.key, version: r.version })) } : {}),
        ...((w.mar || w.project) ? { projection: facts, spec: release.spec, program: release.program, user: actor.user } : {}),
        ...(resource ? { shared: { key, version: resource.version, state: resource.snapshot } } : {}) };
    });
  }
  private async session(c: PoolClient, actor: Actor, id: string) {
    const r = await c.query('SELECT * FROM commit_sessions WHERE tenant=$1 AND id=$2 AND actor=$3 FOR UPDATE',
      [this.config.tenant, id, actor.user.id]);
    if (!r.rowCount) throw new Fault(404, 'session_not_found');
    const s = r.rows[0];
    this.authorize(actor, s.patient);
    if (Date.now() - new Date(s.created_at).getTime() > 5 * 60_000) throw new Fault(409, 'session_expired');
    const release = this.release(s.release_name);
    if (digest(release) !== s.release_hash) throw new Fault(409, 'release_changed');
    const workflow = release.workflows[s.workflow];
    if (!workflow) throw new Fault(409, 'release_changed');
    this.requireMarUnit(actor, workflow);
    return { s, release, workflow };
  }
  private sourceBundle(bundle: Obj, context: Obj) {
    return context.taskId ? { ...bundle, entry: bundle.entry.filter((e: Obj) => e.resource.resourceType !== 'Task' || e.resource.id === context.taskId) } : bundle;
  }
  private async reconstruct(actor: Actor, release: Obj, patient: Obj, s: Obj) {
    if (s.native_state && s.native_facts && s.native_version === s.base_version)
      return { base: { spec: release.spec, program: release.program, user: actor.user, facts: s.native_facts }, state: s.native_state };
    const project = release.workflows[s.workflow]?.project;
    const chart = this.sourceBundle(patient.bundle, s.context);
    const directory = project ? await this.directory(actor) : undefined;
    const projection = await this.lean.call('facts', { bundle: chart, context: s.context,
      ...(directory ? { worldContext: { ...directory, entry: directory.entry.filter((e: Obj) =>
        !s.context.taskId || e.resource.resourceType !== 'Task' || e.resource.for?.reference !== `Patient/${patient.patient}` || e.resource.id === s.context.taskId) } } : {}) });
    let base = { spec: release.spec, program: release.program, user: actor.user, facts: projection.facts };
    const selection = project && release.program.patientSelection;
    if (selection) base = { ...base, facts: (await this.lean.call('facts', { bundle: directory, directoryOnly: true, context: { ...s.context, today: s.context.directoryDate ?? s.context.today } })).facts };
    let state = await this.lean.call('init', base);
    for (const event of s.events) {
      const before = state.patientContext?.patient;
      state = (await this.lean.call('step', { ...base, state, event })).state;
      if (selection && state.patientContext?.patient !== before) {
        if (state.patientContext?.patient && state.patientContext.patient !== patient.patient) throw new Fault(422, 'session_patient_mismatch');
        base = { ...base, facts: state.patientContext?.patient ? projection.facts :
          (await this.lean.call('facts', { bundle: directory, directoryOnly: true, context: { ...s.context, today: s.context.directoryDate ?? s.context.today } })).facts };
        if (state.patientContext?.patient) state = (await this.lean.call('step', { ...base, state, event: { scroll: { screen: state.screen } } })).state;
      }
    }
    return { base, state };
  }
  async event(actor: Actor, id: string, input: { revision: number; event: Obj }) {
    return transaction(this.db, async c => {
      const { s, release, workflow } = await this.session(c, actor, id);
      if (s.revision !== input.revision) throw new Fault(409, 'session_revision_conflict');
      const p = await this.stream(c, `patient:${s.patient}`, true);
      if (s.base_version !== p.version) throw new Fault(409, 'version_conflict');
      if (s.events.length >= 256) throw new Fault(422, 'session_event_limit');
      const { base, state } = await this.reconstruct(actor, release, p.snapshot, s);
      const next = await this.lean.call('step', { ...base, state, event: input.event });
      let cacheFacts = base.facts;
      if (workflow.project && release.program.patientSelection && state.patientContext?.patient !== next.state.patientContext?.patient) {
        const hydrated = await this.reconstruct(actor, release, p.snapshot, { ...s, native_state: null, events: [...s.events, input.event] });
        next.state = hydrated.state; cacheFacts = hydrated.base.facts;
      }
      if (digest(next.state.commits) !== digest(state.commits) || (workflow.project && digest(next.state.receipts) !== digest(state.receipts))) throw new Fault(422, 'use_commit_endpoint');
      // Events have revision CAS; an uncertain response is recovered by opening a
      // new session and reviewing again, never by blindly replaying an event.
      await c.query('UPDATE commit_sessions SET events=$3,revision=revision+1,native_state=$4,native_facts=$5,native_version=$6 WHERE tenant=$1 AND id=$2',
        [this.config.tenant, id, JSON.stringify([...s.events, input.event]), next.state, cacheFacts, p.version]);
      return { revision: s.revision + 1, ...next };
    });
  }
  async submit(actor: Actor, command: Command): Promise<{ status: number; body: Obj }> {
    return transaction(this.db, async c => {
      const t = this.config.tenant;
      const hash = digest(command);
      // Unique key serializes duplicate requests even across independent hosts.
      await c.query('INSERT INTO commit_requests(tenant,actor,request_id,payload_hash) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [t, actor.user.id, command.requestId, hash]);
      const request = (await c.query('SELECT * FROM commit_requests WHERE tenant=$1 AND actor=$2 AND request_id=$3 FOR UPDATE',
        [t, actor.user.id, command.requestId])).rows[0];
      if (request.payload_hash !== hash) throw new Fault(409, 'idempotency_payload_conflict');
      if (request.outcome) {
        if (!request.patient) throw new Fault(409, 'outcome_requires_reconciliation');
        this.authorize(actor, request.patient);
        return request.outcome;
      }
      const finish = async (status: number, body: Obj) => {
        const result = { status, body };
        await c.query('UPDATE commit_requests SET outcome=$4,patient=$5 WHERE tenant=$1 AND actor=$2 AND request_id=$3',
          [t, actor.user.id, command.requestId, result, s.patient]);
        return result;
      };
      const { s, release, workflow } = await this.session(c, actor, command.sessionId);
      const key = workflow.mar && command.commit && command.commit !== 'administerMed' ? undefined : sharedKey(s.patient, workflow);
      const placement = workflow.project && ['disposition','recordAdmission','discharge'].includes(command.commit ?? workflow.commit);
      const keys = [...new Set([`patient:${s.patient}`, ...(key ? [key] : []), ...(placement ? boardKeys(this.config) : [])])].sort();
      const streams = new Map<string, Obj>();
      for (const k of keys) streams.set(k, await this.stream(c, k, true));
      const p = streams.get(`patient:${s.patient}`)!;
      const resource = key ? streams.get(key)! : undefined;
      if (s.revision !== command.revision || s.base_version !== p.version || p.version !== command.expectedVersion ||
          (resource && resource.version !== command.expectedSharedVersion) || (!resource && command.expectedSharedVersion !== undefined))
        return finish(409, { outcome: 'conflict', reason: 'version_conflict', version: p.version });
      const { state } = await this.reconstruct(actor, release, p.snapshot, s);
      const commit = command.commit ?? workflow.commit;
      if (commit !== workflow.commit && !workflow.commits?.includes(commit)) return finish(422, { outcome: 'rejected', reason: 'unsupported_command' });
      const requestInput = {
        spec: release.spec, program: release.program, user: actor.user, patient: s.patient,
        state, event: command.event, commit, currentBundle: this.sourceBundle(p.snapshot.bundle, s.context),
        factsVersions: versions(this.sourceBundle(p.snapshot.bundle, s.context)), context: currentContext(s.context),
      };
      const decision = await this.lean.call(commit === 'markReviewed' && workflow.project ? 'review-check' : 'commit-check', requestInput);
      if (!decision.accept) return finish(422, { outcome: 'rejected', reason: decision.reject?.reason ?? 'invalid_decision' });
      const transactionId = randomUUID();
      const selectedBed = command.bed ? this.config.adt?.beds.find(b => b.resource === command.bed)?.id : s.context.bed;
      if (command.bed && selectedBed === undefined) return finish(422, { outcome: 'rejected', reason: 'bed_not_configured' });
      let clinicalAdt: Obj | undefined;
      let clinicalInput: Obj | undefined;
      const actionKind = placement ? clinicalAction(commit, decision.accept.state) : undefined;
      if (actionKind && this.config.adt?.patients.includes(s.patient) && (actionKind === 'admit' || p.snapshot.adt?.admitted)) {
        const board = boardFrom(this.config, streams);
        if (digest(board.versions) !== digest(command.expectedBoard)) return finish(409, { outcome: 'conflict', reason: 'version_conflict' });
        const role = actor.adtRoles?.find(r => actionKind === 'admit' || r !== 'admittingClerk');
        if (!role) return finish(403, { outcome: 'rejected', reason: 'adt_role_required' });
        if (actionKind === 'admit' && selectedBed === undefined) return finish(422, { outcome: 'rejected', reason: 'bed_required' });
        clinicalInput = { ...board, expected: command.expectedBoard, role,
          command: actionKind === 'admit' ? { admit: { patient: s.patient, bed: selectedBed } } : { discharge: { patient: s.patient } } };
        clinicalAdt = await this.lean.call('adt-commit', clinicalInput);
        if (clinicalAdt.rejected) return finish(422, { outcome: 'rejected', reason: clinicalAdt.rejected });
      } else if (actionKind === 'admit') return finish(422, { outcome: 'rejected', reason: 'patient_not_on_bed_board' });
      let projection: Obj | undefined;
      const projecting = workflow.project || workflow.mar && commit !== 'administerMed';
      if (projecting) {
        try { projection = projectCommand(p.snapshot, release, s.context, actor, commit, decision.accept.state, transactionId, clinicalAdt ? { state: clinicalAdt.state, config: this.config, bed: selectedBed } : undefined); }
        catch (error) { if (error instanceof Fault) return finish(error.status, { outcome: 'rejected', reason: error.message }); throw error; }
      }
      let mar: Obj | undefined;
      let marInput: Obj | undefined;
      if (workflow.mar && commit === 'administerMed') {
        this.requireMarUnit(actor, workflow);
        this.requireMarBinding(p.snapshot, workflow);
        if (actor.user.role !== 'rn' || workflow.shared?.kind !== 'dose') throw new Fault(403, 'role_forbidden');
        const capture = decision.accept.state.captured.find((c: Obj) => c.element === 'highAlertCosign' && c.confirmed);
        if (capture) {
          const cosigner = capture.value?.user?.u;
          const consent = await c.query(`SELECT signer FROM commit_mar_cosigns WHERE tenant=$1 AND patient=$2 AND workflow=$3
            AND release_name=$4 AND patient_version=$5 AND signer=$6 AND expires_at>now() AND release_hash=$7`,
            [t, s.patient, s.workflow, s.release_name, p.version, cosigner, s.release_hash]);
          if (!cosigner || cosigner === actor.user.id || !consent.rowCount)
            return finish(422, { outcome: 'rejected', reason: 'An independent nurse must authenticate and cosign this dose version.' });
        }
        marInput = { state: p.snapshot.mar ?? { shared: emptyShared(), events: [] }, version: p.version,
          expectedVersion: command.expectedVersion, actor: actor.modelId,
          dose: { patient: p.snapshot.modelId, order: workflow.shared.order, occurrence: workflow.shared.occurrence },
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
      if (resource && (!mar || mar.events.some((e: Obj) => e.administered))) {
        action = sharedAction(actor, p.snapshot, workflow);
        multi = await this.lean.call('multi-step', { state: resource.snapshot, action });
        if (!multi.changed) return finish(409, { outcome: 'conflict', reason: 'shared_guard' });
      }
      if (resource && !multi) multi = { state: resource.snapshot };
      const readVersions = Object.fromEntries(keys.map(k => [k, streams.get(k)!.version]));
      // Retain the exact internal input and decision for independent replay.
      const event = { kind: 'command', actor: actor.user.id, requestId: command.requestId,
        releaseHash: s.release_hash, session: { id: s.id, revision: s.revision, context: s.context, events: s.events },
        readVersions, guard: { input: requestInput, decision },
        ...(projection ? { projection } : {}),
        ...(clinicalAdt ? { clinicalAdt: { input: clinicalInput, accepted: clinicalAdt } } : {}),
        ...(mar ? { mar: { input: marInput, accepted: mar } } : {}),
        ...(resource ? { shared: { key, before: resource.snapshot, action, after: multi!.state } } : {}) };
      for (const k of keys) {
        const stream = streams.get(k)!;
        let snapshot = stream.snapshot;
        if (k === `patient:${s.patient}`) snapshot = { ...p.snapshot,
          lastCommand: { transactionId, commit, state: decision.accept.state },
          ...(projection ? { bundle: projection.bundle } : {}),
          ...(mar ? { mar: mar.state, bundle: { ...p.snapshot.bundle,
            entry: [...p.snapshot.bundle.entry, { resource: mar.resource }] } } : {}) };
        if (k === key) snapshot = multi!.state;
        if (clinicalAdt) snapshot = stream.kind === 'patient' ? { ...snapshot,
          adt: clinicalAdt.state.patients.find((p: Obj) => `patient:${p.id}` === k),
          bundle: projectAdt(snapshot, clinicalAdt.state.patients.find((p: Obj) => `patient:${p.id}` === k), this.config, transactionId, new Date().toISOString()) } : clinicalAdt.state.beds.find((b: Obj) => `bed:${b.id}` === k);
        if (k !== `patient:${s.patient}` && digest(snapshot) === digest(stream.snapshot)) continue;
        const updated = await c.query('UPDATE commit_streams SET version=version+1,snapshot=$4 WHERE tenant=$1 AND key=$2 AND version=$3 RETURNING version',
          [t, k, stream.version, snapshot]);
        if (!updated.rowCount) throw new Error('locked stream CAS failed');
        await c.query('INSERT INTO commit_events(tenant,stream,version,transaction_id,event) VALUES($1,$2,$3,$4,$5)',
          [t, k, stream.version + 1, transactionId, k === `patient:${s.patient}` ? event : k === key ? { kind: action ? 'shared' : 'shared-noop', readVersions, ...(action ? { action } : {}), state: multi!.state } : { kind: 'clinical-adt', actor: actor.user.id, requestId: command.requestId, input: clinicalInput, accepted: clinicalAdt }]);
      }
      if (projecting) await c.query('UPDATE commit_sessions SET base_version=$3,events=$4,revision=revision+1,native_state=NULL,native_facts=NULL,native_version=NULL WHERE tenant=$1 AND id=$2',
        [t, s.id, p.version + 1, JSON.stringify([...s.events, command.event])]);
      await c.query("SELECT pg_notify('vgi_commit', 'changed')");
      return finish(201, { outcome: 'persisted', transactionId, version: p.version + 1, revision: s.revision + 1,
        ...(clinicalAdt ? { board: boardKeys(this.config).map(key => ({ key, version: streams.get(key)!.version + (key === `patient:${s.patient}` || streams.get(key)!.kind === 'bed' && digest(streams.get(key)!.snapshot) !== digest(clinicalAdt.state.beds.find((b: Obj) => `bed:${b.id}` === key)) ? 1 : 0) })) } : {}),
        ...(projection ? { links: projection.changed.map((r: Obj) => `/commit/patients/${s.patient}/resources/${r.resourceType}/${r.id}/${r.meta.versionId}`) } : {}),
        ...(resource ? { sharedVersion: resource.version + 1 } : {}), state: decision.accept.state, ...(mar ? { mar: mar.events } : {}) });
    });
  }
}
