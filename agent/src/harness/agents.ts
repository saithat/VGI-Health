import { existsSync } from 'node:fs';
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { EGRESS_HOSTS } from './egress.js';
import { SANDBOX_PATHS } from './sandbox.js';
import { contextWindowSchema, DEFAULT_CONTEXT_WINDOW, DEFAULT_MODEL_URL, MODEL_PORT, modelEndpoint } from './night-provider.js';

export interface LaunchSpec {
  command: string; args: string[]; env: Record<string, string>;
  readOnly: (readonly [string, string])[]; hosts: readonly string[];
}
export interface AgentConfig {
  provider?: 'codex' | 'local';
  baseUrl?: string;
  contextWindow?: number;
  model: string;
  reasoningEffort: string;
  serviceTier: string;
}

const codexHome = () => process.env['CODEX_HOME'] ?? path.join(homedir(), '.codex');
function codexBinary() {
  const configured = process.env['CODEX_BIN'] ?? '/usr/local/bin/codex';
  if (!configured.startsWith('/usr/')) throw new Error('Hill climbing needs Codex installed under /usr (the sandbox mounts /usr read-only)');
  return configured;
}
/** Prepare the CLI's private home (credential copy, policy files) and return how to launch it. */
export async function prepareLaunch(cfg: AgentConfig, home: string, control: string, launch: number): Promise<LaunchSpec> {
    if (!cfg.model) throw new Error('Hill climbing requires --model');
    const local = cfg.provider === 'local';
    if (!local && cfg.serviceTier === 'fast') throw new Error('Codex fast mode is prohibited; use --service-tier default');
    const dir = path.join(home, '.codex'); await mkdir(dir, { recursive: true, mode: 0o700 });
    const auth = path.join(codexHome(), 'auth.json');
    if (!local && existsSync(auth)) await copyFile(auth, path.join(dir, 'auth.json'));
    // Managed policy: tool subprocesses cannot read the client's credential copy.
    const requirements = path.join(control, 'codex-requirements.toml');
    await rm(requirements, { force: true });
    await writeFile(requirements, `[permissions.filesystem]\ndeny_read = ${JSON.stringify([`${SANDBOX_PATHS.home}/.codex/auth.json`])}\n`, { mode: 0o444 });
    let settings = [`service_tier="${cfg.serviceTier}"`];
    if (local) {
      const { pathname } = modelEndpoint(cfg.baseUrl ?? DEFAULT_MODEL_URL);
      const window = contextWindowSchema.parse(cfg.contextWindow ?? DEFAULT_CONTEXT_WINDOW);
      settings = [
        'model_provider="night_local"',
        'model_providers.night_local.name="Local model server"',
        'model_providers.night_local.wire_api="responses"',
        `model_providers.night_local.base_url=${JSON.stringify(`http://127.0.0.1:${MODEL_PORT}${pathname}`)}`,
        `model_context_window=${window}`,
        `model_auto_compact_token_limit=${Math.floor(window * 0.8)}`,
      ];
    }
    return { command: codexBinary(), hosts: local ? [] : EGRESS_HOSTS.codex, readOnly: [[requirements, '/etc/codex/requirements.toml']], env: { CODEX_HOME: `${SANDBOX_PATHS.home}/.codex` },
      args: ['exec', '--json', '-s', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=false', '-c', 'approval_policy="never"',
        '-c', 'web_search="disabled"', '-c', 'mcp_servers={}', '-c', 'features.apps=false', '-c', 'features.plugins=false', '-c', 'features.browser_use=false',
        '-c', 'features.multi_agent=false', '-c', `model_reasoning_effort="${cfg.reasoningEffort}"`, ...settings.flatMap(value => ['-c', value]),
        '--skip-git-repo-check', '--ephemeral', '-C', SANDBOX_PATHS.workspace, '--add-dir', SANDBOX_PATHS.spool, '-m', cfg.model, '-o', `${SANDBOX_PATHS.home}/final-${launch}.txt`, '-'] };
}

export interface LaunchUsage { input: number | null; output: number | null; cachedInput: number | null; turns: number | null; servedModels: string[] }
const lines = (stdout: string) => stdout.split('\n').filter(Boolean).flatMap((l): unknown[] => { try { const v: unknown = JSON.parse(l); return [v]; } catch { return []; } });

/** Codex: sum of turn.completed usage. Claude: the result event, or per-message usage if the run was stopped. */
export function launchUsage(stdout: string): LaunchUsage {
  const events = lines(stdout);
    const u = events.flatMap(e => { const p = z.object({ type: z.literal('turn.completed'), usage: z.object({ input_tokens: z.number(), output_tokens: z.number(), cached_input_tokens: z.number().optional() }) }).safeParse(e); return p.success ? [p.data.usage] : []; });
    const agentTurns = events.filter(e => z.object({ type: z.literal('item.completed'), item: z.object({ type: z.enum(['agent_message', 'command_execution', 'file_change']) }) }).safeParse(e).success).length;
    return u.length ? { input: u.reduce((n, x) => n + x.input_tokens, 0), output: u.reduce((n, x) => n + x.output_tokens, 0), cachedInput: u.reduce((n, x) => n + (x.cached_input_tokens ?? 0), 0), turns: agentTurns, servedModels: [] }
      : { input: null, output: null, cachedInput: null, turns: agentTurns, servedModels: [] };
}

export interface LaunchAudit { status: 'pass' | 'fail'; findings: unknown[]; permissionDenials: number; commands: number }
const SENSITIVE = [SANDBOX_PATHS.home, 'auth.json', '.credentials', '/proc/', '/run/harness/egress.sock', '/run/harness/model.sock', '.req.json', '.res.json'];
/** Fail on any tool family outside the declared set, or any request that names the CLI's private home or credentials. */
export function auditLaunch(stdout: string): LaunchAudit {
  const findings: unknown[] = [];
  let commands = 0;
  const touches = (value: unknown) => { const text = JSON.stringify(value) ?? ''; return SENSITIVE.some(s => text.includes(s)); };
  for (const e of lines(stdout)) {
      const p = z.object({ type: z.string(), item: z.object({ type: z.string(), command: z.string().optional(), changes: z.unknown().optional() }).passthrough().optional() }).safeParse(e);
      if (!p.success) { findings.push({ unparsed: e }); continue; }
      const item = p.data.item;
      if (!item) continue;
      if (!['reasoning', 'agent_message', 'command_execution', 'file_change', 'todo_list', 'plan', 'error'].includes(item.type)) findings.push({ forbiddenItem: item.type });
      if (item.type === 'command_execution' && p.data.type === 'item.completed') { commands++; if (touches(item.command)) findings.push({ sensitiveCommand: item.command }); }
      if (item.type === 'file_change' && touches(item.changes)) findings.push({ sensitiveFileChange: item.changes });
  }
  return { status: findings.length ? 'fail' : 'pass', findings, permissionDenials: 0, commands };
}
