// Recheck retained event-prestate UiScreens with a new layout checker without
// asserting a fresh clinical replay. Verify source bytes and the COMPLETE event
// sequence against the recorded day before exposing any retained screen.
import {createReadStream,readFileSync,readdirSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {createGunzip} from 'node:zlib';
import {createInterface} from 'node:readline';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {digest} from './admission.mjs';
async function fileHash(file){const hash=createHash('sha256');for await(const bytes of createReadStream(file))hash.update(bytes);return hash.digest('hex');}
async function* records(file){for await(const line of createInterface({input:createReadStream(file).pipe(createGunzip()),crlfDelay:Infinity}))yield JSON.parse(line);}
export async function frozenIndex(directory,out){
  const files=readdirSync(directory).filter(f=>f.endsWith('.jsonl.gz')).sort();
  const index=new Map();mkdirSync(join(out,'frozen-index'),{recursive:true});
  for(const name of files){
    const file=join(directory,name),receipt=JSON.parse(readFileSync(file.replace('.jsonl.gz','.json'),'utf8'));
    if(await fileHash(file)!==receipt.sha256)throw Error(`Corrupt retained snapshot: ${file}`);
    const saved=join(out,'frozen-index',`${receipt.sha256}.json`);let traceHash;
    if(existsSync(saved))traceHash=JSON.parse(readFileSync(saved,'utf8')).traceHash;
    else {
      const trace=[];let count=0;
      for await(const row of records(file)){count++;if(row.kind==='screen')trace.push(row.ev);}
      if(count!==receipt.records)throw Error(`Incomplete retained snapshot: ${file}`);
      traceHash=digest(trace);writeFileSync(saved,JSON.stringify({traceHash}));
    }
    const existing=index.get(traceHash);
    if(existing&&existing.receipt.sha256!==receipt.sha256)throw Error('Ambiguous retained snapshots for one recorded trace');
    index.set(traceHash,{file,receipt});
  }
  return index;
}
export async function* frozenRecords(index,recorded){
  const retained=index.get(digest(recorded.trace));
  if(!retained)throw Error('No retained snapshot matches the complete recorded day trace');
  let i=0;
  for await(const row of records(retained.file)){
    if(row.kind==='screen' && digest(row.ev)!==digest(recorded.trace[i++]))throw Error('Retained snapshot event mismatch');
    yield row;
  }
  if(i!==recorded.trace.length)throw Error('Retained snapshot trace denominator mismatch');
}
