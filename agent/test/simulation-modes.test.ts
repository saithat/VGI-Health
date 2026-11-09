import {describe,it,expect} from 'vitest';
import {simulationModesSchema,resolvedSimulationModes,realWorkModes,legacyModes} from '../src/simulation-modes.js';
describe('persisted simulation modes',()=>{
  it('replays retained continuous/real-work manifests with the pre-wave3 assumptions',()=>{
    const old=simulationModesSchema.parse({clockMode:'continuous',interruptions:'realWork'});
    expect(resolvedSimulationModes(old)).toEqual({clockMode:'continuous',interruptions:'realWork',simModel:'legacy',textCost:'legacy'});
    expect(resolvedSimulationModes(old)).not.toEqual(resolvedSimulationModes(realWorkModes));
  });
  it('normalizes explicit legacy controls for resume comparisons',()=>{
    expect(resolvedSimulationModes(legacyModes)).toEqual(resolvedSimulationModes({...legacyModes,simModel:'legacy',textCost:'legacy'}));
  });
  it('records an independent same-text cost opt-out',()=>{
    const mode=simulationModesSchema.parse({...realWorkModes,textCost:'legacy'});
    expect(resolvedSimulationModes(mode).simModel).toBe('wave3');
    expect(resolvedSimulationModes(mode).textCost).toBe('legacy');
    expect(simulationModesSchema.safeParse({...mode,textCost:'unknown'}).success).toBe(false);
  });
});
