import {test,expect} from 'vitest';
import {occurrences} from '../src/lean-layout-geometry.js';
import fixtures from '../../app/tests/data/lean-widgets.json';
import {screenOccurrences} from '../../app/src/lean-ui/sources.js';
import {uiScreenSchema} from '../../app/src/ehr/ui/types.js';
for(const [kind,raw] of Object.entries(fixtures))test(`${kind} agent occurrence mirror retains every rich part`,()=>{
  const screen=uiScreenSchema.parse(raw),parts=screenOccurrences(screen);
  expect(occurrences(raw)).toEqual(parts.map(({path,ids})=>({path,ids})));
  if(kind==='board')expect(parts.flatMap(p=>p.ids)).toEqual(['A::review','B::review']);
  if(kind==='trend'||kind==='growth')expect(parts.filter(p=>p.role==='item').length).toBeGreaterThanOrEqual(6);
});
