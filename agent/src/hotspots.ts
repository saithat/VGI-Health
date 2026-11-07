/** Deterministic train-only priorities. Scores are interaction equivalents; pixels
 * use one 900px viewport per unit. These are ranking assumptions, not timings. */
import type { TrainDay } from './observe.js';
import type { LocalityDigest } from './locality.js';

/** Adapter for the information-needs lane. No free text, memory contents or
 * held-out observations cross this interface. One aggregate per train task. */
export interface InformationEffort {
  day: number; task: string; screen: string;
  lookupDetours: number; memoryCarry: number;
}
export interface Hotspot {
  id: string;
  kind: 'screen' | 'sequence' | 'backtrack' | 'information';
  screens: string[];
  score: number;
  evidence: { clicks: number; scrolls: number; scrollPx: number | null; occurrences: number; lookupDetours: number; memoryCarry: number };
}
export function rankHotspots(train: readonly TrainDay[], locality: LocalityDigest, information: readonly InformationEffort[] = [], topK = 8): Hotspot[] {
  if (!Number.isSafeInteger(topK) || topK < 1) throw Error('topK must be positive');
  const rows: Hotspot[] = locality.screens.map(s => ({id:`screen:${s.screen}`,kind:'screen',screens:[s.screen],
    score:s.clicks+s.scrolls+(s.scrollPx??0)/900,
    evidence:{clicks:s.clicks,scrolls:s.scrolls,scrollPx:s.scrollPx,occurrences:s.visits,lookupDetours:0,memoryCarry:0}}));
  if(!locality.screens.length) for(const day of train) for(const task of day.result.tasks.filter(t=>t.completed)) {
    for(const screen of new Set(day.result.trace.filter(t=>t.task===task.task).map(t=>t.screen))) {
      const events=day.result.trace.filter(t=>t.task===task.task&&t.screen===screen);
      let row=rows.find(r=>r.id===`screen:${screen}`);
      if(!row) {row={id:`screen:${screen}`,kind:'screen',screens:[screen],score:0,evidence:{clicks:0,scrolls:0,scrollPx:null,occurrences:0,lookupDetours:0,memoryCarry:0}};rows.push(row);}
      row.evidence.clicks+=events.filter(e=>!('scroll' in e.event)).length;
      row.evidence.scrolls+=events.filter(e=>'scroll' in e.event).length;
      row.evidence.occurrences++;row.score=row.evidence.clicks+row.evidence.scrolls;
    }
  }
  const paths = new Map<string, {steps:string[]; count:number; kind:'sequence'|'backtrack'}>();
  for (const day of train) for (const task of day.result.tasks.filter(t=>t.completed)) {
    const steps = day.result.trace.filter(e=>e.task===task.task).map(e=>e.screen).filter((s,i,a)=>i===0||s!==a[i-1]);
    for (let length=2;length<=4;length++) for(let i=0;i+length<=steps.length;i++) {
      const seq=steps.slice(i,i+length), key=JSON.stringify(seq);
      const previous=paths.get(key);
      paths.set(key,{steps:seq,count:(previous?.count??0)+1,kind:length===3&&seq[0]===seq[2]?'backtrack':'sequence'});
    }
  }
  for(const {steps,count,kind} of paths.values()) if(count>1||kind==='backtrack') rows.push({
    id:`${kind}:${JSON.stringify(steps)}`,kind,screens:steps,score:count*(steps.length-1),
    evidence:{clicks:0,scrolls:0,scrollPx:null,occurrences:count,lookupDetours:0,memoryCarry:0}});
  const info = new Map<string,{lookupDetours:number;memoryCarry:number;occurrences:number}>();
  const seen = new Set<string>();
  for(const item of information) {
    const day=train.find(d=>d.schedule.day===item.day),key=`${item.day}/${item.task}`;
    if(!day || !day.result.tasks.some(t=>t.task===item.task&&t.completed) || !day.result.trace.some(t=>t.task===item.task&&t.screen===item.screen) ||
      seen.has(key) || ![item.lookupDetours,item.memoryCarry].every(v=>Number.isFinite(v)&&v>=0)) throw Error('Invalid or non-training information effort');
    seen.add(key);
    const old=info.get(item.screen)??{lookupDetours:0,memoryCarry:0,occurrences:0};
    old.lookupDetours+=item.lookupDetours;old.memoryCarry+=item.memoryCarry;old.occurrences++;info.set(item.screen,old);
  }
  for(const [screen,e] of info) rows.push({id:`information:${screen}`,kind:'information',screens:[screen],score:e.lookupDetours+e.memoryCarry,
    evidence:{clicks:0,scrolls:0,scrollPx:null,...e}});
  return rows.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,topK);
}
