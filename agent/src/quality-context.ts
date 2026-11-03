/** Explicit projections are the integrity boundary: never serialize a historical record. */
import type { DecisionRecord, Savings } from './schema.js';
import type { PromptParts } from './prompts.js';
import type { LocalityDigest } from './locality.js';
import { z } from 'zod';

export const LEDGER_RULE = 'Do not re-propose an idea that measured zero or worse unless the program or the evidence has changed in a way you name.';
export const physicalKeys = ['clicks','keystrokes','scrolls','scrollPx','mouseTravelPx'] as const;
export function physicalSaving(s: Savings | null) {
  return s ? {clicks:s.clicks,keystrokes:s.keystrokes,scrolls:s.scrolls,scrollPx:s.scrollPx??null,mouseTravelPx:s.mouseTravelPx??null} : null;
}
export type MeasuredSavings = Map<string,ReturnType<typeof physicalSaving>>;
export function measuredLedger(records: readonly DecisionRecord[], persona: string, night: number, measured:ReadonlyMap<string,ReturnType<typeof physicalSaving>>) {
  const saving=(r:DecisionRecord,id:string)=>{const key=`${r.night}/${r.persona}/${id}`;if(!measured.has(key))throw new Error(`Missing recomputed ledger candidate: ${key}`);return measured.get(key)??null;};
  return records.filter(r=>r.persona===persona && r.night<night).sort((a,b)=>a.night-b.night).flatMap(r=>r.candidates.map(e=>({
    night:r.night,id:e.candidate.id,moveType:e.candidate.moveType,targets:[...e.candidate.targets],summary:e.candidate.summary,
    trainDaySaving:saving(r,e.candidate.id),chosen:r.chosen?.candidateIds.includes(e.candidate.id)??false,
    nightOutcome:r.outcome,seeded:e.candidate.seeded,
  })));
}
export type Ledger = ReturnType<typeof measuredLedger>;
export interface QualityContext { ledger: Ledger; locality: LocalityDigest }
const physical = {
  clicks:z.number(),keystrokes:z.number(),scrolls:z.number(),scrollPx:z.number().nullable(),mouseTravelPx:z.number().nullable(),
};
const totals = z.object({...physical,visits:z.number()});
// Strip unknown fields even if a caller structurally types a holdout-bearing object as train context.
export const contextSchema = z.object({
  ledger:z.array(z.object({night:z.number(),id:z.string(),moveType:z.string(),targets:z.array(z.string()),summary:z.string(),
    trainDaySaving:z.object(physical).nullable(),chosen:z.boolean(),nightOutcome:z.string(),seeded:z.boolean()})),
  locality:z.object({trainDays:z.array(z.number()),units:z.string(),totals,
    screens:z.array(totals.extend({screen:z.string(),share:z.number()})),
    components:z.array(totals.extend({screen:z.string(),component:z.string(),scrollPast:z.array(z.object({component:z.string(),scrolls:z.number()}))})),
    otherComponents:totals,sequences:z.array(z.object({steps:z.array(z.string()),tasks:z.number()}))}),
});
export function withQuality(parts: PromptParts, context?: QualityContext): PromptParts {
  if (!context) return parts; // arm A / production: same object, byte-identical
  const {ledger,locality}=contextSchema.parse(context);
  return {...parts,prompt:parts.prompt+'\n\n## Earlier measured ideas (training days only)\n'+LEDGER_RULE+'\n'+
    JSON.stringify(ledger,(key,value)=>/klm|wallTime|timeSinksByScreen|^(validation|test|holdout|measured)$/i.test(key)?undefined:value)+
    '\n\n## Physical locality (training days only)\n'+JSON.stringify(locality,(key,value)=>/klm|wallTime|timeSinksByScreen|^(validation|test|holdout|measured)$/i.test(key)?undefined:value)};
}
/** Same id or same move and target set: a predeclared, conservative idea identity. */
export function sameIdea(a: {id:string;moveType:string;targets:readonly string[]}, b: {id:string;moveType:string;targets:readonly string[]}): boolean {
  return a.id===b.id || (a.moveType===b.moveType && a.targets.length>0 && JSON.stringify([...a.targets].sort())===JSON.stringify([...b.targets].sort()));
}
export function zeroEffect(s: ReturnType<typeof physicalSaving>): boolean {
  return s!==null && physicalKeys.every(k=>s[k]===0);
}
export function zeroOrWorse(s: ReturnType<typeof physicalSaving>): boolean {
  return s!==null && physicalKeys.every(k=>typeof s[k]==='number' && s[k]<=0);
}
