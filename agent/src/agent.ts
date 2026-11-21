/**
 * The agent interface the loop talks to. Every backend (claude, codex, openai-compat, replay,
 * and the test-only scripted one) is a `JsonLlm`; `LlmAgent` turns prompts
 * into validated candidates on top of it.
 */
import type { RecordingLlm } from './backends/recording.js';
import type { JsonRequest } from './backends/types.js';
import type { PromptParts } from './prompts.js';
import {
LLM_PROPOSAL_JSON_SCHEMA,llmProposalSchema,llmCandidateSchema,moveTypeSchema,toCandidate,
type Candidate,type LlmCallRef,
} from '../../app/src/dashboard/agent-evidence.js';
import { errorMessage } from './util.js';

export interface ProposeContext {
  callId: string;
  purpose: 'migrate' | 'surface' | 'break';
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

export interface AgentBackend {
  readonly name: string;
  readonly model: string;
  proposeCandidates(ctx: ProposeContext): Promise<Proposal>;
}

export class LlmAgent implements AgentBackend {
  constructor(private readonly llm: RecordingLlm) {}
  get name(): string { return this.llm.name; }
  get model(): string { return this.llm.model; }

  async proposeCandidates(ctx: ProposeContext): Promise<Proposal> {
    const req: JsonRequest = {
      callId: ctx.callId, purpose: ctx.purpose, system: ctx.parts.system, prompt: ctx.parts.prompt,
      schemaName: 'LlmProposal', schema: ctx.parts.leanLayouts ? {
        ...LLM_PROPOSAL_JSON_SCHEMA, properties:{...LLM_PROPOSAL_JSON_SCHEMA.properties,candidates:{type:'array',items:{
          ...LLM_PROPOSAL_JSON_SCHEMA.properties.candidates.items,properties:{...LLM_PROPOSAL_JSON_SCHEMA.properties.candidates.items.properties,
            moveType:{type:'string',enum:[...LLM_PROPOSAL_JSON_SCHEMA.properties.candidates.items.properties.moveType.enum,'layout']}}}}},
      } : LLM_PROPOSAL_JSON_SCHEMA,
    };
    const res = await this.llm.complete(req);
    return { ...decodeProposalResponse(res.json, ctx.source, ctx.callId, ctx.parts.leanLayouts), call: this.llm.ref(req, res) };
  }


}

/** Shared decoding policy for live nights and frozen recorded-prompt comparisons. */
export function decodeProposalResponse(json: unknown, source: Candidate['source'], callId: string, leanLayouts = false): Omit<Proposal, 'call'> {
  const parsed = llmProposalSchema.extend({candidates:llmCandidateSchema.extend({moveType:moveTypeSchema}).array()}).safeParse(json);
  if(!leanLayouts && parsed.success && parsed.data.candidates.some(c=>c.moveType==='layout')) throw Error(`${callId}: layout move requires --screens lean`);
  if (!parsed.success) throw new Error(`${callId}: proposal does not match schema: ${parsed.error.issues[0]?.message ?? ''}`);
  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  const undecodable: Proposal['undecodable'] = [];
  for (const raw of parsed.data.candidates.slice(0, 5)) {
    let id = raw.id.trim() || `c${candidates.length + undecodable.length + 1}`;
    while (seen.has(id)) id = `${id}'`;
    seen.add(id);
    try {
      if(raw.moveType==='layout' && !raw.patch.some(op=>op.path==='/layouts'||op.path.startsWith('/layouts/'))) throw Error('layout move must patch /layouts');
      candidates.push(toCandidate({ ...raw, id }, source));
    } catch (e) {
      undecodable.push({ id, summary: raw.summary, error: errorMessage(e) });
    }
  }
  return { hypothesis: parsed.data.hypothesis, decision: parsed.data.decision, candidates, undecodable };
}
