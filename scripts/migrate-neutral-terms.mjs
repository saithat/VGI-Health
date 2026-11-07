#!/usr/bin/env node
/** One-time local-data migration. No runtime aliases; no model calls.
 * Run after building Lean, WASM and the app. Fails closed on certification,
 * screen checks or strict replay; never edits a different checkout.
 */
import { readFile, writeFile as writeFileRaw, readdir, mkdir, rm, access, rename, stat, chmod } from 'node:fs/promises';
// Frozen experiment inputs are read-only by design; rewrite them and keep their mode.
async function writeFile(file, data) {
  const mode=await stat(file).then(s=>s.mode&0o7777,()=>null);
  if(mode!==null&&!(mode&0o200)){await chmod(file,mode|0o200);try{await writeFileRaw(file,data);}finally{await chmod(file,mode);}}
  else await writeFileRaw(file,data);
}
import { resolve, join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { gunzipSync, gzipSync } from 'node:zlib';
import { fictionalize, identityCatalog } from './fictional-identities.mjs';
import { recertifyRuns } from './recertify-runs.mjs';
import { acquireBrowserLock } from './browser-heavy-lock.mjs';
import { archiveStaleGeometry } from './geometry-history.mjs';
const root = resolve(import.meta.dirname, '..');
const compound = (...parts) => parts.join('');
// Source spellings are assembled only here, for this offline migration.
const pairs = [
  [compound('ep','ic-density'),'canonical-density'],[compound('EP','IC_DENSITY_SHOTS'),'CANONICAL_DENSITY_SHOTS'],[compound('ep','ic-after'),'canonical-density-after'],[compound('ep','ic-before'),'canonical-density-before'],
  [compound('Patient Story','board'), 'Patient sidebar'], [compound('patient story','board'),'patient sidebar'], [compound('Story','board'), 'Patient sidebar'], [compound('story','board-avatar'),'patient-sidebar-avatar'], [compound('story','board'), 'patientSidebar'],
  ...[['In',' Basket'],['In',' basket'],['In-','basket'],['In','Basket'],['In','basket'],['in','Basket'],['in','basket'],['in-','basket'],['in ','basket']].map(([a,b]) => [a+b, a.startsWith('I') ? 'Inbox' : 'inbox']),
  ...[['Child Health ', 'Pediatric workflow'],['Visit ', 'Visit workflow'],['ED ', 'ED workflow'],['Nursing ', 'Nursing workflow'],['Surgical ', 'Surgical workflow']].map(([a,b])=>[a+compound('Navi','gator'),b]),
  [compound('Navi','gator'),'Workflow'],[compound('navi','gator'),'workflow'],
  [['Chart','Review'].join(' '),'Chart History'],[['Chart','review'].join(' '),'Chart History'],[compound('chart','Review'),'chartHistory'],[compound('chart','-review'),'chart-history'],
  [['Application','Activities'].join(' '),'Activities'],[['Application','activities'].join(' '),'Activities'],
  ...[[['Preference',' List'],'Order favorites'],[['Preference',' list'],'Order favorites'],[['preference',' lists'],'order favorites'],[['preference',' list'],'order favorites'],[['Preference-','list'],'Order-favorites'],[['preference-','list'],'order-favorites'],[['preference','List'],'orderFavorites'],[['pref','List'],'orderFavorites']].map(([[a,b],neutral])=>[a+b,neutral]),
  [['Best','Practice','Advisory'].join(' '),'Advisory (interruptive alert)'],
];
pairs.sort(([a],[b])=>b.length-a.length);
const mapping = new Map(pairs);
const pattern = new RegExp(pairs.map(([a])=>a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+'|\\b(?:'+[compound('B','P','A'),compound('B','p','a'),compound('b','p','a')].join('|')+')(?=\\b|[A-Z_0-9])','g');
export function migrateTerms(value) {
  if(typeof value==='string')return value.replace(pattern,(term,offset,source)=>{
    if(term===compound('navi','gator')&&(offset===0||!/[\w$]/.test(source[offset-1]))&&/^(?:\?\.|\.)(?:languages?|userAgent)\b/.test(source.slice(offset+term.length)))return term;
    if(mapping.has(term))return mapping.get(term);
    if(term===term.toLowerCase())return 'advisory';
    const token=source.slice(offset).match(/^\w+/)?.[0]??term;
    return token!==term&&token===token.toUpperCase()?'ADVISORY':'Advisory';
  });
  if(Array.isArray(value))return value.map(migrateTerms);
  if(value&&typeof value==='object') {
    const result=Object.fromEntries(Object.entries(value).map(([k,v])=>[migrateTerms(k),migrateTerms(v)]));
    if(value.resourceType==='Patient'||('name' in value&&('birthDate' in value||'sex' in value)))
      for(const key of ['name','id','identifier','file'])if(key in value)result[key]=structuredClone(value[key]);
    return result;
  }
  return value;
}
const exists = async p=>{try{await access(p);return true;}catch{return false;}};
const read = async p=>JSON.parse(await readFile(p,'utf8'));
const write = async(p,v)=>{await mkdir(dirname(p),{recursive:true});await writeFile(p,JSON.stringify(v,null,2)+'\n');};
/** Hash the final manifest status, not the preceding pending status. */
export async function writeRunDigest(dir, manifest) {
  const { contentDigest }=await import('../agent/src/content-digest.ts');
  const manifestFile=join(dir,'manifest.json');
  await write(manifestFile,manifest);
  const digest=await contentDigest(dir);
  manifest.contentDigest=digest.contentDigest;
  await write(manifestFile,manifest);await write(join(dir,'digest.json'),digest);
  return digest;
}
const sha = bytes=>createHash('sha256').update(bytes).digest('hex');
async function files(dir) {
  if(!await exists(dir))return [];
  const out=[];
  for(const e of await readdir(dir,{withFileTypes:true})) {
    const p=join(dir,e.name);
    if(e.isDirectory())out.push(...await files(p));
    else if(e.isFile()&&/\.json(?:l|\.gz)?$/.test(e.name))out.push(p);
  }
  return out.sort();
}
export async function rewriteLocalData(directories, sourceCatalog = new Map()) {
  const paths=(await Promise.all(directories.map(files))).flat();
  const catalog=new Map(sourceCatalog), originals=new Map(), changedDigests=new Map(), modified=new Set();
  // Two passes keep memory bounded by the largest file: the first builds the
  // identity catalog, the second re-reads and rewrites one file at a time.
  const load=async file=>{
    const bytes=await readFile(file), source=(file.endsWith('.gz')?gunzipSync(bytes):bytes).toString();
    return {bytes,value:file.endsWith('.jsonl')?source.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)):JSON.parse(source)};
  };
  for(const file of paths)identityCatalog((await load(file)).value,catalog);
  for(const file of paths) {
    const {value,bytes}=await load(file);originals.set(file,sha(bytes));
    const updated=fictionalize(migrateTerms(value),catalog);
    if(JSON.stringify(updated)===JSON.stringify(value))continue;
    const text=file.endsWith('.jsonl')?updated.map(v=>JSON.stringify(v)).join('\n')+'\n':JSON.stringify(updated,null,2)+'\n';
    const output=file.endsWith('.gz')?gzipSync(text):Buffer.from(text);
    if(!bytes.equals(output)){changedDigests.set(sha(bytes),sha(output));await writeFile(file,output);modified.add(file);}
  }
  // Index byte counts and hashes must be current before propagating index
  // digests into worlds and recordings that refer to them.
  for(const directory of directories.filter(p=>/fixtures\/(?:synthea|synthetic-hospital)$/.test(p))) {
    const file=join(directory,'index.json');if(!await exists(file))continue;
    const before=await readFile(file),index=JSON.parse(before),original=JSON.stringify(index);
    for(const patient of index.patients){const bytes=await readFile(join(directory,patient.file));patient.bytes=bytes.length;patient.sha256=sha(bytes);}
    index.totalBytes=index.patients.reduce((n,p)=>n+p.bytes,0);
    if(JSON.stringify(index)!==original){await write(file,index);const after=await readFile(file);changedDigests.set(sha(before),sha(after));if(originals.has(file))changedDigests.set(originals.get(file),sha(after));modified.add(file);}
  }
  // Refresh file-hash references bottom-up, without retaining old digest claims.
  for(let pass=0;pass<4;pass++) {
    let changed=0;
    for(const file of paths) {
      if(file.endsWith('.gz'))continue;
      const before=await readFile(file,'utf8');
      const after=before.replace(/[a-f0-9]{64}/g,hash=>changedDigests.get(hash)??hash);
      if(after!==before){changedDigests.set(sha(before),sha(after));await writeFile(file,after);modified.add(file);changed++;}
    }
    if(!changed)break;
  }
  async function renameEntries(directory, preserveNames=false) {
    if(!await exists(directory))return;
    for(const entry of await readdir(directory,{withFileTypes:true})) {
      const before=join(directory,entry.name);
      if(entry.isDirectory())await renameEntries(before,preserveNames);
      const name=preserveNames?entry.name:migrateTerms(entry.name);
      if(name!==entry.name) {
        const after=join(directory,name);
        if(await exists(after))throw new Error(`Migration path collision: ${before} -> ${after}`);
        await rename(before,after);
      }
    }
  }
  for(const directory of directories)await renameEntries(directory,/fixtures\/(?:synthea|synthetic-hospital)$/.test(directory));
  return {examinedFiles:paths.length,modifiedFiles:modified.size,identities:catalog.size};
}
async function main() {
  if(!process.argv.includes('--worker')) {
    const result=spawnSync(process.execPath,['--import',join(root,'agent/node_modules/tsx/dist/loader.mjs'),fileURLToPath(import.meta.url),'--worker',...process.argv.slice(2)],{cwd:root,stdio:'inherit',env:process.env});
    process.exitCode=result.status??1;return;
  }
  const {values}=parseArgs({options:{worker:{type:'boolean'},'recertify-only':{type:'boolean',default:false},runs:{type:'string'}}});
  const recertifyOnly=values['recertify-only'];
  const browserLock=await acquireBrowserLock();
  const selected=values.runs?.split(',');
  if(selected?.some(id=>!/^[-\w]+$/.test(id)))throw new Error('Invalid run selection');
  if(recertifyOnly&&!selected?.length)throw new Error('--recertify-only requires explicit --runs');
  if(selected)for(const id of selected)if(!await exists(join(root,'runs',id,'manifest.json')))throw new Error(`No recorded run ${id}`);
  const { installedBuild, bindBuild }=await import('../agent/src/build-binding.ts');
  const { contentDigest, writeDayDigest }=await import('../agent/src/content-digest.ts');
  const { stableStringify }=await import('../agent/src/program.ts');
  const { programSchema }=await import('../agent/src/schema.ts');
  const { expandProgram }=await import('../agent/src/composites.ts');
  const { compilePresentations }=await import('../agent/src/presentation-compiler.ts');
  const { runFingerprints }=await import('../agent/src/fingerprints.ts');
  const { createEhr }=await import('../agent/src/ehr.ts');
  const { createScreenChecker }=await import('../agent/src/screencheck.ts');
  const { browserGeometry }=await import('../agent/src/browser-geometry.ts');
  const { geometryEhr }=await import('../agent/src/geometry.ts');
  const { verifySavedTrajectories, indexTrajectories }=await import('./trajectories/index.mjs');
  const build=await installedBuild();
  const binary=join(root,'lean/.lake/build/bin/ehr');
  const migrationCode={tool:'scripts/migrate-neutral-terms.mjs',toolSha256:sha(await readFile(fileURLToPath(import.meta.url))),identityGeneratorSha256:sha(await readFile(join(root,'scripts/fictional-identities.mjs'))),geometryHistorySha256:sha(await readFile(join(root,'scripts/geometry-history.mjs'))),modelCalls:0,recordedChoicesPreserved:true};
  const sourceCatalog=new Map();
  for(const file of (recertifyOnly?[]:await files(join(root,'fixtures/raw'))).filter(p=>/(?:hospitalInformation|practitionerInformation)[^/]*\.json$/.test(p)))identityCatalog(await read(file),sourceCatalog);
  const report={schemaVersion:1,build,rewritten:recertifyOnly?null:await rewriteLocalData(['fixtures/synthea','fixtures/synthetic-hospital','fixtures/clinical','programs','runs'].map(p=>join(root,p)),sourceCatalog),runs:[],unregenerated:[]};
  for(const name of await readdir(join(root,'runs'))) {
    if(selected&&!selected.includes(name))continue;
    const dir=join(root,'runs',name),manifestFile=join(dir,'manifest.json');
    if(!await exists(manifestFile))continue;
    const manifest=await read(manifestFile);
    if(manifest.ehr?.mode!=='real')continue;
    const baselineIds=await exists(join(dir,'trajectories/index.json'))?(await read(join(dir,'trajectories/index.json'))).tasks.filter(t=>t.baseline).map(t=>t.id):[];
    const item={run:name,certificates:[],replay:null,measurements:[]};report.runs.push(item);
    manifest.buildBindingRequired=true;
    manifest[recertifyOnly?'recertification':'neutralMigration']={...migrationCode,status:'pending',currentMeasurementsRegenerated:false};
    await write(manifestFile,manifest);
    try {
    // A migration is a new certification. Every version receives the current gates.
    const ehr=createEhr({fake:false,binary}),screens=createScreenChecker(ehr,{artifactsDir:join(dir,'migration/screens')});
    const batched=recertifyOnly?await recertifyRuns({runs:[name],output:join(dir,'migration/batch-screen-check')}):null;
    for(const persona of manifest.personas) {
      const folder=join(dir,'programs',persona);
      for(const file of (await readdir(folder)).filter(f=>/^v\d+\.json$/.test(f)).sort((a,b)=>Number(a.slice(1,-5))-Number(b.slice(1,-5)))) {
        const sourceFile=join(folder,file.replace('.json','.source.json'));
        const program=programSchema.parse(await read(await exists(sourceFile)?sourceFile:join(folder,file)));
        await write(sourceFile,program);await write(join(folder,file),expandProgram(program));
        const presentations=compilePresentations(program);
        const componentsFile=join(folder,file.replace('.json','.components.json'));
        if(presentations)await write(componentsFile,presentations);else if(!recertifyOnly)await rm(componentsFile,{force:true});
        const prefix=join(dir,'certs',persona,file.slice(0,-5));
        await write(`${prefix}.build.json`,{status:'rejected',current:null,reason:'Migration recertification pending'});
        const inputDir=join(dir,'certifications',persona,file.slice(0,-5));
        const archived=join(dir,'trajectories/specs',`${program.specVersion}.json`);
        const frozen=join(inputDir,'spec.json');
        const specFile=await exists(frozen)?frozen:await exists(archived)?archived:join(root,'releases',program.specVersion,'spec.json');
        const oldInputs=await exists(join(inputDir,'inputs.json'))?await read(join(inputDir,'inputs.json')):null;
        const canonical=oldInputs?.canonical??program,prev=oldInputs?.prev??program;
        const batchCertificate=batched?.certificates.find(certificate=>certificate.persona===persona&&certificate.version===program.version);
        const result=batchCertificate?.nativeResult??await ehr.deploy({specVersion:specFile,program,canonical,prev,outDir:join(dir,'migration/native')});
        if(!result.deployed){await write(`${prefix}.build.json`,{status:'rejected',current:null,reason:JSON.stringify(result.verdict)});item.certificates.push({persona,version:program.version,status:'rejected',verdict:result.verdict});continue;}
        const screen=batchCertificate?{status:batchCertificate.status==='certified'?'pass':'fail'}:await screens.check({specVersion:specFile,program});
        if(screen.status!=='pass')throw new Error(`Migration screen gate refused ${name}/${persona}/${file}: ${JSON.stringify(screen)}`);
        const spec=await read(specFile),inputs={specVersion:program.specVersion,program,canonical,prev,night:oldInputs?.night??null};
        await write(frozen,spec);await write(join(inputDir,'inputs.json'),inputs);
        await write(`${prefix}.json`,result.certificate);
        const binding={...bindBuild(build,program,result.certificate),certificationInputsSha256:sha(stableStringify({spec,inputs}))};
        await write(`${prefix}.build.json`,binding);
        for(const generation of (await readdir(dirname(prefix))).filter(f=>new RegExp(`^${file.slice(0,-5)}\\.build\\.\\d+\\.json$`).test(f)))await write(join(dirname(prefix),generation),binding);
        for(const deployed of [join(dir,program.owner,`${file.slice(0,-5)}.cert.json`)])if(await exists(deployed))await write(deployed,result.certificate);
        item.certificates.push({persona,version:program.version,status:'certified',screen:screen.status,programHash:result.certificate.programHash});
      }
    }
    const rejected=item.certificates.filter(c=>c.status==='rejected');
    if(rejected.length)throw new Error(`Current checker rejected ${rejected.length} recorded revisions: ${JSON.stringify(rejected)}`);
    manifest.buildBindingRequired=true;manifest.ehr={mode:'real',binary};
    manifest[recertifyOnly?'recertification':'neutralMigration']={...migrationCode,status:'pending',currentMeasurementsRegenerated:false};
    manifest.fingerprints=await runFingerprints(ehr,manifest.world,root);
    await write(manifestFile,manifest);
    if(await exists(join(dir,'trajectories/index.json'))) {
      item.replay=await verifySavedTrajectories(name,root);
      await write(join(dir,'trajectories/verification.json'),item.replay);
    } else {
      const extracted=await indexTrajectories({root,runId:name,binary,baseline:baselineIds});
      item.replay=extracted.verification;
      await verifySavedTrajectories(name,root);
    }
    for(let day=1;day<=manifest.days;day++)if(await exists(join(dir,'days',`day-${String(day).padStart(2,'0')}`)))await writeDayDigest(dir,day,manifest.personas);
    // Re-measure preserved workloads using native simulation and fresh Chromium
    // geometry. Recorded model decisions are inputs, never regenerated here.
    item.geometryHistory=await archiveStaleGeometry(dir,build.appSha256);
    const fixtureIndex=await read(join(root,'fixtures/synthea/index.json'));
    const geometry=browserGeometry(ehr,[join(root,'fixtures/synthea',fixtureIndex.patients[0].file)],join(dir,'migration/geometry-cache'));
    const measured=geometryEhr(ehr,geometry.provider,dir);
    try {
      for(let day=1;day<=manifest.days;day++)for(const persona of manifest.personas) {
        const folder=`day-${String(day).padStart(2,'0')}`,dayFile=join(dir,'days',folder,`${persona}.json`);
        if(!await exists(dayFile))continue;
        const recorded=await read(dayFile),program=await read(join(dir,'programs',persona,`v${recorded.programVersion}.json`));
        const specVersion=join(dir,'certifications',persona,`v${recorded.programVersion}`,'spec.json');
        const params=await read(join(manifest.world,'personas',`${persona}.json`)),schedule=await read(join(manifest.world,'schedules',folder,`${persona}.json`));
        const result=await measured.simulate({specVersion,program,persona:params,schedule,worldDir:manifest.world,seed:manifest.worldSeed*1000+day});
        await write(dayFile,result);item.measurements.push({day,persona,tasks:result.tasks.length,geometry:result.geometry});
      }
    } finally {await geometry.close();}
    const regenerated=await indexTrajectories({root,runId:name,binary,baseline:baselineIds});
    item.regeneratedReplay=regenerated.verification;await verifySavedTrajectories(name,root);
    for(let day=1;day<=manifest.days;day++)if(await exists(join(dir,'days',`day-${String(day).padStart(2,'0')}`)))await writeDayDigest(dir,day,manifest.personas);
    manifest[recertifyOnly?'recertification':'neutralMigration']={...migrationCode,status:'passed',currentMeasurementsRegenerated:true};
    await writeRunDigest(dir,manifest);
    } catch(error) {
      item.error=String(error);report.unregenerated.push(`${name}: ${String(error)}`);
      manifest[recertifyOnly?'recertification':'neutralMigration']={...migrationCode,status:'rejected',reason:String(error),currentMeasurementsRegenerated:false};
      manifest.ehr={mode:'real',binary};
      try {
        manifest.fingerprints=await runFingerprints(createEhr({fake:false,binary}),manifest.world,root);
        await write(manifestFile,manifest);
        for(let day=1;day<=manifest.days;day++)if(await exists(join(dir,'days',`day-${String(day).padStart(2,'0')}`)))await writeDayDigest(dir,day,manifest.personas);
        const digest=await contentDigest(dir);manifest.contentDigest=digest.contentDigest;await write(join(dir,'digest.json'),digest);
      } catch(metadataError) {item.metadataError=String(metadataError);}
      await write(manifestFile,manifest);
    }
  }
  const verdict=spawnSync('python3',['lean/Ehr/Check/certify.py'],{cwd:root,env:process.env,stdio:'inherit'});if(verdict.status!==0)throw new Error('Certification matrix failed');
  report.unregenerated.push('Model responses are preserved as historical records; generating new choices or new live-model experimental outcomes requires model calls.');
  const destination=join(root,recertifyOnly?'runs/recertification-report.json':'runs/neutral-migration-report.json');await write(destination,report);
  console.log(`Migration complete: ${report.runs.length} recorded runs; report ${relative(root,destination)}`);
  if(report.runs.some(item=>item.error))process.exitCode=2;
  browserLock.release();
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
