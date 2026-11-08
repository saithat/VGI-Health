/** Arm R's persistent JavaScript REPL: one confined child process per decision. */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { z } from 'zod';

export interface SandboxLimits {
  /** Synchronous CPU per cell (vm timeout). */
  cellSyncMs: number;
  /** Total REPL time per cell, excluding time spent in harness host calls. */
  cellWallMs: number;
  /** V8 old-space cap for the REPL process. */
  memoryMb: number;
  /** Raw output kept by the child before the harness truncates it for the root. */
  rawOutputBytes: number;
}
export const DEFAULT_SANDBOX_LIMITS: SandboxLimits = { cellSyncMs: 10_000, cellWallMs: 60_000, memoryMb: 768, rawOutputBytes: 65_536 };
export type HostHandler = (name: string, args: unknown) => Promise<unknown>;
export interface CellResult { stdout: string; error: string | null; restarted: boolean; queries: Record<string, number> }
export type Confinement = 'bwrap' | 'none';

/** bwrap view: read-only runtime and REPL directory, private /tmp, no network/IPC/PID sharing, empty env. */
export function sandboxArgs(directory: string, node: string, memoryMb: number): string[] {
  const runtime = ['/usr', '/bin', '/lib', '/lib64'].filter(existsSync).flatMap(p => ['--ro-bind', p, p]);
  return ['--die-with-parent', '--new-session', '--unshare-all', ...runtime, '--ro-bind', directory, '/rlm',
    '--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp', '--clearenv', '--setenv', 'PATH', '/usr/bin:/bin', '--chdir', '/rlm', '--',
    ...nodeArgs(node, '/rlm', memoryMb)];
}
function nodeArgs(node: string, directory: string, memoryMb: number) {
  return [node, '--permission', `--allow-fs-read=${path.join(directory, 'sandbox-child.mjs')}`, `--allow-fs-read=${path.join(directory, 'query-engine.mjs')}`,
    '--disallow-code-generation-from-strings', `--max-old-space-size=${memoryMb}`, '--stack-size=2048', path.join(directory, 'sandbox-child.mjs')];
}

export class RlmSandbox {
  private child: ChildProcessWithoutNullStreams | null = null;
  private directory: string | null = null;
  private waiters = new Map<string, (message: Record<string, unknown>) => void>();
  private hostQueue: Promise<void> = Promise.resolve();
  private hostDepth = 0;
  private stderr = '';
  private cells = 0;
  private exited: string | null = null;
  restarts = 0;
  constructor(private readonly data: string, private readonly files: string, private readonly host: HostHandler,
    readonly limits: SandboxLimits = DEFAULT_SANDBOX_LIMITS, readonly confinement: Confinement = 'bwrap') {}

  get busyInHost() { return this.hostDepth > 0; }

  async start(): Promise<void> {
    if (this.child) return;
    this.exited = null;
    const directory = this.directory ??= await mkdtemp(path.join(tmpdir(), 'agent-rlm-'));
    for (const name of ['sandbox-child.mjs', '../query-engine.mjs']) {
      const target = path.join(directory, path.basename(name));
      if (!existsSync(target)) await copyFile(new URL(`./${name}`, import.meta.url), target);
    }
    const node = process.execPath.startsWith('/usr/') ? process.execPath : '/usr/bin/node';
    const child = this.confinement === 'bwrap'
      ? spawn('bwrap', sandboxArgs(directory, node, this.limits.memoryMb), { stdio: ['pipe', 'pipe', 'pipe'] })
      : spawn(node, nodeArgs(node, directory, this.limits.memoryMb).slice(1), { stdio: ['pipe', 'pipe', 'pipe'], cwd: directory, env: {} });
    this.child = child;
    child.stderr.on('data', (d: Buffer) => { this.stderr = (this.stderr + d.toString()).slice(-8000); });
    child.on('exit', (code, signal) => {
      if (this.child !== child) return;
      this.exited = `REPL process exited (${signal ?? code ?? 'unknown'})`;
      this.child = null;
      for (const [, waiter] of this.waiters) waiter({ type: 'exit' });
      this.waiters.clear();
    });
    createInterface({ input: child.stdout, crlfDelay: Infinity }).on('line', line => {
      if (this.child !== child) return;
      let parsed: unknown;
      try { parsed = JSON.parse(line); } catch { return; }
      const ok = z.record(z.string(), z.unknown()).safeParse(parsed);
      if (!ok.success) return;
      const message = ok.data;
      if (message['type'] === 'host') { this.onHost(message); return; }
      const key = message['type'] === 'cell' ? `cell:${String(message['id'])}` : String(message['type']);
      const waiter = this.waiters.get(key);
      if (waiter) { this.waiters.delete(key); waiter(message); }
    });
    const ready = this.wait('ready');
    child.stdin.write(JSON.stringify({ type: 'init', data: this.data, files: this.files, outputLimit: this.limits.rawOutputBytes }) + '\n');
    const message = await Promise.race([ready, new Promise<Record<string, unknown>>(resolve => setTimeout(() => resolve({ type: 'timeout' }), 60_000))]);
    if (message['type'] !== 'ready') { this.kill(); throw new Error(`REPL failed to start: ${this.exited ?? 'timeout'} ${this.stderr.slice(-500)}`); }
  }

  private wait(key: string) { return new Promise<Record<string, unknown>>(resolve => this.waiters.set(key, resolve)); }

  /** Host calls run one at a time in arrival order, which keeps replay deterministic. */
  private onHost(message: Record<string, unknown>) {
    const id = message['id'];
    this.hostDepth++;
    this.hostQueue = this.hostQueue.then(async () => {
      let reply: { ok: boolean; value: string };
      try {
        const args: unknown = JSON.parse(String(message['args']));
        reply = { ok: true, value: JSON.stringify(await this.host(String(message['name']), args) ?? null) };
      } catch (error) {
        reply = { ok: false, value: (error instanceof Error ? error.message : 'Host call failed').replace(/\/(?:home|tmp|etc|usr|var|proc|run)\/[^\s"'<>]*/g, '[confined path]').slice(0, 2000) };
      } finally { this.hostDepth--; }
      this.child?.stdin.write(JSON.stringify({ type: 'host', id, ...reply }) + '\n');
    });
  }

  /** Run one cell. A cell that exceeds its REPL time or kills the process restarts the REPL with fresh globals. */
  async run(code: string): Promise<CellResult> {
    await this.start();
    const child = this.child;
    if (!child) throw new Error('REPL unavailable');
    const id = String(++this.cells);
    const done = this.wait(`cell:${id}`);
    child.stdin.write(JSON.stringify({ type: 'cell', id, code, syncMs: this.limits.cellSyncMs }) + '\n');
    let spent = 0;
    const tick = 250;
    const timer = new Promise<Record<string, unknown>>(resolve => {
      const interval = setInterval(() => {
        if (!this.busyInHost) spent += tick;
        if (spent >= this.limits.cellWallMs) { clearInterval(interval); resolve({ type: 'wall' }); }
      }, tick);
      void done.then(() => clearInterval(interval));
    });
    const message = await Promise.race([done, timer]);
    if (message['type'] === 'cell') {
      const queries = message['queries'] && typeof message['queries'] === 'object' ? Object.fromEntries(Object.entries(message['queries']).map(([k, v]) => [k, Number(v)])) : {};
      return { stdout: String(message['stdout'] ?? ''), error: message['error'] === null ? null : String(message['error']), restarted: false, queries };
    }
    const reason = message['type'] === 'wall' ? `cell exceeded ${this.limits.cellWallMs} ms of REPL time` : (this.exited ?? 'REPL process exited');
    this.kill();
    await this.hostQueue;
    this.restarts++;
    return { stdout: '', error: `${reason}; the REPL was restarted and all globals you created were reset (preloaded data remains).`, restarted: true, queries: {} };
  }

  private kill() {
    const child = this.child;
    this.child = null;
    if (child) { child.stdin.destroy(); child.kill('SIGKILL'); }
    this.waiters.clear();
  }
  async close() {
    this.kill();
    if (this.directory) await rm(this.directory, { recursive: true, force: true });
    this.directory = null;
  }
  /** For audit only: confined child stderr tail. */
  get stderrTail() { return this.stderr; }
}
export async function readSandboxSource() { return readFile(new URL('./sandbox-child.mjs', import.meta.url), 'utf8'); }
