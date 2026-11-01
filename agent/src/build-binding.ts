import { expandProgram } from './composites.js';
import { compilePresentations } from './presentation-compiler.js';
/** Agent sidecar: binds a native certificate to the exact renderer/interpreter build. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { buildBindingSchema, type BuildBinding } from '../../app/src/core/buildBinding.js';
import { sha256, stableStringify } from './program.js';
import type { Certificate, Program } from './schema.js';
import { REPO_ROOT } from './util.js';

export { buildBindingSchema, type BuildBinding };
export async function installedBuild(root = REPO_ROOT) {
  const build = z.object({ appSha256: z.string().regex(/^[a-f0-9]{64}$/) }).parse(JSON.parse(await readFile(path.join(root, 'app/dist/build.json'), 'utf8')));
  const manifest = z.object({ assets: z.record(z.string(), z.string()) }).parse(JSON.parse(await readFile(path.join(root, 'app/public/ehr/manifest.json'), 'utf8')));
  const actualWasm = await readFile(path.join(root, 'app/public/ehr/ehr-interp.wasm'));
  const { createHash } = await import('node:crypto');
  const wasmSha256 = createHash('sha256').update(actualWasm).digest('hex');
  if (manifest.assets['ehr-interp.wasm'] !== wasmSha256) throw new Error('WASM bytes do not match the installed manifest; rebuild before certification');
  return { appSha256: build.appSha256, wasmSha256, componentsSha256: sha256(stableStringify([])) };
}
export function bindBuild(build: Awaited<ReturnType<typeof installedBuild>>, program: Program, certificate: Certificate): BuildBinding {
  return buildBindingSchema.parse({ schemaVersion: 1, ...build, componentsSha256: sha256(stableStringify(compilePresentations(program) ?? [])), sourceProgramSha256: sha256(stableStringify(program)), programSha256: sha256(stableStringify(expandProgram(program))), certificateSha256: sha256(stableStringify(certificate)) });
}
