import pg, { type PoolClient } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Lean } from './lean.ts';
import { Fault, digest, emptyShared, sharedKey, sharedAction, type Actor, type Command, type Config, type Obj, type Patient } from './types.ts';

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
    return transaction(this.db, async c => {
      await c.query('INSERT INTO commit_streams(tenant,key,kind,version,snapshot) VALUES($1,$2,\'patient\',1,$3)',
        [this.config.tenant, `patient:${patient.patient}`, patient]);
      await c.query('INSERT INTO commit_events(tenant,stream,version,transaction_id,event) VALUES($1,$2,1,$3,$4)',
        [this.config.tenant, `patient:${patient.patient}`, randomUUID(), { kind: 'import', patient }]);
      for (const r of Object.values(this.config.releases)) for (const w of Object.values(r.workflows)) {
        const key = sharedKey(patient.patient, w);
        if (key) await c.query('INSERT INTO commit_streams(tenant,key,kind,snapshot) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
          [this.config.tenant, key, w.shared!.kind === 'dose' ? 'dose' : 'bed', emptyShared()]);
      }
      await c.query("SELECT pg_notify('vgi_commit', 'changed')");
    });
  }
  async read(actor: Actor, patient: string, after = 0) {
    this.authorize(actor, patient);
    // Snapshot and suffix come from one MVCC statement (no torn read).
    const r = await this.db.query(`SELECT s.version,s.snapshot,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('version', e.version, 'transactionId', e.transaction_id,
        'event', e.event) ORDER BY e.version) FROM (SELECT * FROM commit_events e WHERE e.tenant=s.tenant AND e.stream=s.key
        AND e.version>$3 AND e.version<=s.version ORDER BY e.version LIMIT 128) e), '[]'::jsonb) AS events
      FROM commit_streams s WHERE s.tenant=$1 AND s.key=$2`, [this.config.tenant, `patient:${patient}`, after]);
    if (!r.rowCount) throw new Fault(404, 'stream_not_provisioned');
    return r.rows[0];
  }
  async outcome(actor: Actor, requestId: string) {
    const r = await this.db.query('SELECT outcome,patient FROM commit_requests WHERE tenant=$1 AND actor=$2 AND request_id=$3',
      [this.config.tenant, actor.user.id, requestId]);
    if (!r.rowCount) throw new Fault(404, 'request_not_found');
    if (!r.rows[0].patient) throw new Fault(409, 'outcome_requires_reconciliation');
    this.authorize(actor, r.rows[0].patient);
    return r.rows[0].outcome;
  }
  async openSession(actor: Actor, input: { patient: string; release: string; workflow: string }) {
    this.authorize(actor, input.patient);
    const release = this.release(input.release);
    const w = release.workflows[input.workflow];
    if (!Object.hasOwn(release.workflows, input.workflow) || !w) throw new Fault(404, 'workflow_not_found');
    return transaction(this.db, async c => {
      // Hold the same row lock used by commits so session snapshot/version agree.
      const p = await this.stream(c, `patient:${input.patient}`, true);
      const context = currentContext(p.snapshot.context);
      const facts = await this.lean.call('facts', { bundle: p.snapshot.bundle, context });
      const state = await this.lean.call('init', { ...release, facts: facts.facts, user: actor.user });
      const id = randomUUID();
      await c.query(`INSERT INTO commit_sessions(tenant,id,actor,patient,release_name,release_hash,workflow,base_version,context)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [this.config.tenant, id, actor.user.id, input.patient, input.release, digest(release), input.workflow, p.version, context]);
      const key = sharedKey(input.patient, w);
      const resource = key ? await this.stream(c, key) : undefined;
      return { sessionId: id, revision: 0, version: p.version, state, facts: facts.facts,
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
    return { s, release, workflow: release.workflows[s.workflow] };
  }
  private async reconstruct(actor: Actor, release: Obj, patient: Obj, s: Obj) {
    const facts = await this.lean.call('facts', { bundle: patient.bundle, context: s.context });
    const base = { spec: release.spec, program: release.program, user: actor.user, facts: facts.facts };
    let state = await this.lean.call('init', base);
    for (const event of s.events) state = (await this.lean.call('step', { ...base, state, event })).state;
    return { base, state };
  }
  async event(actor: Actor, id: string, input: { revision: number; event: Obj }) {
    return transaction(this.db, async c => {
      const { s, release } = await this.session(c, actor, id);
      if (s.revision !== input.revision) throw new Fault(409, 'session_revision_conflict');
      const p = await this.stream(c, `patient:${s.patient}`, true);
      if (s.base_version !== p.version) throw new Fault(409, 'version_conflict');
      if (s.events.length >= 256) throw new Fault(422, 'session_event_limit');
      const { base, state } = await this.reconstruct(actor, release, p.snapshot, s);
      const next = await this.lean.call('step', { ...base, state, event: input.event });
      if (digest(next.state.commits) !== digest(state.commits)) throw new Fault(422, 'use_commit_endpoint');
      // Events have revision CAS; an uncertain response is recovered by opening a
      // new session and reviewing again, never by blindly replaying an event.
      await c.query('UPDATE commit_sessions SET events=$3,revision=revision+1 WHERE tenant=$1 AND id=$2',
        [this.config.tenant, id, JSON.stringify([...s.events, input.event])]);
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
      const key = sharedKey(s.patient, workflow);
      const keys = [`patient:${s.patient}`, ...(key ? [key] : [])].sort();
      const streams = new Map<string, Obj>();
      for (const k of keys) streams.set(k, await this.stream(c, k, true));
      const p = streams.get(`patient:${s.patient}`)!;
      const resource = key ? streams.get(key)! : undefined;
      if (s.revision !== command.revision || s.base_version !== p.version || p.version !== command.expectedVersion ||
          (resource && resource.version !== command.expectedSharedVersion) || (!resource && command.expectedSharedVersion !== undefined))
        return finish(409, { outcome: 'conflict', reason: 'version_conflict', version: p.version });
      const { state } = await this.reconstruct(actor, release, p.snapshot, s);
      const requestInput = {
        spec: release.spec, program: release.program, user: actor.user, patient: s.patient,
        state, event: command.event, commit: workflow.commit, currentBundle: p.snapshot.bundle,
        factsVersions: versions(p.snapshot.bundle), context: currentContext(s.context),
      };
      const decision = await this.lean.call('commit-check', requestInput);
      if (!decision.accept) return finish(422, { outcome: 'rejected', reason: decision.reject?.reason ?? 'invalid_decision' });
      let multi: Obj | undefined;
      let action: Obj | undefined;
      if (resource) {
        action = sharedAction(actor, p.snapshot, workflow);
        multi = await this.lean.call('multi-step', { state: resource.snapshot, action });
        if (!multi.changed) return finish(409, { outcome: 'conflict', reason: 'shared_guard' });
      }
      const transactionId = randomUUID();
      const readVersions = Object.fromEntries(keys.map(k => [k, streams.get(k)!.version]));
      // Retain the exact internal input and decision for independent replay.
      const event = { kind: 'command', actor: actor.user.id, requestId: command.requestId,
        releaseHash: s.release_hash, session: { id: s.id, revision: s.revision, context: s.context, events: s.events },
        readVersions, guard: { input: requestInput, decision },
        ...(resource ? { shared: { key, before: resource.snapshot, action, after: multi!.state } } : {}) };
      for (const k of keys) {
        const stream = streams.get(k)!;
        const snapshot = k === key ? multi!.state : { ...p.snapshot,
          lastCommand: { transactionId, commit: workflow.commit, state: decision.accept.state } };
        const updated = await c.query('UPDATE commit_streams SET version=version+1,snapshot=$4 WHERE tenant=$1 AND key=$2 AND version=$3 RETURNING version',
          [t, k, stream.version, snapshot]);
        if (!updated.rowCount) throw new Error('locked stream CAS failed');
        await c.query('INSERT INTO commit_events(tenant,stream,version,transaction_id,event) VALUES($1,$2,$3,$4,$5)',
          [t, k, stream.version + 1, transactionId, k === key ? { kind: 'shared', readVersions, action, state: multi!.state } : event]);
      }
      await c.query("SELECT pg_notify('vgi_commit', 'changed')");
      return finish(201, { outcome: 'persisted', transactionId, version: p.version + 1,
        ...(resource ? { sharedVersion: resource.version + 1 } : {}), state: decision.accept.state });
    });
  }
}
