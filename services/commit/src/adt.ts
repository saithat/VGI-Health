import { Fault, digest, maybeObj, obj, objs, required, type Actor, type AdtCommand, type Obj } from './types.ts';
import { normalizeAdtStream, projectAdt } from './clinical-adt.ts';
import { adtBedSchema, adtPatientSchema } from './projection-codecs.ts';
import { protocolTrace } from './protocol-trace.ts';
import { randomUUID } from 'node:crypto';
import { Store, transaction } from './store.ts';

/** Closed-board prototype: lock the complete configured read set in total key
 * order. This also protects negative placement reads across patients/beds.
 * Board size is operator bounded; do not silently extend the set at runtime. */
export class AdtStore {
  store: Store;
  constructor(store: Store) { this.store = store; }
  private definition() {
    if (!this.store.config.adt) throw new Fault(404, 'adt_not_configured');
    return this.store.config.adt;
  }
  private keys() {
    const a = this.definition();
    return [...a.patients.map(p => `patient:${p}`), ...a.beds.map(b => `bed:${b.id}`)].sort();
  }
  authorize(actor: Actor) {
    const a = this.definition();
    const roles = actor.adtRoles ?? [];
    if (!roles.length) throw new Fault(403, 'adt_role_forbidden');
    if (a.patients.some(p => !actor.patients.includes(p)) || a.beds.some(b => !actor.units?.includes(b.unit)))
      throw new Fault(403, 'adt_board_forbidden');
    return roles;
  }
  private board(rows: Obj[]) {
    const keys = this.keys();
    if (rows.length !== keys.length || rows.some((r, i) => r.key !== keys[i])) throw new Fault(409, 'adt_not_provisioned');
    const patients = rows.filter(r => r.kind === 'patient').map(r => adtPatientSchema.parse(obj(r.snapshot).adt));
    const beds = rows.filter(r => r.kind === 'bed').map(r => adtBedSchema.parse(r.snapshot));
    if (patients.some(p => !p) || beds.some(b => obj(b).occupant === undefined)) throw new Fault(409, 'adt_not_provisioned');
    return { state: { patients, beds }, versions: rows.map(r => ({ key: r.key, version: r.version })) };
  }
  async read(actor: Actor) {
    const roles = this.authorize(actor);
    // All streams in ONE primary MVCC statement: a reader never sees a partial transfer.
    const rows = (await this.store.db.query('SELECT key,kind,version,snapshot FROM commit_streams WHERE tenant=$1 AND key=ANY($2::text[]) ORDER BY key COLLATE "C"',
      [this.store.config.tenant, this.keys()])).rows;
    const board = this.board(rows);
    return { ...board, cursor: digest(board.versions), roles };
  }
  /** Privileged initial provisioning only, not a reset/reconciliation endpoint. */
  async provision() {
    const a = this.definition();
    await transaction(this.store.db, async c => {
      // Keep initializers serialized. Online writers cannot provision streams.
      await c.query('SELECT pg_advisory_xact_lock(734592102)');
      const existing = (await c.query('SELECT key,kind,version,snapshot FROM commit_streams WHERE tenant=$1 AND key=ANY($2) ORDER BY key COLLATE "C" FOR UPDATE', [this.store.config.tenant, this.keys()])).rows;
      if (existing.length === this.keys().length && existing.filter(r => r.kind === 'patient').every(r => r.snapshot.adt)) return;
      if (existing.some(r => r.kind === 'bed' || r.snapshot.adt)) throw new Fault(409, 'adt_partial_provisioning');
      if (existing.length !== a.patients.length) throw new Fault(409, 'patient_not_imported');
      const placements = new Map<number, string>();
      const initial = new Map<string, Obj>();
      for (const row of existing) {
        const id = row.key.slice(8);
        const encounter = row.snapshot.bundle.entry.map((e: Obj) => obj(e.resource)).find((r: Obj) =>
          r.resourceType === 'Encounter' && maybeObj(r.class)?.code === 'IMP' && r.status === 'in-progress' && maybeObj(r.subject)?.reference === `Patient/${id}`);
        const bed = a.beds.find(b => b.resource && encounter?.location?.some((l: Obj) => maybeObj(l.location)?.reference === `Location/${b.resource}` && l.status === 'active'));
        if (bed && placements.has(bed.id)) throw new Fault(422, 'conflicting_initial_placement');
        if (bed) placements.set(bed.id, id);
        initial.set(id, adtPatientSchema.parse({ id, admitted: Boolean(encounter), bed: bed?.id ?? null }));
      }
      const initialBeds = a.beds.map(b => ({ id: b.id, unit: b.unit, active: b.active, phase: placements.has(b.id) ? 'occupied' : 'ready', occupant: placements.get(b.id) ?? null }));
      const state = { patients: [...initial.values()], beds: initialBeds };
      const probe = initialBeds.find(b => b.phase === 'ready');
      const admitted = state.patients.find(p => p.admitted);
      const command = admitted ? { discharge: { patient: admitted.id } } : { admit: { patient: state.patients[0].id, bed: required(probe).id } };
      const checked = await this.store.lean.call('adt-commit', { state, versions: [], expected: [], role: 'bedManager', command });
      if (checked.rejected) throw new Fault(422, 'invalid_initial_board');
      for (const bed of initialBeds) await c.query(`INSERT INTO commit_streams(tenant,key,kind,snapshot) VALUES($1,$2,'bed',$3)`,
        [this.store.config.tenant, `bed:${bed.id}`, bed]);
      for (const row of existing) {
        const snapshot = { ...row.snapshot, adt: initial.get(row.key.slice(8)) };
        await c.query('UPDATE commit_streams SET version=version+1,snapshot=$3 WHERE tenant=$1 AND key=$2', [this.store.config.tenant, row.key, snapshot]);
        await c.query('INSERT INTO commit_events(tenant,stream,version,transaction_id,event) VALUES($1,$2,$3,$4,$5)',
          [this.store.config.tenant, row.key, row.version + 1, randomUUID(), { kind: 'adt-initial', state: snapshot.adt }]);
      }
      await c.query("SELECT pg_notify('vgi_commit', 'changed')");
    });
  }
  async submit(actor: Actor, command: AdtCommand) {
    const roles = this.authorize(actor);
    const a = this.definition();
    if (!a.patients.includes(command.patient) || (command.other !== undefined && !a.patients.includes(command.other)) ||
        (command.bed !== undefined && !a.beds.some(b => b.id === command.bed)) ||
        (command.source !== undefined && !a.beds.some(b => b.id === command.source))) throw new Fault(403, 'adt_scope_forbidden');
    // Choose the least-privileged signed role that permits this operation.
    const role = roles.find(r => r !== 'admittingClerk') ?? roles[0];
    const trace = protocolTrace(actor, command, this.store.config.tenant, a);
    const result = await transaction(this.store.db, async c => {
      const t = this.store.config.tenant;
      const hash = digest({ endpoint: 'adt', command });
      await c.query('INSERT INTO commit_requests(tenant,actor,request_id,payload_hash) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [t, actor.user.id, command.requestId, hash]);
      const request = (await c.query('SELECT * FROM commit_requests WHERE tenant=$1 AND actor=$2 AND request_id=$3 FOR UPDATE',
        [t, actor.user.id, command.requestId])).rows[0];
      trace?.emit('request-locked');
      if (request.payload_hash !== hash) throw new Fault(409, 'idempotency_payload_conflict');
      if (request.outcome) {
        trace?.emit('replay', { status: request.outcome.status, answer: digest(request.outcome) });
        return request.outcome;
      }
      const finish = async (status: number, body: Obj) => {
        const result = { status, body };
        trace?.emit('finish', { status, reason: body.reason, answer: digest(result) });
        await c.query('UPDATE commit_requests SET outcome=$4,patient=$5 WHERE tenant=$1 AND actor=$2 AND request_id=$3',
          [t, actor.user.id, command.requestId, result, command.patient]);
        return result;
      };
      const rows = [];
      trace?.emit('plan', { keys: this.keys().map(k => trace.key(k)) });
      // One row at a time: the order is independent of query planner choices.
      for (const key of this.keys()) {
        const row = (await c.query('SELECT * FROM commit_streams WHERE tenant=$1 AND key=$2 FOR UPDATE', [t, key])).rows[0];
        if (!row) throw new Fault(409, 'adt_not_provisioned');
        rows.push(normalizeAdtStream(row));
        trace?.emit('lock', { key: trace.key(key) });
      }
      const board = this.board(rows);
      const { action, patient, bed, source, other, event } = command;
      const operands = action === 'swap' ? { patient, other, source, target: bed } :
        action === 'cancelDischarge' ? { patient, event, bed } :
        ['cancelAdmit', 'cancelTransfer'].includes(action) ? { patient, event } :
        action === 'transfer' ? { patient, source, target: bed } :
        ['clean', 'ready'].includes(action) ? { bed } : action === 'discharge' ? { patient } : { patient, bed };
      const input = { ...board, expected: command.expected, role, command: { [action]: operands } };
      trace?.emit('read', { adt: trace.adtInput(input) });
      if (digest(board.versions) !== digest(command.expected))
        return finish(409, { outcome: 'conflict', reason: 'version_conflict' });
      const accepted = await this.store.lean.call('adt-commit', input);
      trace?.emit('native', { accept: !accepted.rejected, board: accepted.rejected ? undefined : trace.board(accepted.state) });
      if (accepted.rejected) return finish(422, { outcome: 'rejected', reason: accepted.rejected });
      const transactionId = randomUUID();
      const written: Obj[] = [];
      trace?.emit('stage');
      for (const row of rows) {
        const next = row.kind === 'patient'
          ? { ...row.snapshot, adt: objs(obj(accepted.state).patients).find((p: Obj) => `patient:${p.id}` === row.key),
              bundle: projectAdt(row.snapshot, required(objs(obj(accepted.state).patients).find((p: Obj) => `patient:${p.id}` === row.key)), this.store.config, transactionId, new Date().toISOString(),
                { action, event, actor: actor.user.id }) }
          : objs(obj(accepted.state).beds).find((b: Obj) => `bed:${b.id}` === row.key);
        if (digest(next) === digest(row.snapshot)) continue;
        const result = await c.query('UPDATE commit_streams SET version=version+1,snapshot=$4 WHERE tenant=$1 AND key=$2 AND version=$3 RETURNING version',
          [t, row.key, row.version, next]);
        if (result.rowCount !== 1) throw new Error('ADT locked CAS failed');
        trace?.emit('update', { key: trace.key(row.key) });
        await c.query('INSERT INTO commit_events(tenant,stream,version,transaction_id,event) VALUES($1,$2,$3,$4,$5)',
          [t, row.key, row.version + 1, transactionId, { kind: 'adt', actor: actor.user.id,
            requestId: command.requestId, input, accepted }]);
        written.push({ key: row.key, version: row.version + 1 });
        trace?.emit('write', { key: trace.key(row.key), before: row.version, after: row.version + 1, projection: digest(next) });
      }
      if (!written.length) throw new Error('ADT accepted without effects');
      await c.query("SELECT pg_notify('vgi_commit', 'changed')");
      return finish(201, { outcome: 'persisted', transactionId, written });
    }, trace);
    trace?.emit('respond', { status: result.status, answer: digest(result) });
    return result;
  }
}
