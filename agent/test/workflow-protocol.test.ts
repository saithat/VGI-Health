import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { compoundAlert, workflowPlan } from '../../world/src/workflows.js';
import { TaskSchema } from '../../world/src/schema.js';
import { createEhr, DEFAULT_EHR_BIN } from '../src/ehr.js';
import { dayScheduleSchema, personaParamsSchema, programSchema } from '../src/schema.js';
import { REPO_ROOT } from '../src/util.js';

const worldDir=path.join(REPO_ROOT,'runs/world/2');
const available=existsSync(DEFAULT_EHR_BIN)&&existsSync(path.join(worldDir,'world.json'));
const read=(p:string)=>JSON.parse(readFileSync(p,'utf8'));

describe.skipIf(!available)('native compound alert clinical paths',()=>{
  it.each(['advice','result','call','consult'] as const)('requires signed documentation for new %s stream',async kind=>{
    const ehr=createEhr({fake:false});
    const source=dayScheduleSchema.parse(read(path.join(worldDir,'schedules/day-07/P1.json')));
    const candidate=source.tasks.find(t=>t.workflow === (kind === 'result' ? 'W2' : 'W1'));
    if(!candidate)throw new Error('missing source task');
    const task={...candidate,id:`stream-${kind}`,workflow:'W2',workflowPlan:workflowPlan(kind,'P1'),
      choices:{...candidate.choices,orders:[],ackResult:kind === 'result',noteSections:['hpi','assessmentPlan']}};
    const schedule=dayScheduleSchema.parse({...source,tasks:[task]});
    const program=programSchema.parse(read(path.join(REPO_ROOT,'releases/v3/personas/P1.json')));
    const persona=personaParamsSchema.parse(read(path.join(worldDir,'personas/P1.json')));
    const day=await ehr.simulate({specVersion:'v3',program,persona,schedule,worldDir,seed:17,interruptions:'fixedCost'});
    expect(day.tasks[0]).toMatchObject({completed:true,workflow:{closed:true}});
    expect(day.trace.some(e=>e.result === 'ok' && JSON.stringify(e.event).includes('commit.signNote'))).toBe(true);
    if(kind === 'result')expect(day.trace.some(e=>e.result === 'ok' && JSON.stringify(e.event).includes('commit.ackResult'))).toBe(true);
  });
  it.each(['inspect','cancel','alternative','override'] as const)('keeps %s, rationale, guard and closure in one task',async resolution=>{
    const ehr=createEhr({fake:false});
    const source=dayScheduleSchema.parse(read(path.join(worldDir,'schedules/day-07/P1.json')));
    const candidate=source.tasks.find(t=>t.workflow==='W1'&&t.choices.orders.some(o=>o.drug==='atorvastatin'));
    if(!candidate)throw new Error('missing atorvastatin scenario');
    const task=TaskSchema.parse({...candidate,id:`compound-${resolution}`});
    const rationale='Scenario: reviewed the risk; monitoring and patient follow-up planned.';
    const amended=compoundAlert(task,resolution,{drug:'lisinopril',doseTenths:100,unit:'mg',route:'PO',freq:'daily',prn:false},rationale);
    const schedule=dayScheduleSchema.parse({...source,tasks:[amended],clockMode:'legacy'});
    const program=programSchema.parse(read(path.join(REPO_ROOT,'releases/v3/personas/P1.json')));
    const persona=personaParamsSchema.parse(read(path.join(worldDir,'personas/P1.json')));
    const day=await ehr.simulate({specVersion:'v3',program,persona,schedule,worldDir,seed:17,interruptions:'fixedCost'});
    expect(day.tasks).toHaveLength(1);
    expect(day.tasks[0]).toMatchObject({completed:true,workflow:{closed:true,clinicalComplete:true,owner:'P1'}});
    expect(day.tasks[0]?.workflow?.phases).toContain(`decision:${resolution}`);
    expect(JSON.stringify(day.trace)).toContain(rationale);
    if(resolution==='cancel')expect(day.trace.some(e=>e.result === 'ok' && JSON.stringify(e.event).includes('commit.signOrders'))).toBe(false);
  },60000);
});
