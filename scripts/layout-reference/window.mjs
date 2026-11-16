// Mirror of Ehr.Layout.Window: the window a bounded list shows. Authoring,
// geometry and tests only; Lean's `window` operation is authoritative and the
// layout checker windows every screen it reads (Layout.Api.windowed).
export const defaultPageSize=20, minPageSize=5, maxPageSize=50;
export const sizeOf=(cfg,comp)=>Math.min(maxPageSize,Math.max(minPageSize,
  (cfg?.sizes??[]).find(([c])=>c===comp)?.[1]??cfg?.size??defaultPageSize));
export const pageCount=(n,k)=>Math.max(1,Math.floor((n+k-1)/k));
export const pageRows=(rows,k,p)=>rows.slice(p*k,p*k+k);
export const clampPage=(n,k,p)=>Math.min(p,pageCount(n,k)-1);
// Layout.Format.statusColumn / statusTone / resultTone, as far as flags need them.
const statusColumn=k=>/status|confirmation|review state|scheduled|administration/i.test(k)||/^\d{1,2}:\d{2}/.test(k);
const trimAscii=s=>s.replace(/^[ \t\n\r\f\v]+|[ \t\n\r\f\v]+$/g,'');
const statusWord=v=>trimAscii(v.split(/[·\n]/)[0]).toLowerCase().replace(/[_-]/g,' ');
const leads=(s,ws)=>ws.some(w=>s===w||s.startsWith(w+' ')||s.startsWith(w+'\t'));
const red=v=>{const s=statusWord(v);return ['h','high','hh','ll','a','abnormal'].includes(s)||
  leads(s,['critical','urgent','stat','overdue','rejected']);};
const resultTone=f=>{const w=trimAscii(f).toLowerCase();return ['hh','ll','critical'].includes(w)?'critical':['h','high'].includes(w)?'high':['l','low'].includes(w)?'low':'';};
export const flaggedCell=([k,v])=>statusColumn(k)?red(v):(k==='Flag'||k==='Abnormal')?resultTone(v)!=='':false;
export const flaggedRow=row=>row.some(flaggedCell);
const flaggedIndices=rows=>rows.flatMap((row,i)=>flaggedRow(row)?[i]:[]);
export function windowOf(cfg,comp,rows,asked) {
  const k=sizeOf(cfg,comp),pages=pageCount(rows.length,k),page=clampPage(rows.length,k,asked),flags=flaggedIndices(rows);
  const has=q=>flags.some(i=>Math.floor(i/k)===q);
  const cyclic=[...Array(pages).keys()].filter(q=>q>page).concat([...Array(pages).keys()].filter(q=>q<=page));
  const next=cyclic.find(q=>q!==page&&has(q));
  return {comp,flagged:flags.length,flaggedElsewhere:flags.filter(i=>Math.floor(i/k)!==page).length,
    ...(next!==undefined?{nextFlagged:next}:{}),page,pages,size:k,total:rows.length};
}
const entry=node=>Object.entries(node)[0];
const kids=(kind,v)=>kind==='patientPane'?[...v.children,...v.modal]:kind==='tabs'?v.body:v?.children??[];
export function infoComps(node) {
  const [kind,v]=entry(node);
  if(kind==='info') return [v.comp];
  if(kind==='rowAction') return [v.target,...v.children.flatMap(infoComps)];
  return kids(kind,v).flatMap(infoComps);
}
export const pageable=(comp,infoId)=>comp!==''&&infoId!=='searchResults'&&!comp.startsWith('workspace.');
export function eligibleIn(screen) {
  const counts=new Map();
  for(const c of [...screen.workspace,...screen.side,...(screen.modal?[screen.modal]:[]),...(screen.urgent??[])].flatMap(infoComps))
    counts.set(c,(counts.get(c)??0)+1);
  return (comp,infoId)=>pageable(comp,infoId)&&counts.get(comp)===1;
}
export const askedIn=screen=>comp=>(screen.pages??[]).find(([c])=>c===comp)?.[1]??0;
const paged=(cfg,eligible,comp,infoId,rows)=>eligible(comp,infoId)&&sizeOf(cfg,comp)<rows.length;
const never=()=>false;
const childKey=kind=>kind==='tabs'?'body':'children';
export function windowNode(cfg,eligible,asked,node) {
  const [kind,v]=entry(node);
  if(kind==='info') {
    if(!paged(cfg,eligible,v.comp,v.infoId,v.rows)) return node;
    const k=sizeOf(cfg,v.comp);
    return {info:{...v,rows:pageRows(v.rows,k,clampPage(v.rows.length,k,asked(v.comp)))}};
  }
  if(kind==='board') return {board:{...v,children:v.children.map(c=>windowNode(cfg,never,asked,c))}};
  if(kind==='patientPane') return {patientPane:{...v,children:v.children.map(c=>windowNode(cfg,never,asked,c)),
    modal:v.modal.map(c=>windowNode(cfg,never,asked,c))}};
  if(['datedTimeline','timeline','presentation','valueSet','chartReferences','rowAction','section','columns','tabs'].includes(kind))
    return {[kind]:{...v,[childKey(kind)]:v[childKey(kind)].map(c=>windowNode(cfg,eligible,asked,c))}};
  return node;
}
export function windowsOf(cfg,eligible,asked,node) {
  const [kind,v]=entry(node);
  if(kind==='info') return paged(cfg,eligible,v.comp,v.infoId,v.rows)?[windowOf(cfg,v.comp,v.rows,asked(v.comp))]:[];
  if(kind==='board'||kind==='patientPane') return kids(kind,v).flatMap(c=>windowsOf(cfg,never,asked,c));
  return kids(kind,v).flatMap(c=>windowsOf(cfg,eligible,asked,c));
}
/** Layout.Window.windowScreen: every pageable list of the workspace and side
 * cut to the page asked for, with the windows its display parts read. */
export function windowScreen(screen,cfg={}) {
  if(cfg.enabled===false) return screen;
  const eligible=eligibleIn(screen),asked=askedIn(screen);
  const ws=[...screen.workspace,...screen.side].flatMap(n=>windowsOf(cfg,eligible,asked,n));
  const result={...screen,workspace:screen.workspace.map(n=>windowNode(cfg,eligible,asked,n)),
    side:screen.side.map(n=>windowNode(cfg,eligible,asked,n))};
  if(ws.length) result.windows=ws;
  return result;
}
/** Layout.Window.windowOnce: a screen that already carries windows is kept. */
export const windowOnce=(screen,cfg={})=>screen.windows?screen:windowScreen(screen,cfg);
/** Layout.Window.askPage: the view state after the pager selects page `p`. */
export const askPage=(screen,comp,p)=>({...screen,pages:[[comp,p],...(screen.pages??[]).filter(([c])=>c!==comp)]});
