import { createServer } from 'node:net';
import { createInterface } from 'node:readline';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { ToolSession } from '../tool-session.js';
import { validateReply } from './openai-compat.js';

export const nightMcpSource=()=>readFile(new URL('../night-mcp.mjs',import.meta.url),'utf8');
export async function serveNightTools(socket:string,session:ToolSession){
  const clients=new Set<import('node:net').Socket>();
  const server=createServer({allowHalfOpen:true},client=>{
    clients.add(client);client.on('close',()=>clients.delete(client));
    let bytes=0;client.on('data',chunk=>{bytes+=chunk.length;if(bytes>1_000_000)client.destroy();});
    createInterface({input:client}).once('line',line=>{void (async()=>{
      try {
        const req=z.object({method:z.enum(['list','call']),name:z.string().optional(),arguments:z.unknown().optional()}).strict().parse(JSON.parse(line));
        const result=req.method==='list'?session.definitions.map(t=>({...t,annotations:{readOnlyHint:!['submit','complain'].includes(t.name),destructiveHint:false,openWorldHint:false}})):
          await session.execute(req.name??'',req.arguments??{});
        client.end(JSON.stringify(result)+'\n');
      }catch{client.end(JSON.stringify({error:'Invalid confined request'})+'\n');}
    })();});
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(socket,resolve);});
  return async()=>{for(const client of clients)client.destroy();await new Promise<void>(resolve=>server.close(()=>resolve()));};
}
export function auditNightTranscript(stdout:string,tools:readonly string[]){
  const forbidden:unknown[]=[];
  for(const line of stdout.split('\n').filter(Boolean)){
    let raw:unknown;try{raw=JSON.parse(line);}catch{forbidden.push({invalidLine:true});continue;}
    const e=z.object({type:z.string(),item:z.object({type:z.string(),server:z.string().optional(),tool:z.string().optional()}).optional()}).safeParse(raw);
    if(!e.success){forbidden.push(raw);continue;}
    const item=e.data.item;
    if(item){
      if(item.type==='mcp_tool_call'){if(item.server!=='night'||!tools.includes(item.tool??''))forbidden.push(raw);}
      else if(!['reasoning','agent_message','plan','todo_list','error'].includes(item.type))forbidden.push(raw);
    }else if(!['thread.started','turn.started','turn.completed','turn.failed','error'].includes(e.data.type))forbidden.push(raw);
  }
  return {status:forbidden.length?'fail':'pass',forbiddenToolEvents:forbidden.length,toolEvents:forbidden,confinement:'bwrap-private-request-directory',policy:'Only confined night MCP tools; no shell, filesystem or network tools'};
}
export function submittedOutput(schema:Record<string,unknown>,value:unknown,session:ToolSession){
  validateReply(schema,value);
  if(JSON.stringify(value)!==JSON.stringify(session.final)){
    // Key ordering is irrelevant; schemas forbid unknown keys.
    const normalize=(v:unknown):string=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
    if(normalize(value)!==normalize(session.final))throw new Error('Codex output differs from submit');
  }
}
