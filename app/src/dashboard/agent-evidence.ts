/** Review-only agent evidence. Keep these extensions out of the clinical wire
 * schema: dashboard metadata must not invalidate certified painter builds. */
import { z } from 'zod';
import {
  candidateSchema as baseCandidate, evaluatedCandidateSchema as baseEvaluated,
  decisionRecordSchema as baseDecision, llmCandidateSchema as baseLlmCandidate,
  llmProposalSchema as baseProposal, toCandidate as baseToCandidate,
} from '../../../agent/src/schema.js';
export * from './measurement-schema.js';
export const portfolioSchema=z.object({scale:z.enum(['small','medium','radical']),hotspotId:z.string().min(1)});
export const candidateSchema=baseCandidate.extend({portfolio:portfolioSchema.optional()});
export const evaluatedCandidateSchema=baseEvaluated.extend({candidate:candidateSchema});
export const llmCandidateSchema=baseLlmCandidate.extend({portfolio:portfolioSchema.optional()});
export const llmProposalSchema=baseProposal.extend({candidates:z.array(llmCandidateSchema)});
export const decisionRecordSchema=baseDecision.extend({candidates:z.array(evaluatedCandidateSchema),exploration:z.object({
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
export function toCandidate(raw:LlmCandidate,source:Candidate['source']):Candidate {
  return candidateSchema.parse({...baseToCandidate(raw,source),...(raw.portfolio?{portfolio:raw.portfolio}:{})});
}

export { interruptionDayResultSchema as dayResultSchema } from './interruption-schema.js';
