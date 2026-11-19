/** Independent, read-only counterfactuals; checkpoints go only to a separate output directory. */
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createEhr } from './ehr.js';
import { archivedSpecEhr, frozenSpecs, historicalDecisions, decisionId } from './quality.js';
import { frozenGeometry } from './frozen-geometry.js';
import { geometryEhr } from './geometry.js';
import { legacyModes, withSimulationModes } from './simulation-modes.js';
import { calibrationPartition, validationSchedules } from './protocol.js';
import { makeHoldout, learnabilityOk, completionOk, improved, interactionAcceptable, type LoopDeps } from './night.js';
import { RunStore } from './store.js';
import { loadWorld } from './world.js';
import { programSchema, dayResultSchema, type UserMemory, type DecisionRecord, type ReplayDay } from '../../app/src/dashboard/agent-evidence.js';
import { interactionRefusals } from './replay-interaction-gate.js';
import { personalize } from './program.js';
import { fileHash, treeHash } from './fingerprints.js';
import { readJson } from './util.js';

/** Unknown frozen geometry is reported separately from a measured regression. */
export function replayGateVerdict(record:Pick<DecisionRecord,'mode'|'outcome'>,replay:ReplayDay|null) {
  if(record.mode==='hillclimb')throw Error('Historical R2 replay requires a calibration-holdout decision');
  const boundedPass=learnabilityOk(replay);
  const checks=interactionRefusals(replay);
  const unavailable=checks.filter(reason=>reason.includes('unavailable or nonfinite'));
  const knownRefusals=checks.filter(reason=>!reason.includes('unavailable or nonfinite'));
  const discretionary=record.mode==='nightly'||record.mode==='cadence';
  const fullCost=discretionary||record.outcome==='surfaced';
  const expertPass=fullCost ? knownRefusals.length?false:unavailable.length?null:
    discretionary?!!replay&&improved(replay):!!replay&&interactionAcceptable(replay) : completionOk(replay);
  if(discretionary&&expertPass===false&&knownRefusals.length===0)knownRefusals.push('no strict physical interaction improvement');
  return {refused:!boundedPass||expertPass===false?true:expertPass===null?null:false,boundedPass,expertPass,
    expertUnavailable:fullCost?unavailable:[],expertRefusals:fullCost?knownRefusals:completionOk(replay)?[]:['full expert completion required']};
}

export async function replayR2Gate(runDir:string,out:string,options:{decision?:string;summaryOnly?:boolean}={}) {
  if(path.resolve(out).startsWith(path.resolve(runDir)+path.sep)||path.resolve(out)===path.resolve(runDir))throw Error('Output must be outside the retained recording');
  await mkdir(out,{recursive:true});
  const inputHash=await treeHash(path.join(runDir,'decisions'));
  const manifest=JSON.parse(await readFile(path.join(runDir,'manifest.json'),'utf8'));
  const world=await loadWorld(path.resolve('runs/world',path.basename(manifest.world)));
  const records=await historicalDecisions(runDir),source=new RunStore(runDir);
  if(options.decision&&!records.some(r=>decisionId(r)===options.decision&&r.deployed))throw Error('Select an existing shipped decision');
  const installed=createEhr({fake:false});
  if(!installed.binary)throw Error('Missing native executable');
  // Bound the native solver as well as the Node heap. A difficult retained case
  // becomes unavailable evidence rather than exhausting the shared machine.
  const limitedBinary=path.join(out,'ehr-limited');
  const quotedBinary="'"+installed.binary.replaceAll("'","'\\''")+"'";
  await writeFile(limitedBinary,`#!/bin/sh\nulimit -c 0\nulimit -v 7340032\nexec ${quotedBinary} "$@"\n`,{mode:0o755});
  const native=withSimulationModes(createEhr({fake:false,binary:limitedBinary,timeoutMs:120_000}),manifest.simulationModes??legacyModes);
  const provider=await frozenGeometry(path.join(runDir,'geometry'),manifest.fingerprints.app);
  const decisions=[];
  const sizes=[];
  for(const id of world.manifest.personas) {
    if(options.decision&&!options.decision.endsWith(`/${id}`))continue;
    const params=world.personas.get(id);if(!params)throw Error(`Missing persona ${id}`);
    const ehr=geometryEhr(archivedSpecEhr(native,await frozenSpecs(runDir,id)),provider,out);
    const deps:LoopDeps={ehr,worldDir:world.dir,worldSeed:world.manifest.seed,store:new RunStore(out),runId:'offline-r2',
      screens:{mode:'fake',async check(){throw Error('Offline screen checks prohibited');}},
      agent:{name:'scripted',model:'offline-r2',async proposeCandidates(){throw Error('Offline model calls prohibited');},async chooseCandidates(){throw Error('Offline model calls prohibited');}},
      seedPolicy:'none',seedState:{rejected:new Set(),injected:0}};
    let memory:UserMemory|undefined;
    for(let night=1;night<10;night++) {
      const record=records.find(r=>r.persona===id&&r.night===night);
      if(!record)throw Error(`Missing decision ${night}/${id}`);
      if(options.decision&&night>Number(options.decision.match(/night-(\d+)/)?.[1]))break;
      const schedules=await validationSchedules(night,d=>world.schedule(d,id));
      sizes.push({night,persona:id,days:schedules.map(s=>s.day),tasks:schedules.reduce((n,s)=>n+calibrationPartition(s,'validation').tasks.length,0)});
      const targetCached=options.decision&&existsSync(path.join(out,`decision-${Number(options.decision.match(/night-(\d+)/)?.[1])}-${id}.json`));
      if(night%2===1&&!options.summaryOnly&&!targetCached) {
        const file=path.join(out,`train-${night}-${id}.json`);
        const day=await readJson(source.dayPath(night,id),dayResultSchema);
        const program=await source.readProgram(id,day.programVersion);
        const training=existsSync(file)?await readJson(file,dayResultSchema):await ehr.simulate({specVersion:program.specVersion,program,persona:params,
          schedule:calibrationPartition(schedules[schedules.length-1] ?? (()=>{throw Error('Missing calibration schedule');})(),'train'),worldDir:world.dir,seed:world.manifest.seed*1000+night,policy:'bounded',
          memory:memory??{actor:program.owner,entries:[]}});
        if(training.policy!=='bounded'||!training.memory)throw Error('Missing bounded training evidence');
        if(!existsSync(file))await writeFile(file,JSON.stringify(training)); memory=training.memory;
      }
      if(options.decision&&decisionId(record)!==options.decision)continue;
      if(!record.deployed){decisions.push({id:decisionId(record),shipped:false,status:'no shipped release'});continue;}
      const file=path.join(out,`decision-${night}-${id}.json`);
      if(existsSync(file)){const cached=JSON.parse(await readFile(file,'utf8'));
        if(cached.replay){Object.assign(cached,replayGateVerdict(record,cached.replay));await writeFile(file,JSON.stringify(cached,null,2));}
        decisions.push(cached);continue;}
      if(options.summaryOnly)throw Error(`Missing checkpoint ${file}; run that decision first`);
      const after=await source.readProgram(id,record.versionAfter);
      const inputs=JSON.parse(await readFile(path.join(runDir,'certifications',id,`v${record.versionAfter}`,'inputs.json'),'utf8'));
      const canonical=personalize(programSchema.parse(inputs.canonical),params,record.owner);
      const before=record.mode==='nightly'?await source.readProgram(id,record.versionBefore):canonical;
      try {
        const replay=await makeHoldout(deps,{id,userId:record.owner,params},schedules,memory).validate(before,after,record.specVersion,canonical);
        const row={id:decisionId(record),shipped:true,mode:record.mode,outcome:record.outcome,version:record.versionAfter,status:'evaluated',
          ...replayGateVerdict(record,replay),replay};
        await writeFile(file,JSON.stringify(row,null,2));decisions.push(row);
        process.stderr.write(`${decisionId(record)}: ${row.refused===true?'refused':row.refused===false?'passes':'partial: frozen geometry unavailable'}\n`);
      } catch(error) {
        const row={id:decisionId(record),shipped:true,status:'unavailable',error:String(error)};
        await writeFile(file,JSON.stringify(row,null,2));decisions.push(row);
        process.stderr.write(`${decisionId(record)}: unavailable: ${String(error)}\n`);
      }
    }
  }
  if(inputHash!==await treeHash(path.join(runDir,'decisions')))throw Error('Retained decisions changed');
  if(!native.binary)throw Error('Missing native executable');
  return {worldSha256:await treeHash(world.dir),programsSha256:await treeHash(path.join(runDir,'programs')),certificationsSha256:await treeHash(path.join(runDir,'certifications')),scope:'Independent shipped decisions on frozen layouts/specs and historical simulation modes; pooled past holdouts, reconstructed train-only bounded memory, canonical +50% incomplete cost. No alternate-history propagation, model calls, deployment, certificates or recording writes. Full structure effect floor is not reconstructed.',
    decisionSha256:inputHash,nativeSha256:await fileHash(installed.binary),resourceLimits:{nativeAddressSpaceMiB:7168,nativeTimeoutMs:120_000},sizes,decisions};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)) {
  process.env['EHR_INFRA_RETRIES']??='0';
  const [run,out,selection]=process.argv.slice(2);if(!run||!out)throw Error('Usage: tsx src/replay-r2-gate.ts <recording> <separate-output-directory> [night-NN/Px|--summary]');
  // Each shipped decision gets a fresh heap; no geometry cache survives into the next.
  // Child arguments inherit the caller's loader and memory limit without a shell.
  if(!selection)for(const record of (await historicalDecisions(path.resolve(run))).filter(r=>r.deployed)) {
    const child=spawnSync(process.execPath,[...process.execArgv,import.meta.filename,run,out,decisionId(record)],{stdio:'inherit'});
    if(child.error)throw child.error;
    if(child.status!==0) {
      const row={id:decisionId(record),shipped:true,status:'unavailable',error:`Decision worker failed (${child.signal??child.status}); inspect worker stderr`};
      await mkdir(out,{recursive:true});
      await writeFile(path.join(out,`decision-${record.night}-${record.persona}.json`),JSON.stringify(row,null,2));
      process.stderr.write(`${row.id}: ${row.error}\n`);
    }
  }
  const report=await replayR2Gate(path.resolve(run),path.resolve(out),!selection||selection==='--summary'?{summaryOnly:true}:{decision:selection});
  if(!selection||selection==='--summary')await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({decisionSha256:report.decisionSha256,shipped:report.decisions.filter(d=>d.shipped).length,
    refused:report.decisions.filter(d=>'refused' in d&&d.refused).map(d=>d.id),unavailable:report.decisions.filter(d=>d.status==='unavailable').map(d=>d.id),partial:report.decisions.filter(d=>'refused' in d&&d.refused===null).map(d=>d.id),r2Refused:report.decisions.filter(d=>'boundedPass' in d&&!d.boundedPass).map(d=>d.id)}));
}
