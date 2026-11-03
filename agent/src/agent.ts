/**
 * The agent interface the loop talks to. Every backend (claude, codex, replay,
 * and the test-only scripted one) is a `JsonLlm`; `LlmAgent` turns prompts
 * into validated Candidates and choices on top of it.
 */
import type { RecordingLlm } from './backends/recording.js';
import type { JsonRequest } from './backends/types.js';
import type { PromptParts } from './prompts.js';
import {
  LLM_CHOICE_JSON_SCHEMA, LLM_PROPOSAL_JSON_SCHEMA, llmChoiceSchema, llmProposalSchema, toCandidate,
  type Candidate, type LlmCallRef, type LlmChoice,
} from './schema.js';
import { errorMessage } from './util.js';

export interface ProposeContext {
  callId: string;
  purpose: 'propose' | 'repair' | 'migrate' | 'surface' | 'break';
  source: Candidate['source'];
  parts: PromptParts;
}

export interface Proposal {
  hypothesis: string;
  decision: 'change' | 'noChange';
  candidates: Candidate[];
  /** LLM candidates that failed to decode (bad valueJson, schema), logged as rejections. */
  undecodable: { id: string; summary: string; error: string }[];
  call: LlmCallRef;
}

export interface ChooseContext {
  callId: string;
  parts: PromptParts;
}

export interface Choice extends LlmChoice {
  call: LlmCallRef;
}

export interface AgentBackend {
  readonly name: string;
  readonly model: string;
  proposeCandidates(ctx: ProposeContext): Promise<Proposal>;
  chooseCandidates(ctx: ChooseContext): Promise<Choice>;
}

export class LlmAgent implements AgentBackend {
  constructor(private readonly llm: RecordingLlm) {}
  get name(): string { return this.llm.name; }
  get model(): string { return this.llm.model; }

  async proposeCandidates(ctx: ProposeContext): Promise<Proposal> {
    const req: JsonRequest = {
      callId: ctx.callId, purpose: ctx.purpose, system: ctx.parts.system, prompt: ctx.parts.prompt,
      ...(ctx.parts.queryBundle?{queryBundle:ctx.parts.queryBundle}:{}),
      schemaName: 'LlmProposal', schema: LLM_PROPOSAL_JSON_SCHEMA,
    };
    const res = await this.llm.complete(req);
    const parsed = llmProposalSchema.safeParse(res.json);
    if (!parsed.success) throw new Error(`${ctx.callId}: proposal does not match schema: ${parsed.error.issues[0]?.message ?? ''}`);
    const seen = new Set<string>();
    const candidates: Candidate[] = [];
    const undecodable: Proposal['undecodable'] = [];
    for (const raw of parsed.data.candidates.slice(0, 5)) {
      let id = raw.id.trim() || `c${candidates.length + undecodable.length + 1}`;
      while (seen.has(id)) id = `${id}'`;
      seen.add(id);
      try {
        candidates.push(toCandidate({ ...raw, id }, ctx.source));
      } catch (e) {
        undecodable.push({ id, summary: raw.summary, error: errorMessage(e) });
      }
    }
    return { hypothesis: parsed.data.hypothesis, decision: parsed.data.decision, candidates, undecodable, call: this.llm.ref(req, res) };
  }

  async chooseCandidates(ctx: ChooseContext): Promise<Choice> {
    const req: JsonRequest = {
      callId: ctx.callId, purpose: 'choose', system: ctx.parts.system, prompt: ctx.parts.prompt,
      ...(ctx.parts.queryBundle?{queryBundle:ctx.parts.queryBundle}:{}),
      schemaName: 'LlmChoice', schema: LLM_CHOICE_JSON_SCHEMA,
    };
    const res = await this.llm.complete(req);
    const parsed = llmChoiceSchema.safeParse(res.json);
    if (!parsed.success) throw new Error(`${ctx.callId}: choice does not match schema: ${parsed.error.issues[0]?.message ?? ''}`);
    return { ...parsed.data, call: this.llm.ref(req, res) };
  }
}
