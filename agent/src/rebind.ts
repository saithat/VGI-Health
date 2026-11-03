import { InfrastructureError } from './errors.js';
import { retryEhr,retryScreens } from './retry-boundaries.js';
import { retryInfrastructure,infrastructurePersona } from './infrastructure.js';
import { auditedOperation } from './operation-manifest.js';
import { assertCertified } from './certification.js';
import { z } from 'zod';
/** No model, no program edits. Revalidate every published version against its frozen inputs. */
import { existsSync } from 'node:fs';
import { readFile, readdir, appendFile, mkdir, rm, open } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createEhr, type EhrClient } from './ehr.js';
import { bindBuild, installedBuild } from './build-binding.js';
import { readBinding } from './binding-pointer.js';
import { createScreenChecker, type ScreenChecker } from './screencheck.js';
import { recordingEhr } from './recording-ehr.js';
import { programSchema, certificateSchema, screenCheckResultSchema } from './schema.js';
import { sha256, stableStringify } from './program.js';
import { REPO_ROOT, writeJsonAtomic, readJson } from './util.js';

async function rebindRunImpl(dir: string, options: {ehr?: EhrClient; screens?: ScreenChecker; build?: Awaited<ReturnType<typeof installedBuild>>} = {}) {
  const underlying = options.ehr ?? createEhr({fake:false});
  const ehr = retryEhr(recordingEhr(underlying,path.join(dir,'rebind/ehr')));
  const screens = retryScreens(options.screens ?? createScreenChecker(ehr,{artifactsDir:path.join(dir,'rebind/screens')}));
  const build = options.build ?? await retryInfrastructure('rebind:build',()=>installedBuild(undefined,ehr.binary ?? undefined),true);
  await mkdir(path.join(dir,'rebind'),{recursive:true});
  const lock = path.join(dir,'rebind/lock');
  if (existsSync(lock)) {
    const pid=Number(await readFile(lock,'utf8'));
    let live=true; try { process.kill(pid,0); } catch {live=false;}
    if (live || !Number.isInteger(pid) || pid <= 0) throw new Error('Rebind already running or invalid lock');
    await rm(lock);
  }
  const handle = await open(lock,'wx');
  await handle.writeFile(String(process.pid));
  const results: {persona:string; version:number; status:string; reason?:string}[] = [];
  try {
    const published = new Set<string>();
    const manifest = z.object({personas:z.array(z.string().regex(/^P[1-5]$/))}).parse(JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8')));
    for (const persona of manifest.personas) {
      const pointer = z.object({version:z.number().int().nonnegative()}).parse(JSON.parse(await readFile(path.join(dir,'programs',persona,'deployed.json'),'utf8')));
      published.add(`${persona}/0`); published.add(`${persona}/${pointer.version}`);
    }
    const decisions = path.join(dir,'decisions');
    if (existsSync(decisions)) for (const night of await readdir(decisions)) for (const name of await readdir(path.join(decisions,night))) {
      const record = z.object({persona:z.string().regex(/^P[1-5]$/),deployed:z.unknown(),versionAfter:z.number().int().nonnegative()}).parse(JSON.parse(await readFile(path.join(decisions,night,name),'utf8')));
      if (record.deployed) published.add(`${record.persona}/${record.versionAfter}`);
    }
    for (const key of [...published].sort()) {
      const parts=z.tuple([z.string().regex(/^P[1-5]$/),z.string()]).parse(key.split('/')); const [persona,raw]=parts; const version=Number(raw);
      const prefix = path.join(dir,'certs',persona,`v${version}`);
      const currentFile = `${prefix}.build.json`;
      const alreadyRebound = existsSync(currentFile) && JSON.parse(await readFile(currentFile,'utf8')).status === 'bound';
      let old: unknown = null;
      try { old = await readBinding(currentFile); } catch { /* a rejected version may be retried */ }
      if (!old && existsSync(`${prefix}.build.0.json`)) old = JSON.parse(await readFile(`${prefix}.build.0.json`,'utf8'));
      let check: unknown = null, screen: unknown = null;
      const timestamp = new Date().toISOString();
      const inputDir = path.join(dir,'certifications',persona,`v${version}`);
      try {
        const programFile = path.join(dir,'programs',persona,`v${version}.json`);
        const sourceFile = programFile.replace('.json','.source.json');
        const program = await readJson(existsSync(sourceFile)?sourceFile:programFile,programSchema);
        const certificate = await readJson(`${prefix}.json`,certificateSchema);
        const inputs = z.object({specVersion:z.string(),prev:programSchema,canonical:programSchema,program:programSchema,night:z.number().nullable()}).parse(JSON.parse(await readFile(path.join(inputDir,'inputs.json'),'utf8')));
        const specFile = path.join(inputDir,'spec.json');
        const spec = JSON.parse(await readFile(specFile,'utf8'));
        if (stableStringify(program) !== stableStringify(inputs.program)) throw new Error('Program differs from recorded certification inputs');
        if (certificate.verdict !== 'ok' || certificate.specVersion !== inputs.specVersion) throw new Error('Original certificate is invalid');
        const inputHash = sha256(stableStringify({spec,inputs}));
        if (!old || z.object({certificationInputsSha256:z.string().optional()}).parse(old).certificationInputsSha256 !== inputHash) throw new Error('Recorded certification input hash mismatch or missing original provenance');
        assertCertified(program,certificate,inputs.specVersion,ehr.mode);
        const target = { ...bindBuild(build,program,certificate), certificationInputsSha256: inputHash };
        const original=z.object({certificateSha256:z.string(),componentsSha256:z.string()}).parse(old);
        if (target.programSha256 !== sha256(stableStringify(JSON.parse(await readFile(programFile,'utf8'))))) throw new Error('Current compiler changes the recorded executable; program edits are forbidden in rebind');
        if (target.certificateSha256 !== original.certificateSha256 || target.componentsSha256 !== original.componentsSha256) throw new Error('Certificate/component artifacts changed since original binding');
        // A completed receipt for these exact inputs and this build is a resumable checkpoint.
        if (alreadyRebound && old && stableStringify(old) === stableStringify(target)) {results.push({persona,version,status:'cached'});continue;}
        check = await infrastructurePersona(persona,()=>ehr.check({specVersion:specFile,program,prev:inputs.prev,canonical:inputs.canonical}));
        if (check !== 'ok') throw new Error(`CURRENT CHECKER REFUSED: ${JSON.stringify(check)}`);
        screen = await infrastructurePersona(persona,()=>screens.check({specVersion:specFile,program}));
        if (screenCheckResultSchema.parse(screen).status !== 'pass') throw new Error(`CURRENT SCREEN GATE REFUSED: ${JSON.stringify(screen)}`);
        const files = await readdir(path.dirname(prefix));
        const generations = files.flatMap((f) => {const m=new RegExp(`^v${version}\\.build\\.(\\d+)\\.json$`).exec(f);return m?[Number(m[1])]:[];});
        if (!generations.length && old) await writeJsonAtomic(`${prefix}.build.0.json`,old);
        const generation = Math.max(0,...generations)+1;
        const file = `${prefix}.build.${generation}.json`;
        await writeJsonAtomic(file,target);
        const entry = {persona,version,status:'bound',timestamp,old,new:target,check,screen,current:path.basename(file)};
        await appendFile(path.join(dir,'rebind/log.jsonl'),JSON.stringify(entry)+'\n');
        await writeJsonAtomic(currentFile,{status:'bound',current:path.basename(file),timestamp});
        results.push({persona,version,status:'bound'});
      } catch (error) {
        if(error instanceof InfrastructureError)throw error;
        const reason=error instanceof Error?error.message:String(error);
        if (old && !existsSync(`${prefix}.build.0.json`)) await writeJsonAtomic(`${prefix}.build.0.json`,old);
        const entry = {persona,version,status:'rejected',timestamp,reason,old,new:build,check,screen};
        await appendFile(path.join(dir,'rebind/log.jsonl'),JSON.stringify(entry)+'\n');
        await writeJsonAtomic(currentFile,{status:'rejected',current:null,timestamp,reason});
        results.push({persona,version,status:'rejected',reason});
        process.stderr.write(`REBIND REFUSED ${persona}/v${version}: ${reason}\n`);
      }
    }
  } finally {await handle.close();await rm(lock,{force:true});}
  await writeJsonAtomic(path.join(dir,'rebind/result.json'),{timestamp:new Date().toISOString(),build,results});
  return results;
}
export async function rebindRun(dir:string,options:Parameters<typeof rebindRunImpl>[1]={}){
 return auditedOperation(path.join(dir,'rebind'),{name:'scripted',model:'no-model-rebind',complete:async()=>{throw new Error('Rebind never calls a model');}},null,null,()=>rebindRunImpl(dir,options));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {values}=parseArgs({options:{run:{type:'string'}}});
  if (!values.run) throw new Error('Usage: pnpm --filter agent rebind --run <id-or-absolute-directory>');
  const dir=path.isAbsolute(values.run)?values.run:path.join(REPO_ROOT,'runs',values.run);
  const results=await rebindRun(dir);
  console.log(JSON.stringify(results,null,2));
  if (results.some((r)=>r.status==='rejected')) process.exitCode=1;
}
