// Structural mirror of Layout.Widgets: roles/counts only. Lean supplies all
// displayed strings and numeric mark geometry; this module never plots data.
// New specification for owner review: an alert carries its plot in its own
// occurrence; severity icons reserve no widget leaf or placement row.
export const numeric=s=>/^-?\d+(?:\.\d{1,6})?$/.test((s??'').replace(/^[\t\n\v\f\r ]+|[\t\n\v\f\r ]+$/g,''));
const cell=(r,k)=>r.find(([key])=>key===k)?.[1]??'';
export const widgetRows=nodes=>nodes.flatMap(n=>{const [k,v]=Object.entries(n)[0];return k==='info'?v.rows:widgetRows(k==='tabs'?v.body:k==='patientPane'?v.children:v.children??[]);});
export const timeColumn=k=>(k.length>=16&&['T',' '].includes(k[10])) || (k.length>=5&&k[2]===':');
export const dated=s=>{
  const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(s);
  if(!m)return false;
  const [year,month,day,hour,minute,second]=m.slice(1,7).map(Number),zone=m[8];
  const leap=year%400===0||(year%4===0&&year%100!==0),days=month===2?(leap?29:28):[4,6,9,11].includes(month)?30:31;
  if(year<1||month<1||month>12||day<1||day>days||hour>=24||minute>=60||second>=60)return false;
  if(zone==='Z')return true;
  const zh=Number(zone.slice(1,3)),zm=Number(zone.slice(4));
  return zh<=14&&zm<60&&(zh!==14||zm===0)&&zone!=='-00:00';
};
const item=(widget,row=0,col=0)=>({role:'item',widget,row,col});
export function widgetParts(kind,children,refs=[]) {
  const rows=widgetRows(children);
  if(kind==='timeGrid') {
    const columns=[...new Set(rows.flatMap(r=>r.map(([k])=>k)).filter(timeColumn))];
    return [item('gridCorner'),...columns.map((_,i)=>item('gridHour',0,i+1)),
      ...rows.flatMap((_,r)=>[item('gridMedication',r+1),...columns.map((_,c)=>item('gridCell',r+1,c+1))])];
  }
  if(['notes','folderList'].includes(kind))return rows.map((_,r)=>item(kind==='notes'?'noteCard':'folderCard',r));
  const series=n=>[item('plotTitle'),item('plotYHigh'),item('plotYLow'),item('plotXLow'),item('plotXHigh'),item('plot'),...Array.from({length:n},(_,i)=>item('plotLabel',i))];
  if(kind==='growth')return [['Weight','kg','Weight (kg)'],['Height','cm','Height (cm)'],['Head circumference','cm','Head circumference (cm)'],['BMI','kg/m²','BMI (kg/m²)']].flatMap(([name,unit,key])=>{
    const n=rows.filter(r=>numeric(cell(r,'Age (months)'))&&numeric(cell(r,key))).length;
    return n||refs.some(r=>r.measure===name&&r.unit===unit&&r.points.length)?series(n):[];
  });
  if(kind==='trend')return [...new Set(rows.map(r=>JSON.stringify([cell(r,'Test')||cell(r,'Measure'),cell(r,'Unit')])))].flatMap(group=>{
    const [name,unit]=JSON.parse(group),n=rows.filter(r=>(cell(r,'Test')===name||cell(r,'Measure')===name)&&cell(r,'Unit')===unit&&numeric(cell(r,'Value'))&&dated(cell(r,'Recorded')||cell(r,'Date'))).length;
    return n?series(n):[];
  });
  return [];
}
/** Dedicated rich placement, kept separate from info/table/rowAction paging. */
export function placeWidgetParts(leaves,hint,add,x,y,w) {
  const widgets=leaves.filter(l=>hint(l).widget);
  if(!widgets.length)return null;
  let bottom=y;
  const grid=widgets.filter(l=>hint(l).widget.startsWith('grid'));
  if(grid.length) {
    const n=Math.max(...grid.map(l=>hint(l).col)),mw=Math.min(240,Math.floor(w*.3)),cw=Math.floor((w-mw-4)/Math.max(1,n));
    // Many hours wrap into blocks rather than create horizontal page overflow.
    const per=Math.max(1,Math.floor((w-mw-4)/84)),blocks=Math.max(1,Math.ceil(n/per)),rows=Math.max(...grid.map(l=>hint(l).row));
    for(const l of grid){const h=hint(l),block=h.col?Math.floor((h.col-1)/per):0,c=h.col?(h.col-1)%per:0;
      const yy=y+block*((rows+1)*56+12)+h.row*56;
      add(l,h.col?x+mw+4+c*Math.max(84,cw):x,yy,h.col?Math.min(Math.max(84,cw),Math.floor((w-mw-4)/Math.min(per,n))):mw,52,{bg:h.row===0?'slate-100':'white'});
    }
    bottom=y+blocks*((rows+1)*56+12);
  } else for(let i=0;i<widgets.length;i++){
    const l=widgets[i],k=hint(l).widget;
    if(k==='plotTitle') {
      const [high,low,left,right,canvas]=widgets.slice(i+1,i+6);
      add(l,x,bottom,w,20,{bg:'slate-100'});
      add(high,x,bottom+26,72,20);add(low,x,bottom+246,72,20);
      add(canvas,x+80,bottom+26,w-80,240);
      const half=Math.floor((w-84)/2);
      add(left,x+80,bottom+272,half,40);add(right,x+84+half,bottom+272,half,40);
      bottom+=318;i+=5;continue;
    }
    const height=k==='timeAxis'?72:k==='noteCard'?144:k==='folderCard'?52:20;
    add(l,x,bottom,w,height,{bg:['noteCard','folderCard'].includes(k)?'slate-100':'white'});bottom+=height+6;
  }
  for(const l of leaves.filter(l=>!hint(l).widget)){add(l,x,bottom,w,20);bottom+=24;}
  return bottom;
}
