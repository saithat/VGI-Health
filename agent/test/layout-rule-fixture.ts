/** Explicitly synthetic geometry and scripted model; native admission is real. */
import { ScriptedLlm } from './scripted.js';
import { fakeLeanStates } from './lean-fixture.js';
import { llmProposalSchema } from '../src/schema.js';
import type { JsonRequest } from '../src/backends/types.js';
import type { GeometryProvider } from '../src/geometry.js';
export const ruleFixtureStates = async (input: Parameters<GeometryProvider>[0]) => (await fakeLeanStates(input)).map(state => ({ ...state, ui: { ...state.ui, workspace: [
            ...Array.from({ length: 40 }, () => ({ text: { s: 'Synthetic context text' } })),
            ...(Array.isArray(state.ui['workspace']) ? state.ui['workspace'] : []),
        ] } }));
export class RulesScript extends ScriptedLlm {
    constructor(private readonly refuseFirst = false) { super(); }
    override async complete(req: JsonRequest) {
        const response = await super.complete(req);
        if (!['propose', 'repair'].includes(req.purpose))
            return response;
        const proposal = llmProposalSchema.parse(response.json);
        return { ...response, json: { ...proposal, candidates: proposal.candidates.map(candidate => ({ ...candidate, moveType: 'layout', patch: [...candidate.patch, { op: 'add', path: '/layouts', from: '', valueJson: JSON.stringify([{ screen: '*', rules: [{ kind: 'firstViewport', target: this.refuseFirst && req.purpose === 'propose' ? { id: 'missing-rule-target' } : { kind: 'button', role: 'secondary' } }] }]) }] })) } };
    }
}
