import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
const root=resolve('.');
function json(path){return JSON.parse(readFileSync(join(root,path),'utf8'));}
function call(binary,args,input){
  const p=spawnSync(join(root,'lean/.lake/build/bin',binary),args,{input:JSON.stringify(input)+'\n',encoding:'utf8',maxBuffer:64*1024*1024});
  assert.equal(p.status,0,p.stderr||p.stdout);const out=JSON.parse(p.stdout);assert.equal(out.error,undefined,out.error);return out;
}
const request=input=>call('ui-layout',[],input);
const canonicalRoots=['releases/v1','releases/v2','releases/v3','programs/benchmarks/releases/v1','programs/benchmarks/releases/v1.1','programs/benchmarks/releases/v2'];
test('program checker accepts all six canonical typed programs for the fixed-shell compiler',()=>{
  for(const dir of canonicalRoots){const out=request({op:'program-check',spec:json(dir+'/spec.json'),program:json(dir+'/canonical.json')});assert.equal(out.accepted,true,dir);assert.equal(out.theorem,'Ehr.Layout.Range.checkProgram_sound');}
});
test('certificate runtime paints actual native renders without per-patient admission',()=>{
  const spec=json('releases/v1/spec.json'),program=json('releases/v1/personas/P1.json');
  const filename=readdirSync(join(root,'fixtures/synthea')).filter(p=>p.endsWith('.json')&&p!=='index.json').sort()[0];
  assert.ok(filename,'local synthetic FHIR fixture is required');
  const {facts,display}=call('ehr',['facts'],{bundle:json('fixtures/synthea/'+filename),context:{today:'2026-10-31',now:0,receipts:[],record:[]}});
  const user={id:program.owner,role:program.role};
  const initial=call('ehr',['init'],{spec,program,facts,user});
  const selected={...initial,screen:'w1Sign',patientContext:{patient:facts.sourcePatientId,bound:facts.sourcePatientId,activity:'orders',target:'w1Sign',query:''}};
  const alert={...spec.alerts[0],id:'class-test-modal',tier:'interruptive'};
  const modalSpec={...spec,alerts:[...spec.alerts,alert]};
  for(const [sp,state] of [[spec,initial],[spec,selected],[modalSpec,{...selected,popup:[alert.id,'test-key']}],[spec,{...initial,screen:'unreachable-screen'}]]) {
    const render={spec:sp,program,facts,display,user,state};
    const screen=call('ehr',['render-ui'],render);
    const certificate=request({op:'program-check',spec:sp,program});assert.equal(certificate.accepted,true);
    for(const viewport of [{w:92160,h:57600},{w:81920,h:51200},{w:122880,h:69120}]) {
      const fast=request({op:'program-paint',render,viewport});
      const checked=request({op:'structural-paint',screen,viewport});
      assert.equal(fast.accepted,true);assert.equal(checked.accepted,true);
      assert.deepEqual(fast.boxes,checked.boxes);
      assert.equal(fast.rangeTheorem,'Ehr.Layout.Range.layoutAccepted_program');
    }
    if(state===selected) assert.equal(screen.workspace.some(node=>JSON.stringify(node).includes('primary')),true);
    if(sp===modalSpec) assert.notEqual(screen.modal,null);
  }
});
test('layout certificate does not turn a clinical rejection into acceptance',()=>{
  const spec=json('releases/v1/spec.json'),program=json('programs/bad/05-self-cosign.json');
  assert.equal(request({op:'program-check',spec,program}).accepted,true);
  const p=spawnSync(join(root,'lean/.lake/build/bin/ehr'),['check','--spec','releases/v1/spec.json','--program','programs/bad/05-self-cosign.json','--canonical','releases/v1/canonical.json'],{encoding:'utf8'});
  assert.equal(p.status,1);assert.equal(JSON.parse(p.stdout).violation.property,'humanOnlyKept');
});
