import {test} from 'node:test';
import assert from 'node:assert/strict';
import {screenLimits,densityFindings} from './density-reference.mjs';
const sample=(screen,maximum,phase='active')=>({screen,maximum,phase});
test('R5 reference maximizes each screen across states and modal/background windows',()=>{
 const limits=screenLimits([sample('sparse',4),sample('sparse',7,'background-probe'),sample('dense',57)]);
 assert.deepEqual({...limits},{sparse:7,dense:57});
 assert.deepEqual(densityFindings([{file:'candidate',density:[sample('sparse',8),sample('new',57)]}],limits),
  [{file:'candidate',screen:'sparse',phase:'active',measured:8,limit:7,message:'R5 sparse: 8 active targets > limit 7 (active)'}]);
 assert.equal(densityFindings([{file:'new',density:[sample('new',58)]}],limits)[0].limit,57);
});
test('P2 w3OrderSets workspace 61 passes its own reference; sparse screens cannot grow to 57',()=>{
 const reference=[sample('w3OrderSets',57),sample('w3OrderSets',61),sample('w3Landing',12)];
 const trees=[{file:'P2',density:reference}];
 assert.equal(densityFindings(trees,{}).length,1);
 assert.deepEqual(densityFindings(trees,screenLimits(reference)),[]);
 const changed=[{file:'P2',density:[sample('w3OrderSets',62),sample('w3Landing',13)]}];
 assert.deepEqual(densityFindings(changed,screenLimits(reference)).map(f=>[f.screen,f.measured,f.limit]),[['w3OrderSets',62,61],['w3Landing',13,12]]);
});
test('cached raw samples are evaluated again under each reference without mutation',()=>{
 const raw={file:'cached',status:'pass',density:[sample('screen',9)]};
 assert.equal(densityFindings([raw],{screen:8}).length,1);
 assert.deepEqual(densityFindings([raw],{screen:9}),[]);
 assert.equal(raw.status,'pass');
 assert.throws(()=>densityFindings([{file:'missing'}],{}),/Missing R5/);
 assert.throws(()=>screenLimits([sample('screen',NaN)]),/Incomplete/);
 assert.deepEqual(densityFindings([{file:'probe',probe:true}],{}),[]);
});
