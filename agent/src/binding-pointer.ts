import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildBindingSchema, type BuildBinding } from './build-binding.js';
export async function readBinding(file: string): Promise<BuildBinding> {
  const data = JSON.parse(await readFile(file,'utf8'));
  if (data.status === 'rejected') throw new Error(`Build binding refused: ${data.reason}`);
  if (data.status === 'bound') {
    if (!/^v\d+\.build\.\d+\.json$/.test(data.current)) throw new Error('Invalid binding pointer');
    return buildBindingSchema.parse(JSON.parse(await readFile(path.join(path.dirname(file),data.current),'utf8')));
  }
  return buildBindingSchema.parse(data);
}
