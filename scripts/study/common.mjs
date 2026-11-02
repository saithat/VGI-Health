import path from 'node:path';
import { readFile, mkdir, open, link, unlink, realpath } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
export const root = path.resolve(import.meta.dirname, '../..');
export const read = async file => JSON.parse(await readFile(file, 'utf8'));
export const hash = value => createHash('sha256').update(typeof value === 'string' || value instanceof Uint8Array ? value : JSON.stringify(value)).digest('hex');
export function outputDir(value) {
  const dir = path.resolve(value ?? `runs/study-${new Date().toISOString().slice(0,10)}`);
  if (!/^study-[\w-]+$/.test(path.basename(dir)) || path.dirname(dir) !== path.join(root, 'runs'))
    throw Error('Output must be runs/study-<date-or-id>');
  return dir;
}
export async function ensureOutput(dir) {
  await mkdir(dir, { recursive: true, mode: 0o700 });
  if (await realpath(dir) !== dir || await realpath(path.dirname(dir)) !== path.join(root, 'runs'))
    throw Error('Study output may not use symlinks');
}
export async function writeNew(file, data) {
  const temporary = `${file}.pending-${randomUUID()}`;
  try {
    const handle = await open(temporary, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(data, null, 2) + '\n'); await handle.sync(); }
    finally { await handle.close(); }
    // Atomic publication with no replacement. Interrupted temporary files are not JSON exports.
    await link(temporary, file);
  } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}
export function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
}
