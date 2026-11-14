import { personaPhase } from '../src/run.js';

it('runs every persona with at most the worker limit in flight and reports the first failure after all finish',async()=>{
  let active=0,peak=0;const done:string[]=[];
  const work=async(id:string)=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;done.push(id);if(id==='P2')throw Error('P2 failed');};
  await expect(personaPhase(['P1','P2','P3','P4','P5'],true,work,4)).rejects.toThrow('P2 failed');
  expect(peak).toBe(4);expect(done.sort()).toEqual(['P1','P2','P3','P4','P5']);
  active=0;peak=0;await personaPhase(['P1','P3','P4','P5'],true,async id=>{await work(id);},Infinity);expect(peak).toBe(4);
});
