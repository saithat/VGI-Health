/** Read-only attribution of retained order-screen traces; no native replay. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadGeometry } from '../../agent/src/geometry.js';
import { measuredPointingTrace } from '../../app/src/dashboard/trajectory-travel.js';
import { pointerSteps } from '../../app/src/metrics/geometry.js';
import type { DayResult } from '../../agent/src/schema.js';
const [run,persona='P2',day='1']=process.argv.slice(2);
if(!run)throw Error('Usage: tsx scripts/measure-replay/order-scroll-diagnosis.mts RUN [PERSONA] [DAY]');
const result:DayResult=JSON.parse(await readFile(path.join(run,'days',`day-${day.padStart(2,'0')}`,`${persona}.json`),'utf8'));
if(!result.geometry)throw Error('No retained geometry');
const atlas=await loadGeometry(path.join(run,'geometry',`${result.geometry.programHash}.json`),result);
const {trace}=measuredPointingTrace(result.trace,atlas,result);
const clean=trace.filter(row=>!('scroll' in row.event));
const total=pointerSteps(trace,atlas,result.day),targetOnly=pointerSteps(clean,atlas,result.day);
const screens=new Set(trace.filter(row=>row.screen.endsWith('Orders')).map(row=>row.screen));
for(const screen of screens){
 const indices=trace.flatMap((row,i)=>row.screen===screen?[i]:[]);
 const forward=indices.reduce((n,i)=>n+('scroll' in trace[i].event?(total[i].scrollPx??0):0),0);
 const pixels=indices.reduce((n,i)=>n+(total[i].scrollPx??0),0);
 const counterfactual=clean.reduce((n,row,i)=>n+(row.screen===screen?(targetOnly[i].scrollPx??0):0),0);
 console.log(JSON.stringify({run,persona,day:result.day,screen,
  nativeScrolls:indices.filter(i=>'scroll' in trace[i].event).length,
  measuredScrolls:indices.reduce((n,i)=>n+total[i].scrolls,0),
  forwardPx:forward,revealPx:pixels-forward,totalPx:pixels,targetOnlyPx:counterfactual,excessPx:pixels-counterfactual}));
}
