#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const root = resolve(import.meta.dirname, '../..');
export const cache = resolve(root, '.cache/synthetic-hospital');
export const source = JSON.parse(await readFile(new URL('./source.json', import.meta.url), 'utf8'));
export const sha256 = (data) => createHash('sha256').update(data).digest('hex');

export async function verifyCache(directory = cache) {
  for (const [file, expected] of Object.entries(source.files)) {
    if (sha256(await readFile(resolve(directory, file))) !== expected)
      throw new Error(`Checksum mismatch: ${file}; remove the cached file and fetch again`);
  }
}
export async function fetchSource(directory = cache) {
  await mkdir(directory, { recursive: true });
  for (const [file, expected] of Object.entries(source.files)) {
    const path = resolve(directory, file);
    let data;
    try { data = await readFile(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!data) {
      const response = await fetch(`https://raw.githubusercontent.com/sparkcpark/synthetic_hospital/${source.commit}/${file}`);
      if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
      data = Buffer.from(await response.arrayBuffer());
      if (sha256(data) !== expected) throw new Error(`Checksum mismatch: downloaded ${file}`);
      const temporary = `${path}.${process.pid}.tmp`;
      try { await writeFile(temporary, data); await rename(temporary, path); }
      finally { await rm(temporary, { force: true }); }
    }
    if (sha256(data) !== expected) throw new Error(`Checksum mismatch: cached ${file}`);
    console.log(`${file}: sha256 ${expected} verified (${data.length} bytes)`);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await fetchSource();
