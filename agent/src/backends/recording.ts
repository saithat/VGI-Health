/**
 * Wraps any backend and records every call (full system prompt, user prompt,
 * schema name, response, backend, model) to `<runDir>/llm/<callId>.json`.
 * These files are what the replay backend reads, and what the integrity test
 * inspects to prove no validation/test data reached a prompt.
 */
import path from 'node:path';
import { z } from 'zod';
import type { LlmCallRef } from '../schema.js';
import { writeJson } from '../util.js';
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
  createdAt: z.string(),
});
export type LlmRecord = z.infer<typeof llmRecordSchema>;

export function llmRecordPath(runDir: string, callId: string): string {
  return path.join(runDir, 'llm', `${callId}.json`);
}

export class RecordingLlm implements JsonLlm {
  readonly name: JsonLlm['name'];
  readonly model: string;
  constructor(private readonly inner: JsonLlm, private readonly runDir: string) {
    this.name = inner.name;
    this.model = inner.model;
  }

  async complete(req: JsonRequest): Promise<JsonResponse> {
    const res = await this.inner.complete(req);
    const record: LlmRecord = {
      callId: req.callId,
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
