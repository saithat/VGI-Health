import { applyLayoutRules, layoutRuleSchema, denseOutline, type LayoutRule } from '../src/layout-rules.js';
import { layoutDesignSchema, withDesign } from '../src/layout-design.js';
import { layoutRunner, viewports } from '../src/lean-layout-native.js';
import { LeanScreenChecker } from '../src/lean-screencheck.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { fakeCanonical } from '../src/fake/fixtures.js';
import { decodeProposalResponse, LlmAgent } from '../src/agent.js';
import { RecordingLlm } from '../src/backends/recording.js';
import { LLM_PROPOSAL_JSON_SCHEMA } from '../src/schema.js';
import { leanLayoutPrompt } from '../src/lean-layout-prompt.js';
import { formatProgram } from '../src/prompts.js';
import { applyToProgram } from '../src/program.js';
import { tmp } from './helpers.js';
import type { JsonLlm } from '../src/backends/types.js';
function required<T>(value: T | undefined): T { if (value === undefined)
    throw Error('fixture missing'); return value; }
const button = (id: string, role = 'secondary') => ({ button: { comp: id, label: id, role, enabled: true, blockedReason: null, hotkey: null } });
const ui = { screen: 's', banner: [['Patient', 'Synthetic']], title: 'Fixture', nav: [], workspace: [{ section: { id: 'group', title: 'Group', children: [button('a'), button('b')] } }, button('c'), button('sign', 'primary')], side: [], modal: null };
export const rules: LayoutRule[] = [
    { kind: 'firstViewport', target: { id: 'c' } },
    { kind: 'columns', target: { id: 'group' }, count: 2, tracks: [2, 1] },
    { kind: 'order', targets: [{ id: 'b' }, { id: 'a' }] },
    { kind: 'beside', target: { id: 'c' }, anchor: { id: 'group' } },
    { kind: 'region', target: { id: 'c' }, region: 'side' },
    { kind: 'pin', target: { id: 'c' } },
];
for (const rule of rules)
    it(`expands and natively admits ${rule.kind} deterministically at every viewport`, async () => {
        expect(layoutRuleSchema.parse(rule)).toEqual(rule);
        const layouts = viewports.map(viewport => ({ viewport, tree: applyLayoutRules(ui, viewport, [rule]) }));
        expect(layouts).toEqual(viewports.map(viewport => ({ viewport, tree: applyLayoutRules(ui, viewport, [rule]) })));
        const [reply] = await layoutRunner([{ op: 'family-check', references: [{ screen: ui, layouts }], maxTargetsPerViewport: 15 }]);
        expect(reply?.accepted, JSON.stringify(reply)).toBe(true);
    });
it('refuses unknown/fixed targets and malformed tracks with an explicit rule index', () => {
    expect(() => applyLayoutRules(ui, required(viewports[0]), [{ kind: 'firstViewport', target: { id: 'missing' } }])).toThrow(/rule 0.*unknown target.*missing/);
    expect(() => applyLayoutRules(ui, required(viewports[0]), [{ kind: 'pin', target: { role: 'primary' } }])).toThrow(/fixed\/safety/);
    expect(() => applyLayoutRules(ui, required(viewports[0]), [{ kind: 'columns', target: { id: 'group' }, count: 2, tracks: [1] }])).toThrow(/tracks length/);
});
it('keeps literal sidecars compatible and expands rules across multiple shapes and screens inside the gate', async () => {
    const program = withDesign(structuredClone(fakeCanonical('v1')), layoutDesignSchema.parse([{ screen: '*', screens: ['s', 'other'], rules: [{ kind: 'firstViewport', target: { id: 'c' } }] }]));
    const checker = new LeanScreenChecker(createFakeEhr(), { states: async () => [
            { screen: 's', ui, state: 'one' },
            { screen: 's', ui: { ...ui, workspace: [...ui.workspace, button('extra')] }, state: 'two' },
            { screen: 'other', ui: { ...ui, screen: 'other' }, state: 'three' },
        ], limits: async () => ({}) });
    const verdict = await checker.check({ program, specVersion: 'v1' });
    expect(verdict.status, verdict.message).toBe('pass');
    const atlas = await checker.geometry({ program, specVersion: 'v1' });
    expect(atlas?.states).toHaveLength(3);
    expect(atlas?.states[0]?.components['c']?.center.y).toBeLessThan(atlas?.states[0]?.components['a']?.center.y ?? 0);
});
const badRules: LayoutRule[] = [
    { kind: 'firstViewport', target: { id: 'missing' } },
    { kind: 'columns', target: { id: 'group' }, count: 100 },
    { kind: 'columns', target: { id: 'group' }, count: Number.MAX_SAFE_INTEGER },
];
it.each(badRules)('returns a refused rule to repair, never silently deploying its fallback: $kind', async (rule) => {
    const program = withDesign(structuredClone(fakeCanonical('v1')), layoutDesignSchema.parse([{ screen: 's', rules: [rule] }]));
    const checker = new LeanScreenChecker(createFakeEhr(), { states: async () => [{ screen: 's', ui, state: 's' }], limits: async () => ({}) });
    const verdict = await checker.check({ program, specVersion: 'v1' });
    expect(verdict.status).toBe('fail');
    expect(verdict.message).toContain('layout-rule');
    expect(verdict.message).not.toContain('"warning":true');
    if (rule.kind === 'columns')
        expect(verdict.message).toMatch(/G3|native family refusal/);
    else
        expect(verdict.message).toMatch(/unknown target.*missing/);
    expect(checker.referenceStats.admissions).toBeGreaterThan(0);
    await expect(checker.geometry({ program, specVersion: 'v1' })).rejects.toThrow();
});
it('rejects misspelled rule fields rather than erasing them', () => {
    expect(layoutDesignSchema.safeParse([{ screen: 's', rules: [{ kind: 'firstViewport', target: { id: 'c' }, typo: true }] }]).success).toBe(false);
});
const wire = { hypothesis: 'Less search', decision: 'change', candidates: [{ id: 'layout', summary: 'Put action first', moveType: 'layout', rationale: 'traces', targets: ['c'], predicted: { clicks: 0, keystrokes: 0, scrolls: 1 }, patch: [{ op: 'add', path: '/layouts/-', from: '', valueJson: JSON.stringify({ screen: 's', rules: [rules[0]] }) }] }] };
it('exposes layout move only for opt-in requests; mixed patches remain separate from the Program wire', async () => {
    expect(() => decodeProposalResponse(wire, 'llm', 'default')).toThrow(/--screens lean/);
    const decoded = decodeProposalResponse(wire, 'llm', 'lean', true);
    expect(decoded.candidates[0]?.moveType).toBe('layout');
    expect(LLM_PROPOSAL_JSON_SCHEMA.properties.candidates.items.properties.moveType.enum).not.toContain('layout');
    const backend: JsonLlm = { name: 'scripted', model: 'fixture', complete: async (req) => {
            expect(JSON.stringify(req.schema)).toContain('"layout"');
            return { json: wire, backend: 'scripted', model: 'fixture', servedBy: null, replayOf: null, promptMatched: null, usage: null };
        } };
    const agent = new LlmAgent(new RecordingLlm(backend, await tmp('rule-agent')));
    const proposal = await agent.proposeCandidates({ callId: 'night-01/P1/propose-0', purpose: 'surface', source: 'llm', parts: leanLayoutPrompt({ system: 'default', prompt: 'fixture' }, '{}') });
    const patch = required(proposal.candidates[0]).patch;
    const original = withDesign(structuredClone(fakeCanonical('v1')));
    const next = applyToProgram(original, [...patch, { op: 'replace', path: '/screens/0/title', value: 'Updated' }], { version: 1 }).program;
    expect(JSON.stringify(next)).not.toContain('layouts');
    expect(() => applyToProgram(structuredClone(fakeCanonical('v1')), patch, { version: 1 })).toThrow(/--screens lean/);
});
it('puts evidence before visited design, rules and reference material; keeps repair/choice context', () => {
    const program = fakeCanonical('v1');
    const parts = { system: 'browser', prompt: `# Night 1\n## Persona behavior parameters\n{}\n## Hospital spec (exported from Lean)\n{}\n## Current program\n${formatProgram(program)}\nHypothesis: retained\n\n## Checker verdict on the merged program\nG3-refusal\n## Task\nRepair this` };
    const untouched = structuredClone(parts);
    const prompt = leanLayoutPrompt(parts, JSON.stringify({ currentLayouts: [], screens: [], limits: {} }), JSON.stringify({ perScreen: [{ screen: 'home', clicks: 9, scrolls: 5, mouseTravelPx: 100 }], recentTrace: [] }));
    const order = ['## Persona evidence', '## Current design', '## Layout rules', '## Reference index'];
    expect(order.map(s => prompt.prompt.indexOf(s))).toEqual(order.map(s => prompt.prompt.indexOf(s)).sort((a, b) => a - b));
    const current = JSON.parse(required(required(prompt.prompt.split('## Current design on visited screens\n\n')[1]).split('\n\n## Layout rules')[0]));
    expect(current.program.screens.map((s: {
        id: string;
    }) => s.id)).toEqual(['home']);
    expect(prompt.prompt).toContain('G3-refusal');
    expect(prompt.prompt).toContain('Repair this');
    expect(parts).toEqual(untouched);
    expect(denseOutline(ui, required(viewports[0]))).toHaveProperty('regions');
});
