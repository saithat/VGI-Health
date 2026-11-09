import {describe,it,expect} from 'vitest';
import {dayScheduleSchema} from '../../app/src/dashboard/measurement-schema.js';
import {interruptionDayResultSchema as dayResultSchema} from '../../app/src/dashboard/interruption-schema.js';
const arrival={arrivalMs:0,readyMs:1000,priority:0,doseWindows:[['dose',2000]],resultAgeMs:0};
const workload={protocol:'continuous-workload-v1',shifts:[{id:'day',startMs:0,endMs:5000}],
  timings:[{task:'a',arrival,startMs:1000,finishMs:3000,shift:'day',suspensions:[],queueDelayMs:0,
    overtimeMs:0,handovers:0,overdueDoses:['dose'],disposition:'finished'}],pending:[],queueDelayMs:0,
  overdueScheduledDoses:1,resultResponseMs:0,resultsResponded:0,overtimeMs:0,tasksCarriedOver:0};
const day={day:1,persona:'P1',programVersion:0,trace:[],tasks:[],floor:[],complaints:[]};
describe('measurement-only workload fields',()=>{
  it('retains wave3 clock partitions, accepted handover, ED stages and source dates',()=>{
    const clocks={uiMs:100,readingMs:200,clinicalMs:300,communicationMs:400,passiveWaitMs:500,reorientationMs:500,queueMs:0};
    const handover={task:'a',patient:'p',sender:'day',recipient:'night',offeredAtMs:0,acceptedAtMs:1000,reason:'coverage ended'};
    const ed={providerQueueMs:1000,providerStartMs:1000,decisionMs:2500,departureMs:12500,boardingMs:10000};
    const measured={...workload,timings:workload.timings.map(row=>({...row,clocks,handover,ed,actor:'night',arrival:{...arrival,clinicalServiceMs:300,boardingMs:10000}}))};
    expect(dayResultSchema.parse({...day,workload:measured}).workload).toEqual(measured);
  });
  it('retains timestamps and denominators through persisted schema parsing',()=>{
    expect(dayResultSchema.parse({...day,workload}).workload).toEqual(workload);
  });
  it('retains independently scheduled expert workload through the composed codec',()=>{
    expect(dayResultSchema.parse({...day,workload,expert:{...day,workload}}).expert?.workload).toEqual(workload);
  });
  it('keeps historical missing measurements unavailable',()=>{
    expect(dayResultSchema.parse(day).workload).toBeUndefined();
  });
  it('retains source timing and legacy selection across the agent loader',()=>{
    const task={id:'a',day:1,persona:'P1',workflow:'W1',patientId:'p',startMin:0,
      choices:{orders:[],administer:[],ackResult:false,immunizations:[],noteSections:[]},
      todayResources:[],interruptions:0,timing:arrival};
    const schedule={sourceDates:[[1,'2026-11-02']],day:1,persona:'P1',load:'normal',tasks:[task],clockMode:'legacy',shifts:workload.shifts};
    expect(dayScheduleSchema.parse(schedule)).toEqual(schedule);
  });
  it('rejects negative or unknown workload measurements',()=>{
    expect(dayResultSchema.safeParse({...day,workload:{...workload,overtimeMs:-1}}).success).toBe(false);
    expect(dayResultSchema.safeParse({...day,workload:{...workload,protocol:'unknown'}}).success).toBe(false);
  });
});
