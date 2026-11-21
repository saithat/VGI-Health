import { constants } from 'node:fs';
import { open,readdir,rename,rm } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
export const harnessRequestSchema = z.object({
  command: z.string().max(40), argv: z.array(z.string().max(8000)).max(40),
  file: z.object({ name: z.string().max(1000), text: z.string().max(4_000_000) }).nullable(),
}).strict();
export type HarnessRequest = z.infer<typeof harnessRequestSchema>;
export interface HarnessReply { exit: number; output: unknown }
/** File RPC: Codex's own command sandbox forbids socket connections, so the CLI writes
 * <id>.req.json into the spool (atomically, by rename) and waits for <id>.res.json.
 * Requests are served one at a time in discovery order; ids are only file names. */
export async function serveHarnessSpool(spool: string, host: { execute(request: unknown): Promise<HarnessReply> }, pollMs = 50) {
  const seen = new Set<string>();
  let stopped = false, busy: Promise<void> = Promise.resolve();
  const tick = async () => {
    const names = (await readdir(spool)).filter(n => /^[A-Za-z0-9_-]{1,80}\.req\.json$/.test(n) && !seen.has(n)).sort();
    for (const name of names) {
      seen.add(name);
      const id = name.slice(0, -'.req.json'.length), file = path.join(spool, name);
      let raw: unknown = null;
      // The spool is agent-writable: never follow a symlink the agent planted, in either direction.
      try { raw = await readSpoolRequest(file); } catch { raw = null; }
      await rm(file, { force: true });
      const reply = await host.execute(raw);
      const tmp = path.join(spool, `${id}.res.tmp`);
      try {
        await rm(tmp, { force: true });
        await writeSpoolReply(tmp, JSON.stringify(reply));
        await rename(tmp, path.join(spool, `${id}.res.json`));
      } catch { /* a planted file or race: drop the reply; the CLI times out */ }
    }
  };
  const loop = async () => { while (!stopped) { busy = tick().catch(() => undefined); await busy; await new Promise(r => setTimeout(r, pollMs)); } };
  const running = loop();
  return async () => { stopped = true; await busy; await running; };
}

/** Read a regular, non-symlink request file of at most 5 MB. O_NONBLOCK: opening a FIFO the agent
 * planted returns at once (and is then refused as not a regular file) instead of blocking the host. */
async function readSpoolRequest(file: string): Promise<unknown> {
  const fh = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const st = await fh.stat();
    if (!st.isFile() || st.size > 5_000_000) return null;
    return JSON.parse(await fh.readFile('utf8'));
  } finally { await fh.close(); }
}
/** Create the reply exclusively: O_EXCL fails on any existing entry, symlinks included. */
async function writeSpoolReply(file: string, text: string) {
  const fh = await open(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o644);
  try { await fh.writeFile(text); } finally { await fh.close(); }
}
