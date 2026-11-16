/* global TextEncoder */
/** Portable reader for geometry v1 and the chunked v2 store. No Node imports:
 * command-line readers and the dashboard use the same reconstruction code. */
export async function readStoredGeometry(file, read, selection, storageDirectory) {
  let pointer = await read(file);
  if (pointer.schemaVersion === 1) return pointer;
  if (pointer.schemaVersion !== 2) throw Error('Unsupported geometry storage version');
  const directory = storageDirectory ?? file.slice(0, file.lastIndexOf('/'));
  const base = `${directory}/${pointer.programHash}.${pointer.componentsSha256}`;
  const resultKey=selection?.resultKey ?? (selection?.result ? await resultKeyOf(selection.result) : undefined);
  if (resultKey) pointer = await read(`${base}/results/${resultKey}.json`);
  else if (selection?.day !== undefined && selection.day !== null) pointer = await read(`${base}/days/${selection.day}.json`);
  const safeHash = value => {
    if (!/^[a-f0-9]{64}$/.test(value)) throw Error('Invalid geometry content address');
    return value;
  };
  const snapshot = `${directory}/snapshots/${safeHash(pointer.snapshot)}`;
  const header = await read(`${snapshot}/index.json`);
  if(!Number.isSafeInteger(header.chunks)||header.chunks<0)throw Error('Invalid geometry chunk count');
  if (header.atlas.programHash !== pointer.programHash || header.atlas.componentsSha256 !== pointer.componentsSha256)
    throw Error('Geometry snapshot binding mismatch');
  const states = [], bodies = new Map();
  for (let i = 0; i < header.chunks; i++) {
    for (const row of await read(`${snapshot}/${i}.json`)) {
      let body = bodies.get(row.body);
      if (!body) {
        body = await read(`${directory}/objects/${safeHash(row.body)}.json`);
        if(await textHash(JSON.stringify(body))!==row.body)throw Error('Geometry body content hash mismatch');
        bodies.set(row.body, body);
        if (bodies.size > 64) bodies.delete(bodies.keys().next().value);
      }
      const components = { ...body.components };
      for (const [target, source] of Object.entries(row.targets ?? {})) {
        if (!(source in components)) throw Error('Missing geometry target source');
        components[target] = components[source];
      }
      states.push({ ...body, state: row.state, ...(row.sample === undefined ? {} : {sample: row.sample}), components });
    }
  }
  return { ...header.atlas, states };
}

/** The selector deliberately excludes enriched metrics and the atlas binding:
 * recording and later review have the same original clinical trace. */
async function resultKeyOf(result){
  const stable=value=>Array.isArray(value)?`[${value.map(stable).join(',')}]`:
    value&&typeof value==='object'?`{${Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`:
    JSON.stringify(value)??'null';
  const value={day:result.day,persona:result.persona,trace:result.trace,observations:result.observations};
  return textHash(stable(value));
}
async function textHash(value){
  const bytes=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
