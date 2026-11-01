import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { programSchema } from '../src/lean-types.js';
it('preserves the certified workspace selection requirement through agent parsing', () => {
  const canonical = JSON.parse(readFileSync('../releases/v1/personas/P3.json', 'utf8'));
  expect(canonical.patientSelection).toBe(true);
  expect(programSchema.parse(canonical).patientSelection).toBe(true);
});

it('rejects a designer patch that disables the shared patient binding',async()=>{
 const {applyToProgram}=await import('../src/program.js');
 const program=programSchema.parse(JSON.parse(readFileSync('../releases/v1/personas/P3.json','utf8')));
 expect(()=>applyToProgram(program,[{op:'replace',path:'/patientSelection',value:false}],{version:1})).toThrow('patientSelection');
});
