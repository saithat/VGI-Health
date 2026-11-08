// Arm R REPL process. Runs only inside bwrap (no network, read-only runtime, no
// home or repository) under `node --permission` with code generation disabled.
// Model code runs in a separate vm context that receives strings and in-context
// functions only: no host object, require, process, import() or timers.
import vm from 'node:vm';
import { createInterface } from 'node:readline';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { queryTraining } from './query-engine.mjs';

const send = message => process.stdout.write(JSON.stringify(message) + '\n');
const pending = new Map();
let context = null, files = null, output = [], outputBytes = 0, queries = {}, outputLimit = 65536, hostSeq = 0, cellCount = 0;

function write(text) {
  if (outputBytes > outputLimit) return;
  outputBytes += Buffer.byteLength(text) + 1;
  output.push(text);
}

const PRELUDE = `(function(bridge, print, query, dataJson) {
  'use strict';
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); for (const k of Object.keys(value)) freeze(value[k]); } return value; };
  const data = JSON.parse(dataJson);
  const define = (name, value) => Object.defineProperty(globalThis, name, { value, writable: false, enumerable: true, configurable: false });
  for (const [name, value] of Object.entries(data)) define(name, freeze(value));
  const fmt = value => {
    if (typeof value === 'string') return value;
    if (value === undefined) return 'undefined';
    if (typeof value === 'function') return '[function ' + (value.name || 'anonymous') + ']';
    if (typeof value === 'bigint') return String(value) + 'n';
    try { const text = JSON.stringify(value); return text === undefined ? String(value) : text; } catch (e) { return String(value); }
  };
  const call = (name, args) => new Promise((resolve, reject) => bridge(name, JSON.stringify(args === undefined ? null : args),
    text => resolve(JSON.parse(text)), text => reject(new Error(String(text)))));
  const log = (...items) => print(items.map(fmt).join(' '));
  define('print', log);
  define('console', Object.freeze({ log, info: log, warn: log, error: log }));
  define('peek', (value, chars = 1500) => { const text = fmt(value); log(text.length > chars ? text.slice(0, chars) + ' …[' + (text.length - chars) + ' more chars]' : text); });
  define('size', value => { const text = fmt(value); return text.length; });
  define('query', (name, filters = {}) => { const r = JSON.parse(query(String(name), JSON.stringify(filters))); if (r && r.error) throw new Error(r.error); return r.value; });
  define('check_patch', patch => call('check_patch', { patch }));
  define('estimate_patch', patch => call('estimate_patch', { patch }));
  define('complain', text => call('complain', { text: String(text) }));
  define('llm_query', (prompt, data) => call('llm_query', { prompt: String(prompt), data: data === undefined ? null : data }));
  define('FINAL', submission => call('FINAL', submission));
  Object.defineProperty(globalThis, '__rlm_fmt', { value: fmt, writable: false, enumerable: false, configurable: false });
  // Deterministic replay: no wall clock or entropy inside the REPL.
  const FixedDate = Date;
  const DeterministicDate = class Date extends FixedDate { constructor(...a) { super(...(a.length ? a : [0])); } static now() { return 0; } };
  Object.defineProperty(globalThis, 'Date', { value: DeterministicDate, writable: false, enumerable: false, configurable: false });
  let seed = 20261108;
  Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
})`;

function init(message) {
  files = JSON.parse(message.files);
  outputLimit = message.outputLimit;
  const sandbox = {};
  context = vm.createContext(sandbox, { name: 'rlm', codeGeneration: { strings: false, wasm: false } });
  const bridge = (name, args, resolve, reject) => {
    const id = ++hostSeq;
    pending.set(id, { resolve, reject });
    send({ type: 'host', id, name: String(name), args: String(args) });
  };
  const print = text => write(String(text));
  const query = (name, filters) => {
    queries[String(name)] = (queries[String(name)] ?? 0) + 1;
    try {
      const load = file => { const text = files[file]; if (text === undefined) throw new Error('Unknown train query projection'); return JSON.parse(text); };
      const parsed = JSON.parse(String(filters));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('filters must be an object');
      const options = Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)]));
      return JSON.stringify({ value: queryTraining(load, String(name).replace('_', '-'), options) });
    } catch (error) { return JSON.stringify({ error: error instanceof Error ? error.message : 'query failed' }); }
  };
  new vm.Script(PRELUDE, { filename: 'prelude.js' }).runInContext(context)(bridge, print, query, message.data);
  send({ type: 'ready' });
}

async function cell(message) {
  output = []; outputBytes = 0; queries = {};
  const n = ++cellCount;
  let error = null;
  try {
    const script = new vm.Script(`(async () => {\n${message.code}\n})().then(v => v === undefined ? undefined : __rlm_fmt(v))`, { filename: `cell-${n}.js` });
    const value = await script.runInContext(context, { timeout: message.syncMs, breakOnSigint: false });
    if (value !== undefined) write(String(value));
  } catch (e) {
    const name = e && typeof e === 'object' && typeof e.name === 'string' ? e.name : 'Error';
    const text = e && typeof e === 'object' && typeof e.message === 'string' ? e.message : String(e);
    error = `${name}: ${text}`;
  }
  send({ type: 'cell', id: message.id, stdout: output.join('\n'), error, queries });
}

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
let queue = Promise.resolve();
lines.on('line', line => {
  const message = JSON.parse(line);
  if (message.type === 'host') {
    const waiting = pending.get(message.id);
    if (!waiting) return;
    pending.delete(message.id);
    if (message.ok) waiting.resolve(message.value); else waiting.reject(message.value);
    return;
  }
  if (message.type === 'init') { init(message); return; }
  if (message.type === 'cell') queue = queue.then(() => cell(message));
});
lines.on('close', () => process.exit(0));
