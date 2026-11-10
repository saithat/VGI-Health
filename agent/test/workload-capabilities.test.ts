import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createEhr, DEFAULT_EHR_BIN } from '../src/ehr.js';
import { programSchema, dayScheduleSchema, personaParamsSchema } from '../src/schema.js';
import { tmp } from './helpers.js';
import { REPO_ROOT } from '../src/util.js';

const archive=path.join(REPO_ROOT,'runs/core-10day/programs/P1/v5.json');
const specVersion=path.join(REPO_ROOT,'runs/core-10day/certifications/P1/v5/spec.json');
// These IDs identify the retained workload, not regenerated realistic library days.
const retainedWorld=path.join(REPO_ROOT,'runs/world/2-original');
const available=existsSync(archive)&&existsSync(DEFAULT_EHR_BIN)&&existsSync(specVersion);
const ids=['d07-P1-W1-002','d07-P1-W1-004','d07-P1-W1-012','d08-P1-W1-008','d08-P1-W1-009','d09-P1-W1-005','d10-P1-W1-015'];
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));

describe.skipIf(!available)('declined optional feature: seven retained P1 tasks',()=>{
  it.each(['P1','P2','P3','P4','P5'])('preserves the whole declared workload on the %s canonical',async persona=>{
    const ehr=createEhr({fake:false});
    const program=programSchema.parse(read(path.join(REPO_ROOT,`releases/v3/personas/${persona}.json`)));
    const workload=Array.from({length:10},(_,i)=>dayScheduleSchema.parse(read(path.join(REPO_ROOT,`runs/world/2/schedules/day-${String(i+1).padStart(2,'0')}/${persona}.json`))).tasks).flat();
    expect(await ehr.check({specVersion:'v3',program,prev:program,canonical:program,workload})).toBe('ok');
  });
  it('refuses check/deploy for the actual dropped fields and accepts restored reachable fields',async()=>{
    const ehr=createEhr({fake:false});
    const program=programSchema.parse(read(archive));
    const workload=Array.from({length:4},(_,i)=>dayScheduleSchema.parse(read(path.join(retainedWorld,`schedules/day-${String(i+7).padStart(2,'0')}/P1.json`))).tasks)
      .flat().filter(t=>ids.includes(t.id));
    expect(workload.map(t=>t.id).sort()).toEqual([...ids].sort());
    expect(workload.every(t=>t.choices.orders.some(o=>(o.kind??'medication')!=='medication'))).toBe(true);
    const input={specVersion,program,prev:program,canonical:program};
    expect(await ehr.check(input)).toBe('ok');
    expect(await ehr.check({...input,workload})).toMatchObject({violation:{property:'workloadCapabilities',message:expect.stringContaining('orderKind, orderCode')}});
    const outDir=await tmp('capability-deploy');
    expect(await ehr.deploy({...input,workload,outDir})).toMatchObject({deployed:false});
    expect(existsSync(path.join(outDir,program.owner,'current.json'))).toBe(false);
    const canonical=programSchema.parse(read(path.join(REPO_ROOT,'releases/v3/personas/P1.json')));
    const components=canonical.screens.flatMap(s=>s.components).filter(c=>['w1Labs.orderKind','w1Labs.orderCode'].includes(c.id));
    const restored=structuredClone(program);
    const screen=restored.screens.find(s=>s.id==='w1Labs');
    if(!screen)throw new Error('missing w1Labs');
    screen.components.push(...components.map(c=>{const field={...c,id:`capability-${c.id}`,tab:0};delete field.parent;return field;}));
    expect(await ehr.check({...input,program:restored,workload})).toBe('ok');
    const persona=personaParamsSchema.parse(read(path.join(retainedWorld,'personas/P1.json')));
    for(const day of [7,8,9,10]) {
      const original=dayScheduleSchema.parse(read(path.join(retainedWorld,`schedules/day-${String(day).padStart(2,'0')}/P1.json`)));
      const schedule={...original,tasks:original.tasks.filter(t=>ids.includes(t.id))};
      const args={specVersion,persona,schedule,worldDir:retainedWorld,seed:1000+day,clockMode:'legacy' as const,interruptions:'fixedCost' as const};
      const before=await ehr.simulate({...args,program});
      const after=await ehr.simulate({...args,program:restored});
      expect(before.tasks.filter(t=>!t.completed).map(t=>t.task).sort()).toEqual(schedule.tasks.map(t=>t.id).sort());
      expect(after.tasks.every(t=>t.completed)).toBe(true);
    }
    // Keeping the fields under a missing parent is the investigation's failed
    // intervention. Such an orphan cannot satisfy the release contract.
    const orphan=structuredClone(restored);
    for(const c of orphan.screens.flatMap(s=>s.components))if(c.id.startsWith('capability-')) c.parent='missing-parent';
    expect(await ehr.check({...input,program:orphan,workload})).toMatchObject({violation:{property:'workloadCapabilities'}});
  },120000);
});
