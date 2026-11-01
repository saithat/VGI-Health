import {readFile,writeFile,mkdir,copyFile,rm,chmod} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {runFingerprints} from '../src/fingerprints.js';
import {createEhr,DEFAULT_EHR_BIN} from '../src/ehr.js';
import {verifyResume} from '../src/verify-resume.js';
import {REPO_ROOT,writeJson} from '../src/util.js';
import {tmp} from './helpers.js';
it('resumes through the shell wrapper with real fingerprints after runs are copied into dist; never builds or calls a model',async()=>{
 const workspace=await tmp('wrapper-real-fingerprints'), run=path.join(workspace,'runs/core-10day');
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
 await writeFile(path.join(tools,'pnpm'),`#!/bin/sh\nprintf '%s\\n' "$*" >> '${log}'\ncase "$*" in\n '--filter agent verify-resume --run core-10day') exec '${process.execPath}' '${tsx}' '${worker}';;\n *build*|*manual*) exit 99;;\n '--filter agent run-days '*) exit 0;;\n 'trajectories --run core-10day'|'complexity --run core-10day') exit 0;;\n *) exit 98;;\nesac\n`);
 await chmod(path.join(tools,'pnpm'),0o755);
 await writeFile(path.join(tools,'lake'),'#!/bin/sh\nexit 97\n');await chmod(path.join(tools,'lake'),0o755);
 try{
  expect(await runFingerprints(ehr,world)).toEqual(fingerprints);
  const result=spawnSync('bash',[path.join(workspace,'scripts/run-overnight.sh'),'core-10day','--resume'],{env:{...process.env,PATH:`${tools}:${process.env['PATH']??''}`},encoding:'utf8'});
  expect(result.stderr).toBe('');expect(result.status,result.stdout+result.stderr).toBe(0);
  const calls=await readFile(log,'utf8');expect(calls).toContain('verify-resume');expect(calls).toContain('run-days');expect(calls).not.toContain('build');
  await writeJson(path.join(run,'manifest.json'),{world,ehr:{mode:'real',binary:DEFAULT_EHR_BIN},fingerprints:{...fingerprints,agent:'changed-gates'}});
  await expect(verifyResume(run)).rejects.toThrow('fingerprints changed');
  await writeJson(path.join(run,'manifest.json'),{world,ehr:{mode:'real',binary:DEFAULT_EHR_BIN},fingerprints:{...fingerprints,interactionModel:'changed-pointer-model'}});
  await expect(verifyResume(run)).rejects.toThrow('fingerprints changed');
 }finally{await rm(copied,{recursive:true,force:true});}
},30000);
