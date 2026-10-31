import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { z } from 'zod';

/** Repository root (agent/src/util.ts -> ../..). */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Resolve a user-supplied path against the directory pnpm was invoked from. */
export function resolveUserPath(p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(process.env['INIT_CWD'] ?? process.cwd(), p);
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + '\n');
}

export async function readJson<T extends z.ZodType>(file: string, schema: T): Promise<z.infer<T>> {
  const text = await readFile(file, 'utf8');
  const parsed = schema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(`${file}: ${first ? `${first.path.join('.')}: ${first.message}` : 'invalid'}`);
  }
  return parsed.data;
}

export async function readJsonIfExists<T extends z.ZodType>(file: string, schema: T): Promise<z.infer<T> | null> {
  return existsSync(file) ? readJson(file, schema) : null;
}

export const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Small deterministic PRNG (mulberry32) so runs are reproducible from a seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string (FNV-1a), for seeding per-(night, persona) RNGs. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
