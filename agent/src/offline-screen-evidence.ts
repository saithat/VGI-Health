/** Reuse measured UI evidence, never actor memory, scores, choices or deployments.
 * Native loadFacts takes the schedule explicitly; stored schedule files are not
 * dependencies. Every other world file and every rendering dependency is bound.
 */
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import type { EhrClient } from './ehr.js';
import type { ScreenChecker } from './screencheck.js';
import { screenCheckResultSchema } from './schema.js';
import { compilePresentations } from './presentation-compiler.js';
import { geometryCacheKey, geometryProgramHash, geometryComponentsHash, loadGeometry } from './geometry.js';
import { fileHash, treeHash, runFingerprints } from './fingerprints.js';
import { sha256, stableStringify } from './program.js';
import { REPO_ROOT } from './util.js';

export async function worldCoreHash(world:string) {
  const rows:string[]=[];
  async function visit(dir:string) {
    for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
      if(dir===world && entry.name==='schedules')continue;
      const file=path.join(dir,entry.name);rows.push(path.relative(world,file));
      if(entry.isDirectory())await visit(file);
      else if(entry.isFile())rows.push(await fileHash(file));
      else throw Error('Offline evidence refuses world symlinks');
    }
  }
  await visit(world);return sha256(stableStringify(rows));
}
export function assertScreenFingerprints(previous:Record<string,unknown>,current:Record<string,unknown>) {
  for(const [key,value] of Object.entries(current))
    if(key!=='agent' && key!=='world' && stableStringify(previous[key])!==stableStringify(value))
      throw Error(`Offline screen evidence fingerprint mismatch: ${key}`);
}
export async function offlineScreenContext() {
  const app=path.join(REPO_ROOT,'app');
  const sources=['e2e/ui-check.spec.ts','e2e/physical-policy.ts','e2e/geometry-capture.ts','e2e/capture-environment.ts',
    'src/ehr/ui/fonts/manifest.json','playwright.config.ts','src/ehr/ui/fidelity.ts','src/ehr/ui/display.tsx','src/ehr/ui/types.ts',
    'scripts/screen-check.mjs','scripts/screen-cache.mjs','scripts/audit-execution.mjs'];
  const browser=execFileSync(process.execPath,['--input-type=module','-e',
    'import {chromium} from "@playwright/test";process.stdout.write(chromium.executablePath())'],{cwd:app,encoding:'utf8'});
  const physicalEnabled=process.env['EHR_PHYSICAL_POLICY']!=='0';
  return sha256(JSON.stringify({app:JSON.parse(await readFile(path.join(app,'dist/build.json'),'utf8')),
    sources:await Promise.all(sources.map(async file=>[file,await fileHash(path.join(app,file))])),
    browser:await fileHash(browser),playwright:await fileHash(path.join(app,'node_modules/@playwright/test/package.json')),
    presentations:null,node:process.version,platform:process.platform,
    policy:await fileHash(path.join(REPO_ROOT,'docs/design/alert-urgency.json')),
    minimumFont:process.env['EHR_MIN_FONT_PX']??'12',physicalEnabled,
    physicalEnforced:physicalEnabled && process.env['EHR_ENFORCE_PHYSICAL']!=='0',
    urgentAlertIds:process.env['EHR_URGENT_ALERT_IDS']??'[]',projects:['desktop','narrow']}));
}
interface EvidenceScope {previous:string;oldWorld:string;world:string;app:string;context:string;}
/** Internal leaf; reuseOfflineScreens validates this scope before construction. */
export function cachedScreenReports(inner:ScreenChecker,scope:EvidenceScope) {
  const hits={checks:0,geometry:0};
  const directory=(input:Parameters<ScreenChecker['check']>[0])=>{
    if(input.specVersion!==input.program.specVersion || compilePresentations(input.program) ||
       !/^[\w.-]+$/.test(input.program.owner) ||
       (input.schedule && input.worldDir!==scope.world))return null;
    const key=geometryCacheKey(input.program)+(input.schedule&&input.worldDir?
      `:${sha256(JSON.stringify([scope.oldWorld,input.schedule]))}`:'');
    return path.join(scope.previous,'screens',input.program.owner,`v${input.program.version}`,key.replaceAll(':','.'));
  };
  const report=async(input:Parameters<ScreenChecker['check']>[0])=>{
    const dir=directory(input);if(!dir || !existsSync(path.join(dir,'result.json')))return null;
    const output=await readFile(path.join(dir,'output.txt'),'utf8');
    if(!output.includes(`Context ${scope.context}.`))return null;
    const result=screenCheckResultSchema.parse(JSON.parse(await readFile(path.join(dir,'result.json'),'utf8')));
    return result.mode==='real' && result.status!=='error' ? {dir,result}:null;
  };
  const screens:ScreenChecker={mode:inner.mode,
    async check(input){const prior=await report(input);if(!prior)return inner.check(input);hits.checks++;return structuredClone(prior.result);},
    async geometry(input){
      const prior=await report(input);
      if(prior?.result.status==='pass' && existsSync(path.join(prior.dir,'geometry.json'))) {
        const atlas=await loadGeometry(path.join(prior.dir,'geometry.json'));
        if(atlas.source!=='chromium' || atlas.appSha256!==scope.app || atlas.programHash!==geometryProgramHash(input.program) ||
          atlas.componentsSha256!==geometryComponentsHash(input.program))throw Error('Offline geometry identity mismatch');
        const {aliases,...measured}=atlas;
        hits.geometry++;return structuredClone({...measured,...(aliases?{aliases}:{})});
      }
      return inner.geometry ? inner.geometry(input):null;
    }};
  return {screens,hits};
}
export async function reuseOfflineScreens(input:{previous:string;sourceRef:string;world:string;ehr:EhrClient;inner:ScreenChecker}) {
  if(input.ehr.mode!=='real' || process.env['EHR_SAMPLE_FHIR'])throw Error('Evidence reuse requires real EHR and default screen bundles');
  const previous=path.resolve(input.previous);
  const manifest=z.object({mode:z.literal('OFFLINE'),ehr:z.object({mode:z.literal('real')}),world:z.string(),
    fingerprints:z.record(z.string(),z.unknown())}).parse(JSON.parse(await readFile(path.join(previous,'runs/A/manifest.json'),'utf8')));
  const current=await runFingerprints(input.ehr,input.world);
  assertScreenFingerprints(manifest.fingerprints,current);
  if(await treeHash(manifest.world)!==manifest.fingerprints['world'])throw Error('Previous world changed since measurement');
  const core=await worldCoreHash(input.world);
  if(core!==await worldCoreHash(manifest.world))throw Error('Offline screen evidence world metadata/facts mismatch');
  if(manifest.fingerprints['agent']!==current.agent) {
    if(!/^[a-f0-9]{7,40}$/i.test(input.sourceRef))throw Error('Evidence reuse requires its measured source commit');
    const scratch=await mkdtemp(path.join(tmpdir(),'offline-source-'));
    try {
      const archive=execFileSync('git',['archive',input.sourceRef,'agent/src'],{cwd:REPO_ROOT,maxBuffer:32*1024*1024});
      execFileSync('tar',['-xf','-','-C',scratch],{input:archive});
      if(await treeHash(path.join(scratch,'agent/src'))!==manifest.fingerprints['agent'])throw Error('Measured source commit does not match evidence');
      for(const file of ['ehr.ts','composites.ts','presentation-compiler.ts','screencheck.ts','geometry.ts','program.ts','schema.ts','lean-types.ts','native-process.ts','util.ts'])
        if(await fileHash(path.join(scratch,'agent/src',file))!==await fileHash(path.join(REPO_ROOT,'agent/src',file)))
          throw Error(`Offline evidence rendering/client source changed: ${file}`);
    } finally {await rm(scratch,{recursive:true,force:true});}
  }
  const context=await offlineScreenContext();
  const cache=cachedScreenReports(input.inner,{previous,oldWorld:manifest.world,world:input.world,app:current.app,context});
  return {...cache,provenance:{previous,sourceRef:input.sourceRef,worldCore:core,screenContext:context,hits:cache.hits}};
}
