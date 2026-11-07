/** Opt-in TEST instrumentation. A trace is evidence for a refinement test, not
 * a proof of this host. No tokens, chart values or native clinical states are logged.
 * Use a new file and a fresh test tenant; all writers must enable the exporter.
 */
import { appendFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { digest, obj, objs, str, type Actor, type Command, type AdtCommand, type Config, type Obj } from './types.ts';

export class ProtocolTrace {
  private path: string;
  private attempt = randomUUID();
  private failed = false;
  private patients?: string[];
  constructor(path: string, actor: Actor, command: Command | AdtCommand, tenant: string, adt?: Config['adt']) {
    this.path = path;
    this.patients = adt?.patients.slice().sort();
    this.emit('begin', { id: digest([tenant, actor.user.id, command.requestId]), payload: digest(command),
      endpoint: adt ? ('sessionId' in command ? 'clinical-adt' : 'adt') : 'clinical',
      ...('sessionId' in command ? { session: digest(command.sessionId), expectedVersion: command.expectedVersion,
        revision: command.revision, expectedSharedVersion: command.expectedSharedVersion } : {}) });
  }
  private patient(id: string) {
    const index = this.patients?.indexOf(id);
    if (index === undefined || index < 0) return `external-${digest(id)}`;
    return `p${String(index).padStart(3, '0')}`;
  }
  key(key: string) {
    if (!this.patients) return digest(key);
    return key.startsWith('patient:') ? `patient:${this.patient(key.slice(8))}` : key.startsWith('bed:') ? key : digest(key);
  }
  /** Administrative state only: positional patient aliases preserve lock order;
   * chart contents/native clinical states never enter this export. */
  board(value: unknown) {
    const state = obj(value);
    return { patients: objs(state.patients).map((p: Obj) => ({ ...p, id: this.patient(str(p.id)) })),
      beds: objs(state.beds).map((b: Obj) => ({ ...b, unit: digest(b.unit), occupant: b.occupant === null ? null : this.patient(str(b.occupant)) })) };
  }
  adtInput(input: Obj) {
    return { state: this.board(input.state), role: input.role,
      versions: objs(input.versions).map((v: Obj) => ({ ...v, key: this.key(str(v.key)) })),
      expected: objs(input.expected).map((v: Obj) => ({ ...v, key: this.key(str(v.key)) })),
      command: Object.fromEntries(Object.entries(obj(input.command)).map(([action, value]) => {
        const operands = obj(value);
        return [action, { ...operands, ...(operands.patient ? { patient: this.patient(str(operands.patient)) } : {}) }];
      })) };
  }
  emit(step: string, data: Obj = {}) {
    if (this.failed) return;
    try {
      appendFileSync(this.path, JSON.stringify({ schema: 'vgi-commit-protocol-test-v1', attempt: this.attempt,
        step, ...data }) + '\n', { mode: 0o600 });
    } catch {
      // Instrumentation must not change a clinical transaction's outcome.
      this.failed = true;
      process.stderr.write('Commit protocol TEST trace export failed; trace is incomplete.\n');
    }
  }
}
export function protocolTrace(actor: Actor, command: Command | AdtCommand, tenant: string, adt?: Config['adt']) {
  const path = process.env.COMMIT_PROTOCOL_TRACE;
  return path ? new ProtocolTrace(path, actor, command, tenant, adt) : undefined;
}
