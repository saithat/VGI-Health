#!/usr/bin/node
// Forward hill-climbing commands and patch files to the host over the private spool.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import process from 'node:process';
import { setTimeout } from 'node:timers';
const SPOOL = process.env.NIGHT_SPOOL ?? '/spool';
const usage = 'night measure [--days 1,3] <patch.json> | done <patch.json> "<summary>" | done --no-change "<reason>" | status';
// Commands this sandbox has sent and not yet seen answered; private to the launch.
const STATE = process.env.NIGHT_STATE ?? '/tmp/night-pending';
const [command, ...argv] = process.argv.slice(2);
if (!command || command === '--help' || command === 'help') { process.stdout.write(usage + '\n'); process.exit(command ? 0 : 3); }
if (command === 'status') {
  const running = [];
  for (const name of existsSync(STATE) ? readdirSync(STATE) : []) {
    try {
      const entry = JSON.parse(readFileSync(`${STATE}/${name}`, 'utf8'));
      let alive = true;
      try { process.kill(entry.pid, 0); } catch { alive = false; }
      if (!alive) { rmSync(`${STATE}/${name}`, { force: true }); continue; }
      running.push({ command: entry.command, runningSeconds: Math.round((Date.now() - entry.started) / 1000) });
    } catch { /* ignore a partial entry */ }
  }
  process.stdout.write(JSON.stringify({ running }) + '\n');
  process.exit(0);
}
let file = null;
const needsFile = command === 'measure' || (command === 'done' && argv[0] !== '--no-change');
const fileArg = needsFile ? (command === 'measure' && argv[0] === '--days' ? argv[2] : argv[0]) : undefined;
if (fileArg !== undefined) {
  try { file = { name: fileArg, text: readFileSync(fileArg, 'utf8') }; }
  catch (error) { process.stdout.write(JSON.stringify({ error: `cannot read ${fileArg}: ${error.code ?? error.message}` }) + '\n'); process.exit(1); }
}
// File RPC through the spool: write the request atomically, then wait for the reply.
const id = `${process.pid}-${Date.now()}-${randomBytes(4).toString('hex')}`;
try {
  writeFileSync(`${SPOOL}/${id}.req.tmp`, JSON.stringify({ command, argv, file }));
  renameSync(`${SPOOL}/${id}.req.tmp`, `${SPOOL}/${id}.req.json`);
} catch (error) { process.stdout.write(JSON.stringify({ error: `harness unavailable: ${error.code ?? error.message}` }) + '\n'); process.exit(1); }
const marker = `${STATE}/${id}.json`;
try {
  mkdirSync(STATE, { recursive: true });
  writeFileSync(marker, JSON.stringify({ pid: process.pid, started: Date.now(), command: [command, ...argv].join(' ') }));
} catch { /* status is best effort */ }
const response = `${SPOOL}/${id}.res.json`;
const wait = () => {
  if (existsSync(response)) {
    let reply;
    try { reply = JSON.parse(readFileSync(response, 'utf8')); unlinkSync(response); } catch { process.stdout.write(JSON.stringify({ error: 'invalid harness reply' }) + '\n'); process.exit(1); }
    rmSync(marker, { force: true });
    process.stdout.write(JSON.stringify(reply.output) + '\n');
    process.exit(Number.isInteger(reply.exit) ? reply.exit : 1);
  }
  setTimeout(wait, 50);
};
wait();
