/**
 * Codex backend: shells out to
 *   codex exec --output-schema <schema.json> --sandbox read-only --ephemeral -o <out.json> -
 * with the prompt on stdin.
 *
 * Integrity: codex runs with `-C <empty temp dir>` (and `--skip-git-repo-check`)
 * so the agent does not start inside the repo, where later days' traces live
 * under runs/. The prompt contains no file paths.
 *
 * Model: CODEX_MODEL (passed as `-m`), else the `model = "..."` line of
 * ~/.codex/config.toml, else recorded as "codex-default".
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import type { JsonLlm, JsonRequest, JsonResponse } from './types.js';

function configuredModel(): string | null {
  const file = path.join(process.env['CODEX_HOME'] ?? path.join(homedir(), '.codex'), 'config.toml');
  if (!existsSync(file)) return null;
  const m = /^\s*model\s*=\s*"([^"]+)"/m.exec(readFileSync(file, 'utf8'));
  return m?.[1] ?? null;
}

export class CodexLlm implements JsonLlm {
  readonly name = 'codex' as const;
  readonly model: string;
  private readonly explicitModel: string | null;

  constructor(opts: { model?: string; binary?: string; timeoutMs?: number } = {}) {
    this.explicitModel = opts.model ?? process.env['CODEX_MODEL'] ?? null;
    this.model = this.explicitModel ?? configuredModel() ?? 'codex-default';
    this.binary = opts.binary ?? process.env['CODEX_BIN'] ?? 'codex';
    this.timeoutMs = opts.timeoutMs ?? 20 * 60_000;
  }
  private readonly binary: string;
  private readonly timeoutMs: number;

  async complete(req: JsonRequest): Promise<JsonResponse> {
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-codex-'));
    try {
      const schemaFile = path.join(dir, 'schema.json');
      const outFile = path.join(dir, 'out.json');
      await writeFile(schemaFile, JSON.stringify(req.schema));
      const args = [
        'exec', '--json', '-c', `model_reasoning_effort="${process.env['CODEX_REASONING_EFFORT'] ?? 'high'}"`, '--output-schema', schemaFile, '--sandbox', 'read-only', '--ephemeral', '-o', outFile,
        '--skip-git-repo-check', '-C', dir, ...(this.explicitModel ? ['-m', this.explicitModel] : []), '-',
      ];
      const stdin = `${req.system}\n\n---\n\n${req.prompt}\n\nReply with only the JSON object described by the output schema.`;
      const transcript = await this.run(args, stdin, dir);
      const text = await readFile(outFile, 'utf8');
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`codex backend: last message for ${req.callId} is not JSON`);
      }
      return { json, backend: 'codex', model: this.model, servedBy: null, replayOf: null, promptMatched: null, usage: { reasoningEffort: process.env['CODEX_REASONING_EFFORT'] ?? 'high' }, transcript };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private run(args: string[], stdin: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.binary, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
      let stderr = '';
      let stdout = '';
      child.stderr.on('data', (d: Buffer) => { stderr = (stderr + d.toString()).slice(-2_000_000); });
      child.stdout.on('data', (d: Buffer) => { stdout = (stdout + d.toString()).slice(-10_000_000); });
      const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('codex backend: timed out')); }, this.timeoutMs);
      child.on('error', (e) => { clearTimeout(timer); reject(new Error(`codex backend: ${e.message}`)); });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve({ stdout, stderr });
        else reject(new Error(`codex backend: exit ${String(code)}: ${stderr}`));
      });
      child.stdin.end(stdin);
    });
  }
}
