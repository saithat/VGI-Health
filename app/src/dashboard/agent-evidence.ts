/** Review-only agent evidence. Keep these extensions out of the clinical wire
 * schema: dashboard metadata must not invalidate certified painter builds. */
import { z } from 'zod';
import {
  screenCheckResultSchema as baseScreenCheck,
  candidateSchema as baseCandidate, evaluatedCandidateSchema as baseEvaluated,
  decisionRecordSchema as baseDecision, llmCandidateSchema as baseLlmCandidate,
  llmProposalSchema as baseProposal, toCandidate as baseToCandidate,
  trainSummarySchema as baseTrain,
} from '../../../agent/src/schema.js';
export * from './measurement-schema.js';
const floorCostSchema = z.object({clicks:z.number(),scrolls:z.number(),klmDeciSec:z.number(),popups:z.number()});
const floorGapSchema = floorCostSchema.omit({popups:true});
export const trainSummarySchema = baseTrain.extend({
  byWorkflow:z.array(baseTrain.shape.byWorkflow.element.extend({completed:z.number().int().nonnegative().optional()})),
  workflowFloorGaps:z.array(z.object({
  workflow:z.string(),tasks:z.number().int().nonnegative(),completed:z.number().int().nonnegative(),paired:z.number().int().nonnegative(),
  actual:floorCostSchema,floor:floorCostSchema.nullable(),gap:floorGapSchema.nullable(),
  breakdown:z.array(z.object({category:z.enum(['navigation','scrolling','alertAcknowledgments','entrySteps','unattributed']),actual:floorCostSchema,floor:floorCostSchema,gap:floorGapSchema})),
})).optional()});
export type TrainSummary=z.infer<typeof trainSummarySchema>;
export const portfolioSchema=z.object({scale:z.enum(['small','medium','radical']),hotspotId:z.string().min(1)});
export const candidateSchema=baseCandidate.extend({portfolio:portfolioSchema.optional()});
export const evaluatedCandidateSchema=baseEvaluated.extend({candidate:candidateSchema});
export const llmCandidateSchema=baseLlmCandidate.extend({portfolio:portfolioSchema.optional()});
export const llmProposalSchema=baseProposal.extend({candidates:z.array(llmCandidateSchema)});
export const screenCheckResultSchema=baseScreenCheck.extend({mode:z.enum(['real','fake','lean'])});
export type ScreenCheckResult=z.infer<typeof screenCheckResultSchema>;
const baseReplay=baseDecision.shape.validation.shape.replay.unwrap();
const replayDay=baseReplay.extend({
  bounded:baseReplay.shape.bounded.unwrap().extend({memorySource:z.enum(['all-past','train-only'])}).optional(),
});
export type ReplayDay=z.infer<typeof replayDay>;
export const decisionRecordSchema=baseDecision.extend({
  mode:z.enum([...baseDecision.shape.mode.options,'hillclimb']),
  outcome:z.enum([...baseDecision.shape.outcome.options,'backstop']),
  validation:baseDecision.shape.validation.extend({replay:replayDay.nullable()}),
  measured:baseDecision.shape.measured.extend({validation:replayDay.nullable()}),
  screenCheck:screenCheckResultSchema.nullable(),evidence:trainSummarySchema,backend:baseDecision.shape.backend.extend({name:z.enum(['claude','codex','openai-compat','replay','scripted'])}),candidates:z.array(evaluatedCandidateSchema),exploration:z.object({
  policy:z.string(),minimumEffect:z.number(),
  checker:z.object({proposed:z.number().int().nonnegative(),rejected:z.number().int().nonnegative(),rate:z.number().nullable(),checkerRejected:z.number().int().nonnegative(),invalid:z.number().int().nonnegative()}),
  candidates:z.array(z.object({id:z.string(),gross:z.number(),net:z.number(),switchCost:z.number(),fromCurrent:z.number(),fromArchive:z.number(),explorationRank:z.number()})),
  selectedDistance:z.number().nullable(),
}).optional()});
export type Candidate=z.infer<typeof candidateSchema>;
export type EvaluatedCandidate=z.infer<typeof evaluatedCandidateSchema>;
export type DecisionRecord=z.infer<typeof decisionRecordSchema>;
export type LlmCandidate=z.infer<typeof llmCandidateSchema>;
export type LlmProposal=z.infer<typeof llmProposalSchema>;
export function toCandidate(raw:Omit<LlmCandidate,'moveType'> & {moveType:Candidate['moveType']},source:Candidate['source']):Candidate {
  return candidateSchema.parse({...baseToCandidate(raw,source),...(raw.portfolio?{portfolio:raw.portfolio}:{})});
}

export { interruptionDayResultSchema as dayResultSchema } from './interruption-schema.js';
