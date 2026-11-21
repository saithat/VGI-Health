import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { dataState, verifyArchive } from './fetch-data.mjs';

async function scratch(t) {
  const dir = await mkdtemp(join(tmpdir(), 'vgi-fetch-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('requires a unique published checksum matching both the pin and the archive bytes', async t => {
  const dir = await scratch(t);
  const file = 'sample.tar.gz';
  const path = join(dir, file);
  await writeFile(path, 'archive');
  const sha256 = createHash('sha256').update('archive').digest('hex');
  const entry = `${sha256}  ${file}\n`;
  const verify = sums => verifyArchive(path, sums, { file, sha256 });
  await verify(entry);
  for (const bad of ['', entry + entry, entry.replace(sha256, '0'.repeat(64)), entry.replace(file, 'other')])
    await assert.rejects(verify(bad), /SHA256SUMS/);
  await writeFile(path, 'changed');
  await assert.rejects(verify(entry), /SHA-256 mismatch/);
});

test('unrelated runs permit restore, but any partial dataset is preserved', async t => {
  const dir = await scratch(t);
  await mkdir(join(dir, 'runs/my-recording'), { recursive: true });
  assert.equal(await dataState(dir), 'missing');
  await mkdir(join(dir, 'fixtures'));
  await writeFile(join(dir, 'fixtures/keep'), 'original');
  await assert.rejects(dataState(dir), /Partial data: missing .*fixtures\/clinical/);
  assert.equal(await readFile(join(dir, 'fixtures/keep'), 'utf8'), 'original');
  await mkdir(join(dir, 'programs'));
  await mkdir(join(dir, 'runs/world/2'), { recursive: true });
  await assert.rejects(dataState(dir), /Partial data/);
});

test('a later start detects a missing release-only file', async t => {
  const dir = await scratch(t);
  for (const folder of ['fixtures', 'programs', 'runs/world/2'])
    await mkdir(join(dir, folder), { recursive: true });
  await writeFile(join(dir, 'fixtures/.vgi-data-source'), 'test-release');
  const file = 'programs/frozen-program.json';
  await writeFile(join(dir, 'fixtures/.vgi-data-files.json'), JSON.stringify([file]));
  await writeFile(join(dir, file), '{}');
  assert.equal(await dataState(dir), 'test-release');
  await rm(join(dir, file));
  await assert.rejects(dataState(dir), /Partial data: missing programs\/frozen-program.json/);
});
