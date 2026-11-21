#!/usr/bin/node
// Forward hill-climbing commands and patch files to the host over the private spool.
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import process from 'node:process';
import { setTimeout } from 'node:timers';
const SPOOL = process.env.NIGHT_SPOOL ?? '/spool';
const usage = 'night measure [--days 1,3] <patch.json> | done <patch.json> "<summary>" | done --no-change "<reason>"';
const [command, ...argv] = process.argv.slice(2);
if (!command || command === '--help' || command === 'help') { process.stdout.write(usage + '\n'); process.exit(command ? 0 : 3); }
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
const response = `${SPOOL}/${id}.res.json`;
const wait = () => {
  if (existsSync(response)) {
    let reply;
    try { reply = JSON.parse(readFileSync(response, 'utf8')); unlinkSync(response); } catch { process.stdout.write(JSON.stringify({ error: 'invalid harness reply' }) + '\n'); process.exit(1); }
    process.stdout.write(JSON.stringify(reply.output) + '\n');
    process.exit(Number.isInteger(reply.exit) ? reply.exit : 1);
  }
  setTimeout(wait, 50);
};
wait();
