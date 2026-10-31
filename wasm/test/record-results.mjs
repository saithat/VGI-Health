import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cpus, platform, arch } from 'node:os';

function read(name) {
  return JSON.parse(readFileSync(new URL(`../.build/${name}`, import.meta.url), 'utf8'));
}
const hashes = {};
for (const name of ['ehr.wasm', 'ehr-init.wasm']) {
  hashes[name] = createHash('sha256').update(readFileSync(new URL(`../dist/${name}`, import.meta.url))).digest('hex');
}
const result = {
  measuredAt: new Date().toISOString(),
  machine: { platform: platform(), arch: arch(), cpuModel: cpus()[0]?.model, logicalCpus: cpus().length },
  build: read('build-result.json'),
  json: read('node-json-result.json'),
  init: read('node-init-result.json'),
  browser: read('browser-result.json'),
  sha256: hashes,
};
writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
