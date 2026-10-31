/**
 * Claude backend: @anthropic-ai/sdk, structured JSON output.
 *
 * - Model: AGENT_MODEL, default `claude-opus-5-5`.
 * - Adaptive thinking (Opus 5.5 cannot disable thinking); effort AGENT_EFFORT, default "high".
 * - `output_config.format` = the call's JSON Schema, so the reply is schema-valid JSON.
 * - Server-side refusal fallback (`fallbacks: "default"`); the serving model is recorded.
 * - Streaming + finalMessage() (large outputs; avoids HTTP timeouts).
 * - API key from ANTHROPIC_API_KEY.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { JsonLlm, JsonRequest, JsonResponse } from './types.js';

export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5-5';
type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const EFFORTS: readonly Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

function effortFromEnv(): Effort {
  const e = process.env['AGENT_EFFORT'];
  return EFFORTS.find((x) => x === e) ?? 'high';
}

export class ClaudeLlm implements JsonLlm {
  readonly name = 'claude' as const;
  readonly model: string;
  private readonly client: Anthropic;
  private readonly effort: Effort;

  constructor(opts: { model?: string; effort?: Effort } = {}) {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) throw new Error('claude backend: set ANTHROPIC_API_KEY (or use --backend replay for a keyless demo)');
    this.client = new Anthropic({ apiKey, maxRetries: 4 });
    this.model = opts.model ?? process.env['AGENT_MODEL'] ?? DEFAULT_CLAUDE_MODEL;
    this.effort = opts.effort ?? effortFromEnv();
  }

  async complete(req: JsonRequest): Promise<JsonResponse> {
    let message: Anthropic.Beta.BetaMessage;
    try {
      const stream = this.client.beta.messages.stream({
        model: this.model,
        max_tokens: 64000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        thinking: { type: 'adaptive' },
        output_config: { effort: this.effort, format: { type: 'json_schema', schema: req.schema } },
        system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: req.prompt }],
      });
      message = await stream.finalMessage();
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) throw new Error('claude backend: ANTHROPIC_API_KEY was rejected');
      if (error instanceof Anthropic.RateLimitError) throw new Error(`claude backend: rate limited after retries (${error.message})`);
      if (error instanceof Anthropic.BadRequestError) throw new Error(`claude backend: bad request (${error.message})`);
      if (error instanceof Anthropic.APIError) throw new Error(`claude backend: API error ${String(error.status)} (${error.message})`);
      throw error;
    }
    if (message.stop_reason === 'refusal') {
      throw new Error(`claude backend: refused (${message.stop_details?.category ?? 'no category'}) for ${req.callId}`);
    }
    if (message.stop_reason === 'max_tokens') throw new Error(`claude backend: hit max_tokens for ${req.callId}`);
    const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`claude backend: reply for ${req.callId} is not JSON`);
    }
    return { json, backend: 'claude', model: this.model, servedBy: message.model, replayOf: null, promptMatched: null, usage: message.usage };
  }
}
