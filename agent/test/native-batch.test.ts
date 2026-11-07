import { chmod, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmp } from './helpers.js';
import { runNativeJsonBatch } from '../src/native-process.js';

it('stateless native batches require every ordered response and reject errors or partial output',async()=>{
 const directory=await tmp('native-json-batch');const binary=path.join(directory,'native');
 const script=async(body:string)=>{await writeFile(binary,'#!/usr/bin/env node\n'+body);await chmod(binary,0o755);};
 const requests=[{op:'one',input:{n:1}},{op:'two',input:{n:2}}];
 await script(`let input='';process.stdin.on('data',s=>input+=s);process.stdin.on('end',()=>{for(const line of input.trim().split('\\n')){const r=JSON.parse(line);console.log(JSON.stringify({id:r.id,result:r.input}));}});`);
 expect(await runNativeJsonBatch(binary,requests)).toEqual([{n:1},{n:2}]);
 expect(await runNativeJsonBatch('/absent',[])).toEqual([]);
 for(const output of [[{id:0,result:1}],[{id:1,result:1},{id:0,result:2}],[{id:0,error:'failed'},{id:1,result:2}],[{id:0},{id:1,result:2}]]){
  await script(`process.stdin.resume();process.stdin.on('end',()=>console.log(${JSON.stringify(output.map(r=>JSON.stringify(r)).join('\n'))}));`);
  await expect(runNativeJsonBatch(binary,requests)).rejects.toThrow('ehr serve batch');
 }
});
