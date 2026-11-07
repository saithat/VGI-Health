import { useState, type CSSProperties, type WheelEvent, type UIEvent } from 'react';
import type { Drawn } from './schema';
const px = (n:number)=>n/64;
const rgb = (c:{r:number;g:number;b:number})=>`rgb(${c.r},${c.g},${c.b})`;
const weights=[400,600,650,700,750,800,400,400];
// Explicit run policy: logical run order, isolated Hebrew runs read RTL.
// Complex joining/combining scripts have already become measured ASCII escapes.
function lineRuns(line:string,widths:number[]) {
  const runs:{rtl:boolean,cells:{ch:string,width:number}[]}[]=[];
  for(const [i,ch] of Array.from(line).entries()) {
    const last=runs.at(-1);
    const rtl=/[\u05d0-\u05ea\u05ef-\u05f4]/u.test(ch)||(ch===' '&&last?.rtl===true);
    if(!last||last.rtl!==rtl) runs.push({rtl,cells:[]});
    runs.at(-1)?.cells.push({ch,width:widths[i]??0});
  }
  return runs;
}
function Shape({drawn}:{drawn:Drawn}) {
  const {mark}=drawn.box.info;
  const {w,h}=drawn.box.rect;
  if(mark==='rect') return null;
  const common={fill:rgb(drawn.box.style.fg)};
  if(mark==='circle') return <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><ellipse cx={w/2} cy={h/2} rx={w/2} ry={h/2} {...common}/></svg>;
  if('polyline' in mark) return <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={mark.polyline.points.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke={rgb(drawn.box.style.fg)} strokeWidth={mark.polyline.stroke}/></svg>;
  const {startNum,sweepNum,denominator}=mark.wedge;
  if(denominator<=0) return null;
  if(sweepNum>=denominator) return <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><ellipse cx={w/2} cy={h/2} rx={w/2} ry={h/2} {...common}/></svg>;
  // Trigonometry is only paint tessellation; the checked footprint is the integer box.
  const a=2*Math.PI*startNum/denominator,b=2*Math.PI*(startNum+sweepNum)/denominator;
  const x1=w/2+w/2*Math.cos(a),y1=h/2+h/2*Math.sin(a),x2=w/2+w/2*Math.cos(b),y2=h/2+h/2*Math.sin(b);
  return <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><path d={`M ${w/2} ${h/2} L ${x1} ${y1} A ${w/2} ${h/2} 0 ${2*sweepNum>denominator?1:0} 1 ${x2} ${y2} Z`} {...common}/></svg>;
}
export function Painter({boxes}:{boxes:Drawn[]}) {
  const [offsets,setOffsets]=useState<Record<string,number>>({});
  const blocked=boxes.some(d=>d.box.info.interruptive);
  const scrollBy=(event:WheelEvent,id:string)=>{
    if(event.ctrlKey) return;
    const element=document.getElementById(`scroll-${id}`);
    if(element) {element.scrollTop+=event.deltaY;event.preventDefault();}
  };
  return <>{boxes.map(drawn=>{
    const {box,lines}=drawn;
    const {rect,style,info}=box;
    const t=info.text;
    const displacement=box.clips.reduce((total,[id])=>total+(offsets[id]??0),0);
    const y=rect.y/64-displacement;
    // Clip each independent mark to all ancestor viewports. These are only
    // translations/intersections of Lean boxes; no browser layout is measured.
    let left=0,top=0,right=0,bottom=0;
    for(const [i,[,clip]] of box.clips.entries()) {
      const outer=box.clips.slice(i+1).reduce((sum,[id])=>sum+(offsets[id]??0),0);
      left=Math.max(left,(clip.x-rect.x)/64);
      right=Math.max(right,(rect.x+rect.w-clip.x-clip.w)/64);
      top=Math.max(top,clip.y/64-outer-y);
      bottom=Math.max(bottom,y+rect.h/64-(clip.y+clip.h)/64+outer);
    }
    const css:CSSProperties={position:'absolute',left:px(rect.x),top:y,width:px(rect.w),height:px(rect.h),zIndex:style.z,boxSizing:'border-box',padding:0,margin:0,border:0,borderRadius:px(style.radius),background:info.paint?rgb(style.bg):'transparent',color:rgb(style.fg),textAlign:'left',overflowX:box.scroll?'hidden':'visible',overflowY:box.scroll?'auto':'visible',fontFamily:t?.font===6?'VGI Noto Sans Mono':t?.font===7?'VGI Noto Symbols':'VGI World Sans, VGI Noto CJK, VGI Noto Hebrew',fontSize:t?px(t.fontSize):undefined,fontWeight:t?weights[t.font]:400,lineHeight:t?`${px(t.lineHeight)}px`:undefined,clipPath:`inset(${top}px ${right}px ${bottom}px ${left}px)`,pointerEvents:info.paint||box.scroll?'auto':'none'};
    const contentHeight=Math.max(rect.h/64,...boxes.filter(d=>d.box.clips[0]?.[0]===info.id).map(d=>(d.box.rect.y+d.box.rect.h-rect.y)/64));
    const children=<>
      {info.paint&&<Shape drawn={drawn}/>}
      {box.scroll&&<div style={{position:'absolute',width:1,height:contentHeight,pointerEvents:'none'}}/>}
      {info.paint&&lines.length>0&&<div className="lean-lines" style={{background:rgb(style.bg),position:'absolute',inset:0,overflowY:t?.overflow==='scroll'?'auto':'visible',overflowX:'hidden'}}>
        {lines.map((line,i)=><span key={i} data-line={i} style={{position:'absolute',left:0,top:t?px(i*t.lineHeight):0,whiteSpace:'pre',direction:'ltr',unicodeBidi:'isolate'}}>{lineRuns(line,drawn.glyphWidths[i]??[]).map((run,j)=><span key={j} data-run={run.rtl?'rtl':'ltr'} style={{display:'inline-flex',flexDirection:run.rtl?'row-reverse':'row',direction:'ltr',unicodeBidi:'isolate'}}>{run.cells.map((cell,k)=><span key={k} data-glyph style={{display:'inline-block',width:px(cell.width),flexShrink:0}}>{cell.ch}</span>)}</span>)}</span>)}
      </div>}
    </>;
    const props={id:`scroll-${info.id}`,'data-box':info.id,'data-scroll':box.scroll?'true':undefined,'data-source':info.source?.join('.'),role:info.role||undefined,style:css,'aria-label':drawn.original??info.id,'aria-modal':info.role==='dialog'?true:undefined,onScroll:box.scroll?(event:UIEvent<HTMLElement>)=>{const amount=Math.round(event.currentTarget.scrollTop*64)/64;setOffsets(old=>({...old,[info.id]:amount}));}:undefined,onWheel:box.clips[0]&&t?.overflow!=='scroll'?(event:WheelEvent)=>{const id=box.clips[0]?.[0];if(id)scrollBy(event,id);}:undefined};
    if(info.target) return <button key={info.id} {...props} disabled={blocked&&!info.interruptive}>{children}</button>;
    return <div key={info.id} {...props}>{children}</div>;
  })}</>;
}
