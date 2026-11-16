// Untrusted, content-independent vendor reference geometry. All sizes are 1/64px.
export const viewports = [{w:92160,h:57600},{w:81920,h:51200},{w:122880,h:69120}];
export const version = 'dense-reference-v3';
const px = n => Math.round(n * 64);
const key = path => path.join('.');
export function occurrences(screen) {
  const roots = [{text:{s:''}},{text:{s:''}},{text:{s:''}},...screen.workspace,...screen.side,
    ...(screen.modal ? [screen.modal] : []),...(screen.urgent ?? [])];
  const result = [];
  function visit(node,path) {
    const [kind,value] = Object.entries(node)[0];
    result.push({path,kind,value});
    const children = value?.children ?? value?.body ?? [];
    const modal = kind === 'patientPane' ? value.modal : [];
    [...children,...modal].forEach((child,i)=>visit(child,[...path,i]));
  }
  roots.forEach((node,i)=>visit(node,[i]));
  return result;
}
// This mirrors screenShape for authoring only; family-check independently derives
// the authoritative shape and verifies every source, target and semantic flag.
export function shapeFor(screen) {
  const entries = occurrences(screen);
  const commit = entries.find(e=>e.kind==='button' && e.value.role==='primary');
  const sideStart = 3 + screen.workspace.length, modalRoot = sideStart + screen.side.length;
  const slots = entries.map(e=>({path:e.path,target:['button','field'].includes(e.kind),
    region:key(e.path)==='0'?'banner':key(e.path)==='1'?'title':e===commit?'footer':
      screen.modal && e.path[0]===modalRoot?'modal':e.path[0]===2 ||
      (e.path[0]>=sideStart && e.path[0]<modalRoot)?'side':'body',
    lines:['section','columns','presentation','text','tabs'].includes(e.kind)?1:e.kind==='info'?3:2}));
  const hints = Object.fromEntries(entries.map(e=>[key(e.path),{kind:e.kind,
    ...(e.kind==='info'?{rows:e.value.rows.length}:{}),
    ...(e.kind==='button'?{role:e.value.role}:{}),
    ...(e.kind==='field'?{narrative:e.value.kind==='textarea'}:{})}]));
  hints['2'].navItems=screen.nav.reduce((n,[,items])=>n+items.length,0);
  return {slots,hints};
}
export function eraseContent(screen) {
  const result=structuredClone(screen);result.banner=[];result.title='';result.nav=[];
  const entries=occurrences(result).filter(e=>e.path[0]>=3);
  for(const {kind,value} of entries) {
    for(const field of ['label','title','s']) if(typeof value[field]==='string') value[field]='';
    if(kind==='info') value.rows=[];
    if(kind==='field') {value.value=null;value.unit=null;value.provenance=null;}
    if(kind==='button') value.blockedReason=null;
  }
  return result;
}
function validate(shape,viewport) {
  if (!viewports.some(v=>v.w===viewport.w && v.h===viewport.h)) throw Error('Unsupported viewport (use Lean units)');
  const slots=Array.isArray(shape)?shape:shape.slots;
  if (!Array.isArray(slots) || !slots.length || new Set(slots.map(s=>key(s.path))).size!==slots.length)
    throw Error('Expected unique semantic slot paths');
  return slots;
}
function card(slot,x,y,w,h,{z=0,font=0,fontSize=12,lines=1,bg='white',fg='slate-900'}={}) {
  return {type:slot.target?'Button':'Text',id:`source-${key(slot.path)}`,source:slot.path,
    target:slot.target,banner:slot.region==='banner',commit:slot.region==='footer',interruptive:slot.region==='modal',
    position:{x:px(x),y:px(y)},width:px(w),height:px(h),z,bg,fg,
    text:{key:`source-${key(slot.path)}`,safety:true,overflow:'scroll',maxLines:lines,
      font,fontSize:px(fontSize),lineHeight:px(fontSize===14?22:18)}};
}
const absolute=(id,x,y,w,h,children)=>({type:'Absolute',id,position:{x:px(x),y:px(y)},width:px(w),height:px(h),children});
function scroller(id,x,y,w,h,children) {
  // Scroll lays children vertically. An absolute child preserves the authored
  // row/column geometry while its extent supplies the native scroll height.
  const extent=Math.max(0,...children.map(c=>(c.position.y+c.height)/64));
  return {type:'Scroll',id,position:{x:px(x),y:px(y)},width:px(w),height:px(h),children:[absolute(`${id}-content`,0,0,w,extent,children)]};
}
export function layoutFor(shape,viewport) {
  const slots=validate(shape,viewport), hints=shape.hints??{}, w=viewport.w/64,h=viewport.h/64;
  const byPath=new Map(slots.map(s=>[key(s.path),s]));
  const ordinary=slots.filter(s=>['body','side'].includes(s.region) && key(s.path)!=='2');
  const side=ordinary.filter(s=>s.region==='side'), body=ordinary.filter(s=>s.region==='body');
  const hasSide=side.length>0, mainX=hasSide?174:8, mainW=w-mainX-8;
  const bodyTop=(hints['2']?.navItems??0)>10?204:180;
  const children=[];
  const banner=slots.find(s=>s.region==='banner');
  if(banner) children.push(card(banner,8,4,w-16,96,{z:30,lines:4,bg:'slate-100'}));
  const nav=byPath.get('2');
  if(nav) children.push(card(nav,8,104,w-16,bodyTop-140,{lines:2,bg:'slate-100'}));
  for(const title of slots.filter(s=>s.region==='title')) children.push(card(title,mainX,bodyTop-32,mainW,24,{font:3,fontSize:14}));
  function arrange(list,width) {
    const output=[], member=new Set(list.map(s=>key(s.path)));
    const roots=list.filter(s=>!member.has(key(s.path.slice(0,-1))));
    function place(slot,x,y,width) {
      const hint=hints[key(slot.path)]??{};
      let kids=list.filter(s=>s.path.length===slot.path.length+1 && key(s.path.slice(0,-1))===key(slot.path));
      let height=slot.target?28:slot.lines===3?Math.max(36,22+24*(hint.rows??3)):18;
      if(hint.kind==='field') height=hint.narrative?72:36;
      if(hint.kind==='columns' || hint.kind==='presentation') height=18;
      const toggle=hint.kind==='section' && hints[key(kids[0]?.path??[])]?.role==='toggle'?kids.shift():null;
      if(toggle) height=24;
      output.push(card(slot,x,y,toggle?Math.max(24,width-104):width,height,{lines:Math.max(1,Math.floor(height/18)),
        bg:hint.kind==='section'?'slate-100':'white'}));
      if(toggle) output.push(card(toggle,x+width-100,y,100,24));
      let cursor=y+height+4;
      if(kids.length) {
        const columns=hint.kind==='columns'?Math.min(kids.length,width>=1200?3:width>=768?2:1):1;
        if(columns>1) {
          const cw=(width-6*(columns-1))/columns;
          for(let i=0;i<kids.length;i+=columns) {
            const bottoms=kids.slice(i,i+columns).map((s,j)=>place(s,x+j*(cw+6),cursor,cw));
            cursor=Math.max(...bottoms)+4;
          }
        } else {
          // Production sections pack ordinary controls into wrapping rows.
          for(let i=0;i<kids.length;) {
            const next=kids[i], nh=hints[key(next.path)]??{};
            const fieldLike=s=>s.target || hints[key(s.path)]?.kind==='valueSet';
            if(fieldLike(next) && !nh.narrative && next.region!=='footer') {
              const row=[];const capacity=Math.max(1,Math.min(nh.kind==='button'?8:5,Math.floor(width/155)));
              while(i<kids.length && row.length<capacity && fieldLike(kids[i]) && !hints[key(kids[i].path)]?.narrative) row.push(kids[i++]);
              const cw=(width-4*(row.length-1))/row.length;
              cursor=Math.max(...row.map((s,j)=>place(s,x+j*(cw+4),cursor,cw)))+4;
            } else {cursor=place(next,x,cursor,width)+4;i++;}
          }
        }
      }
      return cursor;
    }
    let y=0;
    for(const root of roots) y=place(root,0,y,width)+4;
    // G8 checks reading order after flattening, including multi-column rows.
    return output.sort((a,b)=>a.position.y-b.position.y || a.position.x-b.position.x);
  }
  const content=arrange(body,mainW).map(node=>({...node,position:{...node.position,x:node.position.x+px(mainX-8)}}));
  if(hasSide)content.push(...arrange(side,158));
  content.sort((a,b)=>a.position.y-b.position.y || a.position.x-b.position.x);
  children.push(scroller('reference-body',8,bodyTop,w-16,h-bodyTop-52,content));
  for(const footer of slots.filter(s=>s.region==='footer')) children.push(card(footer,mainX,h-44,mainW,32,{z:20,bg:'blue-700',fg:'white'}));
  slots.filter(s=>s.region==='modal').forEach((slot,i)=>children.push(card(slot,mainX,160+i*60,mainW,54,{z:100,lines:3,bg:'slate-100'})));
  return absolute('reference-root',0,0,w,h,children);
}
// Exact geometry of fixed-shell-v2, serialized into the ordinary language so
// fallback descriptors can also be independently family-checked and painted.
export function fixedShellFor(shape,viewport) {
  const slots=validate(shape,viewport),w=viewport.w/64,h=viewport.h/64;
  const children=[],body=slots.filter(s=>!['banner','footer','modal'].includes(s.region));
  for(const s of slots.filter(s=>s.region==='banner')) children.push(card(s,16,8,w-32,96,{z:30,fontSize:14,lines:4}));
  children.push(scroller('fixed-body',16,128,w-32,h-144,body.map((s,i)=>card(s,0,i*56,w-32,48,{fontSize:14,lines:2}))));
  for(const s of slots.filter(s=>s.region==='footer')) children.push(card(s,16,104,w-32,24,{z:20,fontSize:14}));
  slots.filter(s=>s.region==='modal').forEach((s,i)=>children.push(card(s,16,128+i*56,w-32,48,{z:100,fontSize:14,lines:2})));
  return absolute('fixed-root',0,0,w,h,children);
}
