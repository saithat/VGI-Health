/** Arm H OS boundary: one bwrap sandbox per agent launch. All namespaces are
 * unshared (network included), the environment is cleared, the runtime is
 * read-only, and only four host directories are visible:
 *   /work         the decision workspace (read-write),
 *   /home/agent   the CLI's private state and credential copy (read-write),
 *   /spool        the night CLI's request/reply files (read-write),
 *   /run/harness  the night CLI, the entry script and the egress socket (read-only).
 * The only route out is the allowlisted CONNECT proxy socket (egress.ts). */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

export const SANDBOX_PATHS = { workspace: '/work', home: '/home/agent', control: '/run/harness', spool: '/spool' } as const;
export const PROXY_PORT = 18_443;
export interface SandboxMounts { workspace: string; home: string; control: string; spool: string; readOnly?: readonly (readonly [string, string])[] }

const RUNTIME = ['/usr', '/bin', '/lib', '/lib64', '/sbin'];
const ETC = ['/etc/ssl', '/etc/pki', '/etc/crypto-policies', '/etc/passwd', '/etc/group', '/etc/nsswitch.conf', '/etc/hosts', '/etc/localtime', '/etc/alternatives'];

export function harnessSandboxArgs(m: SandboxMounts, command: string, args: readonly string[], env: Readonly<Record<string, string>>, node = '/usr/bin/node'): string[] {
  const ro = (p: string, at = p) => ['--ro-bind', p, at];
  return ['--die-with-parent', '--new-session', '--unshare-all',
    ...[...RUNTIME, ...ETC].filter(existsSync).flatMap(p => ro(p)),
    '--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp',
    '--bind', m.workspace, SANDBOX_PATHS.workspace, '--bind', m.home, SANDBOX_PATHS.home, '--bind', m.spool, SANDBOX_PATHS.spool, ...ro(m.control, SANDBOX_PATHS.control),
    ...(m.readOnly ?? []).flatMap(([from, to]) => ro(from, to)),
    '--clearenv', '--setenv', 'PATH', `${SANDBOX_PATHS.control}/bin:/usr/local/bin:/usr/bin:/bin`, '--setenv', 'HOME', SANDBOX_PATHS.home,
    '--setenv', 'TMPDIR', '/tmp', '--setenv', 'LANG', 'C.UTF-8',
    ...Object.entries(env).flatMap(([k, v]) => ['--setenv', k, v]),
    '--chdir', SANDBOX_PATHS.workspace, '--',
    node, `${SANDBOX_PATHS.control}/entry.mjs`, `${SANDBOX_PATHS.control}/egress.sock`, String(PROXY_PORT), '--', command, ...args];
}

export interface SandboxRun { stdout: string; stderr: string; code: number | null; signal: string | null; timedOut: boolean; stdoutTruncated: boolean }
/** Run to completion or until timeoutMs (SIGTERM, then SIGKILL after 10 s). */
export function runSandboxed(bwrapArgs: readonly string[], stdin: string, timeoutMs: number, maxStdout = 64_000_000): Promise<SandboxRun> {
  return new Promise((resolve, reject) => {
    const child = spawn('bwrap', bwrapArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false, stdoutTruncated = false;
    child.stdout.on('data', (d: Buffer) => { if (stdout.length < maxStdout) stdout += d.toString(); else stdoutTruncated = true; });
    child.stderr.on('data', (d: Buffer) => { stderr = (stderr + d.toString()).slice(-200_000); });
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 10_000).unref(); }, timeoutMs);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', (code, signal) => { clearTimeout(timer); resolve({ stdout, stderr, code, signal, timedOut, stdoutTruncated }); });
    child.stdin.on('error', () => undefined);
    child.stdin.end(stdin);
  });
}
