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

export class ReplayDivergedError extends Error {
  constructor(readonly callId:string,readonly field:'system'|'prompt',readonly offset:number,expected:string,actual:string){
    super(`Replay diverged at ${callId}: ${field} character ${offset}; expected ${JSON.stringify(expected.slice(Math.max(0,offset-20),offset+40))}, received ${JSON.stringify(actual.slice(Math.max(0,offset-20),offset+40))}`);
    this.name='ReplayDivergedError';
  }
}
export class ReplayMissingError extends Error {}

export class ReplayLlm implements JsonLlm {
  readonly name = 'replay' as const;
  readonly model: string;
  readonly driftedCallIds:string[]=[];
  constructor(private readonly sourceRunDir: string, readonly options:{allowDrift?:boolean}={}) {
    this.model = 'replay';
  }

  async complete(req: JsonRequest): Promise<JsonResponse> {
    const file = llmRecordPath(this.sourceRunDir, req.callId);
    if (!existsSync(file)) throw new ReplayMissingError(`replay backend: no recording for ${req.callId} in ${this.sourceRunDir}`);
    const rec = await readJson(file, llmRecordSchema);
    for(const field of ['system','prompt'] as const){
      if(rec[field]===req[field])continue;
      let offset=0;while(offset<rec[field].length&&offset<req[field].length&&rec[field][offset]===req[field][offset])offset++;
      if(!this.options.allowDrift)throw new ReplayDivergedError(req.callId,field,offset,rec[field],req[field]);
      if(!this.driftedCallIds.includes(req.callId))this.driftedCallIds.push(req.callId);
      break;
    }
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
