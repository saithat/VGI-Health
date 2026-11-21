import { UsageLimitError,usageLimitIn } from '../usage-limit.js';
import { z } from 'zod';
import { confinedArgs,auditTranscript } from './isolation.js';
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
import { existsSync,readFileSync } from 'node:fs';
import { mkdtemp,readFile,rm,writeFile,mkdir,copyFile } from 'node:fs/promises';
import { homedir,tmpdir } from 'node:os';
import path from 'node:path';
import type { JsonLlm,JsonRequest,JsonResponse } from './types.js';

function configuredModel(): string | null {
  const file = path.join(process.env['CODEX_HOME'] ?? path.join(homedir(), '.codex'), 'config.toml');
  if (!existsSync(file)) return null;
  const m = /^\s*model\s*=\s*"([^"]+)"/m.exec(readFileSync(file, 'utf8'));
  return m?.[1] ?? null;
}

export function servedModel(stdout:string):string|null {
  for(const line of stdout.split('\n').filter(Boolean)) {
    const e=z.object({model:z.string().optional(),response:z.object({model:z.string().optional()}).optional(),session:z.object({model:z.string().optional()}).optional()}).safeParse(JSON.parse(line));
    if(e.success){const model=e.data.response?.model ?? e.data.session?.model ?? e.data.model;if(model)return model;}
  }
  return null;
}
export function transcriptFailure(stdout:string):boolean {
 return stdout.split('\n').filter(Boolean).some(line=>{
  const e=z.object({type:z.string(),item:z.object({type:z.string()}).optional()}).parse(JSON.parse(line));
  return ['turn.failed','error'].includes(e.type)||e.item?.type==='error';
 });
}

export class CodexLlm implements JsonLlm {
  readonly name = 'codex' as const;
  readonly model: string;


  constructor(opts: { model?: string; binary?: string; timeoutMs?: number; serviceTier?: string; reasoningEffort?: string } = {}) {
    this.serviceTier = opts.serviceTier ?? process.env['CODEX_SERVICE_TIER'] ?? null;
    this.reasoningEffort = opts.reasoningEffort ?? process.env['CODEX_REASONING_EFFORT'] ?? 'high';
    if (this.serviceTier === 'fast') throw new Error('Codex fast mode is prohibited; use --service-tier default');
    if (this.serviceTier !== null && !['flex', 'default'].includes(this.serviceTier)) throw new Error('Invalid Codex service tier');
    if (!['low', 'medium', 'high', 'xhigh', 'max', 'ultra'].includes(this.reasoningEffort)) throw new Error('Invalid reasoning effort');
    const model=opts.model ?? process.env['CODEX_MODEL'] ?? configuredModel();
    if (!model) throw new Error('Codex requires --model, CODEX_MODEL or model in config.toml; refusing an unrecorded CLI default');
    this.model=model;
    this.binary = opts.binary ?? process.env['CODEX_BIN'] ?? 'codex';
    this.timeoutMs = opts.timeoutMs ?? 20 * 60_000;
  }
  private readonly serviceTier: string | null;
  private readonly reasoningEffort: string;
  private readonly binary: string;
  private readonly timeoutMs: number;

  async complete(req: JsonRequest): Promise<JsonResponse> {
    const dir = await mkdtemp(path.join(tmpdir(), 'agent-codex-'));
    try {
      const privateHome = path.join(dir, 'codex-home');
      await mkdir(privateHome,{mode:0o700});
      const auth = path.join(process.env['CODEX_HOME'] ?? path.join(homedir(), '.codex'), 'auth.json');
      if (existsSync(auth)) await copyFile(auth, path.join(privateHome,'auth.json'));
      const schemaFile = path.join(dir, 'schema.json');
      const outFile = path.join(dir, 'out.json');
      await writeFile(schemaFile, JSON.stringify(req.schema));
      const args = [
        'exec', '--json', '-c', 'features.shell_tool=false', '-c', 'web_search="disabled"', '-c', `model_reasoning_effort="${this.reasoningEffort}"`, ...(this.serviceTier ? ['-c', `service_tier="${this.serviceTier}"`] : []), '--output-schema', schemaFile, '--sandbox', 'read-only', '--ephemeral', '-o', outFile,
        '--skip-git-repo-check', '-C', dir, '-m', this.model, '-',
      ];
      const stdin = `${req.system}\n\n---\n\n${req.prompt}\n\nReply with only the JSON object described by the output schema.`;
      let executable=this.binary;
      if (path.isAbsolute(executable) && !executable.startsWith('/usr/')) {
        const staged=path.join(dir,'codex-executable'); await copyFile(executable,staged); executable=staged;
      }
      const transcript = await this.run(args, stdin, dir, executable);
      const audit = auditTranscript(transcript.stdout);
      if (audit.status !== 'pass') throw Object.assign(new Error('Codex attempted forbidden tools; request rejected'), { transcript, audit });
      const servedBy=servedModel(transcript.stdout);
      if (transcriptFailure(transcript.stdout)) throw Object.assign(new Error('Codex reported a failed turn'),{transcript,audit});
      let text:string;
      try{text=await readFile(outFile, 'utf8');}catch(error){throw Object.assign(new Error(`codex backend: missing output for ${req.callId}`,{cause:error}),{transcript,audit});}
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw Object.assign(new Error(`codex backend: last message for ${req.callId} is not JSON`),{transcript,audit});
      }
      return { json, backend: 'codex', model: this.model, servedBy, replayOf: null, promptMatched: null, usage: { reasoningEffort: this.reasoningEffort, serviceTier: this.serviceTier, isolationAudit: audit }, transcript };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  private run(args: string[], stdin: string, cwd: string, executable: string, timeoutMs=this.timeoutMs): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn('bwrap', confinedArgs(cwd, executable, args), { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
      let stderr = '';
      let stdout = '';
      let stdoutTruncated=false;
      child.stderr.on('data', (d: Buffer) => { stderr = (stderr + d.toString()).slice(-2_000_000); });
      child.stdout.on('data', (d: Buffer) => {
        const next=stdout+d.toString();
        if(next.length>10_000_000){stdoutTruncated=true;stdout=next.slice(0,10_000_000);child.kill('SIGTERM');}
        else stdout=next.slice(-10_000_000);
      });
      const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('codex backend: timed out')); }, timeoutMs);
      child.on('error', (e) => { clearTimeout(timer); reject(new Error(`codex backend: ${e.message}`)); });
      child.on('close', (code) => {
        clearTimeout(timer);
        // Never accept an arm-C turn after dropping command provenance.
        if(stdoutTruncated){reject(Object.assign(new Error('codex backend: query transcript exceeded limit; complete audit unavailable'),{transcript:{stdout:stdout,stderr},audit:{...auditTranscript(stdout),status:'fail',transcriptTruncated:true}}));return;}
        // A plan usage limit or exhausted rate limit pauses the run (resumable); it is never a model result.
        const failed=code!==0||(()=>{try{return transcriptFailure(stdout);}catch{return false;}})();
        const limit=failed?usageLimitIn(stdout,stderr,'codex'):null;
        if(limit){reject(Object.assign(new UsageLimitError(limit),{transcript:{stdout:stdout,stderr}}));return;}
        if (code === 0) resolve({ stdout, stderr });
        else reject(Object.assign(new Error(`codex backend: exit ${String(code)}: ${stderr}`), { transcript: {stdout:stdout,stderr}, audit: auditTranscript(stdout) }));
      });
      child.stdin.end(stdin);
    });
  }
}
