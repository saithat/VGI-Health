// Print the demo URLs after `make run`. Reads the recorded runs from the
// repository (the build no longer copies runs into app/dist). The choice of
// default run mirrors app/scripts/runs-plugin.ts selectDefaultRun: VGI_RUN if
// set, else the newest real run with a manifest, else the committed mock run.
import { readFile, readdir } from 'node:fs/promises';

const runsDir = new URL('../runs/', import.meta.url);

async function defaultRun() {
  if (process.env.VGI_RUN) return process.env.VGI_RUN;
  const real = [];
  for (const entry of await readdir(runsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || ['mock', 'world'].includes(entry.name)) continue;
    try {
      const manifest = JSON.parse(await readFile(new URL(`${entry.name}/manifest.json`, runsDir), 'utf8'));
      if (manifest.worldIsFake || manifest.backend === 'fake') continue;
      real.push({ id: entry.name, createdAt: String(manifest.createdAt ?? ''), days: Number(manifest.daysCompleted ?? manifest.days ?? 0) });
    } catch {
      // Not a recorded run directory.
    }
  }
  real.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.days - a.days || a.id.localeCompare(b.id));
  return real[0]?.id ?? 'mock';
}

const runId = await defaultRun();
const base = `http://localhost:${process.argv[2] ?? 5173}`;
console.log(`\nLIVE EHR sign-in: ${base}/ · local Medplum :8103 (no internet needed)`);
console.log(`REPLAY mode · recorded run: ${runId} · works without Docker`);
for (const persona of ['P1', 'P2', 'P3', 'P4', 'P5']) console.log(`${persona} offline EHR: ${base}/?mode=replay&persona=${persona}&run=${encodeURIComponent(runId)}`);
console.log(`UI browser: ${base}/browse\nDashboard: ${base}/dashboard\n`);
