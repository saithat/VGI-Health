/** Static audit is a tripwire, not a shell parser or the write barrier. Codex's
 * read-only OS sandbox enforces writes; outer bwrap enforces filesystem scope.
 * Missing cwd fails closed unless the immutable CLI or a leading /usr/bin/pwd attests it.
 * CLI JSONL omits cwd on some releases, so arbitrary unattested commands are rejected.
 */
import path from 'node:path';
import { z } from 'zod';
const queryNames=['screens','steps','targets','scroll-past','sequences','ledger'];
export const queryAuditSchema=z.object({queryMode:z.literal(true),requestDirectory:z.string(),commands:z.array(z.object({
  id:z.string(),command:z.string(),cwd:z.string().nullable(),output:z.string(),truncated:z.boolean(),query:z.string().nullable(),
}))});
function shellSyntax(command:string) {
  const unwrapped=command.replace(/^(?:\/bin\/)?(?:ba)?sh\s+-[lc]{1,2}\s+(['"])(.*)\1$/s,'$2');
  let syntax='',quote='',escaped=false;
  for(const char of unwrapped){
    if(escaped){escaped=false;continue;}
    if(char==='\\'&&quote!=="'"){escaped=true;continue;}
    if(quote){if(char===quote)quote='';continue;}
    if(char==="'"||char==='"'){quote=char;continue;}
    syntax+=char;
  }
  return syntax;
}
export function writeAttempt(command:string) {
  // Conservative by design: reject output redirection, command substitution and mutators,
  // including common interpreter file writes; stdout printing remains allowed.
  if(shellSyntax(command).includes('>'))return true;
  return /[`]|\$\(|\$\{|\b(?:tee|mv|cp|rm|touch|mkdir|rmdir|install|truncate|chmod|chown|ln|dd|patch|apply_patch|sed\s+-[^\s]*i|curl|wget|git|cd|pushd|popd)\b|\bexec\b|\b(?:writeFile(?:Sync)?|appendFile(?:Sync)?|write_text|write_bytes|chdir|fchdir|unlink(?:Sync)?|rename(?:Sync)?|rmtree|makedirs)\s*\(|\bopen\s*\([\s\S]*?(?:["'][wax+][bt+]*["']|O_WRONLY|O_RDWR|O_CREAT)|(?:\bcodex-home\b|\bauth\.json\b|\/(?:proc|dev|etc)(?:\/|\b))/i.test(command);
}
export function auditQueryTranscript(stdout:string,directory:string) {
  const forbidden:unknown[]=[],commands=new Map<string,z.infer<typeof queryAuditSchema>['commands'][number]>();
  let sequence=0;
  for(const line of stdout.split('\n').filter(Boolean)) {
    let json:unknown;try{json=JSON.parse(line);}catch{forbidden.push({invalidTranscriptLine:line});continue;}
    const parsed=z.object({type:z.string(),item:z.object({type:z.string()}).passthrough().optional()}).passthrough().safeParse(json);
    if(!parsed.success){forbidden.push(json);continue;}
    const event=parsed.data,item=event.item??event;
    if(item.type==='command_execution') {
      const command=z.object({id:z.string().optional(),command:z.string(),cwd:z.string().optional(),working_directory:z.string().optional(),aggregated_output:z.string().optional(),output:z.string().optional()}).safeParse(item);
      if(!command.success){forbidden.push(json);continue;}
      const c=command.data,id=c.id??`event-${sequence++}`,old=commands.get(id),output=c.aggregated_output??c.output??old?.output??'';
      // Accept the immutable CLI or a leading, absolute pwd for cwd attestation.
      // The latter allows read-only interpreter commands on CLI versions without cwd metadata.
      const unwrapped=c.command.replace(/^\/bin\/(?:ba)?sh\s+-lc\s+(['"])(.*)\1$/s,'$2');
      const pwd=/^\/usr\/bin\/pwd\s*&&\s*/.exec(unwrapped);
      const queryCommand=pwd?unwrapped.slice(pwd[0].length):unwrapped;
      const cli=/^(?:\/usr\/bin\/)?node\s+(?:\.\/)?query\.mjs\s+(screens|steps|targets|scroll-past|sequences|ledger)(?:\s+--[a-z-]+\s+(?:[\w./:()@+-]+|'[^'\r\n]*'|"[^"$`\r\n]*"))*$/.exec(queryCommand);
      let attested:string|null=null;
      if(pwd&&output.includes('\n'))attested=output.split('\n')[0]?.replace(/\r$/,'')||null;
      else try{const result=z.object({cwd:z.string(),query:z.string()}).parse(JSON.parse(output));if(cli&&result.query===cli[1])attested=result.cwd;}catch{/* Other reads must print cwd first or carry explicit cwd. */}
      const cwd=c.cwd??c.working_directory??old?.cwd??attested;
      if(attested&&cwd&&path.resolve(attested)!==path.resolve(cwd))forbidden.push({id,reason:'cwd attestation conflicts with command metadata'});
      const row={id,command:c.command,cwd,output:output.slice(0,16000),truncated:output.length>16000,query:cli?.[1]??null};
      if(old&&old.command!==c.command)forbidden.push({id,reason:'command changed within transcript item'});
      commands.set(id,row);
      if(writeAttempt(c.command)||(cwd!==null&&path.resolve(cwd)!==path.resolve(directory)))forbidden.push({command:c.command,cwd,reason:'write attempt, forbidden access or wrong cwd'});
    }else if(event.item&&!['reasoning','agent_message','plan','todo_list','error'].includes(item.type))forbidden.push(json);
    else if(!event.item&&!['thread.started','turn.started','turn.completed','turn.failed','error','response.created','response.completed'].includes(event.type))forbidden.push(json);
  }
  for(const command of commands.values())if(command.cwd===null||path.resolve(command.cwd)!==path.resolve(directory))forbidden.push({command:command.command,reason:'missing or outside request cwd'});
  return {status:forbidden.length?'fail':'pass',queryMode:true as const,requestDirectory:directory,
    commands:[...commands.values()],forbiddenToolEvents:forbidden.length,toolEvents:forbidden,
    confinement:'bwrap-private-request-directory',policy:'Read-only commands in request directory; static write tripwire plus OS sandbox'};
}
export function queryUsage(usage:unknown) {
  const audit=z.object({isolationAudit:queryAuditSchema}).safeParse(usage);
  const tally:Record<string,number>={};
  if(audit.success)for(const command of audit.data.isolationAudit.commands){const name=command.query&&queryNames.includes(command.query)?command.query:'other';tally[name]=(tally[name]??0)+1;}
  return {count:audit.success?audit.data.isolationAudit.commands.length:0,tally};
}

/** Bound persisted command output too, including arbitrary read-only interpreter
 * commands. The query CLI itself bounds the output before the model sees it.
 */
export function boundedQueryTranscript(stdout:string) {
  return stdout.split('\n').map(line=>{
    if(!line)return line;
    let value:unknown;try{value=JSON.parse(line);}catch{return line;}
    const event=z.object({item:z.object({type:z.string(),aggregated_output:z.string().optional(),output:z.string().optional()}).passthrough().optional()}).passthrough().safeParse(value);
    if(!event.success||event.data.item?.type!=='command_execution')return line;
    for(const key of ['aggregated_output','output'] as const){const output=event.data.item[key];if(output&&output.length>16000)event.data.item[key]=output.slice(0,15960)+'\n[truncated command output]';}
    return JSON.stringify(event.data);
  }).join('\n');
}
