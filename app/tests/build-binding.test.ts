import { describe, it, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import { assertBuildBinding, contentHash, stableJson } from '../src/core/buildBinding';

describe('certificate build binding', () => {
  it('refuses a changed painter, WASM, components, program or certificate', async () => {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
    const program = { b: 2, a: 1 };
    const certificate = { verdict: 'ok', programHash: 'native-hash' };
    const installed = { appSha256: 'a'.repeat(64), wasmSha256: 'b'.repeat(64), componentsSha256: 'c'.repeat(64) };
    const binding = { schemaVersion: 1 as const, ...installed, programSha256: await contentHash(program), certificateSha256: await contentHash(certificate) };
    await expect(assertBuildBinding(binding, installed, { a: 1, b: 2 }, certificate)).resolves.toBeUndefined();
    for (const key of ['appSha256', 'wasmSha256', 'componentsSha256'] as const)
      await expect(assertBuildBinding(binding, { ...installed, [key]: '0'.repeat(64) }, program, certificate)).rejects.toThrow('Certified build mismatch');
    await expect(assertBuildBinding(binding, installed, { a: 3 }, certificate)).rejects.toThrow('Login refused');
    await expect(assertBuildBinding(binding, installed, program, { verdict: 'ok' })).rejects.toThrow('Login refused');
    expect(stableJson(program)).toBe('{"a":1,"b":2}');
  });
});
