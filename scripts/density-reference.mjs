// Reference measurements are independent of candidate admission. Cache raw DOM
// counts by tree and complete painter context; never cache a threshold verdict.
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { contextDigest, treeDigest, cacheRoot, screenContext, readResult, resultKey } from './screen-results.mjs';

export function screenLimits(samples) {
  const limits = Object.create(null);
  for (const sample of samples) {
    if (typeof sample.screen !== 'string' || !sample.screen || !Number.isInteger(sample.maximum) || sample.maximum < 0)
      throw Error('Incomplete R5 reference measurement');
    limits[sample.screen] = Math.max(limits[sample.screen] ?? 0, sample.maximum);
  }
  return limits;
}
export function densityFindings(trees, limits, fallback = 57) {
  return trees.flatMap(tree => {
    if (tree.probe) return [];
    if (!tree.density?.length) throw Error(`Missing R5 measurement: ${tree.file}`);
    return tree.density.flatMap(sample => {
      const limit = Object.hasOwn(limits, sample.screen) ? limits[sample.screen] : fallback;
      if (!Number.isInteger(limit) || limit < 0) throw Error('Invalid R5 limit');
      return sample.maximum > limit ? [{file:tree.file, screen:sample.screen, phase:sample.phase,
        measured:sample.maximum, limit, message:`R5 ${sample.screen}: ${sample.maximum} active targets > limit ${limit} (${sample.phase})`}] : [];
    });
  });
}
export async function measureReference(files, {appDir, output, env = process.env} = {}) {
  const started = performance.now();
  const { chromium } = await import('../app/node_modules/@playwright/test/index.mjs');
  const painterContext = screenContext(appDir, chromium.executablePath(), env);
  const gateContext = contextDigest(painterContext);
  const context = contextDigest({screen:painterContext,
    collector:contextDigest(readFileSync(resolve(appDir,'e2e/action-density.spec.ts'),'utf8'))});
  const directory = join(cacheRoot(env), 'density');
  if (!files.length) throw Error('Empty R5 reference');
  const unique = new Map(files.map(file => [treeDigest(file), file]));
  const complete=(file,payload)=>{
    try {
      screenLimits(payload);
      const tree=JSON.parse(readFileSync(file,'utf8'));
      const phases=tree.modal?['active','background-probe']:['active'];
      return payload.length===phases.length && phases.every(phase=>payload.some(s=>s.phase===phase && s.screen===tree.screen));
    } catch {return false;}
  };
  const samples = new Map();
  const missing = [];
  for (const [hash, file] of unique) {
    const key = contextDigest({context, hash});
    let payload;
    if (env.EHR_SCREEN_CACHE !== '0') try {
      const receipt = JSON.parse(readFileSync(join(directory,`${key}.json`),'utf8'));
      if (receipt.key === key && receipt.sha256 === contextDigest(receipt.payload)) payload = receipt.payload;
    } catch { /* cache miss */ }
    // Ordinary gate counts are equally valid reference measurements.
    if (!payload && env.EHR_SCREEN_CACHE !== '0') {
      const prior = readResult(cacheRoot(env),resultKey(gateContext,hash));
      if (prior?.density?.length) payload = prior.density;
    }
    if (payload?.length && complete(file,payload)) { samples.set(file,payload); }
    else missing.push(file);
  }
  if (missing.length) {
    const manifest = join(output,'reference-manifest.json'), report = join(output,'reference-playwright.json');
    writeFileSync(manifest,JSON.stringify(missing));
    const result = spawnSync(process.execPath,[resolve(appDir,'node_modules/@playwright/test/cli.js'),
      'test','action-density.spec.ts','--project','desktop','--workers',String(Math.max(1,Math.min(4,Number(env.EHR_SCREEN_WORKERS ?? 4)||4))),
      '--grep','R5 measurement batch','--reporter','list,json','--output',join(output,'reference-tests')],
      {cwd:appDir,stdio:'inherit',env:{...env,APP_TEST_PREVIEW:'1',EHR_DENSITY_MANIFEST:manifest,PLAYWRIGHT_JSON_OUTPUT_NAME:report}});
    if (result.status !== 0) throw Error(`R5 reference measurement failed (${result.status})`);
    function visit(suite) {
      for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) for (const run of test.results ?? [])
        for (const a of run.attachments ?? []) if (a.name === 'action-density-batch')
          for (const sample of JSON.parse(a.path ? readFileSync(a.path,'utf8') : Buffer.from(a.body,'base64').toString()))
            samples.set(sample.file,[...(samples.get(sample.file) ?? []),sample]);
      for (const child of suite.suites ?? []) visit(child);
    }
    visit(JSON.parse(readFileSync(report,'utf8')));
    for (const file of missing) {
      const payload = samples.get(file);
      if (!payload?.length || !complete(file,payload)) throw Error(`Missing R5 reference state: ${file}`);
      screenLimits(payload);
      if (env.EHR_SCREEN_CACHE !== '0') {
        mkdirSync(directory,{recursive:true});
        const key = contextDigest({context,hash:treeDigest(file)}), target=join(directory,`${key}.json`), temp=`${target}.${randomUUID()}.tmp`;
        writeFileSync(temp,JSON.stringify({key,sha256:contextDigest(payload),payload})); renameSync(temp,target);
      }
    }
  }
  const limits = screenLimits([...samples.values()].flat());
  const result = {context,key:contextDigest({context,trees:[...unique.keys()].sort()}),limits,trees:unique.size,measured:missing.length,reused:unique.size-missing.length,elapsedMs:Math.round(performance.now()-started)};
  process.stdout.write(`R5 reference: ${JSON.stringify(result)}\n`);
  return result;
}
