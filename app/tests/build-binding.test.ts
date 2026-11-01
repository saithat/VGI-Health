import { describe, it, expect, vi } from 'vitest';
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
it('follows immutable rebind history pointers and refuses rejected versions',async()=>{
  const {readRecordedBinding}=await import('../src/browser/data');
  const binding={schemaVersion:1,appSha256:'a'.repeat(64),wasmSha256:'b'.repeat(64),ehrSha256:'c'.repeat(64),componentsSha256:'d'.repeat(64),programSha256:'e'.repeat(64),certificateSha256:'f'.repeat(64)};
  const calls:string[]=[];
  vi.stubGlobal("fetch",async(input:unknown)=>{const path=String(input);calls.push(path);return new Response(JSON.stringify(path.endsWith('.build.json')?{status:'bound',current:'v1.build.2.json'}:binding));});
  try {
    expect((await readRecordedBinding('/runs/FAKE/certs/P1/v1.build.json')).appSha256).toBe(binding.appSha256);
    expect(calls).toContain('/runs/FAKE/certs/P1/v1.build.2.json');
    vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({status:'rejected',reason:'new checker refused'})));
    await expect(readRecordedBinding('/runs/FAKE/certs/P1/v1.build.json')).rejects.toThrow('new checker refused');
  }finally{vi.unstubAllGlobals();}
});
it('loads a rebound fork against the current build and keeps its frozen replay contract',async()=>{
 const {verifyRecordedBuild,programSpecPath}=await import('../src/browser/data');
 const program={owner:'P1',version:1},certificate={verdict:'ok'},appSha256='1'.repeat(64),wasmSha256='2'.repeat(64);
 const binding={schemaVersion:1,appSha256,wasmSha256,componentsSha256:await contentHash([]),programSha256:await contentHash(program),certificateSha256:await contentHash(certificate)};
 const artifacts:Record<string,unknown>={
 '/runs/FAKE/manifest.json':{buildBindingRequired:true},
 '/runs/FAKE/certs/P1/v1.build.json':{status:'bound',current:'v1.build.2.json'},
 '/runs/FAKE/certs/P1/v1.build.2.json':binding,
 '/runs/FAKE/certs/P1/v1.json':certificate,
 '/build.json':{appSha256},'/ehr/manifest.json':{assets:{'ehr-interp.wasm':wasmSha256}},
 };
 vi.stubGlobal('fetch',async(input:unknown)=>{const value=artifacts[String(input)];if(!value)throw new Error(`Unexpected ${String(input)}`);return new Response(JSON.stringify(value));});
 try{
 await expect(verifyRecordedBuild('runs/FAKE/programs/P1/v1.json',program)).resolves.toBeNull();
 expect(programSpecPath({path:'runs/FAKE/programs/P1/v1.json',run:'FAKE',persona:'P1',release:'v3',version:1,role:'physician',group:'run',label:'fake',deployed:true,mock:false,recordedCertificate:null})).toBe('/runs/FAKE/certifications/P1/v1/spec.json');
 }finally{vi.unstubAllGlobals();}
});
