import {boundedSearch,unavailable,coverage,aggregate} from './search.mjs';
import {pointerTravel} from '../../app/src/metrics/geometry.ts';
import { archivedReleaseId, releaseLabel } from '../historical-releases.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, readdir, mkdir, mkdtemp, rm, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const exec = promisify(execFile);
// Limit Lean children while allowing Node's WebAssembly runtime to reserve its address space.
const leanMemoryKb = Number(process.env.EHR_LEAN_MEMORY_KB ?? 12000000);
if (!Number.isSafeInteger(leanMemoryKb) || leanMemoryKb < 1) throw new Error('EHR_LEAN_MEMORY_KB must be a positive integer');
const run = (bin, args, options = {}) => bin === 'lake'
  ? exec('bash', ['-c', `ulimit -v ${leanMemoryKb}; exec lake "$@"`, 'lake', ...args], {timeout:180000,env:{...process.env,LEAN_NUM_THREADS:'6',LEAN_STACK_SIZE_KB:'65536'},...options})
  : exec(bin,args,{timeout:Number(process.env.EHR_COMMAND_TIMEOUT_MS??600000),...options});
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const write = (p, data) => writeFile(p, JSON.stringify(data,(key,value)=>/klm/i.test(key)?undefined:value,2) + '\n');
const metrics = ['clicks','keystrokes','scrolls','scrollPx','mouseTravelPx','screens','requiredFields','popups'];
export const sum = rows => Object.fromEntries(metrics.map(m => [m, rows.every(r=>typeof r[m]==='number')?Math.round(rows.reduce((n,r)=>n+r[m],0)*1000)/1000:null]));
const exists = async p => { try { await access(p); return true; } catch { return false; } };

const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])])) : value;
const shape = program => JSON.stringify(stable({ screens: program.screens, start: program.start, macros: program.macros, specVersion: program.specVersion }));

export async function compute({ runDir, canonical, releaseDirectory, canonicalOutput, taskTimeoutMs=10000, searchBound=5000 } = {}) {
  canonical??=!runDir;
  if(!Number.isSafeInteger(taskTimeoutMs)||taskTimeoutMs<1||!Number.isSafeInteger(searchBound)||searchBound<1)throw new Error('Task time and search bound must be positive integers');
  if (process.env.EHR_FAKE === '1') throw new Error('Complexity requires the real EHR; EHR_FAKE is forbidden');
  const lean = path.resolve(process.env.EHR_LEAN_DIR ?? path.join(root, 'lean'));
  const binary = process.env.EHR_BIN ?? path.join(lean, '.lake/build/bin/ehr');
  if (!await exists(binary)) throw new Error('Build ehr with (cd lean && lake build ehr), or set EHR_BIN and EHR_LEAN_DIR to the matching build');
  const suiteBytes = await readFile(path.join(root, 'programs/benchmarks/suite.json'), 'utf8');
  const suite = JSON.parse(suiteBytes);
  let releaseSource = suite.releaseSource;
  if (!releaseDirectory && runDir) {
    const manifest = await read(path.join(runDir, 'manifest.json'));
    const persona = manifest.personas[0];
    const baselinePath = [path.join(runDir, 'programs', persona, 'v0.json'), path.join(runDir, persona, 'v0.json')];
    const candidate = (await Promise.all(baselinePath.map(exists))).findIndex(Boolean);
    if (candidate >= 0) {
      const baseline = await read(baselinePath[candidate]);
      const frozen = await read(path.join(root, suite.releaseSource.directory, baseline.specVersion, 'personas', `${persona}.json`));
      if (shape(baseline) !== shape(frozen)) releaseDirectory = 'releases';
    }
  }
  if (releaseDirectory) releaseSource = { directory: path.relative(root, path.resolve(root, releaseDirectory)), reason: 'Explicit release source, or current release source selected because run v0 differs from the frozen historical canonical.' };
  const releaseRoot = path.resolve(root, releaseSource.directory);
  const work = await mkdtemp(path.join(tmpdir(), 'vgi-complexity-'));
  try {
    // Build an adapter outside lean/. Link the exact same Ehr object files as the native CLI.
    const source = path.join(root, 'scripts/complexity/Measure.lean');
    const c = path.join(work, 'Measure.c');
    const helper = path.join(work, 'ehr-benchmark');
    await run('lake', ['env', 'lean', '-j6', `--root=${root}`, '-c', c, source], { cwd: lean });
    const rsp = await readFile(path.join(lean, '.lake/build/bin/ehr.rsp'), 'utf8');
    const objects = [...rsp.matchAll(/"([^"\n]+\.o\.export)"/g)].map(x => x[1]).filter(p => !p.endsWith('/Main.c.o.export'));
    if (!objects.length) throw new Error('Missing native CLI link objects; rebuild ehr');
    await run('lake', ['env', 'leanc', '-O2', '-o', helper, c, ...objects], { cwd: lean, maxBuffer: 8e6 });
    const archive = releaseSource.directory === suite.releaseSource.directory;
    const releasePath = id => archive ? archivedReleaseId(id) : id;
    const provenance = {
      releaseNaming: 'integer',
      suite: suite.id, releaseSource, suiteSha256: hash(suiteBytes), ehrSha256: hash(await readFile(binary)),
      geometryModelSha256:hash(await readFile(path.join(root,'app/src/metrics/geometry.ts'))),adapterSha256: hash(await readFile(source)),
      taskLimits:{timeoutMs:taskTimeoutMs,bound:searchBound},aggregateScope:'Computed tasks only; unavailable tasks are excluded, with explicit coverage counts.',
      search: 'Certified exact within reported space; full excludes Back, scrolling and search. Auto may use goalDirected or navigationDirected. No global-minimum claim for directed spaces.',
      measurement: 'Clicks and keystrokes independently optimized. Other metrics replay the minimum-click path; Pixel travel is measured on the minimum-click trace where a matching Chromium atlas exists; it is not a movement minimum. Missing geometry is unavailable. Hotkeys used whenever available; no interruptions/detours. Screens count visits including initial screen and episode resets. Required fields count distinct required element/slot entries or confirmations per episode.',
      fixedChoices: 'Native ehr min-clicks is also recorded. Benchmark adapter pins fixedValues in the derived Goals (the stock TaskChoices lacks diagnosis, service level and refill-count fields), then calls the same certified jointMinimum and public interpreter. No checker or clinical rules are reimplemented.',
      floor: 'Ehr.Sim.floorMetrics for the same pinned goals and release. Ideal interface has one screen per clinical episode with no geometric floor claimed; field count excludes auto-linked nonhuman fields.',
    };
    const cache = new Map();
    async function iteration(program, specVersion, version, sourcePath, world, day = null, night = null, frozenSpec) {
      const iterationWork=await mkdtemp(path.join(work,'iteration-'));
      const programPath = path.join(iterationWork, 'program.json');
      await write(programPath, program);
      const specPath=frozenSpec&&await exists(frozenSpec)?frozenSpec:path.join(releaseRoot,specVersion,'spec.json');
      const spec = await read(specPath);
      const presentWorkflows = new Set(program.screens.map(s => s.workflow));
      const tasks = [], skipped = [];
      for (const benchmark of suite.cases) {
        const commits = benchmark.requiredCommits;
        if (!presentWorkflows.has(benchmark.workflow) || !commits.every(id => spec.commits.some(c => c.id === id && c.roles.includes(program.role)))) {
          skipped.push({ workflow: benchmark.workflow, reason: 'role projection: task commits not supported' });
          continue;
        }
        for (const step of benchmark.steps) {
          const task = { ...step, persona: program.owner };
          const key = hash(JSON.stringify([program, specVersion, task, benchmark.fixedValues, world]));
          let measured = cache.get(key);
          if (!measured) {
            measured=await boundedSearch(async ({signal,remaining})=>{
              const requestPath=path.join(iterationWork,'request.json');
              await write(requestPath,{root,world,spec:specPath,program:programPath,task,fixedValues:benchmark.fixedValues,bound:searchBound});
              const pending=run(helper,[requestPath],{cwd:root,maxBuffer:32e6,timeout:remaining(),signal,killSignal:'SIGKILL'});
              pending.child.stderr.on('data',chunk=>process.stderr.write(chunk));
              const result=JSON.parse((await pending).stdout);
              if(result.status==='not-computed')return unavailable('search bound',result.reason);
              if(!result.supported)throw new Error(result.reason??'Unsupported benchmark');
              const taskPath=path.join(iterationWork,'task.json');await write(taskPath,task);
              const native=await run(binary,['min-clicks','--spec',specPath,'--program',programPath,'--task',taskPath,'--world',world,'--bound',String(searchBound)],{cwd:root,maxBuffer:32e6,timeout:remaining(),signal,killSignal:'SIGKILL'});
              result.native=JSON.parse(native.stdout);
              if(result.native.exact!==true)throw new Error('Native binary does not report certified joint search');
              return result;
            },{timeoutMs:taskTimeoutMs});
            cache.set(key,measured);
          }
          if(measured.status==='not-computed'){
            tasks.push({id:task.id,workflow:benchmark.workflow,title:benchmark.title,patientId:task.patientId,...measured});
            console.log(`${program.owner}/${task.id}: ${measured.message}`);continue;
          }
          const geometryFile=runDir?path.join(path.resolve(runDir),'geometry',`${hash(JSON.stringify(stable(program)))}.json`):null;
          let geometry=null;if(geometryFile&&await exists(geometryFile)){
            const componentsFile=path.resolve(root,sourcePath).replace(/\.json$/,'.components.json'),components=await exists(componentsFile)?await read(componentsFile):[];
            const componentHash=hash(JSON.stringify(stable(components))),variant=geometryFile.replace(/\.json$/,`.${componentHash}.json`);
            geometry=await read(await exists(variant)?variant:geometryFile);if(geometry.componentsSha256&&geometry.componentsSha256!==componentHash)geometry=null;
          }
          const costs=geometry&&measured.geometryTrace?Object.values(pointerTravel(measured.geometryTrace,geometry)):[];
          measured={...measured,metrics:{...measured.metrics,scrolls:costs.length?costs.reduce((n,c)=>n+c.scrolls,0):null,mouseTravelPx:costs.length&&costs.every(c=>typeof c.mouseTravelPx==='number')?costs.reduce((n,c)=>n+c.mouseTravelPx,0):null,scrollPx:costs.length&&costs.every(c=>typeof c.scrollPx==='number')?costs.reduce((n,c)=>n+c.scrollPx,0):null},floor:{...measured.floor,scrolls:null,mouseTravelPx:null,scrollPx:null}};
          tasks.push({ id: task.id, workflow: benchmark.workflow, title: benchmark.title, patientId: task.patientId, ...measured });
        }
      }
      if (!tasks.length) throw new Error(`${program.owner} has no supported benchmark tasks`);
      const workflows = [...new Set(tasks.map(t => t.workflow))].map(workflow => {
        const ts = tasks.filter(t => t.workflow === workflow);
        return { workflow, metrics:aggregate(ts,'metrics',sum),floor:aggregate(ts,'floor',sum),coverage:coverage(ts) };
      });
      console.log(`${program.owner} v${version} (${specVersion}): ${aggregate(tasks,'metrics',sum).clicks??'not computed'} clicks · ${workflows.map(w => w.workflow).join(', ')}`);
      return { version, label: `v${version}`, specVersion: archive ? releaseLabel(specVersion, 'run1-P3') : specVersion, day, night, source: sourcePath, programSha256: hash(JSON.stringify(program)), tasks, skipped, workflows,coverage:coverage(tasks),total:aggregate(tasks,'metrics',sum),floor:aggregate(tasks,'floor',sum) };
    }
    if (canonical) {
      const iterations = [];
      for (const [version, release] of ['v1', 'v2', 'v3'].entries()) {
        const tasks = [];
        // One instance of each workflow, using its representative authorized role.
        for (const [persona, workflows] of Object.entries({ P1: ['W1', 'W2', 'W7'], P2: ['W3'], P3: ['W4'], P4: ['W5'], P5: ['W6'] })) {
          const full = await read(path.join(releaseRoot, releasePath(release), 'canonical.json'));
          const projection = { role: { P1: 'physician', P2: 'physician', P3: 'rn', P4: 'np', P5: 'surgeon' }[persona] };
          const selected = { ...full, role: projection.role, owner: persona, id: persona };
          // Keep a single workflow for canonical union accounting; no duplicate persona workflows.
          const saved = suite.cases;
          suite.cases = saved.filter(b => workflows.includes(b.workflow));
          try { tasks.push(...(await iteration(selected, releasePath(release), version, `${releaseSource.directory}/${releasePath(release)}/canonical.json`, path.join(root, suite.world))).tasks); }
          finally { suite.cases = saved; }
        }
        const workflows = suite.cases.map(b => ({ workflow: b.workflow, metrics:aggregate(tasks.filter(t=>t.workflow===b.workflow),'metrics',sum),floor:aggregate(tasks.filter(t=>t.workflow===b.workflow),'floor',sum),coverage:coverage(tasks.filter(t=>t.workflow===b.workflow)) }));
        iterations.push({ version, label: release, specVersion: release, tasks,workflows,coverage:coverage(tasks),total:aggregate(tasks,'metrics',sum),floor:aggregate(tasks,'floor',sum) });
      }
      await write(canonicalOutput ? path.resolve(canonicalOutput) : path.join(root, 'programs/benchmarks/canonical-complexity.json'), { schemaVersion: 1, ...provenance, iterations });
    }
    if (runDir) {
      runDir = path.resolve(runDir);
      const manifest = await read(path.join(runDir, 'manifest.json'));
      if (manifest.ehr.mode !== 'real') throw new Error('Cannot present fake runs as measured complexity');
      const pendingPeople = await Promise.allSettled(manifest.personas.map(async persona=>{
        let directory = path.join(runDir, 'programs', persona);
        if (!await exists(directory)) directory = path.join(runDir, persona);
        const files = (await readdir(directory)).filter(f => /^v\d+\.json$/.test(f)).sort((a, b) => Number(a.slice(1, -5)) - Number(b.slice(1, -5)));
        const decisions = [];
        const decisionRoot = path.join(runDir, 'decisions');
        for (const dir of await exists(decisionRoot) ? await readdir(decisionRoot) : []) {
          const file = path.join(runDir, 'decisions', dir, `${persona}.json`);
          if (await exists(file)) decisions.push(await read(file));
        }
        decisions.sort((a, b) => a.night - b.night);
        const iterations = [], markers = [];
        // Fixtures stay fixed even if a future run has a different/random world.
        const world = path.join(root, suite.world);
        for (const file of files) {
          const version = Number(file.slice(1, -5));
          const certPaths = [path.join(runDir, 'certs', persona, file), path.join(directory, `v${version}.cert.json`), path.join(runDir, persona, `v${version}.cert.json`)];
          const certPath = (await Promise.all(certPaths.map(exists))).findIndex(Boolean);
          if (certPath < 0) continue;
          const cert = await read(certPaths[certPath]);
          if (cert.verdict !== 'ok') continue;
          const recorded = await read(path.join(directory, file));
          const specVersion = cert.specVersion;
          const decision = decisions.find(d => d.versionAfter === version && d.versionAfter > d.versionBefore);
          const sourcePath=path.relative(root,path.join(directory,file));
          const program=recorded;
          iterations.push(await iteration(program,specVersion,version,sourcePath,world,version===0?1:decision?decision.night+1:null,decision?.night??null,path.join(runDir,'certifications',persona,`v${version}`,'spec.json')));
        }
        if (!iterations.length || iterations[0].version !== 0) throw new Error(`${persona}: missing certified baseline`);
        for (const d of decisions) {
          const rejected = d.candidates.filter(c => c.check.status === 'fail');
          if (rejected.length) markers.push({ kind: 'rejection', version: d.versionAfter, night: d.night, label: `Night ${d.night}: rejected proposals`, properties: [...new Set(rejected.map(c => c.check.property ?? 'unspecified'))] });
          if (d.release) markers.push({ kind: 'release', version: d.versionAfter, night: d.night, label: releaseLabel(d.release.id, manifest.runId), properties: [] });
        }
        return { persona, iterations, markers };
      }));
      const failure=pendingPeople.find(result=>result.status==='rejected');
      if(failure)throw failure.reason;
      const people=pendingPeople.map(result=>{if(result.status!=='fulfilled')throw new Error('Missing complexity worker');return result.value;});
      const output = { schemaVersion: 1, runId: manifest.runId, ...provenance, personas: people };
      await mkdir(runDir, { recursive: true });
      const destination = path.join(runDir, 'complexity.json');
      // Atomic replacement avoids serving partially written JSON from the dashboard.
      const { rename } = await import('node:fs/promises');
      await write(`${destination}.tmp`, output);
      await rename(`${destination}.tmp`, destination);
      return output;
    }
  } finally { await rm(work, { recursive: true, force: true }); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let id;
  let canonical;
  let taskTimeoutMs=10000,searchBound=5000;
  let releaseDirectory;
  let canonicalOutput;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--run') { id = args[++i]; if (!id) throw new Error('--run requires a run id or directory'); }
    else if (args[i] === '--release-root') { releaseDirectory = args[++i]; if (!releaseDirectory) throw new Error('--release-root requires a directory'); }
    else if (args[i] === '--out') { canonicalOutput = args[++i]; if (!canonicalOutput) throw new Error('--out requires a JSON file'); }
    else if(args[i]==='--task-timeout-ms')taskTimeoutMs=Number(args[++i]);
    else if(args[i]==='--search-bound')searchBound=Number(args[++i]);
    else if(args[i]==='--with-canonical')canonical=true;
    else if (args[i] === '--no-canonical') canonical = false;
    else throw new Error(`Unknown argument ${args[i]}`);
  }
  const runDir = id ? (id.includes('/') ? path.resolve(id) : path.join(root, 'runs', id)) : undefined;
  await compute({ runDir, canonical, releaseDirectory, canonicalOutput,taskTimeoutMs,searchBound });
}
