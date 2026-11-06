import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

/** Presence only: malformed archive inputs must still fail their assertions. */
export function dataReason(...paths) {
  const missing = paths.filter(path => !existsSync(resolve(root, path)));
  return missing.length
    ? `needs ${missing.join(', ')}; restore these local files with their matching frozen recording inputs`
    : undefined;
}
