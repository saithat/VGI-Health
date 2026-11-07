import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { multiscript } from './multiscript.mjs';
const root=resolve('.');
const allScreens=process.argv.includes('--all-screens');
const out=resolve(process.env.TMPDIR??'/home/saithat/Projects/run-tmp','ui-library-port');
mkdirSync(out,{recursive:true});
const programs=new Map();
const programDigests=new Set();
function matchingSpec(path,p) {
  const recorded=path.match(/runs\/core-10day\/programs\/(P[0-9]+)\/(v[0-9]+)(?:\.source)?\.json$/);
  const choices=[recorded?join(root,'runs/core-10day/certifications',recorded[1],recorded[2],'spec.json'):'',join(root,'releases',p.specVersion,'spec.json'),join(root,'programs/benchmarks/releases',p.specVersion,'spec.json')];
  const spec=choices.find(p=>p&&existsSync(p));
  if(!spec) throw new Error(`No matching spec for ${path}`);
  return spec;
}
let scanned=0;
function visit(dir) {
  for(const entry of readdirSync(dir,{withFileTypes:true})) {
    const path=join(dir,entry.name);
    if(entry.isDirectory()) visit(path);
    else if(entry.name.endsWith('.json')) {
      let json;try{json=JSON.parse(readFileSync(path,'utf8'));}catch{continue;}
      if(!Array.isArray(json?.screens)) continue;
      scanned++;
      if(!allScreens&&!json.screens.some(s=>s.id==='w1Sign')) continue;
      // Bind aliases to both program and matching spec, including frozen specs.
      const programHash=createHash('sha256').update(JSON.stringify(json)).digest('hex');
      programDigests.add(programHash);
      const hash=createHash('sha256').update(programHash).update('\0').update(readFileSync(matchingSpec(path,json))).digest('hex');
      if(!programs.has(hash)) programs.set(hash,[]);
      programs.get(hash).push(path);
    }
  }
}
for(const dir of ['releases','programs','runs/core-10day/programs','runs/core-10day/baselines']) visit(join(root,dir));
const paths=[...programs.values()].map(aliases=>{
  const path=aliases[0],p=JSON.parse(readFileSync(path,'utf8'));
  const spec=matchingSpec(path,p);
  return [path,spec];
});
writeFileSync(join(out,'programs.json'),JSON.stringify(paths));
const fhir=readdirSync(join(root,'fixtures/synthea')).filter(p=>p.endsWith('.json')&&p!=='index.json').sort()[0];
if(!fhir) throw new Error('Missing local synthetic FHIR bundle');
const run=spawnSync(join(root,'lean/.lake/build/bin/ui-port-audit'),[join(out,'programs.json'),join(root,'fixtures/synthea',fhir),...(allScreens?['--all-screens']:[])],{cwd:join(root,'lean'),encoding:'utf8',stdio:['ignore','pipe','inherit'],maxBuffer:512*1024*1024});
if(run.status!==0) throw new Error(run.stderr||run.stdout);
writeFileSync(join(out,'results.jsonl'),run.stdout);
const results=run.stdout.trim().split('\n').map(x=>JSON.parse(x));
const sample=results.find(r=>r.sample)?.sample;
if(sample) {
  writeFileSync(join(out,'sample-screen.json'),JSON.stringify(sample));
  const painted=spawnSync(join(root,'lean/.lake/build/bin/ui-layout'),[],{input:JSON.stringify({op:'port',screen:sample})+'\n',encoding:'utf8',maxBuffer:32*1024*1024});
  if(painted.status!==0) throw new Error(painted.stderr);
  writeFileSync(join(out,'sample-layout.json'),painted.stdout);
}
const checks=results.flatMap(r=>r.checks);
const classChecks=results.flatMap(r=>r.classChecks);
const failed=checks.filter(c=>!c.accepted);
const rules={};for(const c of failed) for(const f of c.findings.filter(f=>!f.warning)) rules[f.rule]=(rules[f.rule]??0)+1;
const baselineArg=process.argv.indexOf('--baseline');
const baselinePath=baselineArg>=0?process.argv[baselineArg+1]:join(process.env.TMPDIR??'/home/saithat/Projects/run-tmp','ui-library-port-before-scope.jsonl');
const baseline=baselinePath&&existsSync(baselinePath)?readFileSync(baselinePath,'utf8').trim().split('\n').map(line=>{
  const row=JSON.parse(line);
  // Baseline evidence records absolute paths from its source checkout. Rebase
  // only known repository corpus roots; all lookups below use this checkout.
  const suffix=row.path.match(/\/(releases|programs|runs)\/.+$/)?.[0];
  if(!suffix) throw new Error(`Unknown baseline corpus path ${row.path}`);
  return {...row,path:join(root,suffix.slice(1))};
}):[];
const prior=[];
for(const row of baseline) {
  const now=results.find(r=>r.path===row.path);
  for(const old of row.checks.filter(c=>c.findings.some(f=>f.rule==='G9'&&!f.warning))) {
    const next=now?.checks.find(c=>(!allScreens||c.screen==='w1Sign')&&c.variant===old.variant&&c.viewport.w===old.viewport.w&&c.viewport.h===old.viewport.h);
    prior.push({path:row.path,variant:old.variant,category:row.path.includes('/programs/bad/')?'bad-program':'benchmark',exempt:next?.g9Exempt??false,stillRejected:next?!next.g9Passed:true});
  }
}
// The layout scope exemption does not waive the existing clinical checker.
// Recheck only the two previously G9-failing intentionally bad inputs.
const clinicalBad=[];
for(const path of [...new Set(prior.filter(c=>c.category==='bad-program').map(c=>c.path))]) {
  const pair=paths.find(p=>p[0]===path);
  if(!pair) throw new Error(`Missing audited input ${path}`);
  const canonical=join(dirname(pair[1]),'canonical.json');
  if(!existsSync(canonical)) throw new Error(`Missing canonical ${canonical}`);
  const checked=spawnSync(join(root,'lean/.lake/build/bin/ehr'),['check','--spec',pair[1],'--program',path,'--canonical',canonical],{encoding:'utf8',maxBuffer:16*1024*1024});
  if(![0,1].includes(checked.status)) throw new Error(checked.stderr||checked.stdout);
  clinicalBad.push({path,rejected:checked.status===1,verdict:JSON.parse(checked.stdout)});
}
const scopeComparison={previousG9Checks:prior.length,nowExempt:prior.filter(c=>c.exempt).length,remainingG9Rejections:prior.filter(c=>c.stillRejected).length,badProgramChecks:prior.filter(c=>c.category==='bad-program').length,benchmarkChecks:prior.filter(c=>c.category==='benchmark').length,clinicalBad};
writeFileSync(join(out,'scope-comparison.json'),JSON.stringify({baselinePath,scopeComparison,checks:prior},null,2)+'\n');
const corpusScreen=structuredClone(sample);
if(!corpusScreen) throw new Error('Missing W1 sample for multi-script port corpus');
corpusScreen.banner.push(['Multi-script corpus',multiscript.map(([,s])=>s).join(' | ')]);
const corpusRun=spawnSync(join(root,'lean/.lake/build/bin/ui-layout'),[],{input:JSON.stringify({op:'port',screen:corpusScreen})+'\n',encoding:'utf8',maxBuffer:32*1024*1024});
if(corpusRun.status!==0) throw new Error(corpusRun.stderr);
const corpus=JSON.parse(corpusRun.stdout);
if(!corpus.accepted) throw new Error('Multi-script port corpus rejected: '+JSON.stringify(corpus.findings));
writeFileSync(join(out,'multiscript-layout.json'),JSON.stringify(corpus));
const clinicalScratch=join(out,'clinical-inputs');
mkdirSync(clinicalScratch,{recursive:true});
function clinicalArgs(path,spec,index) {
  const inputs=join(dirname(spec),'inputs.json');
  if(existsSync(inputs)) {
    const frozen=JSON.parse(readFileSync(inputs,'utf8'));
    if(!Array.isArray(frozen.canonical?.screens)) throw new Error(`Missing frozen canonical in ${inputs}`);
    const canonical=join(clinicalScratch,`${index}.canonical.json`);
    writeFileSync(canonical,JSON.stringify(frozen.canonical));
    const args=['check','--spec',spec,'--program',path,'--canonical',canonical];
    if(frozen.prev) {
      const prev=join(clinicalScratch,`${index}.previous.json`);
      writeFileSync(prev,JSON.stringify(frozen.prev));args.push('--prev',prev);
    }
    return args;
  }
  const canonical=join(dirname(spec),'canonical.json');
  if(!existsSync(canonical)) throw new Error(`Missing canonical ${canonical}`);
  return ['check','--spec',spec,'--program',path,'--canonical',canonical];
}
const coverage=[];
if(allScreens) for(const [i,[path,spec]] of paths.entries()) {
  const p=JSON.parse(readFileSync(path,'utf8'));
  if(results[i].programCertificate?.theorem!=='Ehr.Layout.Range.checkProgram_sound') throw new Error(`Missing program range certificate: ${path}`);
  const clinical=spawnSync(join(root,'lean/.lake/build/bin/ehr'),clinicalArgs(path,spec,i),{encoding:'utf8',maxBuffer:16*1024*1024});
  if(![0,1].includes(clinical.status)) throw new Error(clinical.stderr||clinical.stdout);
  const aliases=[...programs.values()][i].map(p=>p.slice(root.length+1));
  const canonicalProgram=aliases.some(a=>a.endsWith('/canonical.json'));
  const acceptedPersona=!canonicalProgram&&clinical.status===0;
  coverage.push({aliases,programSha256:createHash('sha256').update(JSON.stringify(p)).digest('hex'),specSha256:createHash('sha256').update(readFileSync(spec)).digest('hex'),canonicalProgram,acceptedPersona,clinicalAccepted:clinical.status===0,
    universallyCovered:results[i].programCertificate.accepted,certificate:results[i].programCertificate,
    reason:results[i].programCertificate.accepted?null:'program-class-check-declined',
    screens:p.screens.map(sc=>({screen:sc.id,universallyCovered:results[i].programCertificate.accepted,
      reason:results[i].programCertificate.accepted?null:'program-class-check-declined',
      probedClasses:[...new Set(results[i].classChecks.filter(c=>c.screen===sc.id).map(c=>c.classAccepted?'fixed-shell-v2':c.classDecline))]}))});
}
const classProbes={accepted:classChecks.filter(c=>c.classAccepted).length,total:classChecks.length,
  declinedByReason:Object.fromEntries([...new Set(classChecks.filter(c=>!c.classAccepted).map(c=>c.classDecline))].map(reason=>[reason,classChecks.filter(c=>c.classDecline===reason).length]))};
function coverageCounts(predicate) {
  const rows=coverage.filter(predicate);
  const unique=new Set(rows.map(p=>p.programSha256));
  const covered=new Set(rows.filter(p=>p.universallyCovered).map(p=>p.programSha256));
  return {covered:covered.size,total:unique.size,uniquePrograms:unique.size,contexts:rows.length,coveredContexts:rows.filter(p=>p.universallyCovered).length};
}
const programCoverage=allScreens?{
  canonical:coverageCounts(p=>p.canonicalProgram),
  acceptedPersona:coverageCounts(p=>p.acceptedPersona),
  note:'Universal coverage comes from programCertificate and its checked range theorem; finite probes are separate.'}:null;
writeFileSync(join(out,'uncovered.json'),JSON.stringify({programCoverage,programs:coverage},null,2)+'\n');
const report={schemaVersion:2,allScreens,scanned,matchingPaths:[...programs.values()].flat().length,uniquePrograms:programDigests.size,programSpecContexts:programs.size,variantsAndViewports:checks.length,accepted:checks.length-failed.length,rejected:failed.length,failureRules:rules,shellGeometry:{accepted:checks.filter(c=>c.shellAccepted).length,total:checks.length,g9Passed:checks.filter(c=>c.shellG9).length},fhir,admittedFamilies:results.filter(r=>r.familyCases>0&&r.familyAccepted).length,familyCases:results.reduce((sum,r)=>sum+r.familyCases,0),scopeComparison,classProbes,programCoverage,multiscript:{scripts:multiscript.map(([name])=>name),accepted:corpus.accepted},programAliases:[...programs.values()]};
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,programAliases:undefined},null,2));
