// Standalone arm C adapter; the pure engine is shared with confined arm E tools.
import process from 'node:process';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { queryTraining } from './query-engine.mjs';
const directory=dirname(fileURLToPath(import.meta.url));
try {
 if(process.cwd()!==directory)throw new Error('Run queries from the request directory');
 const [query,...args]=process.argv.slice(2),options={};
 for(let i=0;i<args.length;i+=2){const key=args[i],value=args[i+1];if(!['--day','--task','--screen','--target','--limit','--sort'].includes(key)||value===undefined)throw new Error('Expected --day, --task, --screen, --target, --limit or --sort with a value');options[key.slice(2)]=value;}
 const result=queryTraining(name=>JSON.parse(readFileSync(new URL(name,import.meta.url),'utf8')),query,options,{cwd:process.cwd()});
 process.stdout.write(JSON.stringify(result)+'\n');
} catch(error) {
 process.stdout.write(JSON.stringify({query:(process.argv[2]??'').slice(0,100),cwd:process.cwd(),error:String(error instanceof Error?error.message:error).slice(0,2000)})+'\n');
 process.exitCode=1;
}
