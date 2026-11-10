import { existsSync } from 'node:fs';
import { chmod, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { UsageLimitError, apiUsageLimit, usageLimitIn } from '../src/usage-limit.js';
import { ClaudeLlm } from '../src/backends/claude.js';
import { DEFAULT_TOOL_BUDGET, ToolSession } from '../src/tool-session.js';
import { CodexLlm } from '../src/backends/codex.js';
import { RecordingLlm } from '../src/backends/recording.js';
import { InfrastructureError, InfrastructureExhaustedError } from '../src/errors.js';

const lines = (events: unknown[]) => events.map(e => JSON.stringify(e)).join('\n');
const dirs: string[] = [];
afterEach(async () => { for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true }); });

it('recognizes the Claude Code and Codex usage/rate-limit refusals, and nothing the agent itself printed or read', () => {
  // As recorded in the H-claude full study (2026-11-09) and as Codex exec --json reports a plan limit.
  expect(usageLimitIn(lines([{ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', resetsAt: 1794255600, rateLimitType: 'five_hour' } }])))
    .toEqual({ cli: 'claude', message: 'rate limit rejected (five_hour)', resetsAt: '2026-11-09T20:20:00.000Z' });
  expect(usageLimitIn(lines([{ type: 'result', is_error: true, api_error_status: 429, api_error: 'usage_limit_reached', result: "You've hit your 5-hour limit" }])))
    .toMatchObject({ cli: 'claude', message: "You've hit your 5-hour limit" });
  expect(usageLimitIn(lines([{ type: 'turn.failed', error: { message: "You've hit your usage limit. Try again later." } }]))).toMatchObject({ cli: 'codex' });
  expect(usageLimitIn(lines([{ type: 'error', message: 'exceeded retry limit, last status: 429 Too Many Requests' }]))).toMatchObject({ cli: 'codex' });
  expect(usageLimitIn('', 'ERROR: You\'ve hit your usage limit.\n', 'claude')).toMatchObject({ cli: 'claude' });
  // Not a refusal: an allowed rate-limit notice, an ordinary failed turn, tool output or agent text quoting the message.
  expect(usageLimitIn(lines([{ type: 'rate_limit_event', rate_limit_info: { status: 'allowed_warning', resetsAt: 1 } }]))).toBeNull();
  expect(usageLimitIn(lines([{ type: 'turn.failed', error: { message: 'stream disconnected' } }]))).toBeNull();
  expect(usageLimitIn(lines([{ type: 'user', message: { content: [{ type: 'tool_result', content: "You've hit your usage limit" }] } },
    { type: 'assistant', message: { content: [{ type: 'text', text: 'usage_limit_reached' }] } },
    { type: 'item.completed', item: { type: 'command_execution', aggregated_output: "You've hit your usage limit" } }]))).toBeNull();
});

it.skipIf(!existsSync('/usr/bin/bwrap'))('a Codex backend usage limit is an infrastructure error that is not retried and never becomes a model response', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'usage-limit-')); dirs.push(dir);
  const fake = path.join(dir, 'codex');
  await writeFile(fake, `#!/bin/sh\ncat >/dev/null\ncat <<'JSON'\n${lines([{ type: 'thread.started', thread_id: 't' }, { type: 'turn.started' },
    { type: 'error', message: "You've hit your usage limit. Visit https://chatgpt.com/settings/usage to purchase more credits." },
    { type: 'turn.failed', error: { message: "You've hit your usage limit." } }])}\nJSON\nexit 1\n`);
  await chmod(fake, 0o755);
  const llm = new RecordingLlm(new CodexLlm({ model: 'gpt-test', binary: fake, serviceTier: 'default' }), dir);
  const request = { callId: 'night-01/P1/propose-0', purpose: 'propose' as const, system: 's', prompt: 'p', schemaName: 'Proposal', schema: { type: 'object' } };
  const error: unknown = await llm.complete(request).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(InfrastructureError);
  if (!(error instanceof UsageLimitError)) throw new Error('expected a UsageLimitError');
  expect(error.limit).toMatchObject({ cli: 'codex' });
  const recorded = await readdir(path.join(dir, 'llm/night-01/P1'));
  expect(recorded.filter(f => f.includes('.attempt-'))).toEqual(['propose-0.attempt-1.error.json']);
  expect(recorded).not.toContain('propose-0.json');
});

it('an exhausted rate limit from the direct claude (SDK) backend is the same resumable usage-limit error, on both request paths', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'usage-limit-sdk-')); dirs.push(dir);
  const old = process.env['ANTHROPIC_API_KEY'];
  process.env['ANTHROPIC_API_KEY'] = 'test-key';
  try {
    // The error the SDK throws once its own retries (maxRetries 4) are spent.
    const refusal = () => new Anthropic.RateLimitError(429, { type: 'error', error: { type: 'rate_limit_error', message: 'Number of request tokens has exceeded your per-minute rate limit' } },
      undefined, new Headers({ 'retry-after': '60', 'request-id': 'req_test' }));
    let calls = 0;
    const inner = new ClaudeLlm({ model: 'claude-test' });
    Object.defineProperty(inner, 'client', { value: { beta: { messages: { stream: () => { calls++; return { finalMessage: () => Promise.reject(refusal()) }; } } } } });
    const llm = new RecordingLlm(inner, dir);
    const request = { callId: 'night-01/P1/propose-0', purpose: 'propose' as const, system: 's', prompt: 'p', schemaName: 'Proposal', schema: { type: 'object' } };
    const before = Date.now();
    const error: unknown = await llm.complete(request).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InfrastructureExhaustedError);
    if (!(error instanceof UsageLimitError)) throw new Error('expected a UsageLimitError');
    expect(error.limit.cli).toBe('claude-api');
    expect(error.limit.message).toContain('rate limit');
    expect(Date.parse(error.limit.resetsAt ?? '')).toBeGreaterThanOrEqual(before + 60_000);
    expect(calls).toBe(1); // not retried by the recording or outer boundaries
    const recorded = await readdir(path.join(dir, 'llm/night-01/P1'));
    expect(recorded.filter(f => f.includes('.attempt-'))).toEqual(['propose-0.attempt-1.error.json']);
    expect(recorded).not.toContain('propose-0.json');
    // The tool-session path (arms C/E) raises it too, instead of BackendRequestError.
    const toolSession = new ToolSession([], DEFAULT_TOOL_BUDGET, () => Promise.resolve({}));
    const toolError: unknown = await llm.complete({ ...request, callId: 'night-01/P1/tools-0', toolSession }).catch((e: unknown) => e);
    expect(toolError).toBeInstanceOf(UsageLimitError);
    // Other API errors keep their meaning.
    Object.defineProperty(inner, 'client', { value: { beta: { messages: { stream: () => ({ finalMessage: () => Promise.reject(new Anthropic.InternalServerError(500, undefined, 'boom', new Headers())) }) } } } });
    const other: unknown = await inner.complete(request).catch((e: unknown) => e);
    expect(other).not.toBeInstanceOf(UsageLimitError);
  } finally { if (old === undefined) delete process.env['ANTHROPIC_API_KEY']; else process.env['ANTHROPIC_API_KEY'] = old; }
});

it('reads the direct API reset time from retry-after or the anthropic-ratelimit reset headers', () => {
  const now = Date.parse('2026-11-10T00:00:00Z');
  expect(apiUsageLimit(429, 'm', new Headers({ 'retry-after': '30' }), now)?.resetsAt).toBe('2026-11-10T00:00:30.000Z');
  expect(apiUsageLimit(429, 'm', new Headers({ 'anthropic-ratelimit-tokens-reset': '2026-11-10T00:01:00Z', 'anthropic-ratelimit-requests-reset': '2026-11-10T00:00:10Z' }), now)?.resetsAt).toBe('2026-11-10T00:01:00.000Z');
  expect(apiUsageLimit(429, 'm', undefined, now)).toEqual({ cli: 'claude-api', message: 'm', resetsAt: null });
  expect(apiUsageLimit(529, 'overloaded', undefined, now)).toBeNull();
});
