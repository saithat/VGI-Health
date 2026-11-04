/** Simulation-only pixel accounting for ignored remembered-location attempts.
 * The ordinal memory model has no pixel coordinates. Project the measured
 * reveal point of its remembered slot onto the attempted viewport; do not
 * scroll, navigate, or send an event to the interpreter. Unknown slots stay
 * unavailable. These virtual targets are explicitly model assumptions.
 */
import type { DayResult, Program } from '../../../agent/src/schema';
import type { GeometryAtlas, PointerEvent } from '../metrics/geometry';
export const BOUNDED_POINT_ASSUMPTION = 'simulation assumption: ignored bounded clicks project the measured reveal point of the remembered ordinal slot onto the attempted viewport; no additional scroll or clinical event';
type Observation = NonNullable<DayResult['observations']>[number];
interface Row extends PointerEvent { t: number; result: unknown; }
function ghost(row: Row): string | null {
  if (row.result !== 'ignored' || !row.ops.includes('point') || !row.event || typeof row.event !== 'object' || !('click' in row.event)) return null;
  const payload = row.event.click;
  return payload && typeof payload === 'object' && 'comp' in payload && typeof payload.comp === 'string' && /^#+$/.test(payload.comp) ? payload.comp : null;
}
const key = (row: Row, id: string) => `bounded-miss-slot-proxy:${JSON.stringify([row.task,row.t,row.screen,id])}`;
const target = (day: number, row: Row, id: string, place: Observation['place']) => `${id}:bounded-miss-slot-proxy:${encodeURIComponent(JSON.stringify([day,row.task,row.t,row.screen,place.screen,place.parent,place.tab,place.position]))}`;
/** Return a separate metrics trace; the guarded clinical trace remains byte-for-byte unchanged. */
export function pointingTrace(trace: readonly Row[], atlas: GeometryAtlas, context?: Pick<DayResult,'day'|'observations'|'geometry'>): PointerEvent[] {
  const observations = new Map(context?.observations?.filter(o=>o.kind==='miss').map(o=>[o.traceIndex,o]));
  return trace.map((row,index) => {
    const id=ghost(row);if(!id || context?.geometry?.missingTargets.includes(`${row.screen}/${id}`))return row;
    const options=atlas.aliases?.[key(row,id)]??[];
    const observation=observations.get(index);
    const resolved=context && observation?.task===row.task
      ? target(context.day,row,id,observation.place)
      : options.length===1 ? options[0] : undefined;
    if(!resolved || !options.includes(resolved) || !atlas.states.some(s=>s.screen===row.screen && s.components[resolved]))return row;
    return {...row,event:{click:{comp:resolved}}};
  });
}
/** `program` must be expanded, just like the native simulator's input. */
export function projectBoundedPoints(result: DayResult, program: Program, atlas: GeometryAtlas): GeometryAtlas {
  if(result.policy!=='bounded' || !result.observations?.some(o=>o.kind==='miss'))return atlas;
  const states=[...atlas.states],aliases={...atlas.aliases};
  const ids=new Set(program.screens.flatMap(s=>s.components.map(c=>c.id)));
  for(const observation of result.observations) {
    const row=result.trace[observation.traceIndex];
    if(observation.kind!=='miss' || !row || row.task!==observation.task)continue;
    const id=ghost(row);if(!id || ids.has(id))continue;
    const place=observation.place;
    const component=program.screens.find(s=>s.id===place.screen)?.components[place.position];
    if(!component || (component.parent??'')!==place.parent || component.tab!==place.tab)continue;
    const ordered=atlas.states.filter(s=>!s.sample?.startsWith('workspace-d')).sort((a,b)=>
      Number(a.state.includes('-popup-'))*2+Number(a.state.includes('-expanded'))-
      Number(b.state.includes('-popup-'))*2-Number(b.state.includes('-expanded')));
    const source=ordered.find(s=>s.screen===place.screen && s.components[component.id]);
    const attempted=ordered.find(s=>s.screen===row.screen);
    const box=source?.components[component.id];
    if(!source || !attempted || !box || source.viewport.width!==1440 || source.viewport.height!==900 ||
       box.reveal.x<0 || box.reveal.x>1440 || box.reveal.y<0 || box.reveal.y>900)continue;
    const virtual=target(result.day,row,id,place);if(ids.has(virtual))continue;
    // Highest state-sort priority number keeps this out of untargeted fallback
    // selection; its unique target ID selects it only for this modelled point.
    states.push({...attempted,state:`bounded-miss-slot-proxy-popup-expanded-${virtual}`,
      components:{...attempted.components,[virtual]:{center:{...box.reveal},reveal:{...box.reveal},chain:[],offsets:{}}}});
    const lookup=key(row,id);aliases[lookup]=[...new Set([...(aliases[lookup]??[]),virtual])];
  }
  return {...atlas,states,aliases};
}
