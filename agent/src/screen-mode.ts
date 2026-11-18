import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
/** The simulator and recorder paint with the Lean page's layout by default.
 * A resumed run keeps its recorded gate; archive/cadence and generator-only
 * runs are not available on the Lean gate and need an explicit
 * `--screens browser`. */
export function defaultScreenMode(o:{screens?:string|undefined;resume:boolean;archive:boolean;generatorOnly:boolean;recordedGate?:string|undefined}):'lean'|'browser'{
  if(o.screens)return z.enum(['lean','browser']).parse(o.screens);
  if(o.resume&&o.recordedGate!==undefined)return z.enum(['lean','browser']).parse(o.recordedGate);
  if(o.archive||o.generatorOnly)throw Error('Archive/cadence and generator-only runs are not available on the Lean screen gate; pass --screens browser');
  return 'lean';
}
export async function recordedScreenGate(manifest:string):Promise<string|undefined>{
  if(!existsSync(manifest))return undefined;
  return z.object({screenGate:z.string().optional()}).parse(JSON.parse(await readFile(manifest,'utf8'))).screenGate??'browser';
}

