import { scriptedClimb } from "./lean-fixture.js";
import { withData } from "./data.js";
import path from 'node:path';
import { readFile,readdir } from 'node:fs/promises';
import { fakeWorld,tmp } from './helpers.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { runDays } from '../src/run.js';
import { ScriptedLlm } from './scripted.js';
import { RunStore } from '../src/store.js';
import { rejectionKind,pickSeeded } from '../src/seeded.js';
import { fakeCanonical,fakeSpec } from '../src/fake/fixtures.js';
import { sumMetrics,pairedMetrics,saving } from '../src/observe.js';
import { writeJson } from '../src/util.js';
import { dayResultSchema,type CheckResult } from '../src/schema.js';
it('does not label an antibiotic review, other human-only element, or unrelated unit failure as a seeded target',()=>{
 const check:CheckResult={status:'fail',property:'reviewsBeforeCommit',message:'abxIndication is not shown on screen signing when signOrders is clicked',counterexample:[],screens:['signing'],verdict:null};
 expect(rejectionKind(check)).toBe(null);
 expect(pickSeeded('until-each-rejected',{rejected:new Set(),injected:0},fakeCanonical('v3'),fakeSpec('v3'),6)?.seededKind).toBe('allergyHidden');
 expect(rejectionKind({...check,message:'allergyList is not shown on screen signing'})).toBe('allergyHidden');
 expect(rejectionKind({...check,property:'humanOnlyKept',message:'field x on screen s prefills consent, which a human must enter every time'})).toBe(null);
 expect(rejectionKind({...check,property:'units',message:'field x on screen s fills drugDose from record value pounds, a bare number'})).toBe(null);
});
it('initial deployment infrastructure failure has a manifest status',async()=>{
 const ehr=createFakeEhr();ehr.deploy=async()=>{throw new Error('FAKE initial native I/O');};
 const runsRoot=await tmp('initial-infra');
 await expect(runDays({ ...scriptedClimb,days:1,runId:'initial',personas:['P1'],worldDir:await fakeWorld(1),runsRoot,llm:new ScriptedLlm(),ehr})).rejects.toThrow('failed after 3 attempts');
 expect(JSON.parse(await readFile(path.join(runsRoot,'initial/manifest.json'),'utf8')).status).toBe('infrastructure-error');
});
withData("runs/core-10day/decisions").it('a no-change designer has zero agent saving through both releases despite canonical drift, and staging is cleaned',async()=>{
 const world=await fakeWorld(3),runsRoot=await tmp('FAKE-no-agent-eight-days');
 const noChange={name:'scripted' as const,model:'FAKE-no-change',complete:async()=>({json:{hypothesis:'FAKE no change',decision:'noChange',candidates:[]},backend:'scripted' as const,model:'FAKE-no-change',servedBy:null,replayOf:null,promptMatched:null,usage:null})};
 const run=await runDays({ ...scriptedClimb,days:3,personas:['P1'],releaseDays:{v2:2,v3:3},worldDir:world,runsRoot,runId:'control',llm:noChange,seedPolicy:'none'}),store=new RunStore(run.dir);
 for(const persona of ['P1'])for(const day of [2,3]){
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
