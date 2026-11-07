import { z } from 'zod';
import type { Program, TrainEstimate, DecisionRecord } from '../../app/src/dashboard/agent-evidence.js';
import { usageWeightedSwitchCost, type SwitchCost, type ClinicianContext } from './cadence.js';
import { novelty } from '../../explore/structure.js';

export const STRUCTURE_POLICY='hotspot-portfolio-v1';
export const structurePolicySchema=z.object({
  /** Daily net click+scroll saving; train and validation must both pass. */
  minimumEffect:z.number().finite().nonnegative().default(5),
  noveltyWeight:z.number().finite().nonnegative().default(0.25),
  topK:z.number().int().positive().max(50).default(8),
});
export type StructurePolicy=z.infer<typeof structurePolicySchema>;
export const defaultStructurePolicy=():StructurePolicy=>structurePolicySchema.parse({});
export function effectPass(estimate:TrainEstimate|null,net:number,minimum:number):boolean {
  return !!estimate&&estimate.days.length>0&&estimate.before.tasks>0&&estimate.after.tasks===estimate.before.tasks&&
    estimate.after.completed===estimate.after.tasks&&Number.isFinite(net)&&net>0&&net>=minimum;
}
export async function scoreStructure(before:Program,after:Program,estimate:TrainEstimate|null,context:ClinicianContext,
  archive:readonly Program[]=[],costModel:SwitchCost=usageWeightedSwitchCost) {
  const cost=await costModel(structuredClone(before),structuredClone(after),structuredClone(context));
  if(!Number.isFinite(cost.cost)||cost.cost<0)throw Error('Invalid relearning cost');
  const gross=estimate?(estimate.before.clicks+estimate.before.scrolls-estimate.after.clicks-estimate.after.scrolls)/estimate.days.length:0;
  return {gross,net:gross-cost.cost,switchCost:cost,...novelty(after,before,archive)};
}
export function rejectionGauge(rec:DecisionRecord) {
  const proposed=rec.candidates.filter(c=>!c.candidate.seeded&&c.candidate.source!=='archive-bundle');
  const rejected=proposed.filter(c=>c.check.status==='fail').length;
  return {proposed:proposed.length,rejected,rate:proposed.length?rejected/proposed.length:null,
    checkerRejected:proposed.filter(c=>c.check.status==='fail').length,
    invalid:proposed.filter(c=>c.check.status==='invalid-patch').length};
}
