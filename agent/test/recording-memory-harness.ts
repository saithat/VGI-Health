/** Manual, model-free day/night stress harness. Output and snapshots are never
 * fixtures. Use a disk-backed TMPDIR and node --expose-gc --max-old-space-size=1024. */
import { parseArgs } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { writeHeapSnapshot } from 'node:v8';
import { runDays } from '../src/run.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { writeFakeWorld } from '../src/fake/world.js';
import { geometryProgramHash, type GeometryProvider } from '../src/geometry.js';
import { ReplayLlm } from '../src/backends/replay.js';
import { ScriptedLlm } from './scripted.js';
import { fakeLeanStates } from './lean-fixture.js';

const {values}=parseArgs({options:{
  out:{type:'string'},mode:{type:'string',default:'lean'},days:{type:'string',default:'8'},
  states:{type:'string',default:'200'},snapshots:{type:'boolean',default:false},'replay-from':{type:'string'},
}});
if(!values.out||!process.env['TMPDIR']||!global.gc)throw Error('Specify --out and TMPDIR; run node with --expose-gc');
if(values.mode!=='lean'&&values.mode!=='browser')throw Error('--mode must be lean or browser');
const mode=values.mode,out=path.resolve(values.out),days=Number(values.days),states=Number(values.states);
if(!Number.isSafeInteger(days)||days<2||!Number.isSafeInteger(states)||states<1)throw Error('Invalid days/states');
await mkdir(out,{recursive:true});
const world=await writeFakeWorld(path.join(out,'world'),{days,seed:7,personas:['P1']});
const geometry:GeometryProvider=async input=>({
  schemaVersion:1,programHash:geometryProgramHash(input.program),appSha256:'FAKE-STRESS',source:'recorded-fixture',viewport:{width:1440,height:900},
  states:Array.from({length:states},(_,i)=>{
    const screen=input.program.screens[i%input.program.screens.length];if(!screen)throw Error('Missing screen');
    return {screen:screen.id,state:`day-${input.schedule?.day}-state-${i}`,viewport:{width:1440,height:900},scrollers:{},
      components:Object.fromEntries(screen.components.map((component,j)=>[component.id,{
        center:{x:100+j*20,y:100+i%10},reveal:{x:100+j*20,y:100+i%10},chain:[],offsets:{},
      }]))};
  }),
});
const script=new ScriptedLlm();
const llm=values['replay-from']?new ReplayLlm(path.resolve(values['replay-from'])):{
  name:script.name,model:script.model,
  async complete(request:Parameters<ScriptedLlm['complete']>[0]){
    try{return await script.complete(request);}finally{script.prompts.length=0;}
  },
};
function disk(directory:string){
  let bytes=0,files=0,maxFileBytes=0;
  const walk=(root:string)=>{
    let entries;try{entries=readdirSync(root,{withFileTypes:true});}catch{return;}
    for(const entry of entries){const file=path.join(root,entry.name);if(entry.isDirectory())walk(file);else{
      const size=statSync(file).size;bytes+=size;files++;maxFileBytes=Math.max(maxFileBytes,size);
    }}
  };walk(directory);return {bytes,files,maxFileBytes};
}
const rows:unknown[]=[],runDirectory=path.join(out,'run');let started=performance.now();
await runDays({days,screenMode:mode,personas:['P1'],worldDir:world,runsRoot:out,runId:'run',ehr:createFakeEhr(),llm,
  ...(mode==='lean'?{leanOptions:{states:async input=>{
    const base=await fakeLeanStates(input);
    if(!input.result)return base;
    return Array.from({length:Math.max(states,input.result.trace.length)},(_,i)=>{
      const event=input.result?.trace[i],state=base.find(s=>s.screen===event?.screen)??base[i%base.length];
      if(!state)throw Error('Missing semantic fixture');
      return {...state,state:`trace-${i}`,...(event?{eventIndex:i}:{})};
    });
  },limits:async()=>({})}}:{geometry}),
  structurePolicy:false,releaseDays:{v2:99,v3:99},seedPolicy:'none',
  log(line){
    const match=/^(day|night) (\d+) P1:/.exec(line);if(!match)return;
    global.gc?.();global.gc?.();
    const row={phase:match[1],day:Number(match[2]),elapsedMs:performance.now()-started,memory:process.memoryUsage(),
      geometry:disk(path.join(runDirectory,'geometry')),reports:disk(path.join(runDirectory,'reports'))};
    rows.push(row);process.stdout.write(JSON.stringify(row)+'\n');
    if(values.snapshots&&match[1]==='day'&&[1,days].includes(Number(match[2])))writeHeapSnapshot(path.join(out,`day-${match[2]}.heapsnapshot`));
    started=performance.now();
  },
});
await writeFile(path.join(out,'memory.json'),JSON.stringify(rows,null,2)+'\n');
