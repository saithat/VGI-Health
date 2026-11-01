import { readFile } from 'node:fs/promises';
const { runId } = JSON.parse(await readFile(new URL('../app/dist/runs/default.json', import.meta.url), 'utf8'));
const base = `http://localhost:${process.argv[2] ?? 5173}`;
console.log(`\nLIVE EHR sign-in: ${base}/ · local Medplum :8103 (no internet needed)`);
console.log(`REPLAY mode · recorded run: ${runId} · works without Docker`);
for (const persona of ['P1', 'P2', 'P3', 'P4', 'P5']) console.log(`${persona} offline EHR: ${base}/?mode=replay&persona=${persona}&run=${encodeURIComponent(runId)}`);
console.log(`UI browser: ${base}/browse\nDashboard: ${base}/dashboard\n`);
