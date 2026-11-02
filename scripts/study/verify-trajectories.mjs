/** Reuse the dashboard's trajectory replay against the frozen WASM, independently of study UI. */
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { loadEhrInterp } from '../../app/public/ehr/interp-loader.mjs';
import { replayTrajectory } from '../../app/src/dashboard/trajectory-replay.ts';
import { sessions } from './analysis.mjs';
import { read, arg, outputDir, hash, root } from './common.mjs';
export async function verifyTrajectories(out) {
  const manifest=await read(path.join(out,'manifest.json')), data=await sessions(out);
  const wasmBinary=await readFile(path.join(root,'app/public/ehr/ehr-interp.wasm'));
  if(hash(wasmBinary)!==manifest.provenance.wasmSha256)throw Error('Frozen WASM mismatch');
  const wasm=await loadEhrInterp({wasmBinary});
  const interp={
    init:(spec,program,facts,user)=>wasm.init(`{"spec":${spec},"program":${program},"facts":${facts},"user":${user}}`),
    step:(spec,program,facts,user,state,event)=>wasm.step(`{"spec":${spec},"program":${program},"facts":${facts},"user":${user},"state":${state},"event":${event}}`),
  };
  const rows=[];
  for(const person of data.included)for(const trial of person.trials) {
    const scenario=trial.practice?manifest.practice:manifest.cases.find(c=>c.id===trial.caseId);
    if(!scenario)throw Error('Unknown frozen case');
    const input=scenario.episodes[0];
    const trajectory={schemaVersion:1,id:trial.caseId,context:{programPath:'manifest.json',specPath:'manifest.json',
      fixtureFile:'manifest.json',resources:[],today:'frozen synthetic context',user:input.user,startMin:scenario.task.startMin,
      segments:trial.segments},trace:trial.trace,nativeMismatch:null};
    const replay=replayTrajectory(interp,trajectory,input.spec,input.program);
    const finalStateMatches=isDeepStrictEqual(replay.state,trial.finalState);
    const row={participant:person.participant,design:trial.design,practice:trial.practice,eventsVerified:replay.eventsVerified,
      firstMismatch:replay.firstMismatch,finalStateMatches};
    rows.push(row);
    if(replay.firstMismatch || !finalStateMatches)throw Error(`Study replay mismatch: ${JSON.stringify(row)}`);
  }
  const result={schemaVersion:1,provenance:data.provenance,wasmSha256:hash(wasmBinary),rows,
    eventsVerified:rows.reduce((n,r)=>n+r.eventsVerified,0),mismatches:0};
  await writeFile(path.join(out,'trajectory-verification.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});
  return result;
}
if(process.argv[1]===import.meta.filename) {
  const result=await verifyTrajectories(outputDir(arg('out')));
  console.log(JSON.stringify({eventsVerified:result.eventsVerified,mismatches:result.mismatches}));
}
