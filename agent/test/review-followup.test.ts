import { withData } from "./data.js";
import path from 'node:path';
import {readFile,readdir} from 'node:fs/promises';
import {fakeWorld,tmp} from './helpers.js';
import {createFakeEhr} from '../src/fake/ehr-fake.js';
import {createScreenChecker} from '../src/screencheck.js';
import {runDays} from '../src/run.js';
import {ScriptedLlm} from './scripted.js';
import {RunStore} from '../src/store.js';
import {rejectionKind,pickSeeded} from '../src/seeded.js';
import {fakeCanonical,fakeSpec} from '../src/fake/fixtures.js';
import {sumMetrics,pairedMetrics,saving} from '../src/observe.js';
import {writeJson} from '../src/util.js';
import {dayResultSchema,type CheckResult} from '../src/schema.js';
it('does not label an antibiotic review, other human-only element, or unrelated unit failure as a seeded target',()=>{
 const check:CheckResult={status:'fail',property:'reviewsBeforeCommit',message:'abxIndication is not shown on screen signing when signOrders is clicked',counterexample:[],screens:['signing'],verdict:null};
 expect(rejectionKind(check)).toBe(null);
 expect(pickSeeded('until-each-rejected',{rejected:new Set(),injected:0},fakeCanonical('v3'),fakeSpec('v3'),6)?.seededKind).toBe('allergyHidden');
 expect(rejectionKind({...check,message:'allergyList is not shown on screen signing'})).toBe('allergyHidden');
 expect(rejectionKind({...check,property:'humanOnlyKept',message:'field x on screen s prefills consent, which a human must enter every time'})).toBe(null);
 expect(rejectionKind({...check,property:'units',message:'field x on screen s fills drugDose from record value pounds, a bare number'})).toBe(null);
});
withData("runs/run1-P3/decisions").describe("archive-backed fault prompts", () => {
it.each(['screen-check','native-deploy','publication'])('records %s infrastructure separately and never marks the run completed',async(stage)=>{
 const ehr=createFakeEhr(), screens=createScreenChecker(ehr), deploy=ehr.deploy;
 const simulate=ehr.simulate;ehr.simulate=async input=>{const result=await simulate(input);return {...result,tasks:result.tasks.map(t=>({...t,clicks:input.program.version>0?1:2,scrolls:0,scrollPx:0,mouseTravelPx:100}))};};
 if(stage==='screen-check'){const check=screens.check.bind(screens);screens.check=async i=>{if(i.program.version>0)throw new Error('FAKE browser startup');return check(i);};}
 if(stage==='native-deploy')ehr.deploy=async i=>{if(i.program.version>0)throw new Error('FAKE native deploy I/O');return deploy(i);};
 const original=RunStore.prototype.deploy;
 const spy=stage==='publication'?vi.spyOn(RunStore.prototype,'deploy').mockImplementation(async function(this:RunStore,...args:Parameters<RunStore['deploy']>){if(args[1].version>0)throw new Error('FAKE store I/O');return original.apply(this,args);}):null;
 try{
 const run=await runDays({days:2,personas:['P1'],worldDir:await fakeWorld(2),runsRoot:await tmp('infra'),llm:new ScriptedLlm(),ehr,screens,releaseDays:{v2:99,v3:99}});
 const record=await new RunStore(run.dir).readDecision(1,'P1');
 expect(record.outcome).toBe(stage==='screen-check'?'error':'infrastructure-error');
 expect(record.screenCheck?.status).toBe(stage==='screen-check'?'error':'pass');
 expect(record.flags.some(f=>f.includes(`[${stage}]`))).toBe(true);
 expect(run.rejections.every(r=>r.property!=='ScreenCheck')).toBe(true);
 expect(JSON.parse(await readFile(path.join(run.dir,'manifest.json'),'utf8')).status).toBe('infrastructure-error');
 }finally{spy?.mockRestore();}
});
});

it('initial deployment infrastructure failure has a manifest status',async()=>{
 const ehr=createFakeEhr();ehr.deploy=async()=>{throw new Error('FAKE initial native I/O');};
 const runsRoot=await tmp('initial-infra');
 await expect(runDays({days:1,runId:'initial',personas:['P1'],worldDir:await fakeWorld(1),runsRoot,llm:new ScriptedLlm(),ehr})).rejects.toThrow('day-1');
 expect(JSON.parse(await readFile(path.join(runsRoot,'initial/manifest.json'),'utf8')).status).toBe('infrastructure-error');
});
withData("runs/run1-P3/decisions").it('a no-change designer has zero agent saving through both releases despite canonical drift, and staging is cleaned',async()=>{
 const world=await fakeWorld(8),runsRoot=await tmp('FAKE-no-agent-eight-days');
 const noChange={name:'scripted' as const,model:'FAKE-no-change',complete:async()=>({json:{hypothesis:'FAKE no change',decision:'noChange',candidates:[]},backend:'scripted' as const,model:'FAKE-no-change',servedBy:null,replayOf:null,promptMatched:null,usage:null})};
 const run=await runDays({days:8,worldDir:world,runsRoot,runId:'control',llm:noChange,seedPolicy:'none'}),store=new RunStore(run.dir);
 for(const persona of ['P1','P2','P3','P4','P5'])for(const day of [2,4,6,8]){
  const actual=dayResultSchema.parse(JSON.parse(await readFile(store.dayPath(day,persona),'utf8')));
  const control=dayResultSchema.parse(JSON.parse(await readFile(path.join(run.dir,'no-agent/days',`day-${String(day).padStart(2,'0')}`,`${persona}.json`),'utf8')));
  expect(sumMetrics(control.tasks)).toEqual(sumMetrics(actual.tasks));
  const pair=pairedMetrics(control,actual);expect(saving(pair.before,pair.after).klmDeciSec).toBe(0);
 }
 const current=await store.login('P1'), next={...current.program,version:current.program.version+1};
 await store.deploy('P1',next,current.certificate,undefined,99);
 expect((await readdir(path.join(run.dir,'programs/P1')))).toContain(`v${next.version}.json`);
 await store.recover('P1',true);
 expect((await readdir(path.join(run.dir,'programs/P1')))).not.toContain(`v${next.version}.json`);
 expect((await store.login('P1')).program.version).toBe(current.program.version);
 await writeJson(path.join(run.dir,'programs/P1',`v${next.version}.source.json`),next);
 await store.recover('P1',true);
 expect((await readdir(path.join(run.dir,'programs/P1')))).not.toContain(`v${next.version}.source.json`);
},30000);
