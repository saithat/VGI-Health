import { z } from 'zod';
import type { EhrClient } from './ehr.js';
/** Explicit measurement semantics; omitted metadata denotes historical controls. */
export const simulationModesSchema = z.object({
  clockMode: z.enum(['continuous', 'legacy']),
  interruptions: z.enum(['realWork', 'fixedCost']),
});
export type SimulationModes = z.infer<typeof simulationModesSchema>;
export const legacyModes: SimulationModes = {clockMode:'legacy', interruptions:'fixedCost'};
export const realWorkModes: SimulationModes = {clockMode:'continuous', interruptions:'realWork'};
export function withSimulationModes(ehr:EhrClient, modes:SimulationModes):EhrClient {
  return {...ehr, mode:ehr.mode, binary:ehr.binary,
    check:i=>ehr.check(i), deploy:i=>ehr.deploy(i), minClicks:i=>ehr.minClicks(i),
    renderScreens:i=>ehr.renderScreens(i), runBatch:i=>ehr.runBatch(i), specExport:i=>ehr.specExport(i),
    simulate:i=>ehr.simulate({...i,...modes}),
  };
}
