import { Worker, MessageChannel, receiveMessageOnPort } from 'node:worker_threads';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const digest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');

/** Only the real executable decides state, visibility, validity and commits. */
export class Native {
  constructor(binary, { transport = process.env.EHR_CONFORMANCE_TRANSPORT ?? 'cli' } = {}) {
    if (!['cli', 'serve'].includes(transport)) throw Error('Unknown conformance transport');
    this.transport = transport;
    this.sequence = 0;
    this.binary = binary;
    this.sha256 = digest(readFileSync(binary));
    this.cache = new Map();
    this.calls = 0;
  }
  call(command, input) {
    const json = JSON.stringify(input);
    const key = command + digest(json);
    if (this.cache.has(key)) return structuredClone(this.cache.get(key));
    if (this.transport === 'serve') {
      this.calls++;
      const output = this.serve(command, input);
      if (output.error) throw Error(`native ${command}: ${output.error}`);
      this.cache.set(key, output);
      return structuredClone(output);
    }
    const result = spawnSync(this.binary, [command], {
      input: json, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 30000,
      env: { ...process.env, LEAN_NUM_THREADS: process.env.LEAN_NUM_THREADS ?? '6' },
    });
    this.calls++;
    if (result.error || result.status !== 0) throw new Error(`native ${command}: ${result.error?.message ?? result.stderr ?? result.stdout}`);
    const output = JSON.parse(result.stdout);
    if (output.error) throw new Error(`native ${command}: ${output.error}`);
    this.cache.set(key, output);
    return structuredClone(output);
  }
  serve(op, input) {
    if (this.transportFailed) throw Error(`native ${op}: transport failed`);
    if (!this.worker) {
      const { port1, port2 } = new MessageChannel();
      this.port = port1;
      this.signal = new Int32Array(new SharedArrayBuffer(4));
      this.worker = new Worker(new URL('./native-worker.mjs', import.meta.url), {
        workerData: { binary: this.binary, port: port2, signal: this.signal.buffer }, transferList: [port2],
      });
      this.worker.on('error', () => { this.transportFailed = true; });
    }
    const id = ++this.sequence;
    Atomics.store(this.signal, 0, 0);
    this.port.postMessage({ id, op, input });
    if (Atomics.wait(this.signal, 0, 0, 35_000) === 'timed-out') {
      this.transportFailed = true;
      throw Error(`native ${op}: transport timed out`);
    }
    const response = receiveMessageOnPort(this.port)?.message;
    if (response?.id !== id) throw Error(`native ${op}: response out of sequence`);
    if (response.error || response.result === undefined) throw Error(`native ${op}: ${response.error ?? 'missing result'}`);
    return response.result;
  }
  async close() {
    if (!this.worker) return;
    const worker = this.worker;
    const done = new Promise((resolve, reject) => { worker.once('exit', resolve); worker.once('error', reject); });
    this.port.postMessage({ close: true });
    this.port.close();
    this.worker = undefined;
    await done;
  }

}
