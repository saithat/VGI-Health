import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Obj } from './types.ts';

/** One bounded FIFO, one stateless long-running native child. Never auto-replay
 * a host transaction. A crash/time limit rejects the call and respawns on demand. */
export class Lean {
  private child?: ChildProcessWithoutNullStreams;
  private pending?: { id: number; resolve: (v: Obj) => void; reject: (e: Error) => void };
  private buffer = '';
  private sequence = 0;
  private tail: Promise<unknown> = Promise.resolve();
  private queued = 0;
  private closed = false;
  private binary: string;
  private timeoutMs: number;
  private args: string[];
  constructor(binary: string, timeoutMs = 10_000, args = ['serve']) { this.binary = binary; this.timeoutMs = timeoutMs; this.args = args; }

  call(op: string, input: Obj): Promise<Obj> {
    if (this.closed || this.queued >= 128) return Promise.reject(new Error('Lean unavailable/queue full'));
    this.queued++;
    const run = this.tail.then(() => this.execute(op, input));
    this.tail = run.catch(() => {});
    return run.finally(() => { this.queued--; });
  }
  private start() {
    const child = spawn(this.binary, this.args, {
      env: { ...process.env, LEAN_NUM_THREADS: '2' }, stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child = child;
    this.buffer = '';
    // Diagnostics never share the JSON protocol; cap retained memory at zero.
    child.stderr.resume();
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      if (this.child !== child) return;
      this.buffer += chunk;
      if (this.buffer.length > 16 * 1024 * 1024) return this.fail(new Error('Lean response too large'));
      let end: number;
      while ((end = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, end);
        this.buffer = this.buffer.slice(end + 1);
        try {
          const response = JSON.parse(line);
          if (!this.pending || response.id !== this.pending.id) throw new Error('Lean protocol out of sequence');
          const p = this.pending;
          this.pending = undefined;
          if (response.error) p.reject(new Error(`Lean: ${response.error}`));
          else if (response.result === undefined) { p.reject(new Error('Lean missing result')); this.fail(new Error('Lean protocol')); }
          else p.resolve(response.result);
        } catch (e) { this.fail(e as Error); }
      }
    });
    child.on('error', e => { if (this.child === child) this.fail(e); });
    child.stdin.on('error', e => { if (this.child === child) this.fail(e); });
    child.on('exit', () => { if (this.child === child) this.fail(new Error('Lean process exited')); });
  }
  private execute(op: string, input: Obj): Promise<Obj> {
    if (this.closed) return Promise.reject(new Error('Lean closed'));
    if (!this.child) this.start();
    const id = ++this.sequence;
    return new Promise<Obj>((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error('Lean timeout')), this.timeoutMs);
      this.pending = { id, resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } };
      const line = JSON.stringify({ id, op, input });
      if (line.length > 8 * 1024 * 1024) { const p = this.pending; this.pending = undefined; p.reject(new Error('Lean request too large')); return; }
      this.child!.stdin.write(line + '\n');
    });
  }
  private fail(e: Error) {
    const child = this.child;
    this.child = undefined;
    child?.kill('SIGKILL');
    const pending = this.pending;
    this.pending = undefined;
    pending?.reject(e);
  }
  close() { this.closed = true; this.fail(new Error('Lean closed')); }
}
