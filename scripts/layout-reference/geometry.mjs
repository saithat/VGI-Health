import {occurrences} from './generator.mjs';
// Convert only native boxes/clips to the existing pointerTravel atlas contract.
// This is an estimator, not an admission decision or browser measurement.
export function geometryFor(screen,painted,{state='',sample}={}) {
  const boxes=painted.boxes, components={},scrollers={},clipRects={},approximations=[];
  for(const d of boxes.filter(d=>d.box.scroll)) {
    const b=d.box, extent=Math.max(b.rect.y+b.rect.h,...boxes.filter(p=>p.box.clips.some(([id])=>id===b.info.id)).map(p=>p.box.rect.y+p.box.rect.h));
    scrollers[b.info.id]={maxX:0,maxY:Math.max(0,(extent-b.rect.y-b.rect.h)/64),width:b.rect.w/64,height:b.rect.h/64};
    clipRects[b.info.id]={x:b.rect.x/64,y:b.rect.y/64,w:b.rect.w/64,h:b.rect.h/64};
  }
  function at(path) {
    const box=boxes.find(d=>d.box.info.source?.join('.')===path.join('.'))?.box;
    if(!box) return null;
    let x=(box.rect.x+box.rect.w/2)/64,y=(box.rect.y+box.rect.h/2)/64;
    const center={x,y},offsets={},chain=box.clips.map(([id])=>id);
    // Keep the complete target visible when it fits its enclosing viewport.
    for(const [id,clip] of [...box.clips].reverse()) {
      const top=clip.y/64,bottom=(clip.y+clip.h)/64,half=Math.min(box.rect.h,clip.h)/128;
      const next=Math.max(0,Math.min(scrollers[id]?.maxY??0,y+half-bottom));
      offsets[id]={x:0,y:next};y-=next;
      if(y<top) y=top+half;
    }
    return {center,reveal:{x,y},chain,offsets};
  }
  for(const entry of occurrences(screen)) {
    const id=entry.value?.comp??entry.value?.id;
    if(typeof id==='string') {const box=at(entry.path);if(box) components[id]=box;}
    if(entry.kind==='alert' && entry.value.alertId) components[entry.value.alertId]=at(entry.path);
    if(entry.kind==='tabs') approximations.push({kind:'tabs-as-one-slot',id});
  }
  // Semantic.nav is a single noninteractive text source. Mapping navigation
  // to this slot is explicitly exposed as a proxy, never a separate target count.
  for(const [,items] of screen.nav) for(const [id] of items) {
    components[id]=at([2]);approximations.push({kind:'navigation-as-one-slot',id});
  }
  return {screen:screen.screen??'',state,...(sample?{sample}:{}),viewport:{width:painted.viewport.w/64,height:painted.viewport.h/64},components,scrollers,clipRects,approximations};
}
export class GeometryMeter {
  constructor() {this.pointer={x:720,y:450};this.screen='';this.offsets={};this.scrolls=0;this.scrollPx=0;this.mouseTravelPx=0;this.missingTargets=new Set();this.events=0;this.proxiedEvents=0;}
  event(ev,geometry) {
    this.events++;
    if(ev.screen!==this.screen) {this.screen=ev.screen;this.offsets={};}
    const scroll=next=>{for(const [id,to] of Object.entries(next)) {
      const old=this.offsets[id]??{x:0,y:0},distance=Math.hypot(to.x-old.x,to.y-old.y);
      if(distance>0) {this.scrolls++;this.scrollPx+=distance;}this.offsets[id]=to;
    }};
    if(ev.event.scroll) {
      const entry=Object.entries(geometry.scrollers).find(([,s])=>s.maxY>0);
      if(entry) {const [id,s]=entry;scroll({[id]:{x:0,y:Math.min(s.maxY,(this.offsets[id]?.y??0)+s.height)}});}return;
    }
    const id=Object.entries(ev.event).filter(([kind])=>kind!=='hotkey').map(([,payload])=>payload?.comp??payload?.alert).find(Boolean);
    if(!id || (!ev.ops.some(op=>['point','click'].includes(op)) && !ev.event.enter && !ev.event.confirm)) return;
    if(geometry.approximations.some(p=>p.id===id)) this.proxiedEvents++;
    const b=geometry.components[id];
    if(!b) {this.missingTargets.add(`${ev.screen}/${id}`);this.pointer=null;return;}
    const destination=()=>({x:b.center.x,y:b.center.y-b.chain.reduce((n,id)=>n+(this.offsets[id]?.y??0),0)});
    let target=destination();
    const outside=target.x<0||target.x>geometry.viewport.width||target.y<0||target.y>geometry.viewport.height||b.chain.some(id=>{
      const c=geometry.clipRects[id];return c && (target.y<c.y || target.y>=c.y+c.h);
    });
    if(outside) {scroll(b.offsets);target=b.reveal;}
    if(this.pointer) this.mouseTravelPx+=Math.hypot(target.x-this.pointer.x,target.y-this.pointer.y);
    this.pointer=target;
  }
  result() {return {scrolls:this.scrolls,scrollPx:this.missingTargets.size?null:Math.round(this.scrollPx),mouseTravelPx:this.missingTargets.size?null:Math.round(this.mouseTravelPx),
    measuredScrollPx:Math.round(this.scrollPx),measuredTravelPx:Math.round(this.mouseTravelPx),missingTargets:[...this.missingTargets],events:this.events,proxiedEvents:this.proxiedEvents};}
}
