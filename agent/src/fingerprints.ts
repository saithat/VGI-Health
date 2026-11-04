import { existsSync } from 'node:fs';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT } from './util.js';
import type { EhrClient } from './ehr.js';
export const fileHash = async (file: string) => createHash('sha256').update(await readFile(file)).digest('hex');
export async function treeHash(dir: string): Promise<string> {
  const hash = createHash('sha256');
  async function visit(root: string) {
    for (const entry of (await readdir(root, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      const file = path.join(root, entry.name);
      hash.update(path.relative(dir, file));
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) hash.update(await readFile(file));
      else throw new Error(`Refusing symlink in immutable run input: ${file}`);
    }
  }
  await visit(dir); return hash.digest('hex');
}
export async function runFingerprints(ehr: EhrClient, world: string, root = REPO_ROOT) {
  const specs: Record<string,string> = {};
  for (const release of ['v1','v2','v3']) specs[release] = await fileHash(path.join(root,'releases',release,'spec.json'));
  let fixtures='FAKE';
  const metadata=path.join(world,'manifest.json');
  if(ehr.mode==='real' && existsSync(metadata)) {
    const manifest=z.object({fixtures:z.object({index:z.string()})}).parse(JSON.parse(await readFile(metadata,'utf8')));
    fixtures=await treeHash(path.dirname(path.resolve(root,manifest.fixtures.index)));
  }
  return { boundedPointing:await fileHash(path.join(root,'app/src/dashboard/bounded-pointing.ts')), interactionModel:await treeHash(path.join(root,'app/src/metrics')),agent:await treeHash(path.join(root,'agent/src')), screenHarness:await treeHash(path.join(root,'app/scripts')), screenTests:await treeHash(path.join(root,'app/e2e')), playwright:await fileHash(path.join(root,'app/playwright.config.ts')), fixtures, ehr: ehr.binary ? await fileHash(ehr.binary) : 'FAKE', releases: specs, world: await treeHash(world),
    app: ehr.mode === 'real' ? z.object({appSha256:z.string().regex(/^[a-f0-9]{64}$/)}).parse(JSON.parse(await readFile(path.join(root,'app/dist/build.json'),'utf8'))).appSha256 : 'FAKE',
    wasm: await fileHash(path.join(root,'app/public/ehr/ehr-interp.wasm')) };
}
