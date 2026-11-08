// Trusted stdio MCP adapter. No filesystem API, shell, HTTP or model-supplied
// endpoint. The host passes one private Unix socket at launch.
import { connect } from 'node:net';
import { createInterface } from 'node:readline';
import process from 'node:process';
const socket=process.argv[2];
if(!socket)throw new Error('Private socket required');
function rpc(value){return new Promise((resolve,reject)=>{
 const client=connect(socket),lines=createInterface({input:client});
 client.on('connect',()=>client.end(JSON.stringify(value)+'\n'));
 client.on('error',reject);lines.once('line',line=>{try{resolve(JSON.parse(line));}catch(error){reject(error);}client.destroy();});
 client.setTimeout(900000,()=>{client.destroy();reject(new Error('Host timeout'));});
});}
let queue=Promise.resolve();
createInterface({input:process.stdin}).on('line',line=>{queue=queue.then(async()=>{
 let request;try{request=JSON.parse(line);}catch{return;}
 if(request.id===undefined)return;
 let result;
 try {
  if(request.method==='initialize')result={protocolVersion:request.params?.protocolVersion??'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'night',version:'1'}};
  else if(request.method==='ping')result={};
  else if(request.method==='tools/list')result={tools:await rpc({method:'list'})};
  else if(request.method==='tools/call')result={content:[{type:'text',text:JSON.stringify(await rpc({method:'call',name:request.params?.name,arguments:request.params?.arguments??{}}))}]};
  else {process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,error:{code:-32601,message:'Only night tools are available'}})+'\n');return;}
  process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result})+'\n');
 }catch{process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,error:{code:-32603,message:'Confined night tool failed'}})+'\n');}
});});
