// Shared helpers for infra/scripts (setup.mjs, load.mjs).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const ENV_PATH = resolve(REPO_ROOT, '.env');

/** Identifier system for VGI-managed resources (personas, loaded fixture files). */
export const VGI_SYSTEM_BASE = 'https://vgi-health.example/fhir/sid';
export const PERSONA_SYSTEM = `${VGI_SYSTEM_BASE}/persona`;
export const FIXTURE_FILE_SYSTEM = `${VGI_SYSTEM_BASE}/fixture-file`;

/** Parses a dotenv file into an ordered list of lines plus a key -> value map. */
export function readEnvFile(path = ENV_PATH) {
  const text = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const lines = text === '' ? [] : text.replace(/\n$/, '').split('\n');
  const values = {};
  for (const line of lines) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (m) values[m[1]] = unquote(m[2]);
  }
  return { text, lines, values };
}

function unquote(v) {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

/**
 * Updates the given keys in .env, preserving every other line (other lanes keep their own keys,
 * e.g. API keys, in the same file). Writes only if the content actually changes.
 * Returns true if the file was written.
 */
export function updateEnvFile(updates, { header, path = ENV_PATH } = {}) {
  const { text, lines } = readEnvFile(path);
  const out = [...lines];
  const pending = new Map(Object.entries(updates));
  for (let i = 0; i < out.length; i++) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(out[i]);
    if (m && pending.has(m[1])) {
      out[i] = `${m[1]}=${pending.get(m[1])}`;
      pending.delete(m[1]);
    }
  }
  if (pending.size > 0) {
    if (out.length > 0 && out[out.length - 1].trim() !== '') out.push('');
    if (header && !out.includes(header)) out.push(header);
    for (const [k, v] of pending) out.push(`${k}=${v}`);
  }
  const next = out.join('\n') + '\n';
  if (next === text) return false;
  writeFileSync(path, next, { mode: 0o600 });
  return true;
}

/** Loads .env into process.env without overriding variables already set in the environment. */
export function loadEnv(path = ENV_PATH) {
  const { values } = readEnvFile(path);
  for (const [k, v] of Object.entries(values)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
  return values;
}

export function withSlash(u) {
  return u.endsWith('/') ? u : u + '/';
}

/** Structural equality for JSON values (key order independent). */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  const ka = Object.keys(a).filter((k) => a[k] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
}

/** True if every key in `desired` has the same value in `actual` (extra keys in actual are ignored). */
export function containsFields(actual, desired) {
  return Object.keys(desired).every((k) => deepEqual(actual?.[k], desired[k]));
}

export function log(...args) {
  console.log(...args);
}
