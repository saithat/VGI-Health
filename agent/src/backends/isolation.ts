import { z } from 'zod';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
/** Empty filesystem, read-only runtime, private request directory. No repository or home mount. */
export function confinedArgs(directory: string, binary: string, args: string[]): string[] {
  const runtime = ['/usr','/bin','/lib','/lib64'].filter(existsSync).flatMap((p) => ['--ro-bind',p,p]);
  const network = ['/etc/resolv.conf','/etc/nsswitch.conf','/etc/hosts','/etc/ssl','/etc/pki','/etc/crypto-policies'].filter(existsSync).flatMap((p) => ['--ro-bind',p,p]);
  return ['--die-with-parent','--new-session','--unshare-pid','--unshare-ipc','--unshare-uts',...runtime,...network,
    '--proc','/proc','--dev','/dev','--tmpfs','/tmp','--bind',directory,directory,'--chdir',directory,
    '--clearenv','--setenv','PATH','/usr/local/bin:/usr/bin:/bin','--setenv','HOME',directory,
    '--setenv','CODEX_HOME',path.join(directory,'codex-home'), '--',binary,...args];
}
/** Tool execution is forbidden even inside confinement: designer gets only supplied JSON. */
export function auditTranscript(stdout: string) {
  const forbidden: unknown[] = [];
  for (const line of stdout.split('\n').filter(Boolean)) {
    let item: unknown;
    try { item = JSON.parse(line); } catch { forbidden.push({invalidTranscriptLine:line}); continue; }
    const parsed = z.object({item:z.object({type:z.string().optional()}).optional(),type:z.string().optional()}).safeParse(item);
    if (!parsed.success) {forbidden.push(item);continue;}
    const value=parsed.data;
    if (value.item && !['reasoning','agent_message','plan','todo_list','error'].includes(value.item.type ?? '')) forbidden.push(item);
    else if (['command_execution','file_change','mcp_tool_call','web_search','function_call','tool_call'].includes(value.type ?? '')) forbidden.push(item);
  }
  return { status: forbidden.length ? 'fail' : 'pass', outsideTempReadAudit: forbidden.length ? 'forbidden tool attempt; filesystem confinement remains enforced' : 'no file-read/tool events', forbiddenToolEvents: forbidden.length, toolEvents: forbidden, confinement: 'bwrap-private-request-directory', policy: 'No tool events allowed; all filesystem reads outside request/runtime denied by OS' };
}
export async function auditRunTranscripts(dir: string) {
  const audits: unknown[] = [];
  async function visit(root: string) {
    if (!existsSync(root)) return;
    for (const entry of await readdir(root,{withFileTypes:true})) {
      const file = path.join(root,entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.name.endsWith('.json')) {
        const record = z.object({transcript:z.object({stdout:z.string().optional()}).optional(),audit:z.unknown().optional()}).parse(JSON.parse(await readFile(file,'utf8')));
        if (record.transcript?.stdout) audits.push({ file:path.relative(dir,file), ...auditTranscript(record.transcript.stdout) });
        else if (record.audit) audits.push(record.audit);
      }
    }
  }
  await visit(path.join(dir,'llm'));
  return { status: audits.some((a) => z.object({status:z.string().optional()}).parse(a).status === 'fail') ? 'fail':'pass', transcripts:audits.length, results:audits };
}
