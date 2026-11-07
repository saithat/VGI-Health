/** Structural distance ignores version numbers, styling and prose. Identity,
 * screen membership, container/tab membership, kind and sibling edges count. */
import { expandProgram } from '../agent/src/composites.js';
import { kindTag } from '../agent/src/program.js';
import type { Program } from '../agent/src/schema.js';
function features(source:Program):Set<string> {
  const p=expandProgram(source),out=new Set<string>();
  for(const s of p.screens) {
    out.add(`screen:${s.id}:${s.workflow}`);
    const previous=new Map<string,string>();
    for(const c of s.components) {
      out.add(`component:${c.id}:${kindTag(c.kind)}`);
      out.add(`place:${c.id}:${s.id}:${c.parent??''}:${c.tab}`);
      const group=`${c.parent??''}:${c.tab}`,prev=previous.get(group)??'^';
      out.add(`edge:${s.id}:${group}:${prev}:${c.id}`);previous.set(group,c.id);
    }
  }
  return out;
}
export function structuralDistance(a:Program,b:Program):number {
  const x=features(a),y=features(b),union=new Set([...x,...y]);
  return union.size ? [...union].filter(v=>x.has(v)!==y.has(v)).length/union.size : 0;
}
export function novelty(program:Program,current:Program,archive:readonly Program[]) {
  const fromCurrent=structuralDistance(program,current);
  const fromArchive=archive.length?Math.min(...archive.map(p=>structuralDistance(program,p))):fromCurrent;
  return {fromCurrent,fromArchive,bonus:(fromCurrent+fromArchive)/2};
}
/** Radical must actually alter topology; reordering and density alone do not qualify. */
export function radicalChange(before:Program,after:Program):boolean {
  const a=expandProgram(before),b=expandProgram(after);
  if(JSON.stringify(a.screens.map(s=>s.id).sort())!==JSON.stringify(b.screens.map(s=>s.id).sort()))return true;
  const old=new Map(a.screens.flatMap(s=>s.components.map(c=>[c.id,{screen:s.id,c}] as const)));
  if(old.size!==b.screens.reduce((n,s)=>n+s.components.length,0))return true;
  return b.screens.some(s=>s.components.some(c=>{
    const p=old.get(c.id);return !p||p.screen!==s.id||p.c.parent!==c.parent||p.c.tab!==c.tab||kindTag(p.c.kind)!==kindTag(c.kind);
  }));
}
