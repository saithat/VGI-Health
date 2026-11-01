import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {boundedSearch,unavailable,aggregate,coverage} from './search.mjs';
import {sum} from './compute.mjs';
const exec=promisify(execFile);
test('task timeout kills the reporting subprocess and returns an unavailable floor',async()=>{
 const result=await boundedSearch(async ({signal,remaining})=>{await exec(process.execPath,['-e','setInterval(()=>{},1000)'],{signal,timeout:remaining(),killSignal:'SIGKILL'});return {};},{timeoutMs:40});
 assert.equal(result.status,'not-computed');assert.equal(result.message,'not computed (search bound)');assert.equal(result.metrics,null);assert.equal(result.floor,null);
});
test('native bound exits and structured helper bounds remain unavailable, never zero',async()=>{
 const bound=await boundedSearch(async()=>({status:'not-computed',reason:'search bound'}),{timeoutMs:100});assert.equal(bound.floor,null);
 const native=await boundedSearch(async()=>{throw Object.assign(new Error('exit 1'),{stderr:'joint click search exceeded bound or found no completion'});},{timeoutMs:100});assert.equal(native.reason,'search bound');
 const error=await boundedSearch(async()=>{throw new Error('invalid report fixture');},{timeoutMs:100});assert.equal(error.reason,'report error');
});
test('bounded tasks are excluded from aggregates and coverage stays explicit',()=>{
 const metrics={clicks:7,keystrokes:9,scrolls:1,scrollPx:300,mouseTravelPx:50,screens:2,requiredFields:3,popups:0};
 const tasks=[{status:'computed',metrics,floor:{...metrics,clicks:4}},unavailable('search bound')];
 assert.deepEqual(coverage(tasks),{expected:2,computed:1,notComputed:1});assert.equal(aggregate(tasks,'floor',sum).clicks,4);
 assert.equal(aggregate([tasks[1]],'floor',sum).clicks,null);
});
