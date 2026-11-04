import {describe,expect,it} from 'vitest';
import {PERSONA_PARAMS,personaParams} from '../src/personas';
import {PersonaParamsSchema} from '../src/schema';
describe('bounded persona generation',()=>{
  it('preserves historical defaults and gives explicit reproducible actor tastes',()=>{
    expect(personaParams('P1',7)).toEqual(PERSONA_PARAMS.P1);
    const actor=personaParams('P1',7,'bounded',true);
    expect(PersonaParamsSchema.parse(actor)).toEqual(actor);
    expect(actor).toEqual(personaParams('P1',7,'bounded',true));
    expect(actor.hiddenPreferences).not.toEqual(personaParams('P1',8,'bounded',true).hiddenPreferences);
    expect(actor.policy).toBe('bounded');
  });
});
