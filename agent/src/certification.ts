import { expandProgram } from './composites.js';
import { programHash, stableStringify } from './program.js';
import type { Certificate, Program } from './schema.js';
/** Lean's canonical JSON/FNV hash, independently checked against native certificates. */
export function nativeProgramHash(program: Program): string {
  let hash = 14695981039346656037n;
  for (const byte of Buffer.from(stableStringify(expandProgram(program)), 'utf8')) hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 1099511628211n);
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}
export function assertCertified(program: Program, certificate: Certificate, specVersion: string, mode: 'real' | 'fake'): void {
  if (certificate.verdict !== 'ok') throw new Error('Refusing uncertified measurement: certificate verdict is not ok');
  if (certificate.specVersion !== specVersion) throw new Error(`Refusing uncertified measurement: certificate ${certificate.specVersion} != active ${specVersion}`);
  const expected = mode === 'real' ? nativeProgramHash(program) : programHash(program);
  if (certificate.programHash !== expected) throw new Error('Refusing uncertified measurement: program hash differs from certificate');
}
