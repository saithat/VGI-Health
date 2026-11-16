import {widgetParts,placeWidgetParts,numeric,dated} from "./widgets.mjs";
// Untrusted, content-independent vendor reference geometry. All sizes are 1/64px.
import {windowOnce} from './window.mjs';
export const viewports = [{w:92160,h:57600},{w:81920,h:51200},{w:122880,h:69120}];
export const version = 'dense-reference-v10';
const px = n => Math.round(n * 64);
const key = path => path.join('.');
const button=(comp,label,role)=>({button:{comp,label,role,enabled:true,blockedReason:null,hotkey:null}});
export const navNode=nav=>({section:{id:'navigation',title:'Navigation',children:nav.map(([title,items])=>({section:{id:title,title,children:items.map(([id,label])=>button(id,label,'nav'))}}))}});
// Extend part/role placement here when the semantic inventory grows. Keys are
// UiNode kinds (a node's own part) or part roles (its further display parts).
export const placementRules={field:'field',button:'button',alert:'line',text:'line',info:'table',section:'section',
  timeline:'section',datedTimeline:'section',patientPane:'section',tabs:'tabs',stepper:'steps',columns:'columns',
  valueSet:'transparent',presentation:'wrapper',rowAction:'wrapper',chartReferences:'wrapper',board:'wrapper',
  control:'field',unit:'field',code:'field',required:'field',hint:'field',source:'field',pending:'field',human:'field',
  reason:'button',hotkey:'button',tab:'tabs',step:'steps',cellLabel:'table',cellValue:'table',status:'table',badge:'table',
  empty:'table',item:'line',position:'pager',flagged:'pager',pager:'pager'};

/* The semantic inventory, mirrored from Lean (Layout.Display, Layout.Semantic):
   a node's own part, then its further display parts in reading order, then its
   child nodes. Lean independently derives the authoritative inventory. */
const kindBase=kind=>kind.split(':')[0];
const kindOptions=kind=>{const [,...rest]=kind.split(':');return rest.length?rest.join(':').split('|').filter(Boolean).map(c=>[c,c]):[];};
const fieldOptions=(cx,comp,kind)=>{const set=cx.fieldChoices.find(([id])=>id===comp)?.[1];return set?set.options:cx.options.length?cx.options:kindOptions(kind);};
const uniformRows=rows=>rows.length>=2&&rows.slice(1).every(r=>JSON.stringify(r.map(([k])=>k))===JSON.stringify(rows[0].map(([k])=>k)));
const cellRole=k=>/status|confirmation|review state|scheduled|administration/i.test(k)||/^\d{1,2}:\d{2}/.test(k)?'status':k==='Flag'||k==='Abnormal'?'badge':'cellValue';
function leafParts(cx,kind,v) {
  if(kind==='field') {
    const showCode=cx.fieldChoices.find(([id])=>id===v.comp)?.[1].showCode??false;
    const chosen=v.value!==null&&showCode&&fieldOptions(cx,v.comp,v.kind).some(([c])=>c===v.value);
    return [{role:'control',target:true,comp:v.comp,ids:[v.comp],narrative:kindBase(v.kind)==='textarea'},
      ...(v.unit!==null?[{role:'unit'}]:[]),...(chosen?[{role:'code'}]:[]),...(v.required?[{role:'required'}]:[]),
      ...(cx.entryHints.some(([id])=>id===v.comp)?[{role:'hint'}]:[]),...(v.provenance!==null?[{role:'source'}]:[]),
      ...(v.pendingConfirm?[{role:'pending',target:!cx.confirms.has(v.comp),comp:v.comp}]:[]),...(v.humanOnly?[{role:'human'}]:[])];
  }
  if(kind==='button') return [...(!v.enabled||v.blockedReason!==null?[{role:'reason'}]:[]),...(v.hotkey!==null?[{role:'hotkey'}]:[])];
  // Indexed IDs select exact tab target boxes in geometry.
  if(kind==='tabs') return v.labels.map((_,i)=>({role:'tab',target:true,comp:v.id,ids:[`${v.id}#tab:${i}`],col:i}));
  if(kind==='stepper') return v.steps.map((_,i)=>({role:'step',col:i}));
  if(kind==='info') {
    if(!v.rows.length) return [...windowParts(cx,v.comp),...(v.display==='status'?[]:[{role:'empty'}])];
    return [...windowParts(cx,v.comp),...infoCells(v)];
  }
  if(kind==='presentation')return widgetParts(v.kind,v.children,cx.references);
  if(kind==='timeline')return [{role:'item',widget:'timeAxis'}];
  if(kind==='alert')return [{role:'item',widget:'severityIcon'}];
  if(kind==='board') return v.urgent.map(()=>({role:'alert'}));
  if(kind==='datedTimeline') return [...v.dated,...v.undated].map(()=>({role:'item'})).concat([{role:'item',widget:'timeAxis'}]);
  if(kind==='chartReferences') return v.references.map(()=>({role:'item'}));
  if(kind==='patientPane') return (v.metadata.urgent??[]).map(a=>'alert' in a?{role:'alert',comp:a.alert.comp}:
    {role:'button',target:true,comp:a.button.comp});
  return [];
}
/* Layout.Display.pagerParts: a paged list's position, flagged count and four
   targets. A pager target answers the geometry for the page it selects
   (`id#tab:p`, the address of `selectTab id p`); the next and previous targets
   take their pages, the page selector every other page. */
function windowParts(cx,comp) {
  const w=(cx.windows??[]).find(x=>x.comp===comp);if(!w)return [];
  const page=q=>`${comp}#tab:${q}`;
  return [{role:'position',comp},{role:'flagged',comp},
    {role:'pager',target:true,comp,pager:'previous',col:Math.max(0,w.page-1),ids:w.page>0?[page(w.page-1)]:[]},
    {role:'pager',target:true,comp,pager:'next',col:w.page+1,ids:w.page+1<w.pages?[page(w.page+1)]:[]},
    {role:'pager',target:true,comp,pager:'page',col:w.page,
      ids:[...Array(w.pages).keys()].filter(q=>Math.abs(q-w.page)!==1).map(page)},
    {role:'pager',target:true,comp,pager:'nextFlagged',col:w.nextFlagged??w.page,ids:[]}];
}
function infoCells(v) {
  return uniformRows(v.rows)?[...v.rows[0].map((_,c)=>({role:'cellLabel',row:0,col:c})),
      ...v.rows.flatMap((row,r)=>row.map(([k],c)=>({role:cellRole(k),row:r,col:c})))]:
    v.rows.flatMap((row,r)=>row.flatMap(([k],c)=>[{role:'cellLabel',row:r,col:c},{role:cellRole(k),row:r,col:c}]));
}
function ownPart(kind,v,chrome) {
  if(kind==='text') return {role:'text'};
  if(kind==='field') return {role:'label',comp:v.comp};
  if(kind==='button') return {role:'button',target:true,commit:v.role==='primary',comp:v.comp,ids:[v.comp]};
  if(kind==='alert') return {role:'alert',comp:v.comp,ids:[v.comp]};
  if(kind==='info') return {role:'heading',comp:v.comp===''?v.infoId:v.comp,ids:[v.comp]};
  // The navigation wrapper and group headings are chrome, not program components.
  if(kind==='section') return {role:'heading',comp:v.id,ids:chrome?[]:[v.id]};
  if(kind==='timeline'||kind==='datedTimeline') return {role:'heading'};
  if(kind==='patientPane') return {role:'heading',comp:v.patient};
  if(kind==='tabs') return {role:'wrapper',comp:v.id,ids:[v.id]};
  if(kind==='rowAction') return {role:'wrapper',comp:v.target,row:v.row};
  return {role:'wrapper'};
}
const childNodes=(kind,v)=>kind==='patientPane'?[...v.children,...v.modal]:kind==='tabs'?v.body:v?.children??[];
const confirmComps=node=>{const [kind,v]=Object.entries(node)[0];return kind==='button'?(v.role==='confirm'?[v.comp]:[]):childNodes(kind,v).flatMap(confirmComps);};
/** Every occurrence of the semantic inventory, in Lean's order and with Lean's
 * paths: `{path, role, target, commit, comp, ids, kind, value, leaf, ...}`.
 * `kind`/`value` are the UiNode of an own part; a display part has `leaf`.
 * Like Lean's `inventory` operation, it reads the screen as the layout shows
 * it: bounded lists one page at a time (window.mjs mirrors Layout.Window). */
export const occurrences=screen=>inventoryOf(windowOnce(screen));
function inventoryOf(screen) {
  const result=[],body=[...screen.workspace,...screen.side,...(screen.modal?[screen.modal]:[]),...(screen.urgent??[])];
  const push=(path,part,extra={})=>result.push({path,role:part.role,target:part.target??false,commit:part.commit??false,
    comp:part.comp??'',ids:part.ids??[],...(part.narrative?{narrative:true}:{}),...(part.row!==undefined?{row:part.row}:{}),
    ...(part.col!==undefined?{col:part.col}:{}),...(part.pager?{pager:part.pager}:{}),...(part.widget?{widget:part.widget}:{}),...extra});
  function visit(node,path,cx,chrome=false,scope={}) {
    const [kind,value]=Object.entries(node)[0];
    push(path,ownPart(kind,value,chrome),{kind,value,...scope});
    const leaves=leafParts(cx,kind,value);
    leaves.forEach((leaf,i)=>push([...path,i],leaf,{leaf:true,of:kind,...scope,...(["board","patientPane"].includes(kind)?{nestedRegion:"urgent"}:{})}));
    let inner=cx;
    if(kind==='chartReferences')inner={...cx,references:value.references};
    if(kind==='valueSet') inner={...cx,options:value.options.map(o=>[o.code,o.label])};
    if(kind==='patientPane') inner={...cx,fieldChoices:value.metadata.fieldChoices,entryHints:value.metadata.entryHints,confirms:new Set([...value.children,...value.modal].flatMap(confirmComps))};
    childNodes(kind,value).forEach((child,i)=>visit(child,[...path,leaves.length+i],inner,chrome,
      kind==='patientPane'?{patient:value.patient,...(i>=value.children.length?{nestedRegion:'modal'}:{})}:scope));
  }
  const cx={options:[],fieldChoices:screen.fieldChoices??[],entryHints:screen.entryHints??[],confirms:new Set(body.flatMap(confirmComps)),
    windows:screen.windows??[]};
  push([0],{role:'banner'});push([1],{role:'title'});
  visit(navNode(screen.nav),[2],cx,true);
  body.forEach((node,i)=>visit(node,[i+3],cx));
  for(const e of result)if(e.patient)e.ids=e.ids.map(id=>`${e.patient}::${id}`);
  return result;
}
// This mirrors screenShape for authoring only; family-check independently derives
// the authoritative shape and verifies every source, target and semantic flag.
export function shapeFor(screen) {
  screen=windowOnce(screen);
  const entries=occurrences(screen);
  const commit=entries.find(e=>e.commit);
  const sideStart=3+screen.workspace.length,modalRoot=sideStart+screen.side.length,urgentRoot=modalRoot+Number(Boolean(screen.modal));
  const slots=entries.map(e=>({path:e.path,target:e.target,
    region:key(e.path)==='0'?'banner':key(e.path)==='1'?'title':e.path[0]>=urgentRoot?'urgent':e.nestedRegion??(e===commit?'footer':
      screen.modal && e.path[0]===modalRoot?'modal':e.path[0]===2 ||
      (e.path[0]>=sideStart && e.path[0]<modalRoot)?'side':'body'),
    lines:['control','button','alert'].includes(e.role)?2:1}));
  const hints=Object.fromEntries(entries.map(e=>[key(e.path),{role:e.role,
    ...(e.leaf?{leaf:true,placement:placementRules[e.role]??'line'}:{kind:e.kind,placement:placementRules[e.kind]??'line'}),
    ...(e.path[0]>=urgentRoot?{urgent:true}:{}),
    ...(e.kind==='button'?{buttonRole:e.value.role}:{}),
    ...(e.kind==='info'?{comp:e.comp}:{}),...(e.kind==='rowAction'?{rowTarget:e.comp}:{}),
    ...(e.pager?{pager:e.pager}:{}),
    ...(e.narrative?{narrative:true}:{}),
    ...(e.row!==undefined?{row:e.row}:{}),...(e.col!==undefined?{col:e.col}:{}),...(e.widget?{widget:e.widget}:{}),...(e.patient?{patient:e.patient}:{}),
    ...(e.kind==='info'&&e.value.rows.length?{uniform:uniformRows(e.value.rows),cols:e.value.rows[0].length}:{})}]));
  hints['2'].navItems=screen.nav.reduce((n,[,items])=>n+items.length,0);
  return {slots,hints};
}
/** Erase patient strings while keeping every structural fact the inventory
 * depends on: optional values stay present (as empty strings), lists keep their
 * lengths, table column captions and coded values stay (they decide cell roles,
 * header rows and code parts). Lean's shape of the result equals the original. */
export function eraseContent(screen) {
  const result=structuredClone(screen);result.banner=[];result.title='';result.viewer=null;result.nav=result.nav.map(([,items])=>['',items.map(([id])=>[id,''])]);
  const blank=v=>v===null||v===undefined?v:'';
  const entries=inventoryOf(result).filter(e=>e.path[0]>=3&&!e.leaf);
  for(const {kind,value} of entries) {
    for(const field of ['label','title','s']) if(typeof value[field]==='string') value[field]='';
    if(kind==='info') value.rows=value.rows.map(row=>row.map(([k,v])=>[k,numeric(v)?'0':/^(Test|Measure|Unit)$/.test(k)?v:dated(v)?'1970-01-01T00:00:00Z':'']));
    if(kind==='field') {if(!['code','coded'].includes(kindBase(value.kind)))value.value=blank(value.value);value.unit=blank(value.unit);value.provenance=blank(value.provenance);}
    if(kind==='button') {value.blockedReason=blank(value.blockedReason);value.hotkey=blank(value.hotkey);}
    if(kind==='valueSet') value.options=value.options.map(o=>({...o,label:''}));
    if(kind==='chartReferences') value.references=value.references.map(r=>({...r,percentile:'',source:'',population:'',points:r.points.map(()=>[0,0])}));
    if(kind==='tabs') value.labels=value.labels.map(()=>'');
    if(kind==='stepper') value.steps=value.steps.map(([id])=>[id,'']);
    if(kind==='datedTimeline') {value.dated=value.dated.map(d=>({...d,source:{...d.source,resource:'',timestamp:''}}));value.undated=value.undated.map(u=>({...u,resource:'',timestamp:''}));}
    if(kind==='board') value.urgent=value.urgent.map(u=>({...u,patient:'',banner:[],label:''}));
    if(kind==='patientPane') {value.banner=[];}
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
    target:slot.target,banner:slot.region==='banner',commit:slot.region==='footer',interruptive:slot.region==='modal',urgent:slot.region==='urgent',
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
  const urgent=slots.filter(s=>s.region==='urgent');
  const urgentColumns=Math.max(1,Math.floor((w-18)/266)),urgentHeight=urgent.length?Math.ceil(urgent.length/urgentColumns)*40+12:0;
  const ordinary=slots.filter(s=>['body','side'].includes(s.region) && s.path[0]!==2);
  const side=ordinary.filter(s=>s.region==='side'), body=ordinary.filter(s=>s.region==='body');
  const hasSide=side.length>0, mainX=hasSide?174:8, mainW=w-mainX-8;
  const navSlots=slots.filter(s=>s.path[0]===2), navColumns=Math.max(1,Math.floor((w-16)/155));
  const navRows=navSlots.filter(s=>s.path.length===2).reduce((n,g)=>n+1+Math.ceil(navSlots.filter(s=>s.path.length===3 && s.path[1]===g.path[1]).length/navColumns),1);
  const bodyTop=104+urgentHeight+navRows*28+40;
  const scrollTop=104+urgentHeight,bodyOffset=bodyTop-scrollTop,scrollChrome=[];
  const children=[];
  const urgentWidth=(w-24-6*(Math.min(urgent.length,urgentColumns)-1))/Math.max(1,Math.min(urgent.length,urgentColumns));
  urgent.forEach((slot,i)=>children.push(card(slot,12+(i%urgentColumns)*(urgentWidth+6),8+Math.floor(i/urgentColumns)*40,urgentWidth,34,
    {z:40,bg:{r:255,g:241,b:240},fg:{r:118,g:27,b:24}})));
  const banner=slots.find(s=>s.region==='banner');
  if(banner) children.push(card(banner,8,4+urgentHeight,w-16,96,{z:30,lines:4,bg:'slate-100'}));
  let navY=0;
  if(byPath.has('2'))scrollChrome.push(card(byPath.get('2'),0,navY,w-16,18,{bg:'slate-100'}));
  navY+=28;
  for(const group of navSlots.filter(s=>s.path.length===2)) {
    scrollChrome.push(card(group,0,navY,w-16,18,{bg:'slate-100'}));navY+=28;
    const links=navSlots.filter(s=>s.path.length===3 && s.path[1]===group.path[1]),cw=(w-16-4*(navColumns-1))/navColumns;
    links.forEach((s,i)=>scrollChrome.push(card(s,(i%navColumns)*(cw+4),navY+Math.floor(i/navColumns)*28,cw,24,{bg:'slate-100'})));
    navY+=Math.ceil(links.length/navColumns)*28;
  }
  for(const title of slots.filter(s=>s.region==='title')) scrollChrome.push(card(title,mainX-8,bodyOffset-32,mainW,24,{font:3,fontSize:14}));
  // Dense content: each node's parts are placed together, in reading order.
  // A field is its label beside or above its control, with unit, code and
  // required marker on the control's row when they fit, and its remaining
  // annotations below; a table is its caption, a header row and value cells in
  // column tracks; tabs share one row; a button keeps its reason and hotkey
  // inline. Structural wrappers have empty text and take a small box in a left
  // gutter, so they reserve no content row.
  function arrange(list,width) {
    const output=[],byKey=new Map(list.map(s=>[key(s.path),s])),hint=s=>hints[key(s.path)]??{};
    const parentOf=s=>{for(let n=s.path.length-1;n>0;n--){const k=key(s.path.slice(0,n));if(byKey.has(k))return k;}return null;};
    const kidsOf=new Map(),roots=[];
    for(const s of list){const p=parentOf(s);if(p===null)roots.push(s);else{if(!kidsOf.has(p))kidsOf.set(p,[]);kidsOf.get(p).push(s);}}
    const isLeaf=s=>hint(s).leaf===true && byKey.has(key(s.path.slice(0,-1)));
    const gutter=list.some(s=>!hint(s).leaf && (hint(s).role==='wrapper'))?22:0,W=Math.floor(width-gutter);
    const placed=new Set();let gutterBottom=-1e9;
    // Uniform tables of this list and the row-action groups that name them.
    const tables=new Set(list.filter(s=>hint(s).kind==='info'&&hint(s).uniform).map(s=>hint(s).comp));
    const rowActions=new Map(),tablesPlaced=new Set();
    for(const s of list)if(hint(s).kind==='rowAction'){const t=hint(s).rowTarget;if(!rowActions.has(t))rowActions.set(t,[]);rowActions.get(t).push(s);}
    // Row actions a table could not attach (narrow or stale rows) follow it.
    const detached=(comp,x,bottom,w)=>{let y=bottom;for(const a of (rowActions.get(comp)??[]))
      if(!placed.has(key(a.path)))y=place(a,x,y+6,w);return y;};
    const add=(slot,x,y,w,h,opts={})=>{placed.add(key(slot.path));
      output.push(card(slot,gutter+x,y,Math.max(24,Math.floor(w)),h,{lines:Math.max(1,Math.floor(h/18)),...opts}));};
    const wrapperBox=(slot,y)=>{const gy=Math.max(y,gutterBottom+2);placed.add(key(slot.path));output.push(card(slot,0,gy,20,18));gutterBottom=gy+18;};
    const lineHeight=s=>s.target?28:hint(s).role==='alert'?28:18;
    function lines(parts,x,y,w){for(const p of parts){if(placed.has(key(p.path)))continue;const h=lineHeight(p);add(p,x,y,w,h);y+=h+2;}return y;}
    // Pack fixed/flexible items left to right, wrapping; returns the bottom.
    function pack(items,x,y,w,h){
      let cx=0,cy=y,bottom=y;
      const flex=items.filter(i=>!i.width).length;
      for(const item of items){
        let iw=item.width??Math.max(100,Math.floor((w-items.reduce((n,i)=>n+(i.width??0)+4,0))/Math.max(1,flex)));
        iw=Math.min(iw,w);
        if(cx>0 && cx+iw>w){cx=0;cy+=h+2;}
        add(item.slot,x+cx,cy,iw,h);cx+=iw+4;bottom=cy+h;
      }
      return bottom;
    }
    function field(node,leaves,x,y,w) {
      const role=r=>leaves.find(l=>hint(l).role===r);
      const control=role('control'),narrative=control&&hint(control).narrative;
      const inline=[['unit',48],['code',64],['required',68]].map(([r,width])=>({slot:role(r),width})).filter(i=>i.slot);
      const notes=[['hint'],['source'],['pending',72],['human',88]].map(([r,width])=>({slot:role(r),width})).filter(i=>i.slot);
      const inlineW=inline.reduce((n,i)=>n+i.width+4,0);
      const fits=w-inlineW>=80;
      const below=fits?notes:[...inline,...notes];
      let top=y,cx=x,cw=w;
      if(!narrative && !below.length && w>=480) {
        // Wide single field: the label stands beside its control.
        const lw=Math.min(200,Math.floor(w*0.3));add(node,x,y,lw,28);cx=x+lw+4;cw=w-lw-4;
      } else {add(node,x,y,w,18);top=y+20;}
      const ch=narrative?72:28;
      if(control) add(control,cx,top,fits?cw-inlineW:cw,ch);
      if(fits){let ix=cx+cw-inlineW+4;for(const i of inline){add(i.slot,ix,top,i.width,ch);ix+=i.width+4;}}
      let bottom=top+ch;
      if(below.length) bottom=pack(below,x,bottom+4,w,24);
      return lines(leaves,x,bottom+2,w)-2;
    }
    function buttonCell(node,leaves,x,y,w) {
      const reason=leaves.find(l=>hint(l).role==='reason'),hotkey=leaves.find(l=>hint(l).role==='hotkey');
      if(!reason && !hotkey){add(node,x,y,w,28);return y+28;}
      if(w>=220) {
        const bw=Math.min(160,Math.max(80,Math.floor(w*0.4)));add(node,x,y,bw,28);
        let rx=x+bw+4,rest=w-bw-4;
        if(hotkey){add(hotkey,x+w-56,y,56,28);rest-=60;}
        if(reason){if(rest>=40)add(reason,rx,y,rest,28);else return lines([reason],x,y+30,w)-2;}
        return y+28;
      }
      add(node,x,y,w,28);return lines(leaves,x,y+30,w)-2;
    }
    // A paged list's position, flagged count and pager targets share one row
    // above its header (Layout.Display.pagerParts); they wrap when narrow.
    function pagerRow(leaves,x,y,w) {
      const parts=leaves.filter(l=>['position','flagged','pager'].includes(hint(l).role));
      if(!parts.length) return y;
      const width={position:170,flagged:250,previous:104,next:88,page:180,nextFlagged:108};
      return pack(parts.map(p=>({slot:p,width:width[hint(p).role==='pager'?hint(p).pager:hint(p).role]})),x,y,w,24)+4;
    }
    // Row actions attached to their record's row: a uniform table reserves an
    // action column and each record's single-button actions sit in its row.
    const attachable=a=>(kidsOf.get(key(a.path))??[]).length>0&&(kidsOf.get(key(a.path))??[]).every(b=>
      hint(b).kind==='button'&&!(kidsOf.get(key(b.path))??[]).length);
    function attach(actions,x,y,pitch,aw) {
      for(const a of actions) {
        const ay=y+hint(a).row*pitch,buttons=kidsOf.get(key(a.path)),bw=Math.floor((aw-4*(buttons.length-1))/buttons.length);
        wrapperBox(a,ay);buttons.forEach((b,j)=>add(b,x+j*(bw+4),ay,bw,28));
      }
    }
    function table(node,leaves,x,y,w) {
      const h=hint(node);add(node,x,y,w,18,{bg:'slate-100'});y+=20;
      y=pagerRow(leaves,x,y,w);
      const cells=leaves.filter(l=>hint(l).row!==undefined);
      const actions=(rowActions.get(h.comp)??[]).filter(a=>!placed.has(key(a.path)));
      if(h.uniform) {
        const records=Math.max(0,...cells.map(c=>hint(c).row+1));
        const attached=actions.filter(a=>attachable(a)&&hint(a).row<records);
        const most=Math.max(0,...attached.map(a=>kidsOf.get(key(a.path)).length));
        const aw=most?Math.min(260,most*92):0,n=h.cols,cw=Math.floor((w-aw-(aw?4:0)-4*(n-1))/n);
        if(cw>=56) {
          const header=cells.slice(0,n),values=cells.slice(n),pitch=most?30:20,cellH=most?28:18;
          header.forEach(c=>add(c,x+hint(c).col*(cw+4),y,cw,18,{bg:'slate-100'}));y+=20;
          for(const c of values)add(c,x+hint(c).col*(cw+4),y+hint(c).row*pitch,cw,cellH);
          attach(attached,x+w-aw,y,pitch,aw);
          const bottom=y+records*pitch;
          return lines(leaves,x,bottom,w)-2;
        }
        return lines(leaves,x,y,w)-2;
      }
      // One record (or records with different captions): caption/value pairs
      // in as many pair columns as the width allows; a record starts a line.
      const k=Math.max(1,Math.floor((w+8)/300)),pw=Math.floor((w-8*(k-1))/k),lw=Math.min(140,Math.floor(pw*0.4));
      let row=-1,i=0,lineY=y-20;
      for(let p=0;p+1<cells.length;p+=2){
        const label=cells[p],value=cells[p+1];
        if(hint(label).row!==row||i===k){lineY+=20;i=0;row=hint(label).row;}
        add(label,x+i*(pw+8),lineY,lw,18,{bg:'slate-100'});add(value,x+i*(pw+8)+lw+4,lineY,pw-lw-4,18);i++;
      }
      return lines(leaves,x,cells.length?lineY+20:y,w)-2;
    }
    function strip(leaves,x,y,w,h,max) {
      if(!leaves.length) return y;
      const per=Math.max(1,Math.min(leaves.length,Math.floor((w+4)/84))),cw=Math.min(max,Math.floor((w-4*(per-1))/per));
      leaves.forEach((s,i)=>add(s,x+(i%per)*(cw+4),y+Math.floor(i/per)*(h+4),cw,h));
      return y+Math.ceil(leaves.length/per)*(h+4)-4;
    }
    const fieldLike=s=>{const h=hint(s);if(h.leaf)return false;
      if(h.kind==='field')return !(kidsOf.get(key(s.path))??[]).some(l=>hint(l).narrative);
      if(h.kind==='button')return s.region!=='footer' && h.buttonRole!=='toggle';
      if(h.kind==='valueSet'){const kids=(kidsOf.get(key(s.path))??[]);return kids.length===1&&fieldLike(kids[0]);}
      return false;};
    function flow(children,x,y,w) {
      let cursor=y;
      for(let i=0;i<children.length;) {
        const next=children[i];
        if(fieldLike(next)) {
          const row=[],capacity=Math.max(1,Math.min(hint(next).kind==='button'?8:5,Math.floor(w/155)));
          while(i<children.length && row.length<capacity && fieldLike(children[i])) row.push(children[i++]);
          const cw=Math.floor((w-4*(row.length-1))/row.length);
          cursor=Math.max(...row.map((s,j)=>place(s,x+j*(cw+4),cursor,cw)))+6;
        } else {cursor=place(next,x,cursor,w)+6;i++;}
      }
      return cursor-6;
    }
    function place(node,x,y,w) {
      // Attached row actions were placed with their table's rows.
      if(placed.has(key(node.path))) return y-6;
      const h=hint(node),kids=kidsOf.get(key(node.path))??[];
      if(h.kind==='rowAction' && tables.has(h.rowTarget) && !tablesPlaced.has(h.rowTarget) && attachable(node)) return y-6;
      const leaves=kids.filter(isLeaf),children=kids.filter(k=>!isLeaf(k));
      if(h.leaf) return lines([node],x,y,w)-2;
      let bottom=y;
      const icon=leaves.find(l=>hint(l).widget==='severityIcon');
      if(icon){add(node,x+28,y,w-28,28);add(icon,x,y,24,24);return y+28;}
      const rich=placeWidgetParts(leaves,hint,add,x,y+(h.role==='heading'?24:0),w);
      if(rich!==null){if(h.role==='heading')add(node,x,y,w,20,{bg:'slate-100'});else wrapperBox(node,y);bottom=rich;}
      else switch(h.placement) {
        case 'field': bottom=field(node,leaves,x,y,w);break;
        case 'button': bottom=buttonCell(node,leaves,x,y,w);break;
        case 'table': bottom=table(node,leaves,x,y,w);tablesPlaced.add(h.comp);bottom=detached(h.comp,x,bottom,w);break;
        case 'line': add(node,x,y,w,lineHeight(node));bottom=lines(leaves,x,y+lineHeight(node)+2,w)-2;break;
        case 'tabs': wrapperBox(node,y);bottom=strip(leaves,x,y,w,24,180);break;
        case 'steps': wrapperBox(node,y);bottom=strip(leaves,x,y,w,18,200);break;
        case 'section': {
          const toggle=children[0]&&hint(children[0]).buttonRole==='toggle'&&!(kidsOf.get(key(children[0].path))??[]).length?children.shift():null;
          add(node,x,y,toggle?Math.max(24,w-104):w,toggle?24:18,{bg:'slate-100'});
          if(toggle)add(toggle,x+w-100,y,100,24);
          bottom=lines(leaves,x,y+(toggle?26:20),w)-2;break;
        }
        default: wrapperBox(node,y);bottom=lines(leaves,x,y,w)-2;
      }
      if(!children.length) return Math.max(bottom,y);
      if(h.kind==='board' || h.kind==='columns') {
        const columns=Math.min(children.length,w>=1200?3:w>=768?2:1),cw=(w-6*(columns-1))/columns;
        let cursor=y;
        for(let i=0;i<children.length;i+=columns) {
          const bottoms=children.slice(i,i+columns).map((s,j)=>place(s,x+Math.floor(j*(cw+6)),cursor,Math.floor(cw)));
          cursor=Math.max(...bottoms)+6;
        }
        return cursor-6;
      }
      const start=!leaves.length&&['wrapper','transparent'].includes(h.placement)?y:bottom+6;
      return flow(children,x,start,w);
    }
    let y=0;
    for(let i=0;i<roots.length;) {
      if(fieldLike(roots[i])){const run=[];while(i<roots.length&&fieldLike(roots[i]))run.push(roots[i++]);y=flow(run,0,y,W)+8;}
      else {y=place(roots[i],0,y,W)+8;i++;}
    }
    const missing=list.filter(s=>!placed.has(key(s.path)));
    if(missing.length) throw Error(`Reference generator left ${missing.length} occurrences unplaced (${key(missing[0].path)})`);
    // G8 checks reading order after flattening, including multi-column rows.
    return output.sort((a,b)=>a.position.y-b.position.y || a.position.x-b.position.x);
  }
  const content=arrange(body,mainW).map(node=>({...node,position:{x:node.position.x+px(mainX-8),y:node.position.y+px(bodyOffset)}}));
  if(hasSide)content.push(...arrange(side,158).map(node=>({...node,position:{...node.position,y:node.position.y+px(bodyOffset)}})));
  content.push(...scrollChrome);
  content.sort((a,b)=>a.position.y-b.position.y || a.position.x-b.position.x);
  children.push(scroller('reference-body',8,scrollTop,w-16,Math.max(24,h-scrollTop-52),content));
  for(const footer of slots.filter(s=>s.region==='footer')) children.push(card(footer,mainX,h-44,mainW,32,{z:20,bg:'blue-700',fg:'white'}));
  slots.filter(s=>s.region==='modal').forEach((slot,i)=>children.push(card(slot,mainX,160+urgentHeight+i*60,mainW,54,{z:100,lines:3,bg:'slate-100'})));
  return absolute('reference-root',0,0,w,h,children);
}
// Exact geometry of fixed-shell-v2, serialized into the ordinary language so
// fallback descriptors can also be independently family-checked and painted.
export function fixedShellFor(shape,viewport) {
  const slots=validate(shape,viewport),w=viewport.w/64,h=viewport.h/64;
  const children=[],body=slots.filter(s=>!['banner','footer','modal','urgent'].includes(s.region)).sort((a,b)=>Number(a.path[0]===2)-Number(b.path[0]===2));
  for(const s of slots.filter(s=>s.region==='banner')) children.push(card(s,16,8,w-32,96,{z:30,fontSize:14,lines:4}));
  children.push(scroller('fixed-body',16,272,w-32,h-288,body.map((s,i)=>card(s,0,i*56,w-32,48,{fontSize:14,lines:2}))));
  for(const s of slots.filter(s=>s.region==='footer')) children.push(card(s,16,104,w-32,24,{z:20,fontSize:14}));
  slots.filter(s=>s.region==='modal').forEach((s,i)=>children.push(card(s,16,272+i*56,w-32,48,{z:100,fontSize:14,lines:2})));
  slots.filter(s=>s.region==='urgent').forEach((s,i)=>children.push(card(s,16,128+i*24,w-32,24,{z:40,fontSize:14})));
  return absolute('fixed-root',0,0,w,h,children);
}
