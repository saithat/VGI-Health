import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
export const SYSTEM = 'urn:vgi:world:realism';
export const SNOMED = 'http://snomed.info/sct';
export const EXT = 'https://vgi-health.example/fhir/StructureDefinition/';
export const read = p => JSON.parse(readFileSync(p, 'utf8'));
export const write = (p, value, indent = 0) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(value, null, indent) + '\n'); };
export const hash = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
export const id = (...parts) => `wr-${hash(parts.join('|')).slice(0, 32)}`;
export const cc = (code, text, system = SYSTEM) => ({ coding: [{ system, code, display: text }], text });
export const ref = (r, display) => ({ reference: typeof r === 'string' ? r : `${r.resourceType}/${r.id}`, ...(display ? { display } : {}) });
export const text = c => c?.text ?? c?.coding?.[0]?.display ?? '';
export const title = s => s?.replace(/\b[A-Z][A-Z']+\b/g, w => ['ED','OR','ICU','LLC','MD','RN'].includes(w) ? w : w[0] + w.slice(1).toLowerCase());
export const tag = (r, ...codes) => { r.meta = { ...r.meta, tag: [...(r.meta?.tag ?? []), ...codes.map(code => ({ system: SYSTEM, code }))] }; return r; };
export const stamp = (date, minute) => `${date}T${String(Math.floor(minute / 60)).padStart(2,'0')}:${String(minute % 60).padStart(2,'0')}:00-08:00`;
export const calendarAgo = (date, days) => new Date(Date.parse(date.slice(0,10) + 'T12:00:00Z') - days*86400000).toISOString().slice(0,10);
export function resourceKey(e) { return `${e.resource.resourceType}/${e.resource.id ?? e.fullUrl?.replace('urn:uuid:', '')}`; }
