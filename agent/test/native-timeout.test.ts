import { withData } from "./data.js";
import {chmod,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createEhr} from '../src/ehr.js';
import {InfrastructureError} from '../src/errors.js';
import {runDays} from '../src/run.js';
import {fakeWorld,tmp} from './helpers.js';
import {ScriptedLlm} from './scripted.js';
import {tinyProgram} from '../../lean/generated/ehr-samples.js';
import {programSchema} from '../src/schema.js';
import {nativeTimeout,runNative} from '../src/native-process.js';
withData("runs/core-10day/decisions").it('kills a hung real native command, reports its command and deadline, and classifies the manifest',async()=>{
 const dir=await tmp('native-timeout'),binary=path.join(dir,'hung-ehr');
 await writeFile(binary,`#!${process.execPath}\nsetInterval(()=>{},1000);`);await chmod(binary,0o755);
 const ehr=createEhr({fake:false,binary,timeoutMs:40}),program=programSchema.parse(tinyProgram);
 await expect(ehr.check({specVersion:'v1',program,prev:program,canonical:program})).rejects.toThrow(/ehr check timed out after 40ms/);
 await expect(runDays({days:1,personas:['P3'],worldDir:await fakeWorld(1),runsRoot:dir,runId:'FAKE-timeout',ehr,llm:new ScriptedLlm()})).rejects.toBeInstanceOf(InfrastructureError);
 const manifest=JSON.parse(await readFile(path.join(dir,'FAKE-timeout/manifest.json'),'utf8'));expect(manifest.status).toBe('infrastructure-error');
 expect(manifest.error).toContain('timed out');
});
it('allows bounded successful commands and rejects invalid timeout settings',async()=>{
 expect(nativeTimeout()).toBe(600000);expect(()=>nativeTimeout('0')).toThrow('positive');
 expect(await runNative(process.execPath,['-e',`process.stdout.write('ok')`],{timeoutMs:2000})).toMatchObject({code:0,stdout:'ok'});
});
