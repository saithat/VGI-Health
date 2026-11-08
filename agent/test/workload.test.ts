import {describe,it,expect} from 'vitest';
import {dayResultSchema,dayScheduleSchema} from '../../app/src/dashboard/measurement-schema.js';
const arrival={arrivalMs:0,readyMs:1000,priority:0,doseWindows:[['dose',2000]],resultAgeMs:0};
const workload={protocol:'continuous-workload-v1',shifts:[{id:'day',startMs:0,endMs:5000}],
  timings:[{task:'a',arrival,startMs:1000,finishMs:3000,shift:'day',suspensions:[],queueDelayMs:0,
    overtimeMs:0,handovers:0,overdueDoses:['dose'],disposition:'finished'}],pending:[],queueDelayMs:0,
  overdueScheduledDoses:1,resultResponseMs:0,resultsResponded:0,overtimeMs:0,tasksCarriedOver:0};
const day={day:1,persona:'P1',programVersion:0,trace:[],tasks:[],floor:[],complaints:[]};
describe('measurement-only workload fields',()=>{
  it('retains timestamps and denominators through persisted schema parsing',()=>{
    expect(dayResultSchema.parse({...day,workload}).workload).toEqual(workload);
  });
  it('keeps historical missing measurements unavailable',()=>{
    expect(dayResultSchema.parse(day).workload).toBeUndefined();
  });
  it('retains source timing and legacy selection across the agent loader',()=>{
    const task={id:'a',day:1,persona:'P1',workflow:'W1',patientId:'p',startMin:0,
      choices:{orders:[],administer:[],ackResult:false,immunizations:[],noteSections:[]},
      todayResources:[],interruptions:0,timing:arrival};
    const schedule={day:1,persona:'P1',load:'normal',tasks:[task],clockMode:'legacy',shifts:workload.shifts};
    expect(dayScheduleSchema.parse(schedule)).toEqual(schedule);
  });
  it('rejects negative or unknown workload measurements',()=>{
    expect(dayResultSchema.safeParse({...day,workload:{...workload,overtimeMs:-1}}).success).toBe(false);
    expect(dayResultSchema.safeParse({...day,workload:{...workload,protocol:'unknown'}}).success).toBe(false);
  });
});
