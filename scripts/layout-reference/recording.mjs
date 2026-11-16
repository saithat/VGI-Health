// Native event pre-state snapshots. Cache independently of layout geometry so
// comparing generators never requires changing or re-simulating a recording.
import {spawn,execFile} from 'node:child_process';
import {promisify,isDeepStrictEqual} from 'node:util';
import {createInterface} from 'node:readline';
import {createReadStream,createWriteStream,existsSync,mkdirSync,readFileSync,renameSync} from 'node:fs';
import {createGzip,createGunzip} from 'node:zlib';
import {pipeline} from 'node:stream/promises';
import {once} from 'node:events';
import {createHash,randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {read,write} from './cli.mjs';
import {digest} from './admission.mjs';
const exec=promisify(execFile);
export class NativeSession {
  constructor(binary) {
    this.child=spawn(binary,['serve'],{stdio:['pipe','pipe','pipe'],env:{...process.env,LEAN_NUM_THREADS:'2'}});this.pending=[];this.id=0;this.stderr='';
    this.child.stderr.on('data',b=>{this.stderr+=b;});
    this.child.stdin.on('error',error=>{for(const p of this.pending.splice(0))p.reject(error);});
    createInterface({input:this.child.stdout}).on('line',line=>{
      const pending=this.pending.shift();if(!pending)return;
      try {const row=JSON.parse(line);if(row.id!==pending.id||row.error)throw Error(row.error??'Wrong native response id');pending.resolve(row.result);}catch(e){pending.reject(e);}
    });
    this.child.on('error',error=>{for(const p of this.pending.splice(0))p.reject(error);});
    this.child.on('close',code=>{for(const p of this.pending.splice(0))p.reject(Error(`Native closed: ${code}: ${this.stderr}`));});
  }
  call(op,input) {return new Promise((resolve,reject)=>{const id=this.id++;this.pending.push({id,resolve,reject});this.child.stdin.write(JSON.stringify({id,op,input})+'\n');});}
  close() {this.child.stdin.end();}
}
function resources(bundle) {return bundle.entry.map(e=>({...e.resource,...(!e.resource.id&&e.fullUrl?.startsWith('urn:uuid:')?{id:e.fullUrl.slice(9)}:{})}));}
function merge(a,b) {const map=new Map(a.map(r=>[`${r.resourceType}/${r.id}`,r]));for(const r of b)map.set(`${r.resourceType}/${r.id}`,r);return [...map.values()];}
function taskBundles(root,schedule) {
  const fixtures=read(join(root,'fixtures/synthea/index.json')),bundles=new Map(),extras=new Map(),result=new Map();
  for(const task of schedule.tasks) {
    const file=fixtures.patients.find(p=>p.id===task.patientId)?.file;if(!file)throw Error(`Missing patient ${task.patientId}`);
    if(!bundles.has(file))bundles.set(file,resources(read(join(root,'fixtures/synthea',file))));
    const today=merge(extras.get(task.patientId)??[],task.todayResources??[]);extras.set(task.patientId,today);
    result.set(task.id,{resourceType:'Bundle',entry:merge(bundles.get(file),today).map(resource=>({resource}))});
  }
  return result;
}
async function* nativeRecords(o) {
  const {root,out,runName,folder,persona,recorded,program,spec,schedule,inputs,world,scheduleFile,specFile,programFile,dayFile,binary,verbose}=o;
  mkdirSync(join(out,'contexts'),{recursive:true});
  const contextFile=join(out,'contexts',`${runName}-${folder}-${persona}-${digest(inputs)}.json`);
  if(!existsSync(contextFile))await exec('lean',['-j2','--run',join(root,'scripts/trajectories/Contexts.lean'),root,world,scheduleFile,specFile,programFile,dayFile,contextFile],
    {cwd:root,timeout:180000,maxBuffer:4*1024*1024,env:{...process.env,LEAN_NUM_THREADS:'2',LEAN_STACK_SIZE_KB:'65536',LEAN_PATH:join(root,'lean/.lake/build/lib/lean')}});
  const contexts=read(contextFile),sourceBundles=taskBundles(root,schedule),session=new NativeSession(binary);
  try {
    for(const context of contexts) {
      if(verbose)console.log(`${runName}/${folder}/${persona}/${context.id}`);
      yield {kind:'context',task:context.id,mismatch:context.nativeMismatch?{task:context.id,native:context.nativeMismatch}:null};
      const trace=recorded.trace.filter(e=>e.task===context.id),task=schedule.tasks.find(t=>t.id===context.id);
      const projected=await session.call('facts',{bundle:sourceBundles.get(context.id),context:{today:schedule.sourceDates?.find(([n])=>n===schedule.day)?.[1]??`2026-11-${String(2+Math.floor((schedule.day-1)/5)*7+(schedule.day-1)%5).padStart(2,'0')}`,now:task.startMin,record:[],receipts:[]}});
      for(const segment of context.segments) {
        let state=segment.initialState;
        const base={spec,program,facts:segment.facts,user:{id:program.owner,role:program.role}};
        for(let index=segment.start;index<segment.end;index++) {
          const ev=trace[index];
          if(state.patientContext?.patient&&state.patientContext.bound!==state.patientContext.patient)
            state=(await session.call('step',{...base,state,event:{scroll:{screen:state.screen}}})).state;
          const startMin=Math.floor((recorded.workload?.timings?.find(t=>t.task===context.id)?.startMs??task.startMin*60000)/60000);
          state={...state,clock:Math.max(0,Math.floor(ev.t-startMin*600))};
          const screen=await session.call('render-ui',{...base,display:projected.display,state});
          const next=await session.call('step',{...base,state,event:ev.event});
          const mismatch=state.screen!==ev.screen||!isDeepStrictEqual(next.result,ev.result)?{task:context.id,index,expectedScreen:ev.screen,actualScreen:state.screen,expectedResult:ev.result,actualResult:next.result}:null;
          yield {kind:'screen',ev,screen,stateKey:digest({state,facts:segment.facts}),mismatch};
          state=next.state;
        }
      }
    }
  } finally {session.close();}
}
async function fileDigest(path) {const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
export async function* screenRecords(options) {
  const directory=join(options.out,'native-screens');mkdirSync(directory,{recursive:true});
  const key=digest({inputs:options.inputs,adapter:digest(readFileSync(new URL('./recording.mjs',import.meta.url)))});
  const file=join(directory,`${key}.jsonl.gz`),receiptFile=join(directory,`${key}.json`);
  if(existsSync(file)&&existsSync(receiptFile)) {
    const receipt=read(receiptFile);
    if(receipt.key!==key||receipt.sha256!==await fileDigest(file))throw Error('Corrupt native screen snapshot cache');
    const stream=createReadStream(file).pipe(createGunzip());let count=0;
    for await(const line of createInterface({input:stream,crlfDelay:Infinity})) {count++;yield JSON.parse(line);}
    if(count!==receipt.records)throw Error('Incomplete native screen snapshot cache');
    return;
  }
  const temp=`${file}.${randomUUID()}.tmp`,gzip=createGzip(),completed=pipeline(gzip,createWriteStream(temp));let count=0;
  // Attach rejection handling before awaiting native requests, preserving the
  // original error while preventing an unhandled stream rejection.
  completed.catch(()=>{});
  try {
    for await(const record of nativeRecords(options)) {
      count++;if(!gzip.write(JSON.stringify(record)+'\n'))await once(gzip,'drain');yield record;
    }
    gzip.end();await completed;renameSync(temp,file);
    write(receiptFile,{key,records:count,sha256:await fileDigest(file)});
  } catch(error) {gzip.destroy(error);throw error;}
}
