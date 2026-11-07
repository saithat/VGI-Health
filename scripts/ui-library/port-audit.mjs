import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root=resolve('.');
const out=resolve(process.env.TMPDIR??'/home/saithat/Projects/run-tmp','ui-library-port');
mkdirSync(out,{recursive:true});
const programs=new Map();
let scanned=0;
function visit(dir) {
  for(const entry of readdirSync(dir,{withFileTypes:true})) {
    const path=join(dir,entry.name);
    if(entry.isDirectory()) visit(path);
    else if(entry.name.endsWith('.json')) {
      let json;try{json=JSON.parse(readFileSync(path,'utf8'));}catch{continue;}
      if(!Array.isArray(json?.screens)) continue;
      scanned++;
      if(!json.screens.some(s=>s.id==='w1Sign')) continue;
      // Deduplicate byte-identical program inputs, retaining every path in evidence.
      const hash=createHash('sha256').update(JSON.stringify(json)).digest('hex');
      if(!programs.has(hash)) programs.set(hash,[]);
      programs.get(hash).push(path);
    }
  }
}
for(const dir of ['releases','programs','runs/core-10day/programs','runs/core-10day/baselines']) visit(join(root,dir));
const paths=[...programs.values()].map(aliases=>{
  const path=aliases[0],p=JSON.parse(readFileSync(path,'utf8'));
  const recorded=path.match(/runs\/core-10day\/programs\/(P[0-9]+)\/(v[0-9]+)(?:\.source)?\.json$/);
  const choices=[recorded?join(root,'runs/core-10day/certifications',recorded[1],recorded[2],'spec.json'):'',join(root,'releases',p.specVersion,'spec.json'),join(root,'programs/benchmarks/releases',p.specVersion,'spec.json')];
  const spec=choices.find(p=>p&&existsSync(p));
  if(!spec) throw new Error(`No matching spec for ${path}`);
  return [path,spec];
});
writeFileSync(join(out,'programs.json'),JSON.stringify(paths));
const fhir=readdirSync(join(root,'fixtures/synthea')).filter(p=>p.endsWith('.json')&&p!=='index.json').sort()[0];
if(!fhir) throw new Error('Missing local synthetic FHIR bundle');
const run=spawnSync(join(root,'lean/.lake/build/bin/ui-port-audit'),[join(out,'programs.json'),join(root,'fixtures/synthea',fhir)],{cwd:join(root,'lean'),encoding:'utf8',maxBuffer:128*1024*1024});
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
    const next=now?.checks.find(c=>c.variant===old.variant&&c.viewport.w===old.viewport.w&&c.viewport.h===old.viewport.h);
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
const report={scanned,matchingPaths:[...programs.values()].flat().length,uniquePrograms:programs.size,variantsAndViewports:checks.length,accepted:checks.length-failed.length,rejected:failed.length,failureRules:rules,fhir,admittedFamilies:results.filter(r=>r.familyAccepted).length,familyCases:results.reduce((sum,r)=>sum+r.familyCases,0),scopeComparison,programAliases:[...programs.values()]};
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,programAliases:undefined},null,2));
