#!/usr/bin/node
// The night CLI inside the arm H sandbox. It has no logic of its own: it sends
// its argv (and, for check/estimate/submit, the named file's text) to the harness
// through a private file spool and prints the JSON reply. Exit codes: 0 ok,
// 1 command error, 2 budget exhausted or already submitted, 3 usage.
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import process from 'node:process';
import { setTimeout } from 'node:timers';
const SPOOL = process.env.NIGHT_SPOOL ?? '/spool';
const USAGE = `usage: night <command> [args]
  check <patch.json>             native Lean checker verdict (costs one check)
  estimate <patch.json>          check + train-window replay estimate (costs one estimate)
  render <screenId>              exact current-program training Chromium geometry
  query <name> [--day N] [--task ID] [--screen ID] [--target ID] [--limit N] [--sort interactions|travel]
                                 names: screens, steps, targets, scroll-past, sequences, ledger
  complain <text>                record missing information or tools
  submit <submission.json>       end the decision (once)
  submit --no-change "<hypothesis>" ["<rationale>"]
  status                         remaining budget`;
const [command, ...argv] = process.argv.slice(2);
if (!command || command === '--help' || command === 'help') { process.stdout.write(USAGE + '\n'); process.exit(command ? 0 : 3); }
let file = null;
const fileArg = ['check', 'estimate'].includes(command) ? argv[0] : command === 'submit' && argv[0] !== '--no-change' ? argv[0] : undefined;
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
const response = `${SPOOL}/${id}.res.json`, deadline = Date.now() + 40 * 60_000;
const wait = () => {
  if (existsSync(response)) {
    let reply;
    try { reply = JSON.parse(readFileSync(response, 'utf8')); unlinkSync(response); } catch { process.stdout.write(JSON.stringify({ error: 'invalid harness reply' }) + '\n'); process.exit(1); }
    process.stdout.write(JSON.stringify(reply.output) + '\n');
    process.exit(Number.isInteger(reply.exit) ? reply.exit : 1);
  }
  if (Date.now() > deadline) { process.stdout.write(JSON.stringify({ error: 'harness did not reply' }) + '\n'); process.exit(1); }
  setTimeout(wait, 50);
};
wait();
