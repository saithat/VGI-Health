import {readFile,writeFile,mkdir,copyFile,chmod} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {tmp} from './helpers.js';
import {REPO_ROOT,writeJson} from '../src/util.js';
it('fresh preflight leaves virtual-address limits to the scope and blocks before any backend on stale WASM',async()=>{
 const root=await tmp('preflight'),bin=path.join(root,'bin'),log=path.join(root,'calls');await mkdir(bin);await mkdir(path.join(root,'scripts'));
 const source=await readFile(path.join(REPO_ROOT,'scripts/run-overnight.sh'),'utf8');expect(source).not.toContain('ulimit -v');
 await copyFile(path.join(REPO_ROOT,'scripts/run-overnight.sh'),path.join(root,'scripts/run-overnight.sh'));
 await mkdir(path.join(root,'lean'));await writeJson(path.join(root,'runs/world/2/world.json'),{});
 for(const [name,body]of [['lake','exit 0'],['make','exit 42'],['pnpm','exit 99']] as const){const file=path.join(bin,name);await writeFile(file,`#!/bin/sh\nprintf '%s\\n' '${name}' >> '${log}'\n${body}\n`);await chmod(file,0o755);}
 const result=spawnSync('bash',[path.join(root,'scripts/run-overnight.sh'),'FAKE-preflight'],{env:{...process.env,PATH:`${bin}:${process.env['PATH']??''}`},encoding:'utf8'});
 expect(result.status).toBe(42);expect(await readFile(log,'utf8')).toBe('lake\nmake\n');
});
