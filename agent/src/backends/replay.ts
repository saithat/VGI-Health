/**
 * Replay backend: returns the responses recorded in a previous run directory
 * (`<source>/llm/<callId>.json`), so demos are deterministic and need no API
 * key or network. Reports the original backend/model as `replayOf`, and
 * whether today's prompt is byte-identical to the recorded one.
 */
import { BackendRequestError } from '../errors.js';
import { existsSync } from 'node:fs';
import { readJson } from '../util.js';
import { llmRecordPath, llmRecordSchema } from './recording.js';
import type { JsonLlm, JsonRequest, JsonResponse } from './types.js';
import { z } from 'zod';
import { toolEventSchema } from '../tool-session.js';
import { stableStringify } from '../program.js';

export class ReplayDivergedError extends Error {
  constructor(readonly callId:string,readonly field:'system'|'prompt',readonly offset:number,expected:string,actual:string){
    super(`Replay diverged at ${callId}: ${field} character ${offset}; expected ${JSON.stringify(expected.slice(Math.max(0,offset-20),offset+40))}, received ${JSON.stringify(actual.slice(Math.max(0,offset-20),offset+40))}`);
    this.name='ReplayDivergedError';
  }
}
export class ReplayMissingError extends Error {}
export class ToolReplayDivergedError extends ReplayMissingError {}

export class ReplayLlm implements JsonLlm {
  readonly name = 'replay' as const;
  readonly model: string;
  readonly driftedCallIds:string[]=[];
  constructor(private readonly sourceRunDir: string, readonly options:{allowDrift?:boolean}={}) {
    this.model = 'replay';
  }

  async complete(req: JsonRequest): Promise<JsonResponse> {
    const file = llmRecordPath(this.sourceRunDir, req.callId);
    if(!existsSync(file)&&req.toolSession&&existsSync(file.replace(/\.json$/,'.error.json'))){
      const original=await readJson(file.replace(/\.json$/,'.request.json'),z.object({system:z.string(),prompt:z.string()}));
      if(original.system!==req.system||original.prompt!==req.prompt)throw new ToolReplayDivergedError('Tool replay requires identical prompts');
      const failure=await readJson(file.replace(/\.json$/,'.error.json'),z.object({error:z.string(),toolEvents:z.array(toolEventSchema),toolStats:z.object({inputTokens:z.number(),outputTokens:z.number(),exceeded:z.string().nullable()})}));
      try{await req.toolSession.replay(failure.toolEvents,false);}catch(error){throw new ToolReplayDivergedError(error instanceof Error?error.message:'Tool replay diverged');}
      req.toolSession.restoreAccounting(failure.toolStats);
      throw new BackendRequestError(failure.error);
    }
    if (!existsSync(file)) throw new ReplayMissingError(`replay backend: no recording for ${req.callId} in ${this.sourceRunDir}`);
    const rec = await readJson(file, llmRecordSchema);
    if(req.toolSession){
      // E never allows prompt drift, and re-executes every frozen tool result.
      if(rec.system!==req.system||rec.prompt!==req.prompt)throw new ToolReplayDivergedError('Tool replay requires identical prompts');
      const transcript=z.object({toolEvents:z.array(toolEventSchema),toolStats:z.object({inputTokens:z.number(),outputTokens:z.number(),exceeded:z.string().nullable()})}).parse(rec.transcript);
      let final:unknown;try{final=await req.toolSession.replay(transcript.toolEvents);}catch(error){throw new ToolReplayDivergedError(error instanceof Error?error.message:'Tool replay diverged');}
      req.toolSession.restoreAccounting(transcript.toolStats);req.toolSession.assertBudget();
      if(stableStringify(final)!==stableStringify(rec.response))throw new ToolReplayDivergedError('Tool replay submission differs');
    }
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
      usage: req.toolSession?rec.usage:null,
      ...(req.toolSession?{transcript:rec.transcript}:{}),
      ...(rec.finishReason !== undefined ? { finishReason: rec.finishReason } : {}),
    };
  }
}
