/** Geometry only; no timing model or inferred coordinates. */
export interface Point {x:number;y:number}
export interface BoxGeometry {center:Point; reveal:Point; chain:string[]; offsets:Record<string,Point>}
export interface ScreenGeometry {screen:string;state:string;viewport:{width:number;height:number};components:Record<string,BoxGeometry>;scrollers:Record<string,{maxX:number;maxY:number;width:number;height:number}>}
export interface GeometryAtlas {schemaVersion:1;programHash:string;appSha256:string;viewport:{width:1440;height:900};states:ScreenGeometry[];aliases?:Record<string,string[]>;source:'chromium'|'recorded-fixture'}
export interface PointerEvent {task:string;screen:string;event:unknown;ops:readonly string[]}
export interface PointerCost {mouseTravelPx:number|null;scrollPx:number|null;scrolls:number;missingTargets:string[]}
function target(event:unknown):string|null {
 if(!event||typeof event!=='object')return null;
 for(const [kind,payload] of Object.entries(event)){
  if(kind==='hotkey'||kind==='scroll')continue;
  if(payload&&typeof payload==='object'){
   const id=Object.entries(payload).find(([key,value])=>['comp','alert'].includes(key)&&typeof value==='string')?.[1];
   if(typeof id==='string')return id;
  }
 }
 return null;
}
/** One pointer starts at viewport center per day trace; screen scroll positions persist until navigation. */
export function pointerTravel(trace:readonly PointerEvent[],atlas:GeometryAtlas):Record<string,PointerCost>{
 const result:Record<string,PointerCost>={};let pointer:Point|null={x:720,y:450},active='';let offsets:Record<string,Point>={};
 for(const ev of trace){
  const cost=result[ev.task]??{mouseTravelPx:0,scrollPx:0,scrolls:0,missingTargets:[]};result[ev.task]=cost;
  if(ev.screen!==active){active=ev.screen;offsets={};}
  const id=target(ev.event), candidates=id?[id,...(atlas.aliases?.[id]??[])]:[],states=atlas.states.filter(s=>s.screen===ev.screen);
  const ordered=[...states].sort((a,b)=>Number(a.state.includes('-popup-'))*2+Number(a.state.includes('-expanded'))-Number(b.state.includes('-popup-'))*2-Number(b.state.includes('-expanded')));
  const state=ordered.find(s=>id&&s.components[id])??ordered.find(s=>candidates.some(c=>s.components[c]))??ordered[0];
  if(!state){cost.missingTargets.push(`${ev.screen}/${id??'scroll'}`);cost.mouseTravelPx=null;cost.scrollPx=null;pointer=null;continue;}
  const scroll=(next:Record<string,Point>)=>{for(const [key,to] of Object.entries(next)){const from=offsets[key]??{x:0,y:0};const distance=Math.hypot(to.x-from.x,to.y-from.y);if(distance>0){cost.scrollPx=cost.scrollPx===null?null:cost.scrollPx+distance;cost.scrolls++;}offsets[key]=to;}};
  if(ev.event&&typeof ev.event==='object'&&'scroll' in ev.event){
   const entry=Object.entries(state.scrollers).find(([,s])=>s.maxY>0);
   if(entry){const [key,s]=entry,old=offsets[key]??{x:0,y:0};scroll({[key]:{x:old.x,y:Math.min(s.maxY,old.y+s.height)}});}
   continue;
  }
  if(!id||!ev.ops.some(op=>['point','click'].includes(op))&&!(ev.event&&typeof ev.event==='object'&&('enter' in ev.event||'confirm' in ev.event)))continue;
  const box=candidates.map(c=>state.components[c]).find(Boolean);
  if(!box){cost.missingTargets.push(`${ev.screen}/${id}`);cost.mouseTravelPx=null;cost.scrollPx=null;pointer=null;continue;}
  const delta=box.chain.reduce((p,key)=>({x:p.x+(offsets[key]?.x??0),y:p.y+(offsets[key]?.y??0)}),{x:0,y:0});
  let destination={x:box.center.x-delta.x,y:box.center.y-delta.y};
  if(destination.x<0||destination.x>1440||destination.y<0||destination.y>900){scroll(box.offsets);destination=box.reveal;}
  if(!pointer)cost.mouseTravelPx=null;else if(cost.mouseTravelPx!==null)cost.mouseTravelPx+=Math.hypot(destination.x-pointer.x,destination.y-pointer.y);
  pointer=destination;
 }
 for(const cost of Object.values(result))for(const key of ['mouseTravelPx','scrollPx'] as const)if(cost[key]!==null)cost[key]=Math.round(cost[key]*100)/100;
 return result;
}
