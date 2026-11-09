import { describe, expect, it } from "vitest";
import { compoundAlert, workflowPlan } from "../src/workflows";
import { INBOX_STREAMS } from "../src/flows/clinic";
import { DayBuild } from "../src/build";
import type { Inpatient } from "../src/state";
import { Rng } from "../src/rng";
import { generateWorld } from "../src/world";
import { loadPopulation } from "../src/patients";
import { doseAttempts, doseWindowMinutes } from "../src/medication/outcomes";
import { AdministrationDecisionSchema, TaskSchema, type Task, type OrderChoice } from "../src/schema";
import { allTasks, run, FIXTURE_INDEX } from "./helpers";

const tasks = allTasks(run(17));
const rx: OrderChoice = {drug:"atorvastatin",doseTenths:200,unit:"mg",route:"PO",freq:"daily",prn:false};
const task: Task = {id:"compound",day:1,persona:"P1",patientId:"p",workflow:"W1",startMin:0,
  choices:{orders:[rx],administer:[],ackResult:false,immunizations:[],noteSections:[]},todayResources:[],interruptions:0};

describe("compound workflows", () => {
  it.each(["inspect", "cancel", "alternative", "override"] as const)("keeps %s in one task with explicit review/decision documentation", resolution => {
    const alternative = {...rx,drug:"lisinopril"};
    const t = compoundAlert(task,resolution,alternative);
    expect(TaskSchema.parse(t)).toEqual(t);
    expect(t.id).toBe(task.id);
    expect(t.workflowPlan?.kind).toBe("alert");
    expect(t.choices.orders).toEqual(resolution === "cancel" ? [] : resolution === "alternative" ? [alternative] : [rx]);
    expect(t.choices.noteSections).toContain("assessmentPlan");
    expect(JSON.stringify(t.todayResources)).toContain(resolution);
  });
  it("requires a declared alternative",()=> expect(()=>compoundAlert(task,"alternative")).toThrow());
  it("keeps every refill as a distinct claim/review/response workflow",()=> {
    const refills=tasks.filter(t=>t.workflow === "W7");
    expect(refills.length).toBeGreaterThan(0);
    expect(new Set(refills.map(t=>t.choices.refill))).toEqual(new Set(["approve","deny","modify"]));
    expect(refills.every(t=>t.workflowPlan?.kind === "refill")).toBe(true);
  });
  it("uses separate uncapped streams with explicit ownership and accepted support delegation",()=> {
    expect(INBOX_STREAMS).toEqual({advice:15.3,prescription:14.3,result:12.3,call:23.5,consult:0.31});
    for(const kind of ["advice","result","call","consult"]) expect(tasks.some(t=>t.workflowPlan?.kind === kind)).toBe(true);
    const call=tasks.find(t=>t.workflowPlan?.kind === "call");
    expect(call?.workflowPlan).toMatchObject({owner:"P1",delegateTo:"P1-triage",delegateAccepted:true});
    expect(run(17).days.some(d=>d.state.today.inbox.P1.handled>22)).toBe(true);
  });
  it.each(["chart","pharmacy","dispensing","reconciliation","prescription","coordination"] as const)("labels %s scenario times explicitly", kind=> {
    expect(workflowPlan(kind,"P1")).toMatchObject({phaseMs:5000,delegateAccepted:true});
  });
});

it("has symmetric CMS windows, signed timing and distinct charting/nonadministration",()=> {
  expect(doseWindowMinutes(rx)).toBe(120);
  expect(doseWindowMinutes({...rx,freq:"BID"})).toBe(60);
  expect(doseWindowMinutes({...rx,drug:"warfarin"})).toBe(30);
  const decisions=tasks.flatMap(t=>t.choices.administer.flatMap(o=>o.administration ? [o.administration] : []));
  expect(decisions.some(a=>a.outcome === "given" && a.attemptMin<a.scheduledMin)).toBe(true);
  expect(decisions.some(a=>a.outcome === "given" && (a.chartedMin ?? 0)>(a.administeredMin ?? 0))).toBe(true);
  for(const a of decisions) {
    AdministrationDecisionSchema.parse(a);
    const width=a.windowEndMin-a.scheduledMin;
    expect([30,60,120]).toContain(width);
    expect(a.windowStartMin).toBe(Math.max(0,a.scheduledMin-width));
    expect(a.outcome === "given" ? a.administeredMin === a.attemptMin : a.administeredMin === undefined).toBe(true);
    expect(a.chartedMin).toBeGreaterThanOrEqual(a.attemptMin);
  }
  const valid=decisions.find(a=>a.outcome === "given");
  if (!valid || valid.windowStartMin == null) throw new Error("missing given dose");
  expect(AdministrationDecisionSchema.safeParse({...valid,attemptMin:valid.windowStartMin-1}).success).toBe(false);
  expect(AdministrationDecisionSchema.safeParse({...valid,chartedMin:valid.attemptMin-1}).success).toBe(false);
  expect(AdministrationDecisionSchema.safeParse({...valid,outcome:"held"}).success).toBe(false);
});

it("does not give early prandial insulin during NPO or a dose after discharge",()=> {
  const patient: Inpatient = {patientId:"p",admissionId:"a",service:"medicine",admitDay:0,admitClock:400,
    source:"initial",diagnosis:"scenario",plannedDischargeDay:5,dischargeClock:550,room:"4W-1",weightKg:70,
    diabetic:true,regimens:[],prnPerShift:0,caseId:null,offWard:[],npo:[{day:1,untilClock:530}]};
  const timingRng=(offset:number)=>{
    const r=new Rng("forced-timing");const fork=r.fork.bind(r);
    r.fork=label=>{const child=fork(label);if(label === "signed-offset")child.normal=()=>offset;
      if(label === "clinical-policy")child.chance=()=>false;return child;};
    return r;
  };
  const insulin=doseAttempts({...rx,drug:"insulin lispro",route:"SC"},patient,1,540,"insulin",timingRng(-20));
  expect(insulin[0]).toMatchObject({outcome:"given",administeredMin:540});
  const discharge=doseAttempts(rx,{...patient,plannedDischargeDay:1},1,540,"oral",timingRng(20));
  expect(discharge[0]).toMatchObject({outcome:"notGiven",reason:"discharged-before-administration"});
  expect(discharge[0]?.administeredMin).toBeUndefined();
});

it("schedules new MAR charting in successor coverage and preserves legacy mode",()=> {
  const w=run(17),first=w.days[0];if(!first)throw new Error("missing world day");
  const b=new DayBuild(1,first.state.context,w.pop,structuredClone(w.initial),"chart-spill");
  const administration={outcome:"given" as const,reason:"scheduled",occurrence:"late-chart",scheduledMin:1080,
    windowStartMin:1020,windowEndMin:1140,attemptMin:1100,administeredMin:1100,chartedMin:1200,reoffer:false,notifyPrescriber:false};
  const t=b.addTask("P3","W4","p",780,{administer:[{...rx,freq:"q6h",administration}]},[],0);
  expect(t.startMin).toBe(780);
  for(const task of tasks)for(const o of task.choices.administer)if(o.administration?.chartedMin != null)
    expect(task.startMin+420).toBeGreaterThanOrEqual(o.administration.chartedMin);
  const legacy=generateWorld(17,1,loadPopulation(FIXTURE_INDEX).patients,undefined,"legacy");
  expect(allTasks(legacy).every(t=>t.workflowPlan === undefined)).toBe(true);
  expect(legacy.days[0]?.state.today.inbox.P1.handled).toBeLessThanOrEqual(22);
  expect(allTasks(legacy).flatMap(t=>t.choices.administer).every(o=>o.administration?.windowStartMin == null)).toBe(true);
});
