/** Subscription usage limits and rate-limit refusals from the Claude Code and Codex CLIs.
 * A refused request says nothing about the agent: the sample is aborted as a resumable
 * infrastructure error (never recorded as an agent result), the run pauses, and
 * `--resume` after the reset reruns only the samples that did not finish. */
import { z } from 'zod';
import { InfrastructureExhaustedError } from './errors.js';

export interface UsageLimit { cli: 'claude' | 'codex'; message: string; resetsAt: string | null }
/** Not retried: retryInfrastructure stops at InfrastructureExhaustedError, and runNight rethrows it. */
export class UsageLimitError extends InfrastructureExhaustedError {
  constructor(readonly limit: UsageLimit) { super(`usage limit (${limit.cli}): ${limit.message}${limit.resetsAt ? `; resets ${limit.resetsAt}` : ''}`); }
}

const parsed = (stdout: string) => stdout.split('\n').filter(Boolean).flatMap((l): unknown[] => { try { return [JSON.parse(l)]; } catch { return []; } });
/** Codex prints these for a plan quota ("You've hit your usage limit…") and an exhausted rate limit. */
const CODEX_TEXT = /hit your usage limit|usage_limit_reached|usage_not_included|rate_limit_exceeded|rate limit exceeded|429 Too Many Requests/i;
const resets = (seconds: unknown) => typeof seconds === 'number' && Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : null;

/** The usage/rate-limit refusal in one CLI launch's output, or null. Only the CLI's own
 * error events (and stderr) count, never tool output or text the agent wrote. */
export function usageLimitIn(stdout: string, stderr = '', cli: UsageLimit['cli'] = 'codex'): UsageLimit | null {
  for (const e of parsed(stdout)) {
    // Claude Code: rate_limit_event with status "rejected", or a synthetic API-error message/result (HTTP 429, usage_limit_reached).
    const rl = z.object({ type: z.literal('rate_limit_event'), rate_limit_info: z.object({ status: z.string(), resetsAt: z.number().optional(), rateLimitType: z.string().optional() }).passthrough() }).safeParse(e);
    if (rl.success && rl.data.rate_limit_info.status === 'rejected')
      return { cli: 'claude', message: `rate limit rejected (${rl.data.rate_limit_info.rateLimitType ?? 'unknown window'})`, resetsAt: resets(rl.data.rate_limit_info.resetsAt) };
    const api = z.object({ type: z.enum(['assistant', 'result']), api_error_status: z.number().optional(), api_error: z.string().optional(), error: z.string().optional(), result: z.string().optional() }).passthrough().safeParse(e);
    if (api.success && (api.data.api_error_status === 429 || api.data.api_error === 'usage_limit_reached' || api.data.api_error === 'rate_limit_error' || api.data.error === 'rate_limit'))
      return { cli: 'claude', message: api.data.result ?? api.data.api_error ?? 'HTTP 429', resetsAt: null };
    // Codex exec --json: a top-level error event or a failed turn.
    const codex = z.object({ type: z.enum(['error', 'turn.failed']), message: z.string().optional(), error: z.object({ message: z.string() }).optional() }).safeParse(e);
    const text = codex.success ? codex.data.message ?? codex.data.error?.message ?? '' : '';
    if (CODEX_TEXT.test(text)) return { cli: 'codex', message: text.slice(0, 500), resetsAt: null };
  }
  const line = stderr.split('\n').find(l => CODEX_TEXT.test(l));
  return line ? { cli, message: line.trim().slice(0, 500), resetsAt: null } : null;
}
