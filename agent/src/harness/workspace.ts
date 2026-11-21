import { createHash } from 'node:crypto';
import { chmod,copyFile,mkdir,mkdtemp,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
export async function prepareWorkspace(files: Readonly<Record<string,string>>, writable?: string) {
    const root = await mkdtemp(path.join(tmpdir(), 'agent-harness-'));
    await chmod(root, 0o700);
    const ws = path.join(root, 'work'), home = path.join(root, 'home'), ctl = path.join(root, 'control');
    for (const d of [ws, home, ctl, path.join(root, 'spool'), path.join(ctl, 'bin')]) await mkdir(d, { recursive: true });
    for (const [name, text] of Object.entries(files)) {
      const file = path.join(ws, name); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, text, { mode: name === writable ? 0o644 : 0o444 });
    }
    await copyFile(new URL('./entry.mjs', import.meta.url), path.join(ctl, 'entry.mjs'));
    await copyFile(new URL('./night-cli.mjs', import.meta.url), path.join(ctl, 'bin', 'night'));
    await chmod(path.join(ctl, 'bin', 'night'), 0o555);
    return root;
}

export function workspaceHash(files: Readonly<Record<string, string>>) {
  const h = createHash('sha256');
  for (const name of Object.keys(files).sort()) h.update(`${name}\0${createHash('sha256').update(files[name] ?? '').digest('hex')}\n`);
  return h.digest('hex');
}
