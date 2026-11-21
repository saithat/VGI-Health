// Print the demo URLs after `make run`. Reads the recorded runs from the
// repository (the build no longer copies runs into app/dist). The choice of
// default run mirrors app/scripts/runs-plugin.ts selectDefaultRun: VGI_RUN if
// set, else the newest real run with a manifest, or show the empty dashboard.
import { readFile, readdir } from 'node:fs/promises';

const runsDir = new URL('../runs/', import.meta.url);

async function defaultRun() {
  if (process.env.VGI_RUN) return process.env.VGI_RUN;
  const real = [];
  for (const entry of await readdir(runsDir, { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; })) {
    if (!entry.isDirectory() || entry.name === 'world') continue;
    try {
      const manifest = JSON.parse(await readFile(new URL(`${entry.name}/manifest.json`, runsDir), 'utf8'));
      if (manifest.worldIsFake || manifest.backend === 'fake') continue;
      real.push({ id: entry.name, createdAt: String(manifest.createdAt ?? ''), days: Number(manifest.daysCompleted ?? manifest.days ?? 0) });
    } catch {
      // Not a recorded run directory.
    }
  }
  real.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.days - a.days || a.id.localeCompare(b.id));
  return real[0]?.id ?? null;
}

const runId = await defaultRun();
const base = `http://127.0.0.1:${process.argv[2] ?? 5173}`;
console.log(`\nStart page: ${base}/ · Live EHR sign-in: ${base}/lean.html · local commit authority :18090 (no internet needed)`);
console.log(`ADT: ${base}/?workflow=adt · MAR dose list: ${base}/?workflow=mar`);
if (runId) console.log(`Recorded run: ${base}/dashboard?run=${encodeURIComponent(runId)}`);
console.log(`UI browser: ${base}/browse\nDashboard: ${base}/dashboard\n`);
