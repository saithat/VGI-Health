/** Reported completion usage from a backend response or its recorded Codex transcript. */
import { z } from 'zod';
import type { JsonResponse } from './types.js';
import type { TokenCounts } from '../quality-report.js';

const usageSchema=z.object({input_tokens:z.number(),output_tokens:z.number(),cached_input_tokens:z.number().optional()});
export function usageOf(response:Pick<JsonResponse,'usage'|'transcript'>):Omit<TokenCounts,'source'>|null {
  const direct=usageSchema.safeParse(response.usage);
  if(direct.success)return {input:direct.data.input_tokens,output:direct.data.output_tokens,cachedInput:direct.data.cached_input_tokens??0};
  const transcript=z.object({stdout:z.string()}).safeParse(response.transcript);
  if(transcript.success) for(const line of transcript.data.stdout.split('\n').reverse().filter(Boolean)) {
    let parsed:unknown;try{parsed=JSON.parse(line);}catch{continue;}
    const event=z.object({type:z.literal('turn.completed'),usage:usageSchema}).safeParse(parsed);
    if(event.success)return {input:event.data.usage.input_tokens,output:event.data.usage.output_tokens,cachedInput:event.data.usage.cached_input_tokens??0};
  }
  return null;
}
