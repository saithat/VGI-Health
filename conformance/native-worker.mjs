// Async pipe ownership stays here so the semantic driver can keep synchronous
// calls. Each request contains its entire state; the native server is stateless.
import { spawn } from 'node:child_process';
import { workerData } from 'node:worker_threads';
const { binary, port, signal } = workerData;
const wake = new Int32Array(signal);
const limit = 32 * 1024 * 1024;
let child, pending, timer, buffer = '', closing = false;
function reply(message) {
  clearTimeout(timer);
  pending = undefined;
  port.postMessage(message);
  Atomics.store(wake, 0, 1);
  Atomics.notify(wake, 0);
}
function fail(error) {
  const old = child;
  child = undefined;
  buffer = '';
  old?.kill('SIGKILL');
  if (pending !== undefined) reply({ id: pending, error: String(error) });
}
function start() {
  const process = spawn(binary, ['serve'], { stdio: ['pipe', 'pipe', 'pipe'] });
  child = process;
  process.stderr.resume();
  process.stdout.setEncoding('utf8');
  process.stdout.on('data', chunk => {
    if (child !== process) return;
    buffer += chunk;
    if (Buffer.byteLength(buffer) > limit) return fail('Native response too large');
    let end;
    while ((end = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      try {
        const response = JSON.parse(line);
        if (pending === undefined || response.id !== pending) throw Error('Native response out of sequence');
        reply(response);
      } catch (error) { fail(error); }
    }
  });
  process.on('error', error => { if (child === process) fail(error); });
  process.stdin.on('error', error => { if (child === process) fail(error); });
  process.on('exit', () => {
    if (closing) port.close();
    else if (child === process) fail('Native process exited');
  });
}
port.on('message', request => {
  if (request.close) {
    closing = true;
    clearTimeout(timer);
    if (child) child.kill('SIGTERM');
    else port.close();
    return;
  }
  if (pending !== undefined) return fail('Concurrent native request');
  pending = request.id;
  if (!child) start();
  timer = setTimeout(() => fail('Native request timed out'), 30_000);
  child.stdin.write(JSON.stringify(request) + '\n');
});
