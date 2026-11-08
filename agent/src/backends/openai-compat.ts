import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import { BackendRequestError } from '../errors.js';
import { isRecord } from '../jsonpatch.js';
import type { JsonLlm, JsonRequest, JsonResponse } from './types.js';
import { runToolTurns } from '../tool-turns.js';

export const schemaModeSchema = z.enum(['json_schema', 'json_object', 'prompt']);
type SchemaMode = z.infer<typeof schemaModeSchema>;

/** JSON Schema defaults are annotations, while the converter applies them. Remove
 * only schema-node annotations, preserving properties actually named "default". */
function validationSchema(schema: Record<string, unknown>): z.ZodType {
  function stripDefaults(node: Record<string, unknown>): Record<string, unknown> {
    for (const key of ['dependencies', '$dynamicRef', '$dynamicAnchor', '$vocabulary']) {
      if (key in node) throw new Error(`openai-compat: unsupported JSON Schema keyword ${key}`);
    }
    const result = { ...node };
    delete result['default'];
    for (const key of ['properties', 'patternProperties', '$defs', 'definitions', 'dependentSchemas']) {
      const entries = result[key];
      if (isRecord(entries)) result[key] = Object.fromEntries(Object.entries(entries).map(([name, child]) => [name, isRecord(child) ? stripDefaults(child) : child]));
    }
    for (const key of ['items', 'additionalItems', 'contains', 'propertyNames', 'additionalProperties', 'not', 'if', 'then', 'else', 'unevaluatedItems', 'unevaluatedProperties', 'allOf', 'anyOf', 'oneOf', 'prefixItems']) {
      const child = result[key];
      if (isRecord(child)) result[key] = stripDefaults(child);
      else if (Array.isArray(child)) result[key] = child.map(item => isRecord(item) ? stripDefaults(item) : item);
    }
    return result;
  }
  return z.fromJSONSchema(stripDefaults(schema));
}

/** Keep the original JSON: validation must never coerce, strip or repair a reply. */
export function validateReply(schema: Record<string, unknown>, json: unknown): void {
  const result = validationSchema(schema).safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`reply does not match request schema at ${issue?.path.join('.') || '<root>'}: ${issue?.message ?? 'invalid JSON'}`);
  }
}

const completionSchema = z.object({
  model: z.string().min(1),
  choices: z.array(z.object({
    finish_reason: z.string(),
    message: z.object({ content: z.string().nullable(), refusal: z.string().nullable().optional() }),
  })).min(1),
  usage: z.unknown().optional(),
});

function numberSetting(name: string, integer: boolean, min: number, max = Infinity): number | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!raw.trim() || !Number.isFinite(n) || (integer && !Number.isSafeInteger(n)) || n < min || n > max) {
    throw new Error(`openai-compat: ${name} must be ${integer ? 'an integer' : 'a number'} in [${min}, ${max}]`);
  }
  return n;
}

/** Plain Chat Completions HTTP transport; no SDK, tools, default model or repair. */
export class OpenAICompatLlm implements JsonLlm {
  readonly name = 'openai-compat' as const;
  readonly model: string;
  private readonly url: string;
  private readonly apiKey: string | undefined;
  private readonly mode: SchemaMode;
  private readonly maxTokens: number | undefined;
  private readonly temperature: number | undefined;
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(opts: { model?: string } = {}) {
    const base = process.env['OPENAI_COMPAT_BASE_URL']?.trim();
    if (!base) throw new Error('openai-compat: OPENAI_COMPAT_BASE_URL is required (include /v1 when the server uses it)');
    let url: URL;
    try { url = new URL(base); } catch { throw new Error('openai-compat: OPENAI_COMPAT_BASE_URL must be an HTTP(S) URL'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error('openai-compat: base URL must be HTTP(S), without credentials, query or fragment');
    }
    this.url = base.replace(/\/+$/, '') + '/chat/completions';
    const model = (opts.model ?? process.env['OPENAI_COMPAT_MODEL'])?.trim();
    if (!model) throw new Error('openai-compat: requires --model or OPENAI_COMPAT_MODEL; refusing an unrecorded default');
    this.model = model;
    this.apiKey = process.env['OPENAI_COMPAT_API_KEY'];
    const mode = schemaModeSchema.safeParse(process.env['OPENAI_COMPAT_SCHEMA_MODE'] ?? 'json_schema');
    if (!mode.success) throw new Error('openai-compat: OPENAI_COMPAT_SCHEMA_MODE must be json_schema, json_object or prompt');
    this.mode = mode.data;
    this.maxTokens = numberSetting('OPENAI_COMPAT_MAX_TOKENS', true, 1);
    this.temperature = numberSetting('OPENAI_COMPAT_TEMPERATURE', false, 0, 2);
    this.timeoutMs = numberSetting('OPENAI_COMPAT_TIMEOUT_MS', true, 1) ?? 20 * 60_000;
    this.retries = numberSetting('OPENAI_COMPAT_RETRIES', true, 0, 4) ?? 2;
  }

  async complete(req: JsonRequest): Promise<JsonResponse> {
    try { return req.toolSession ? await this.toolRequest(req) : await this.request(req); }
    catch (error) { throw new BackendRequestError(error instanceof Error ? error.message : 'openai-compat: request failed'); }
  }

  private async toolRequest(req:JsonRequest):Promise<JsonResponse>{
    const session=req.toolSession;if(!session)throw new Error('Missing tool session');
    const messages:unknown[]=[{role:'system',content:req.system},{role:'user',content:req.prompt}];
    const result=await runToolTurns(req,async results=>{
      for(const r of results)messages.push({role:'tool',tool_call_id:r.id,content:JSON.stringify(r.result)});
      const response=await fetch(this.url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(Math.min(this.timeoutMs,session.remainingMs)),
        headers:{'Content-Type':'application/json',...(this.apiKey?{Authorization:`Bearer ${this.apiKey}`}:{})},
        body:JSON.stringify({model:this.model,messages,tools:session.definitions.map(t=>({type:'function',function:{name:t.name,description:t.description,parameters:t.inputSchema}})),
          tool_choice:'required',parallel_tool_calls:false,max_tokens:Math.min(this.maxTokens??16000,session.remainingTokens),...(this.temperature!==undefined?{temperature:this.temperature}:{})})});
      if(!response.ok){await response.body?.cancel();throw new Error(`openai-compat: tool HTTP ${response.status}`);}
      const reply=z.object({model:z.string(),usage:z.object({prompt_tokens:z.number().nonnegative(),completion_tokens:z.number().nonnegative(),prompt_tokens_details:z.object({cached_tokens:z.number()}).optional()}),
        choices:z.array(z.object({finish_reason:z.string(),message:z.object({role:z.literal('assistant'),content:z.string().nullable().optional(),tool_calls:z.array(z.object({id:z.string(),type:z.literal('function'),function:z.object({name:z.string(),arguments:z.string()})})).optional()})})).min(1)}).parse(await response.json());
      const choice=reply.choices[0];if(!choice||choice.finish_reason!=='tool_calls')throw new Error('openai-compat: expected complete tool_calls turn');
      messages.push(choice.message);
      return {calls:(choice.message.tool_calls??[]).map(c=>({id:c.id,name:c.function.name,arguments:JSON.parse(c.function.arguments)})),
        inputTokens:reply.usage.prompt_tokens,outputTokens:reply.usage.completion_tokens,cachedInputTokens:reply.usage.prompt_tokens_details?.cached_tokens??0,servedBy:reply.model,raw:reply};
    });
    return {...result,backend:this.name,model:this.model,replayOf:null,promptMatched:null};
  }

  private async request(req: JsonRequest): Promise<JsonResponse> {
    if (req.queryBundle) throw new Error('openai-compat: query tools are unsupported');
    // Compile before making a paid call, including on servers with constrained decoding.
    validationSchema(req.schema);
    const body = JSON.stringify({
      model: this.model,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: this.mode === 'json_schema' ? req.prompt :
          `${req.prompt}\n\nReturn only JSON matching this JSON Schema (${req.schemaName}):\n${JSON.stringify(req.schema)}` },
      ],
      ...(this.maxTokens !== undefined ? { max_tokens: this.maxTokens } : {}),
      ...(this.temperature !== undefined ? { temperature: this.temperature } : {}),
      ...(this.mode === 'json_schema' ? { response_format: { type: 'json_schema', json_schema: { name: req.schemaName, schema: req.schema, strict: true } } } :
        this.mode === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
    });
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      let retryMs: number | null = null;
      try {
        let response: Response;
        try {
          response = await fetch(this.url, {
            method: 'POST', redirect: 'error', signal: controller.signal,
            headers: { 'Content-Type': 'application/json', ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}) }, body,
          });
        } catch {
          throw new Error(`openai-compat: ${controller.signal.aborted ? 'timed out' : 'HTTP connection failed'} for ${req.callId}`);
        }
        if (!response.ok) {
          // Never echo a provider's error body: it may contain credentials or the prompt.
          await response.body?.cancel();
          if ((response.status === 429 || (response.status >= 500 && response.status < 600)) && attempt < this.retries) {
            const header = response.headers.get('retry-after');
            const seconds = header === null ? NaN : Number(header);
            const requested = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header ?? '') - Date.now();
            retryMs = Math.min(10_000, Math.max(0, Number.isFinite(requested) ? requested : 500 * 2 ** attempt));
          } else throw new Error(`openai-compat: HTTP ${response.status} for ${req.callId} after ${attempt + 1} attempt(s)`);
        } else {
          let raw: unknown;
          try { raw = await response.json(); } catch { throw new Error(`openai-compat: invalid HTTP JSON or timed out reading ${req.callId}`); }
          const parsed = completionSchema.safeParse(raw);
          if (!parsed.success) throw new Error(`openai-compat: malformed Chat Completions response for ${req.callId}`);
          const reply = parsed.data, choice = reply.choices[0];
          if (!choice) throw new Error('openai-compat: no completion choice');
          if (choice.finish_reason === 'length') throw new Error(`openai-compat: finish_reason=length (truncated) for ${req.callId}`);
          if (choice.finish_reason !== 'stop' || choice.message.refusal || choice.message.content === null) {
            throw new Error(`openai-compat: refused or incomplete reply for ${req.callId}`);
          }
          const content = choice.message.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
          let json: unknown;
          try { json = JSON.parse(content); } catch { throw new Error(`openai-compat: reply for ${req.callId} is not JSON`); }
          try { validateReply(req.schema, json); } catch (error) {
            throw new Error(`openai-compat: ${req.callId}: ${error instanceof Error ? error.message : 'schema validation failed'}`);
          }
          return { json, backend: this.name, model: this.model, servedBy: reply.model, usage: reply.usage ?? null,
            finishReason: choice.finish_reason, replayOf: null, promptMatched: null,
            transcript: { schemaMode: this.mode, maxTokens: this.maxTokens ?? null, temperature: this.temperature ?? null, attempts: attempt + 1 } };
        }
      } finally { clearTimeout(timer); }
      if (retryMs !== null) await delay(retryMs);
    }
  }
}
