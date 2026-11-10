import { BackendRequestError } from '../errors.js';
import { UsageLimitError } from '../usage-limit.js';
import { retryInfrastructure,replayDrifted } from '../infrastructure.js';
import { ReplayDivergedError, ReplayMissingError } from './replay.js';
import { armCrashHook } from '../crash-hook.js';
/**
 * Wraps any backend and records every call (full system prompt, user prompt,
 * schema name, response, backend, model) to `<runDir>/llm/<callId>.json`.
 * These files are what the replay backend reads, and what the integrity test
 * inspects to prove no validation/test data reached a prompt.
 */
import path from 'node:path';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import type { LlmCallRef } from '../schema.js';
import { readJson, writeJson } from '../util.js';
import type { JsonLlm, JsonRequest, JsonResponse } from './types.js';

export const llmRecordSchema = z.object({
  callId: z.string(),
  purpose: z.string(),
  backend: z.string(),
  model: z.string(),
  servedBy: z.string().nullable(),
  replayOf: z.object({ backend: z.string(), model: z.string(), source: z.string() }).nullable(),
  promptMatched: z.boolean().nullable(),
  schemaName: z.string(),
  system: z.string(),
  prompt: z.string(),
  response: z.unknown(),
  usage: z.unknown(),
  finishReason: z.string().optional(),
  transcript: z.unknown().optional(),
  createdAt: z.string(),
  requestedModel:z.string().optional(),
});
export type LlmRecord = z.infer<typeof llmRecordSchema>;

export function llmRecordPath(runDir: string, callId: string): string {
  return path.join(runDir, 'llm', `${callId}.json`);
}

export class RecordingLlm implements JsonLlm {
  readonly name: JsonLlm['name'];
  readonly model: string;
  constructor(private readonly inner: JsonLlm, private readonly runDir: string, private readonly reuseExisting = false) {
    armCrashHook(inner.name);
    this.name = inner.name;
    this.model = inner.model;
  }

  async complete(req: JsonRequest): Promise<JsonResponse> {
    const file = llmRecordPath(this.runDir, req.callId);
    const toolEventStart=req.toolSession?.events.length??0;
    if (this.reuseExisting && !req.toolSession && existsSync(file)) {
      const old = await readJson(file, llmRecordSchema);
      if (old.system !== req.system || old.prompt !== req.prompt || old.schemaName !== req.schemaName ||
          old.backend !== this.inner.name || (old.requestedModel??old.model) !== this.inner.model) {
        throw new Error(`resume: completed LLM call ${req.callId} differs from the checkpoint; refusing to overwrite it`);
      }
      return { json: old.response, backend: this.inner.name, model: old.model, servedBy: old.servedBy,
        replayOf: old.replayOf, promptMatched: old.promptMatched, usage: old.usage,
        ...(old.finishReason !== undefined ? { finishReason: old.finishReason } : {}) };
    }
    await writeJson(file.replace(/\.json$/, '.request.json'), { ...req, toolSession:undefined, ...(req.toolSession?{tools:req.toolSession.definitions,budget:req.toolSession.budget}:{}), backend: this.inner.name, model: this.inner.model, startedAt: new Date().toISOString() });
    let attempt=0;
    const res=await retryInfrastructure(`llm:${req.callId}`,async()=>{
      try { return await this.inner.complete(req); }
      catch(error){
        if(error instanceof ReplayDivergedError || error instanceof ReplayMissingError)throw error;
        attempt++;
        const detail={callId:req.callId,error:error instanceof Error?error.message:String(error),time:new Date().toISOString(),...(req.toolSession?{toolEvents:req.toolSession.events.slice(toolEventStart),toolStats:req.toolSession.stats()}:{}),...((error&&typeof error==='object'&&'transcript' in error)?{transcript:error.transcript}:{}),...((error&&typeof error==='object'&&'audit' in error)?{audit:error.audit}:{})};
        let number=attempt;
        while(existsSync(file.replace(/\.json$/,`.attempt-${number}.error.json`)))number++;
        await writeJson(file.replace(/\.json$/,`.attempt-${number}.error.json`),detail);
        await writeJson(file.replace(/\.json$/,'.error.json'),detail);
        if(req.toolSession&&!(error instanceof UsageLimitError))throw new BackendRequestError(detail.error);
        throw error;
      }
    }, true);
    if(res.promptMatched===false)await replayDrifted(req.callId);
    const record: LlmRecord = {
      callId: req.callId,
      requestedModel:this.inner.model,
      purpose: req.purpose,
      backend: res.backend,
      model: res.model,
      servedBy: res.servedBy,
      replayOf: res.replayOf,
      promptMatched: res.promptMatched,
      schemaName: req.schemaName,
      system: req.system,
      prompt: req.prompt,
      response: res.json,
      usage: res.usage ?? null,
      ...(res.finishReason !== undefined ? { finishReason: res.finishReason } : {}),
      ...(res.transcript ? { transcript: res.transcript } : {}),
      createdAt: new Date().toISOString(),
    };
    await writeJson(llmRecordPath(this.runDir, req.callId), record);
    return res;
  }

  ref(req: JsonRequest, res: JsonResponse): LlmCallRef {
    return {
      callId: req.callId,
      purpose: req.purpose,
      backend: res.backend,
      model: res.model,
      servedBy: res.servedBy,
      promptChars: req.system.length + req.prompt.length,
      promptMatched: res.promptMatched,
      replayOf: res.replayOf,
      file: path.relative(this.runDir, llmRecordPath(this.runDir, req.callId)),
    };
  }
}
