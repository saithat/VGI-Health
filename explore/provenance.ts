import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export async function provenance(){
 const files:Record<string,string>={};
 for(const directory of ['explore','agent/src']){
  const visit=async(dir:string):Promise<void>=>{
   for(const e of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    const file=path.join(dir,e.name);if(e.isDirectory()){if(e.name!=='node_modules'&&e.name!=='__pycache__')await visit(file);}
    else files[file]=createHash('sha256').update(await readFile(file)).digest('hex');
   }
  };await visit(directory);
 }
 return {gitCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  sourceSha256:createHash('sha256').update(JSON.stringify(files)).digest('hex'),files};
}
