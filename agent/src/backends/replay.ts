/**
 * Replay backend: returns the responses recorded in a previous run directory
 * (`<source>/llm/<callId>.json`), so demos are deterministic and need no API
 * key or network. Reports the original backend/model as `replayOf`, and
 * whether today's prompt is byte-identical to the recorded one.
 */
import { existsSync } from 'node:fs';
import { readJson } from '../util.js';
import { llmRecordPath, llmRecordSchema } from './recording.js';
import type { JsonLlm, JsonRequest, JsonResponse } from './types.js';

export class ReplayMissingError extends Error {}

export class ReplayLlm implements JsonLlm {
  readonly name = 'replay' as const;
  readonly model: string;
  constructor(private readonly sourceRunDir: string) {
    this.model = 'replay';
  }

  async complete(req: JsonRequest): Promise<JsonResponse> {
    const file = llmRecordPath(this.sourceRunDir, req.callId);
    if (!existsSync(file)) throw new ReplayMissingError(`replay backend: no recording for ${req.callId} in ${this.sourceRunDir}`);
    const rec = await readJson(file, llmRecordSchema);
    const original = rec.replayOf ?? { backend: rec.backend, model: rec.model, source: this.sourceRunDir };
    return {
      json: rec.response,
      backend: 'replay',
      model: original.model,
      servedBy: rec.servedBy,
      replayOf: { backend: original.backend, model: original.model, source: original.source },
      promptMatched: rec.system === req.system && rec.prompt === req.prompt,
      usage: null,
    };
  }
}
