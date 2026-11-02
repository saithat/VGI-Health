/** Compare a clean HEAD archive build with this lane; no branch or worktree mutations. */
import path from 'node:path';
import { mkdtemp, symlink, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { root, read, arg, outputDir, ensureOutput } from './common.mjs';
const out=outputDir(arg('out'));
await ensureOutput(out);
const scratch=await mkdtemp(path.join(tmpdir(),'study-binding-'));
const archive=path.join(scratch,'head.tar');
execFileSync('git',['archive','HEAD','--format=tar','--output',archive],{cwd:root});
execFileSync('tar',['-xf',archive,'-C',scratch]);
for(const dir of ['node_modules','app/node_modules','agent/node_modules','world/node_modules','infra/scripts/node_modules'])
  await symlink(path.join(root,dir),path.join(scratch,dir),'dir');
try { await access(path.join(root,'.env')); await symlink(path.join(root,'.env'),path.join(scratch,'.env')); } catch (error) { if(error.code!=='ENOENT') throw error; }
const gitDir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim();
const log=[];
for(const [name,args]of [
  ['typecheck',[path.join(root,'app/node_modules/typescript/bin/tsc'),'-b']],
  ['bundle',[path.join(root,'app/node_modules/vite/bin/vite.js'),'build']],
]) {
  try {log.push(name+'\n'+execFileSync(process.execPath,args,{cwd:path.join(scratch,'app'),encoding:'utf8',maxBuffer:10e6,env:{...process.env,TAILSCALE_SERVE:'0',GIT_DIR:gitDir,GIT_WORK_TREE:scratch}}));}
  catch(error){log.push(error.stdout??'',error.stderr??'');await writeFile(path.join(out,'baseline-build.log'),log.join('\n'));throw Error(`Baseline ${name} failed; see ${path.join(out,'baseline-build.log')}`);}
}
await writeFile(path.join(out,'baseline-build.log'),log.join('\n'),{mode:0o600});
const baseline=await read(path.join(scratch,'app/dist/build.json')),current=await read(path.join(root,'app/dist/build.json'));
const result={baselineCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),baseline,current,
  match:baseline.appSha256===current.appSha256,method:'Clean git archive of HEAD built in TMPDIR with the same installed dependencies; no other branch/worktree touched'};
await writeFile(path.join(out,'app-binding-comparison.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(result));
if(!result.match)throw Error('Study lane changed certified app binding');
