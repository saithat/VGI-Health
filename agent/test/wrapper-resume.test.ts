import { withData } from "./data.js";
import {readFile,writeFile,mkdir,copyFile,rm,chmod} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {runFingerprints} from '../src/fingerprints.js';
import {createEhr,DEFAULT_EHR_BIN} from '../src/ehr.js';
import {verifyResume} from '../src/verify-resume.js';
import {REPO_ROOT,writeJson} from '../src/util.js';
import {tmp} from './helpers.js';
withData("runs/world/2").it('resumes with real fingerprints, never rebuilds/calls a model, and survives post-run floor failure',async()=>{
 const workspace=await tmp('wrapper-real-fingerprints'), run=path.join(workspace,'runs/wrapper-fixture');
 await mkdir(path.join(workspace,'scripts'),{recursive:true});await copyFile(path.join(REPO_ROOT,'scripts/run-overnight.sh'),path.join(workspace,'scripts/run-overnight.sh'));
 await writeJson(path.join(workspace,'runs/world/2/world.json'),{});
 const ehr=createEhr({fake:false}), world=path.join(REPO_ROOT,'runs/world/2');
 const fingerprints=await runFingerprints(ehr,world);
 expect(fingerprints.interactionModel).toMatch(/^[a-f0-9]{64}$/);expect(fingerprints.ehr).not.toBe('FAKE');expect(fingerprints.app).toMatch(/^[a-f0-9]{64}$/);
 await writeJson(path.join(run,'manifest.json'),{world,ehr:{mode:'real',binary:DEFAULT_EHR_BIN},fingerprints});
 const copied=path.join(REPO_ROOT,'app/dist/runs/FAKE-wrapper-resume-test');
 await writeJson(path.join(copied,'changed-run-data.json'),{timestamp:Date.now(),data:'A build copies run data here'});
 const tools=path.join(workspace,'bin');await mkdir(tools);
 const worker=path.join(workspace,'verify.mts');
 await writeFile(worker,`import {verifyResume} from '${REPO_ROOT}/agent/src/verify-resume.ts'; await verifyResume(${JSON.stringify(run)});`);
 const tsx=path.join(REPO_ROOT,'agent/node_modules/tsx/dist/cli.mjs'), log=path.join(workspace,'calls');
 await writeFile(path.join(tools,'pnpm'),`#!/bin/sh\nprintf '%s\\n' "$*" >> '${log}'\ncase "$*" in\n '--filter agent verify-resume --run wrapper-fixture') exec '${process.execPath}' '${tsx}' '${worker}';;\n *build*|*manual*) exit 99;;\n '--filter agent run-days '*) exit 0;;\n 'complexity --run wrapper-fixture') exit 7;;\n 'trajectories --run wrapper-fixture'|'conformance --run wrapper-fixture --run-only --jobs 5') exit 0;;\n *) exit 98;;\nesac\n`);
 await chmod(path.join(tools,'pnpm'),0o755);
 await writeFile(path.join(tools,'make'),`#!/bin/sh\nprintf '%s\\n' "make $*" >> '${log}'\nif [ "$*" = wasm-check ]; then exec '${process.execPath}' '${REPO_ROOT}/scripts/wasm-assets.mjs'; fi\nexit 98\n`);await chmod(path.join(tools,'make'),0o755);

 await writeFile(path.join(tools,'lake'),'#!/bin/sh\nexit 97\n');await chmod(path.join(tools,'lake'),0o755);
 try{
  expect(await runFingerprints(ehr,world)).toEqual(fingerprints);
  const result=spawnSync('bash',[path.join(workspace,'scripts/run-overnight.sh'),'wrapper-fixture','--resume'],{env:{...process.env,PATH:`${tools}:${process.env['PATH']??''}`},encoding:'utf8'});
  expect(result.stderr).toContain('Post-run floor report unavailable');expect(result.status,result.stdout+result.stderr).toBe(0);
  const calls=await readFile(log,'utf8');expect(calls).toContain('verify-resume');expect(calls).toContain('run-days --parallel');expect(calls).toContain('make wasm-check');expect(calls).not.toContain('build');
  await writeJson(path.join(run,'manifest.json'),{world,ehr:{mode:'real',binary:DEFAULT_EHR_BIN},fingerprints:{...fingerprints,agent:'changed-gates'}});
  await expect(verifyResume(run)).rejects.toThrow('fingerprints changed');
  await writeJson(path.join(run,'manifest.json'),{world,ehr:{mode:'real',binary:DEFAULT_EHR_BIN},fingerprints:{...fingerprints,interactionModel:'changed-pointer-model'}});
  await expect(verifyResume(run)).rejects.toThrow('fingerprints changed');
 }finally{await rm(copied,{recursive:true,force:true});}
},30000);

withData('runs/world/2').it('verifies exploration fingerprints for native cadence manifests',async()=>{
 const {CADENCE_PROTOCOL}=await import('../src/cadence.js');
 const {treeHash}=await import('../src/fingerprints.js');
 const directory=await tmp('cadence-native-resume'),ehr=createEhr({fake:false}),world=path.join(REPO_ROOT,'runs/world/2');
 if(!ehr.binary)throw Error('native binary required');
 const fingerprints={...await runFingerprints(ehr,world),explore:await treeHash(path.join(REPO_ROOT,'explore'))};
 const manifest={protocol:CADENCE_PROTOCOL,world,ehr:{mode:'real',binary:ehr.binary},fingerprints};
 await writeJson(path.join(directory,'manifest.json'),manifest);
 expect(await verifyResume(directory)).toEqual(fingerprints);
 await writeJson(path.join(directory,'manifest.json'),{...manifest,fingerprints:{...fingerprints,explore:'changed'}});
 await expect(verifyResume(directory)).rejects.toThrow('fingerprints changed');
});
