/** Opt-in TEST instrumentation. A trace is evidence for a refinement test, not
 * a proof of this host. No tokens, clinical values or native states are logged.
 * Use a new file and a fresh test tenant; all writers must enable the exporter.
 */
import { appendFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { digest, type Actor, type Command, type Obj } from './types.ts';

export class ProtocolTrace {
  private path: string;
  private attempt = randomUUID();
  private failed = false;
  constructor(path: string, actor: Actor, command: Command, tenant: string) {
    this.path = path;
    this.emit('begin', { id: digest([tenant, actor.user.id, command.requestId]), payload: digest(command),
      session: digest(command.sessionId), expectedVersion: command.expectedVersion, revision: command.revision,
      expectedSharedVersion: command.expectedSharedVersion });
  }
  key(key: string) { return digest(key); }
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
export function protocolTrace(actor: Actor, command: Command, tenant: string) {
  const path = process.env.COMMIT_PROTOCOL_TRACE;
  return path ? new ProtocolTrace(path, actor, command, tenant) : undefined;
}
