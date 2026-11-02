import type { Program } from '../agent/src/schema.js';
import { commitOf, fieldElement, infoOf } from '../agent/src/program.js';
import { taskModels } from './tasks.js';
import type { DesignPoint, TaskExpr, Workflow } from './design.js';
/** Abstract task realization records; screen names describe allocation, never clinical prerequisites. */
const screens:Record<Workflow,Record<string,string[]>>={
 W1:{select:['home'],room:['w1Rooming'],reconcile:['w1MedRec'],'history-exam-assessment':['w1Hpi','w1Exam'],orders:['w1Orders','w1Labs'],'review-sign-orders':['w1Verify','w1Sign'],'close-sign-note':['w1Close']},
 W2:{'select-result':['w2Inbasket'],'review-result-trend':['w2Result'],'action-message-followup':['w2Result','w2Message'],'ack-result':['w2Result']},
 W3:{'select-track-board':['w3TrackBoard'],triage:['w3Triage'],'provider-documentation':['w3Provider'],'draft-order':['w3Orders','w3OrderSets'],'review-sign-orders':['w3Sign'],admit:['w3Disposition'],discharge:['w3Disposition'],transfer:['w3Disposition'],observe:['w3Disposition'],consult:['w3Disposition'],'finalize-note':['w3Provider']},
 W4:{'select-task':['w4Worklist'],mar:['w4Mar'],'scan-assess-independent-check':['w4Admin'],'record-administration':['w4Admin'],'flowsheet-sbar':['w4Flowsheet','w4Handoff']},
 W5:{'select-room':['home','w5Rooming'],growth:['w5Growth'],note:['w5Note'],'weight-based-orders':['w5Orders'],'review-sign-orders':['w5Sign'],vaccines:['w5Immunizations'],'close-sign-visit':['w5Close']},
 W6:{'consult-or-case':['w6Schedule','w6Consults'],'consult-sign':['w6Consult','w6ConsultClose'],preop:['w6PreOp'],'review-sign-orders':['w6Orders','w6Sign'],'operative-note-sign':['w6OpNote'],'postop-rounding':['w6PostOp','w6Rounding'],discharge:['w6Discharge']},
 W7:{'select-request':['w7Queue'],'review-labs-visit-adherence':['w7Review'],'choose-response':['w7Decision'],'approve-or-deny':['w7Decision']},
};
export function atoms(t:TaskExpr):string[]{return t.op==='atom'?[t.id]:'tasks'in t?t.tasks.flatMap(atoms):atoms(t.task);}
export interface TaskBinding {
  workflow:Workflow;task:string;abstractUi:{inspect:string[];edit:string[];humanCommit:string[]};
  concrete:{screenIds:string[];componentIds:string[]};paradigm:DesignPoint;
}
export function bindTasks(program:Program,workflows:Workflow[],point:DesignPoint):Record<string,TaskBinding>{
 const bindings:Record<string,TaskBinding>={};
 for(const w of workflows)for(const task of atoms(taskModels[w])){
  const allocated=program.screens.filter(s=>(screens[w][task]??[]).includes(s.id));
  const cs=allocated.flatMap(s=>s.components);
  const unique=(xs:(string|null)[])=>[...new Set(xs.filter((x):x is string=>x!==null))];
  bindings[`${w}/${task}`]={workflow:w,task,abstractUi:{inspect:unique(cs.map(infoOf)),edit:unique(cs.map(fieldElement)),humanCommit:unique(cs.map(commitOf))},
    concrete:{screenIds:allocated.map(s=>s.id),componentIds:cs.map(c=>c.id)},paradigm:structuredClone(point)};
 }
 return bindings;
}
