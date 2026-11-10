/** The two native CLI agents arm H can launch, how each is confined inside the
 * bwrap sandbox, and how its transcript is read back (usage, served model, audit). */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { EGRESS_HOSTS } from './egress.js';
import { SANDBOX_PATHS } from './sandbox.js';
import type { HarnessKind } from './stats.js';

export interface LaunchSpec {
  command: string; args: string[]; env: Record<string, string>;
  readOnly: (readonly [string, string])[]; hosts: readonly string[];
}
export interface AgentConfig { harness: HarnessKind; model: string | null; reasoningEffort: string; serviceTier: string; maxTurns: number;
  /** Pre-declared H-claude+node variant: Claude Code may run `node /work/<script>` (see NODE_SHIM). */
  interpreter?: 'node' | null;
  /** Test-only: a command run in place of a model CLI (harness 'script'). */
  script?: { command: string; args: string[] } }

/** Tools claude -p may use. Bash is limited to the night CLI and basic read-only commands;
 * dontAsk mode denies everything else. File writes are limited to /work. */
export const CLAUDE_TOOLS = ['Bash', 'Read', 'Glob', 'Grep', 'Edit', 'Write'];
export const CLAUDE_ALLOWED = ['Read(//work/**)', 'Edit(//work/**)', 'Write(//work/**)', 'Glob', 'Grep',
  ...['night', 'ls', 'cat', 'jq', 'head', 'wc', 'grep'].map(c => `Bash(${c}:*)`)];
/** H-claude+node: the one extra allowlist entry. Claude Code matches it on the command text, so
 * `node /work/../x` would match; the shim below resolves the path and refuses anything outside /work. */
export const CLAUDE_NODE_ALLOWED = `Bash(node ${SANDBOX_PATHS.workspace}/*)`;
export const claudeAllowed = (interpreter: AgentConfig['interpreter']) => interpreter === 'node' ? [...CLAUDE_ALLOWED, CLAUDE_NODE_ALLOWED] : CLAUDE_ALLOWED;
/** First on PATH as /run/harness/bin/node (read-only) for the node variant only. It runs a regular file
 * whose resolved path is inside /work, under Node's permission model: file reads and writes only in
 * /work and /tmp, no child processes, workers, addons or WASI. The bwrap sandbox and egress allowlist
 * are unchanged; NODE_OPTIONS cannot widen the flags. */
export const NODE_SHIM = `#!/bin/sh
# Arm H claude+node: run one script from the workspace under Node's permission model.
case "$1" in ${SANDBOX_PATHS.workspace}/*) ;; *) echo "node: only scripts under ${SANDBOX_PATHS.workspace} may run: node ${SANDBOX_PATHS.workspace}/<script> [args]" >&2; exit 126;; esac
script=$(/usr/bin/realpath -e -- "$1" 2>/dev/null) || { echo "node: no such script: $1" >&2; exit 126; }
case "$script" in ${SANDBOX_PATHS.workspace}/*) ;; *) echo "node: $1 resolves outside ${SANDBOX_PATHS.workspace}" >&2; exit 126;; esac
[ -f "$script" ] || { echo "node: not a regular file: $1" >&2; exit 126; }
shift
exec /usr/bin/env -u NODE_OPTIONS -u NODE_PATH /usr/bin/node --permission --allow-fs-read=${SANDBOX_PATHS.workspace} --allow-fs-read=/tmp --allow-fs-write=${SANDBOX_PATHS.workspace} --allow-fs-write=/tmp -- "$script" "$@"
`;
/** Claude Code's auto-memory is off in the sandbox (settings and env); its attempts would only be denied anyway. */
export const CLAUDE_SETTINGS = { autoMemoryEnabled: false };
export const CLAUDE_DENIED = [`Read(/${SANDBOX_PATHS.home}/**)`, `Edit(/${SANDBOX_PATHS.home}/**)`, `Write(/${SANDBOX_PATHS.home}/**)`, 'Edit(//work/.claude/**)', 'Write(//work/.claude/**)', 'WebFetch', 'WebSearch', 'Task', 'Agent'];

const codexHome = () => process.env['CODEX_HOME'] ?? path.join(homedir(), '.codex');
function codexBinary() {
  const configured = process.env['CODEX_BIN'] ?? '/usr/local/bin/codex';
  if (!configured.startsWith('/usr/')) throw new Error('Arm H needs a codex installed under /usr (the sandbox mounts /usr read-only)');
  return configured;
}
function claudeBinary() {
  const configured = process.env['CLAUDE_BIN'] ?? path.join(homedir(), '.local/bin/claude');
  if (!existsSync(configured)) throw new Error('Arm H claude harness: claude CLI not found; set CLAUDE_BIN');
  return realpathSync(configured);
}
export const CLAUDE_CREDENTIALS = () => path.join(process.env['CLAUDE_CONFIG_DIR'] ?? path.join(homedir(), '.claude'), '.credentials.json');
const claudeCredentialSchema = z.object({ claudeAiOauth: z.object({ accessToken: z.string(), expiresAt: z.number() }).passthrough() }).passthrough();
/** Milliseconds the host's Claude access token stays valid, or null when there is none. */
export function claudeTokenValidityMs(now = Date.now()) {
  const file = CLAUDE_CREDENTIALS();
  if (!existsSync(file)) return null;
  const parsed = claudeCredentialSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  return parsed.success ? parsed.data.claudeAiOauth.expiresAt - now : null;
}

/** The node shim exists in the read-only control directory only for the node variant. */
async function installInterpreter(control: string, interpreter: AgentConfig['interpreter']) {
  const shim = path.join(control, 'bin', 'node');
  await rm(shim, { force: true });
  if (interpreter === 'node') { await mkdir(path.dirname(shim), { recursive: true }); await writeFile(shim, NODE_SHIM, { mode: 0o555 }); }
}
/** Prepare the CLI's private home (credential copy, policy files) and return how to launch it. */
export async function prepareLaunch(cfg: AgentConfig, home: string, control: string, launch: number): Promise<LaunchSpec> {
  if (cfg.interpreter && cfg.harness === 'codex') throw new Error('The node interpreter variant is defined for the claude harness only');
  if (cfg.harness === 'codex') {
    if (!cfg.model) throw new Error('Arm H codex harness requires --model');
    if (cfg.serviceTier === 'fast') throw new Error('Codex fast mode is prohibited; use --service-tier default');
    const dir = path.join(home, '.codex'); await mkdir(dir, { recursive: true, mode: 0o700 });
    const auth = path.join(codexHome(), 'auth.json');
    if (existsSync(auth)) await copyFile(auth, path.join(dir, 'auth.json'));
    // Managed policy: tool subprocesses cannot read the client's credential copy.
    const requirements = path.join(control, 'codex-requirements.toml');
    await rm(requirements, { force: true });
    await writeFile(requirements, `[permissions.filesystem]\ndeny_read = ${JSON.stringify([`${SANDBOX_PATHS.home}/.codex/auth.json`])}\n`, { mode: 0o444 });
    return { command: codexBinary(), hosts: EGRESS_HOSTS.codex, readOnly: [[requirements, '/etc/codex/requirements.toml']], env: { CODEX_HOME: `${SANDBOX_PATHS.home}/.codex` },
      args: ['exec', '--json', '-s', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=false', '-c', 'approval_policy="never"',
        '-c', 'web_search="disabled"', '-c', 'mcp_servers={}', '-c', 'features.apps=false', '-c', 'features.plugins=false', '-c', 'features.browser_use=false',
        '-c', 'features.multi_agent=false', '-c', `model_reasoning_effort="${cfg.reasoningEffort}"`, '-c', `service_tier="${cfg.serviceTier}"`,
        '--skip-git-repo-check', '--ephemeral', '-C', SANDBOX_PATHS.workspace, '--add-dir', SANDBOX_PATHS.spool, '-m', cfg.model, '-o', `${SANDBOX_PATHS.home}/final-${launch}.txt`, '-'] };
  }
  if (cfg.harness === 'claude') {
    const dir = path.join(home, '.claude'); await mkdir(dir, { recursive: true, mode: 0o700 });
    // Access token only: the sandboxed CLI cannot refresh, so it never rotates the host's refresh token.
    const source = CLAUDE_CREDENTIALS();
    if (!existsSync(source)) throw new Error('Arm H claude harness: no Claude Code credentials');
    const creds = claudeCredentialSchema.parse(JSON.parse(readFileSync(source, 'utf8')));
    await writeFile(path.join(dir, '.credentials.json'), JSON.stringify({ claudeAiOauth: { ...creds.claudeAiOauth, refreshToken: undefined } }), { mode: 0o600 });
    await writeFile(path.join(dir, 'settings.json'), JSON.stringify(CLAUDE_SETTINGS), { mode: 0o600 });
    await installInterpreter(control, cfg.interpreter);
    const binary = claudeBinary();
    return { command: '/opt/claude/claude', hosts: EGRESS_HOSTS.claude, readOnly: [[binary, '/opt/claude/claude']],
      env: { CLAUDE_CONFIG_DIR: `${SANDBOX_PATHS.home}/.claude`, CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', DISABLE_AUTOUPDATER: '1', DISABLE_TELEMETRY: '1', DISABLE_ERROR_REPORTING: '1' },
      args: ['-p', '--output-format', 'stream-json', '--verbose', '--max-turns', String(cfg.maxTurns), '--tools', CLAUDE_TOOLS.join(','),
        '--allowedTools', ...claudeAllowed(cfg.interpreter), '--disallowedTools', ...CLAUDE_DENIED, '--permission-mode', 'dontAsk', '--setting-sources', 'user',
        '--strict-mcp-config', '--no-session-persistence', '--disable-slash-commands', ...(cfg.model ? ['--model', cfg.model] : [])] };
  }
  if (!cfg.script) throw new Error('script harness needs a command');
  await installInterpreter(control, cfg.interpreter);
  return { command: cfg.script.command, args: cfg.script.args, env: {}, readOnly: [], hosts: EGRESS_HOSTS.script };
}

export interface LaunchUsage { input: number | null; output: number | null; cachedInput: number | null; turns: number | null; servedModels: string[] }
const lines = (stdout: string) => stdout.split('\n').filter(Boolean).flatMap((l): unknown[] => { try { const v: unknown = JSON.parse(l); return [v]; } catch { return []; } });

/** Codex: sum of turn.completed usage. Claude: the result event, or per-message usage if the run was stopped. */
export function launchUsage(harness: HarnessKind, stdout: string): LaunchUsage {
  const events = lines(stdout);
  if (harness === 'codex') {
    const u = events.flatMap(e => { const p = z.object({ type: z.literal('turn.completed'), usage: z.object({ input_tokens: z.number(), output_tokens: z.number(), cached_input_tokens: z.number().optional() }) }).safeParse(e); return p.success ? [p.data.usage] : []; });
    const agentTurns = events.filter(e => z.object({ type: z.literal('item.completed'), item: z.object({ type: z.enum(['agent_message', 'command_execution', 'file_change']) }) }).safeParse(e).success).length;
    return u.length ? { input: u.reduce((n, x) => n + x.input_tokens, 0), output: u.reduce((n, x) => n + x.output_tokens, 0), cachedInput: u.reduce((n, x) => n + (x.cached_input_tokens ?? 0), 0), turns: agentTurns, servedModels: [] }
      : { input: null, output: null, cachedInput: null, turns: agentTurns, servedModels: [] };
  }
  if (harness === 'claude') {
    const usage = z.object({ input_tokens: z.number(), output_tokens: z.number(), cache_read_input_tokens: z.number().optional(), cache_creation_input_tokens: z.number().optional() }).passthrough();
    const result = events.flatMap(e => { const p = z.object({ type: z.literal('result'), usage, num_turns: z.number().optional(), modelUsage: z.record(z.string(), z.unknown()).optional() }).safeParse(e); return p.success ? [p.data] : []; }).at(-1);
    const total = (u: z.infer<typeof usage>) => ({ input: u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0), output: u.output_tokens, cachedInput: u.cache_read_input_tokens ?? 0 });
    if (result) return { ...total(result.usage), turns: result.num_turns ?? null, servedModels: Object.keys(result.modelUsage ?? {}).sort() };
    // Stopped before its result event: sum each assistant message once.
    const seen = new Map<string, { usage: z.infer<typeof usage>; model: string }>();
    for (const e of events) { const p = z.object({ type: z.literal('assistant'), message: z.object({ id: z.string(), model: z.string(), usage }) }).safeParse(e); if (p.success) seen.set(p.data.message.id, { usage: p.data.message.usage, model: p.data.message.model }); }
    const all = [...seen.values()].map(v => total(v.usage));
    return all.length ? { input: all.reduce((n, x) => n + x.input, 0), output: all.reduce((n, x) => n + x.output, 0), cachedInput: all.reduce((n, x) => n + x.cachedInput, 0), turns: seen.size, servedModels: [...new Set([...seen.values()].map(v => v.model))].sort() }
      : { input: null, output: null, cachedInput: null, turns: null, servedModels: [] };
  }
  return { input: 0, output: 0, cachedInput: 0, turns: null, servedModels: [] };
}

export interface LaunchAudit { status: 'pass' | 'fail'; findings: unknown[]; permissionDenials: number; commands: number }
const SENSITIVE = [SANDBOX_PATHS.home, 'auth.json', '.credentials', '/proc/', '/run/harness/egress.sock', '.req.json', '.res.json'];
/** Fail on any tool family outside the declared set, or any request that names the CLI's private home or credentials. */
export function auditLaunch(harness: HarnessKind, stdout: string): LaunchAudit {
  const findings: unknown[] = [];
  let denials = 0, commands = 0;
  const touches = (value: unknown) => { const text = JSON.stringify(value) ?? ''; return SENSITIVE.some(s => text.includes(s)); };
  for (const e of lines(stdout)) {
    if (harness === 'codex') {
      const p = z.object({ type: z.string(), item: z.object({ type: z.string(), command: z.string().optional(), changes: z.unknown().optional() }).passthrough().optional() }).safeParse(e);
      if (!p.success) { findings.push({ unparsed: e }); continue; }
      const item = p.data.item;
      if (!item) continue;
      if (!['reasoning', 'agent_message', 'command_execution', 'file_change', 'todo_list', 'plan', 'error'].includes(item.type)) findings.push({ forbiddenItem: item.type });
      if (item.type === 'command_execution' && p.data.type === 'item.completed') { commands++; if (touches(item.command)) findings.push({ sensitiveCommand: item.command }); }
      if (item.type === 'file_change' && touches(item.changes)) findings.push({ sensitiveFileChange: item.changes });
    } else if (harness === 'claude') {
      const a = z.object({ type: z.literal('assistant'), message: z.object({ content: z.array(z.object({ type: z.string(), name: z.string().optional(), input: z.unknown().optional() }).passthrough()) }) }).safeParse(e);
      if (a.success) for (const b of a.data.message.content) if (b.type === 'tool_use') {
        commands++;
        if (!CLAUDE_TOOLS.includes(b.name ?? '')) findings.push({ forbiddenTool: b.name });
        // Recorded for audit; a denied attempt is the boundary working, not a failure.
        if (touches(b.input)) findings.push({ sensitiveToolInput: b.input, note: 'attempted' });
      }
      const r = z.object({ type: z.literal('result'), permission_denials: z.array(z.unknown()).optional() }).safeParse(e);
      if (r.success) denials += r.data.permission_denials?.length ?? 0;
    }
  }
  return { status: findings.length ? 'fail' : 'pass', findings, permissionDenials: denials, commands };
}
