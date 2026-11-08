import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { BACKENDS, createBackend } from '../src/backends/index.js';
import { OpenAICompatLlm } from '../src/backends/openai-compat.js';
import { validateReply } from '../src/backends/openai-compat.js';
import { RecordingLlm, llmRecordSchema } from '../src/backends/recording.js';
import { ReplayLlm } from '../src/backends/replay.js';
import type { JsonRequest } from '../src/backends/types.js';
import { readJson } from '../src/util.js';

const request: JsonRequest = { callId: 'night-01/P1/propose-0', purpose: 'propose', system: 'Return the requested JSON.', prompt: 'Return ok=true and count=2.', schemaName: 'Tiny',
  schema: { type: 'object', additionalProperties: false, required: ['ok', 'count'], properties: { ok: { const: true }, count: { type: 'integer', minimum: 1 } } } };
const json = { ok: true, count: 2 };
const usage = { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 };
const wire = (content = JSON.stringify(json), finish_reason = 'stop') => ({ model: 'served-model', choices: [{ finish_reason, message: { role: 'assistant', content } }], usage });
const directories: string[] = [];
const servers: ReturnType<typeof createServer>[] = [];
const bodies: unknown[] = [];
const auth: (string | undefined)[] = [];

async function server(handler: (res: ServerResponse, req: IncomingMessage) => void) {
  const http = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    bodies.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    auth.push(req.headers.authorization);
    expect(req.url).toBe('/v1/chat/completions');
    res.setHeader('Content-Type', 'application/json');
    handler(res, req);
  });
  servers.push(http);
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const address = http.address();
  if (!address || typeof address === 'string') throw new Error('No fake HTTP address');
  vi.stubEnv('OPENAI_COMPAT_BASE_URL', `http://127.0.0.1:${address.port}/v1/`);
}

beforeEach(() => {
  for (const key of Object.keys(process.env).filter(k => k.startsWith('OPENAI_COMPAT_'))) vi.stubEnv(key, undefined);
  vi.stubEnv('OPENAI_COMPAT_MODEL', 'requested-model');
  vi.stubEnv('OPENAI_COMPAT_RETRIES', '1');
  bodies.length = 0; auth.length = 0;
});
afterEach(async () => {
  for (const http of servers.splice(0)) { http.closeAllConnections(); await new Promise<void>(resolve => http.close(() => resolve())); }
  for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

it.each(['json_schema', 'json_object', 'prompt'])('uses %s mode and validates locally', async mode => {
  await server(res => res.end(JSON.stringify(wire())));
  vi.stubEnv('OPENAI_COMPAT_SCHEMA_MODE', mode);
  vi.stubEnv('OPENAI_COMPAT_MAX_TOKENS', '50');
  vi.stubEnv('OPENAI_COMPAT_TEMPERATURE', '0.2');
  const backend = createBackend('openai-compat', { model: 'cli-model' });
  expect(BACKENDS).toContain('openai-compat');
  expect(await backend.complete(request)).toMatchObject({ json, backend: 'openai-compat', model: 'cli-model', servedBy: 'served-model', usage, finishReason: 'stop' });
  const body = z.object({ model: z.string(), max_tokens: z.number(), temperature: z.number(), response_format: z.unknown().optional(), messages: z.array(z.object({ role: z.string(), content: z.string() })) }).parse(bodies[0]);
  expect(body).toMatchObject({ model: 'cli-model', max_tokens: 50, temperature: 0.2 });
  expect(body.messages[0]).toEqual({ role: 'system', content: request.system });
  if (mode === 'json_schema') {
    expect(body.response_format).toEqual({ type: 'json_schema', json_schema: { name: 'Tiny', schema: request.schema, strict: true } });
    expect(body.messages[1]?.content).toBe(request.prompt);
  } else {
    expect(body.messages[1]?.content).toContain(JSON.stringify(request.schema));
    expect(body.response_format).toEqual(mode === 'prompt' ? undefined : { type: 'json_object' });
  }
  expect(auth).toEqual([undefined]);
});

it.each(['json_schema', 'json_object', 'prompt'])('rejects schema-invalid JSON in %s without repair or retry', async mode => {
  await server(res => res.end(JSON.stringify(wire('{"ok":true,"count":"2"}'))));
  vi.stubEnv('OPENAI_COMPAT_SCHEMA_MODE', mode);
  await expect(new OpenAICompatLlm().complete(request)).rejects.toThrow('does not match request schema');
  expect(bodies).toHaveLength(1);
});

it.each(['{"ok":true,"count":2,"extra":1}', '{"count":2}', '```json\n{"ok":true,"count":2}\n```'])('refuses missing/extra keys and non-JSON wrappers: %s', async content => {
  await server(res => res.end(JSON.stringify(wire(content))));
  await expect(new OpenAICompatLlm().complete(request)).rejects.toThrow();
  expect(bodies).toHaveLength(1);
});

it('fails on length even if the content happens to be valid JSON', async () => {
  await server(res => res.end(JSON.stringify(wire(JSON.stringify(json), 'length'))));
  await expect(new OpenAICompatLlm().complete(request)).rejects.toThrow('finish_reason=length');
});

it('strips multiline think blocks before parsing, without extracting arbitrary JSON', async () => {
  await server(res => res.end(JSON.stringify(wire('<think>private\nreasoning {}</think>\n<think>more</think>\n' + JSON.stringify(json)))));
  expect((await new OpenAICompatLlm().complete(request)).json).toEqual(json);
});

it.each([429, 503])('retries HTTP %s with the same request', async status => {
  let calls = 0;
  await server(res => { if (++calls === 1) { res.statusCode = status; res.setHeader('Retry-After', '0'); res.end('{}'); } else res.end(JSON.stringify(wire())); });
  expect((await new OpenAICompatLlm().complete(request)).json).toEqual(json);
  expect(calls).toBe(2); expect(bodies[0]).toEqual(bodies[1]);
});

it('does not multiply the HTTP retry budget through RecordingLlm or expose a key in errors', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'compat-budget-')); directories.push(dir);
  await server(res => { res.statusCode = 500; res.setHeader('Retry-After', '0'); res.end('secret-test-key'); });
  vi.stubEnv('OPENAI_COMPAT_API_KEY', 'secret-test-key');
  await expect(new RecordingLlm(new OpenAICompatLlm(), dir).complete(request)).rejects.toThrow('HTTP 500');
  expect(bodies).toHaveLength(2);
  expect(auth).toEqual(['Bearer secret-test-key', 'Bearer secret-test-key']);
  const error = await readFile(path.join(dir, 'llm/night-01/P1/propose-0.error.json'), 'utf8');
  expect(error).not.toContain('secret-test-key');
});

it('times out while waiting for a response', async () => {
  await server(() => { /* Intentionally never reply. */ });
  vi.stubEnv('OPENAI_COMPAT_TIMEOUT_MS', '25');
  await expect(new OpenAICompatLlm().complete(request)).rejects.toThrow('timed out');
  expect(bodies).toHaveLength(1);
});

it('rejects refusal and tool finishes', async () => {
  await server(res => res.end(JSON.stringify(wire(JSON.stringify(json), 'tool_calls'))));
  await expect(new OpenAICompatLlm().complete(request)).rejects.toThrow('refused or incomplete');
});

it('requires explicit base/model configuration and validates numeric/mode settings', () => {
  expect(() => new OpenAICompatLlm()).toThrow('OPENAI_COMPAT_BASE_URL');
  vi.stubEnv('OPENAI_COMPAT_BASE_URL', 'http://127.0.0.1/v1'); vi.stubEnv('OPENAI_COMPAT_MODEL', undefined);
  expect(() => new OpenAICompatLlm()).toThrow('unrecorded default');
  vi.stubEnv('OPENAI_COMPAT_MODEL', 'model'); vi.stubEnv('OPENAI_COMPAT_SCHEMA_MODE', 'invalid');
  expect(() => new OpenAICompatLlm()).toThrow('OPENAI_COMPAT_SCHEMA_MODE');
  vi.stubEnv('OPENAI_COMPAT_SCHEMA_MODE', 'prompt'); vi.stubEnv('OPENAI_COMPAT_MAX_TOKENS', '0');
  expect(() => new OpenAICompatLlm()).toThrow('OPENAI_COMPAT_MAX_TOKENS');
  vi.stubEnv('OPENAI_COMPAT_MAX_TOKENS', undefined); vi.stubEnv('OPENAI_COMPAT_BASE_URL', 'http://key@localhost/v1');
  expect(() => new OpenAICompatLlm()).toThrow('without credentials');
});

it('treats JSON Schema defaults as annotations, never as permission to fill required fields', () => {
  const schema = { type: 'object', required: ['default', 'count'], properties: { default: { type: 'boolean' }, count: { type: 'integer', default: 2 } } };
  expect(() => validateReply(schema, { default: true })).toThrow('request schema');
  expect(() => validateReply(schema, { default: true, count: 2 })).not.toThrow();
  expect(() => validateReply(schema, { default: 'wrong', count: 2 })).toThrow('request schema');
});

it('records and replays response, model provenance, usage and finish reason unchanged', async () => {
  await server(res => res.end(JSON.stringify(wire())));
  vi.stubEnv('OPENAI_COMPAT_API_KEY', 'secret-test-key');
  const dir = await mkdtemp(path.join(tmpdir(), 'compat-record-')); directories.push(dir);
  const first = await new RecordingLlm(new OpenAICompatLlm(), dir).complete(request);
  const recordFile = path.join(dir, 'llm/night-01/P1/propose-0.json');
  const record = await readJson(recordFile, llmRecordSchema);
  expect(record).toMatchObject({ backend: 'openai-compat', model: 'requested-model', servedBy: 'served-model', response: json, usage, finishReason: 'stop' });
  const replay = await new ReplayLlm(dir).complete(request);
  expect(replay).toMatchObject({ json: first.json, model: first.model, servedBy: first.servedBy, promptMatched: true, finishReason: 'stop', replayOf: { backend: 'openai-compat', model: 'requested-model', source: dir } });
  const reused = await new RecordingLlm(new OpenAICompatLlm(), dir, true).complete(request);
  expect(reused).toMatchObject({ json, usage, finishReason: 'stop' });
  expect(bodies).toHaveLength(1);
  expect(await readFile(recordFile, 'utf8')).not.toContain('secret-test-key');
});
