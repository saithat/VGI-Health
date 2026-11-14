import { fakeCanonical, fakeSpec } from '../src/fake/fixtures.js';
import { fakeSchedule, FAKE_PERSONAS } from '../src/fake/world.js';
import { summarizeTrain, type TrainDay } from '../src/observe.js';
import { nightlyPrompt } from '../src/prompts.js';
import { workflowFloorGaps } from '../src/floor-evidence.js';
import { trainSummarySchema, type TaskMetrics, type TraceEvent } from '../../app/src/dashboard/agent-evidence.js';
vi.mock('../src/manual.js',()=>({promptContext:()=>({manual:'fixture',rules:'rules'})}));

const program={...fakeCanonical('v1'),id:'P1'};
const persona=FAKE_PERSONAS.find(p=>p.id==='P1');
if(!persona)throw Error('Missing persona');
const schedule=fakeSchedule(1,persona.id,7), scheduled=schedule.tasks[0];
if(!scheduled)throw Error('Missing task');
const task:TaskMetrics={task:scheduled.id,clicks:5,scrolls:8,klmDeciSec:140,completed:true,keystrokes:0,popups:1,overrides:0,searches:0,backtracks:0};
const floor={...task,clicks:2,scrolls:0,klmDeciSec:45,popups:1};
const trace:TraceEvent[]=[
  {task:task.task,t:900,screen:'s',event:{click:{comp:'workspace.open|patient'}},ops:['point','click'],result:'ok'},
  {task:task.task,t:910,screen:'s',event:{scroll:{screen:'s'}},ops:['scroll'],result:'ok'},
  {task:task.task,t:940,screen:'s',event:{ack:{alert:'a'}},ops:['think','point','click'],result:'ok'},
  {task:task.task,t:950,screen:'s',event:{enter:{comp:'field',value:{flag:{b:true}}}},ops:['think','key'],result:'ok'},
];
const train:TrainDay={schedule:{...schedule,tasks:[scheduled]},result:{day:1,persona:'P1',programVersion:program.version,tasks:[task],floor:[floor],trace,complaints:[]}};

it('reconciles navigation, measured scrolls, acknowledgments, entry and unmodeled residuals without wall-clock deltas',()=>{
  const rows=workflowFloorGaps('P1',program,[train],new Map([[program.version,program]])), row=rows[0];
  expect(row?.gap).toEqual({clicks:3,scrolls:8,klmDeciSec:95});
  expect(row?.breakdown.find(p=>p.category==='scrolling')?.actual.scrolls).toBe(8);
  expect(row?.breakdown.find(p=>p.category==='alertAcknowledgments')?.gap.klmDeciSec).toBe(0);
  for(const key of ['clicks','scrolls','klmDeciSec'] as const)expect(row?.breakdown.reduce((n,p)=>n+p.gap[key],0)).toBeCloseTo(row?.gap?.[key]??0);
  expect(workflowFloorGaps('P1',program,[{...train,result:{...train.result,trace:trace.map(t=>({...t,t:t.t+9999}))}}],new Map())).toEqual(rows);
});
it('excludes even days, foreign personas, unscheduled traces and incomplete or missing-floor costs',()=>{
  const poison={...task,task:'HOLDOUT_SECRET',clicks:99999};
  const contaminated:TrainDay={...train,result:{...train.result,tasks:[...train.result.tasks,poison],floor:[floor,poison],trace:[...trace,{task:'HOLDOUT_SECRET',t:999999,event:{click:{comp:'HOLDOUT_SECRET'}},ops:['click'],screen:'secret',result:'ok'}]}};
  const base=workflowFloorGaps('P1',program,[train],new Map());
  expect(workflowFloorGaps('P1',program,[contaminated],new Map())).toEqual(base);
  expect(workflowFloorGaps('P1',program,[{schedule:{...train.schedule,day:2},result:{...train.result,day:2}}],new Map())).toEqual([]);
  expect(workflowFloorGaps('P2',program,[train],new Map())).toEqual([]);
  const missing=workflowFloorGaps('P1',program,[{...train,result:{...train.result,floor:[]}}],new Map());
  expect(missing[0]).toMatchObject({tasks:1,completed:1,paired:0,floor:null,gap:null,breakdown:[]});
  const failed=workflowFloorGaps('P1',program,[{...train,result:{...train.result,tasks:[{...task,completed:false}]}}],new Map());
  expect(failed[0]).toMatchObject({tasks:1,completed:0,paired:0,gap:null});
  const evidence=summarizeTrain('P1',program,[train],new Map());
  expect(trainSummarySchema.parse(evidence).workflowFloorGaps).toEqual(base);
  const prompt=nightlyPrompt({night:1,persona:{id:'P1',userId:'P1',params:persona},program,spec:fakeSpec('v1'),history:[],evidence});
  expect(prompt.prompt).toContain('"klmDeciSec":140');expect(prompt.prompt).not.toContain('HOLDOUT_SECRET');
});
