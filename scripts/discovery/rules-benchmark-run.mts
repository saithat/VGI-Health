#!/usr/bin/env node
/** Full Lean screen gate with rule expansion, real family admission and fallback diagnostics. */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import {LeanScreenChecker} from '../../agent/src/lean-screencheck.ts';
import {createFakeEhr} from '../../agent/src/fake/ehr-fake.ts';
import {fakeCanonical} from '../../agent/src/fake/fixtures.ts';
import {layoutDesignSchema,withDesign} from '../../agent/src/layout-design.ts';
const button=(comp,role='secondary')=>({button:{comp,label:comp,role,enabled:true,blockedReason:null,hotkey:null}});
const ui={screen:'s',banner:[['Patient','Synthetic benchmark']],title:'Review',nav:[],workspace:[{section:{id:'group',title:'Group',children:[button('a'),button('b')]}},button('c'),button('sign','primary')],side:[],modal:null};
const variants=[
 {kind:'firstViewport',target:{id:'c'}},
 {kind:'columns',target:{id:'group'},count:2,tracks:[2,1]},
 {kind:'order',targets:[{id:'b'},{id:'a'}]},
 {kind:'beside',target:{id:'c'},anchor:{id:'group'}},
 {kind:'region',target:{id:'c'},region:'side'},
 {kind:'pin',target:{id:'c'}},
 {kind:'firstViewport',target:{id:'missing'}},
 {kind:'columns',target:{id:'group'},count:100},
];
const out=resolve(process.argv[2]??'runs/layout-rules-benchmark');
const checker=new LeanScreenChecker(createFakeEhr(),{states:async()=>[{screen:'s',ui,state:'s'}],limits:async()=>({}),artifactsDir:join(out,'gate')});
const started=performance.now(),candidates=[],refusalsByRule={};
for(const rule of variants){
 const program=withDesign(structuredClone(fakeCanonical('v1')),layoutDesignSchema.parse([{screen:'s',rules:[rule]}]));
 const verdict=await checker.check({program,specVersion:'v1'});
 const findings=JSON.parse(verdict.message).findings??[];
 const rules=[...new Set(findings.flatMap(f=>f.findings.map(x=>x.rule)))];
 if(verdict.status==='fail')for(const r of rules)refusalsByRule[r]=(refusalsByRule[r]??0)+1;
 candidates.push({rule,accepted:verdict.status==='pass',status:verdict.status,rules});
}
const elapsedMs=performance.now()-started;
const report={scope:'Eight synthetic candidates, one shape, all three viewports, full screen gate including program-check, transform, family-check, paint, refusal fallback and artifacts. Clinical checker and semantic states are fake; G1–G11 executable is real. Wall throughput is local, not clinician time.',candidates,elapsedMs,candidatesPerSecond:variants.length/(elapsedMs/1000),refusalsByRule};
await mkdir(out,{recursive:true});await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
