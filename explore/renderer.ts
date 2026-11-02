/** Trusted custom-renderer gate protocol. The LLM never selects the executable. */
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { runNative } from '../agent/src/native-process.js';
import { sha256 } from '../agent/src/program.js';
import type { EhrClient } from '../agent/src/ehr.js';
import type { Candidate } from './generator.js';
import { write } from './evaluate.js';
export interface RendererAssertion {
  stateSha256: string;
  viewport: [number,number];
  accessibility: 'pass'|'fail';
  geometry: 'pass'|'fail';
  artifact: string;
}
export function requireRendererCoverage(expected:string[], viewports: [number,number][], evidence:{rendererSha256:string;assertions:RendererAssertion[]}) {
  if(!/^[0-9a-f]{64}$/.test(evidence.rendererSha256))throw Error('Missing renderer build hash');
  for(const state of expected)for(const viewport of viewports){
    const a=evidence.assertions.find(a=>a.stateSha256===state&&a.viewport[0]===viewport[0]&&a.viewport[1]===viewport[1]);
    if(!a||a.accessibility!=='pass'||a.geometry!=='pass'||!a.artifact)throw Error('Incomplete custom renderer state/viewport coverage');
  }
}
export function externalRendererGate(ehr:EhrClient,script:string,bundles:string[],viewports:[number,number][]=[[1440,900],[390,844]]) {
  if(!path.isAbsolute(script)||!bundles.length)throw Error('Provide a trusted absolute renderer gate script and sample bundles');
  return async(candidate:Candidate,dir:string):Promise<Record<string,unknown>>=>{
    const files:string[]=[];
    for(const [i,fhir]of bundles.entries()) files.push(...await ehr.renderScreens({specVersion:candidate.program.specVersion,program:candidate.program,fhir,ui:true,outDir:path.join(dir,'custom-renderer-inputs',`b${i}`)}));
    const states=await Promise.all(files.map(async file=>({file,sha256:sha256(await readFile(file,'utf8'))})));
    if(!states.length)throw Error('No exported renderer states');
    const input=path.join(dir,'renderer-input.json'),output=path.join(dir,'renderer-result.json');
    await write(input,{candidate,states,viewports,output,
      contract:'Independent exact accessibility identity/content/events and geometry assertions per exported state/viewport. Full rows/source/units, modal boundaries, patient binding and honest offers must survive.'});
    const result=await runNative(process.execPath,[script,input,output]);
    if(result.code!==0)throw Error(`Renderer gate failed: ${result.stderr.slice(-1000)}`);
    const evidence=JSON.parse(await readFile(output,'utf8')) as {rendererSha256:string;assertions:RendererAssertion[]};
    requireRendererCoverage([...new Set(states.map(s=>s.sha256))],viewports,evidence);
    return {status:'pass',...evidence,coverageInput:input,gateSha256:sha256(await readFile(script,'utf8'))};
  };
}
