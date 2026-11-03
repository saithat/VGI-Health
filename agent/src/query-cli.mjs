// Standalone arm C tool. Node builtins only: this file is copied without node_modules.
// No writes, subprocesses, arbitrary filenames, or network. Limits bound valid JSON
// output even for very long traces, target lists and clinical text values.
import process from 'node:process';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
const directory=dirname(fileURLToPath(import.meta.url));
function main(){
if(process.cwd()!==directory)throw new Error('Run queries from the request directory');
const [query,...args]=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){const key=args[i],value=args[i+1];if(!['--day','--task','--screen','--target','--limit','--sort'].includes(key)||value===undefined)throw new Error('Expected --day, --task, --screen, --target, --limit or --sort with a value');options[key.slice(2)]=value;}
const limit=options.limit===undefined?15:Number(options.limit);
if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('--limit must be 1..100');
const load=name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8'));
const matches=row=>(!options.task||row.task===options.task)&&(!options.screen||row.screen===options.screen)&&(!options.target||row.component===options.target);
const selectedDays=rows=>rows.filter(d=>!options.day||String(d.day)===options.day);
const physical=['clicks','keystrokes','scrolls','scrollPx','mouseTravelPx','visits'];
const aggregate=(rows,key)=>{
 const groups=new Map();for(const row of rows){const id=key(row);let total=groups.get(id);if(!total){total={screen:row.screen,...(key===byComponent?{component:row.component}:{}),...Object.fromEntries(physical.map(k=>[k,0]))};groups.set(id,total);}
 for(const k of physical)total[k]=total[k]===null||row[k]===null?null:Math.round((total[k]+(row[k]??0))*100)/100;
 }return [...groups.values()];
};
const byComponent=r=>`${r.screen}/${r.component}`;
let rows;
if(query==='ledger'){
 if(options.day||options.task||options.screen||options.sort)throw new Error('ledger accepts --target and --limit');
 rows=load('ledger.json').filter(row=>!options.target||row.targets.includes(options.target));
}
else if(query==='sequences'){
 if(options.day||options.task||options.screen||options.target)throw new Error('sequences covers all train days; filters unsupported');
 const sequences=new Map();
 for(const day of load('traces.json'))for(const task of day.tasks.filter(t=>t.completed)){
  const steps=day.trace.filter(e=>e.task===task.task&&e.kind!=='scroll').map(e=>`${e.screen}:${e.kind}:${e.target}`);
  for(let length=2;length<=4;length++)for(let i=0;i+length<=steps.length;i++){
   const key=JSON.stringify(steps.slice(i,i+length)),tasks=sequences.get(key)??new Set();tasks.add(`${day.day}/${task.task}`);sequences.set(key,tasks);
  }
 }
 rows=[...sequences].filter(([,tasks])=>tasks.size>1).sort((a,b)=>b[1].size-a[1].size||a[0].localeCompare(b[0])).map(([steps,tasks])=>({steps:JSON.parse(steps),tasks:tasks.size}));
}else if(query==='steps'){
 if(!options.task)throw new Error('steps requires --task ID');
 const attributed=load('attribution.json');
 rows=selectedDays(load('traces.json')).flatMap(d=>d.trace.flatMap((step,i)=>step.task===options.task&&(!options.screen||step.screen===options.screen)?[{day:d.day,...step,cost:attributed.find(a=>a.day===d.day)?.steps[i]??null}]:[]));
}else{
 const traces=load('traces.json'),completed=new Set(traces.flatMap(d=>d.tasks.filter(t=>t.completed).map(t=>`${d.day}/${t.task}`)));
 const attributed=selectedDays(load('attribution.json')).flatMap(d=>d.steps.filter(r=>completed.has(`${d.day}/${r.task}`)&&matches(r)));
 if(query==='screens'){
  rows=aggregate(attributed,r=>r.screen).sort((a,b)=>(b.clicks+b.scrolls)-(a.clicks+a.scrolls));
  const total=rows.reduce((n,r)=>n+r.clicks,0);rows=rows.map(r=>({...r,share:total?r.clicks/total:0}));
 }else if(query==='targets'){
  if(options.sort&&!['interactions','travel'].includes(options.sort))throw new Error('--sort must be interactions or travel');
  rows=aggregate(attributed,byComponent).sort((a,b)=>options.sort==='travel'?(b.mouseTravelPx??-1)-(a.mouseTravelPx??-1):(b.clicks+b.scrolls)-(a.clicks+a.scrolls)||(b.mouseTravelPx??-1)-(a.mouseTravelPx??-1)||b.keystrokes-a.keystrokes||byComponent(a).localeCompare(byComponent(b)));
 }else if(query==='scroll-past'){
  if(!options.target)throw new Error('scroll-past requires --target ID');
  const totals=new Map();for(const row of attributed)for(const component of row.scrollPast){const id=`${row.screen}/${component}`,old=totals.get(id)??{screen:row.screen,component,reveals:0,scrolls:0};old.reveals++;old.scrolls+=row.scrolls;totals.set(id,old);}rows=[...totals.values()].sort((a,b)=>b.scrolls-a.scrolls);
 }else throw new Error('Queries: screens, steps, targets, scroll-past, sequences, ledger');
}
let truncated=rows.length>limit;
const clip=value=>{
 if(typeof value==='string'&&value.length>500){truncated=true;return value.slice(0,500)+'… [truncated]';}
 if(Array.isArray(value)){if(value.length>100)truncated=true;return value.slice(0,100).map(clip);}
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clip(v)]));
 return value;
};
const result={query,cwd:process.cwd(),totalRows:rows.length,rows:rows.slice(0,limit).map(clip),truncated,note:''};
let output;
for(;;){result.truncated=truncated;result.note=truncated?'Truncated to bounded output; narrow filters or lower --limit.':'';output=JSON.stringify(result);if(output.length<=15999)break;result.rows.pop();truncated=true;}
process.stdout.write(output+'\n');

}
try{main();}catch(error){
 process.stdout.write(JSON.stringify({query:(process.argv[2]??'').slice(0,100),cwd:process.cwd(),error:String(error instanceof Error?error.message:error).slice(0,2000)})+'\n');
 process.exitCode=1;
}
