import type {RunData} from './data';
import type {DayResult} from '../../../agent/src/schema';
export type Effort={clicks:number;keystrokes:number;scrolls:number;scrollPx:number|null;mouseTravelPx:number|null};
const keys=['clicks','keystrokes','scrolls','scrollPx','mouseTravelPx'] as const;
const empty=():Effort=>({clicks:0,keystrokes:0,scrolls:0,scrollPx:0,mouseTravelPx:0});
function add(a:Effort,b:Effort){for(const key of keys){const x=a[key],y=b[key];if(key==='scrollPx'||key==='mouseTravelPx')a[key]=typeof x==='number'&&typeof y==='number'?x+y:null;else a[key]=(x??0)+(y??0);}return a;}
function cost(t:DayResult['tasks'][number]):Effort{return {clicks:t.clicks,keystrokes:t.keystrokes,scrolls:t.scrolls,scrollPx:t.scrollPx??null,mouseTravelPx:t.mouseTravelPx??null};}
function divide(a:Effort,n:number):Effort{return {clicks:a.clicks/n,keystrokes:a.keystrokes/n,scrolls:a.scrolls/n,scrollPx:a.scrollPx===null?null:a.scrollPx/n,mouseTravelPx:a.mouseTravelPx===null?null:a.mouseTravelPx/n};}
function difference(a:Effort,b:Effort):Effort{return {clicks:a.clicks-b.clicks,keystrokes:a.keystrokes-b.keystrokes,scrolls:a.scrolls-b.scrolls,scrollPx:a.scrollPx===null||b.scrollPx===null?null:a.scrollPx-b.scrollPx,mouseTravelPx:a.mouseTravelPx===null||b.mouseTravelPx===null?null:a.mouseTravelPx-b.mouseTravelPx};}
export interface WorkloadIteration {version:number;days:number[];tasks:number;completed:number;unclassified:number;workflows:{workflow:string;tasks:number;completed:number;mean:Effort}[];total:Effort|null;canonical?:Effort|null;savings?:Effort|null;noAgent?:Effort|null;agentSavings?:Effort|null}
export function workloadAt(run:RunData,persona:string,version:number):WorkloadIteration{
 const days=run.days.filter(d=>d.persona===persona&&d.programVersion===version&&(!run.manifest.measurementProtocol||d.day%2===0));
 const groups=new Map<string,{tasks:number;completed:number;measured:number;actual:Effort;canonical:Effort;canonicalN:number;control:Effort;controlActual:Effort;controlN:number}>();let unclassified=0;
 for(const day of days)for(const task of day.tasks){
  const workflow=/(?:^|-)(W[1-7])(?:-|$)/.exec(task.task)?.[1];if(!workflow){unclassified++;continue;}
  const g=groups.get(workflow)??{tasks:0,completed:0,measured:0,actual:empty(),canonical:empty(),canonicalN:0,control:empty(),controlActual:empty(),controlN:0};groups.set(workflow,g);g.tasks++;g.completed+=Number(task.completed);
  if(!task.completed)continue;
  const canonical=run.baselines?.find(d=>d.persona===persona&&d.day===day.day)?.tasks.find(t=>t.task===task.task);
  if(!run.manifest.measurementProtocol||canonical?.completed){add(g.actual,cost(task));g.measured++;if(canonical?.completed){add(g.canonical,cost(canonical));g.canonicalN++;}}
  const control=run.noAgentDays?.find(d=>d.persona===persona&&d.day===day.day)?.tasks.find(t=>t.task===task.task);
  if(control?.completed){add(g.control,cost(control));add(g.controlActual,cost(task));g.controlN++;}
 }
 const workflows=[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([workflow,g])=>({workflow,tasks:g.tasks,completed:g.completed,mean:divide(g.actual,Math.max(1,g.measured))}));
 const total=workflows.length?workflows.reduce((a,w)=>add(a,w.mean),empty()):null;
 const canonicalGroups=[...groups.values()].filter(g=>g.canonicalN),controlGroups=[...groups.values()].filter(g=>g.controlN);
 const canonical=canonicalGroups.length?canonicalGroups.reduce((a,g)=>add(a,divide(g.canonical,g.canonicalN)),empty()):null;
 const noAgent=controlGroups.length?controlGroups.reduce((a,g)=>add(a,divide(g.control,g.controlN)),empty()):null;
 const controlActual=controlGroups.reduce((a,g)=>add(a,divide(g.controlActual,g.controlN)),empty());
 return {version,days:days.map(d=>d.day),tasks:workflows.reduce((n,w)=>n+w.tasks,0),completed:workflows.reduce((n,w)=>n+w.completed,0),unclassified,workflows,total,canonical,savings:canonical&&total?difference(canonical,total):null,noAgent,agentSavings:noAgent?difference(noAgent,controlActual):null};
}
export function versionsFor(run:RunData,persona:string){
 const committed=new Set([0,...run.records.filter(r=>r.persona===persona&&r.deployed).map(r=>r.versionAfter)]);
 return [...new Set([...run.programs.keys(),...(run.files??[])])].flatMap(key=>{const m=new RegExp(`^programs/${persona}/v(\\d+)\\.json$`).exec(key);return m&&(!run.manifest.measurementProtocol||committed.has(Number(m[1])))?[Number(m[1])]:[];}).sort((a,b)=>a-b);
}
