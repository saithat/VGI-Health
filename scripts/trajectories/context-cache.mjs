import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export function extractionKey(provenance,inputs){
 const hash=createHash('sha256');
 // Length prefix every input so different file boundaries cannot collide.
 for(const bytes of [Buffer.from(provenance),...inputs])hash.update(String(bytes.length)+':').update(bytes);
 return hash.digest('hex');
}
export async function cachedExtraction(directory,key,produce){
 if(!directory)return produce();
 const file=path.join(directory,`${key}.json`);
 try{const rows=JSON.parse(await readFile(file,'utf8'));if(!Array.isArray(rows))throw new Error('Invalid native context cache');return rows;}catch(error){if(error.code!=='ENOENT')throw error;}
 const rows=await produce();if(!Array.isArray(rows))throw new Error('Invalid native extraction result');
 await mkdir(directory,{recursive:true});const pending=`${file}.${process.pid}.tmp`;await writeFile(pending,JSON.stringify(rows));await rename(pending,file);return rows;
}
