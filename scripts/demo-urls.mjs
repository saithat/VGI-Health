import { readFile } from 'node:fs/promises';
const { runId } = JSON.parse(await readFile(new URL('../app/dist/runs/default.json', import.meta.url), 'utf8'));
const base = `http://localhost:${process.argv[2] ?? 5173}`;
console.log(`\nREPLAY mode · recorded run: ${runId} · no API key or external network needed`);
for (const persona of ['P1', 'P2', 'P3', 'P4', 'P5']) console.log(`${persona} EHR: ${base}/?persona=${persona}&run=${encodeURIComponent(runId)}`);
console.log(`UI browser: ${base}/browse\nDashboard: ${base}/dashboard\n`);
