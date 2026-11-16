import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';

/** Historical atlases can approach V8's string limit. Decode their states one
 * at a time; never read or join the complete document as a string. New files
 * are already bounded and take the ordinary JSON path. */
export async function readGeometryJson(file){
  if((await stat(file)).size<=16*1024*1024)return JSON.parse(await readFile(file,'utf8'));
  let prefix='',suffix='',started=false,finished=false,depth=0,inString=false,escaped=false;
  let parts=[],size=0;const states=[];
  for await(const raw of createReadStream(file,{encoding:'utf8',highWaterMark:65536})){
    let chunk=raw;
    if(!started){
      prefix+=chunk;
      const match=/"states"\s*:\s*\[/.exec(prefix);
      if(!match){if(prefix.length>8*1024*1024)throw Error('Missing legacy geometry states');continue;}
      chunk=prefix.slice(match.index+match[0].length);
      prefix=prefix.slice(0,match.index)+'"states":[]';started=true;
    }
    if(finished){suffix+=chunk;if(suffix.length>8*1024*1024)throw Error('Oversized legacy geometry metadata');continue;}
    let begin=depth?0:-1;
    for(let i=0;i<chunk.length;i++){
      const char=chunk[i];
      if(!depth){
        if(char===']'){suffix+=chunk.slice(i+1);finished=true;break;}
        if(char==='{'){depth=1;begin=i;}
        else if(!/[,\s]/.test(char))throw Error('Invalid legacy geometry state');
        continue;
      }
      if(inString){
        if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')inString=false;
      }else if(char==='"')inString=true;
      else if(char==='{'||char==='[')depth++;
      else if(char==='}'||char===']')depth--;
      if(depth===0){
        const part=chunk.slice(begin,i+1);size+=part.length;
        if(size>16*1024*1024)throw Error('Legacy geometry state exceeds the 16 MiB decode limit');
        parts.push(part);states.push(JSON.parse(parts.join('')));parts=[];size=0;begin=-1;
      }
    }
    if(depth&&begin>=0){const part=chunk.slice(begin);parts.push(part);size+=part.length;}
    if(size>16*1024*1024||suffix.length>8*1024*1024)throw Error('Oversized legacy geometry record');
  }
  if(!started||!finished||depth)throw Error('Incomplete legacy geometry atlas');
  const metadata=JSON.parse(prefix+suffix);
  if(metadata.schemaVersion!==1||typeof metadata.programHash!=='string')throw Error('Invalid legacy geometry atlas');
  return {...metadata,states};
}
