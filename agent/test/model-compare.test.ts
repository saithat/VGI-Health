vi.mock('../src/manual.js', () => ({ promptContext: () => ({ manual: 'fixture', rules: 'rules', manualHash: 'm', ruleContextHash: 'r', ruleProfile: 'core' }) }));
import { mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { compareRecordedNights, comparisonOutput, densityOnly, frozenRequest, parseNights, scoreProposal } from '../src/model-compare.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import type { CheckInput, SimulateInput } from '../src/ehr.js';
import { fakeCanonical, fakeSpec } from '../src/fake/fixtures.js';
import { FAKE_PERSONAS, writeFakeWorld } from '../src/fake/world.js';
import { RecordingLlm, llmRecordSchema } from '../src/backends/recording.js';
import type { JsonLlm, JsonRequest } from '../src/backends/types.js';
import { treeHash } from '../src/fingerprints.js';
import { emptyRecord, type LoopDeps, type NightInput } from '../src/night.js';
import { summarizeTrain } from '../src/observe.js';
import { personalize } from '../src/program.js';
import { calibrationPartition } from '../src/protocol.js';
import { RunStore } from '../src/store.js';
import { readJson, writeJson } from '../src/util.js';
import { loadWorld } from '../src/world.js';
import { LLM_CHOICE_JSON_SCHEMA, LLM_PROPOSAL_JSON_SCHEMA } from '../src/schema.js';

const predicted = { clicks: 0, keystrokes: 0, scrolls: 1, mouseTravelPx: null, scrollPx: null };
const candidate = (id: string, component: string, field: string, valueJson: string) => ({ id, summary: id, moveType: 'reorder', rationale: 'fixture', targets: [component],
  patch: [{ op: 'replace', path: `/screens/[id=w1-orders]/components/[id=${component}]/${field}`, from: '', valueJson }], predicted });
const response = { hypothesis: 'density and unsafe display', decision: 'change', candidates: [
  candidate('compact', 'w1-dose', 'size', '"compact"'),
  candidate('unsafe', 'w1-orders-banner', 'size', '"tiny"'),
  candidate('invalid', 'does-not-exist', 'size', '"compact"'),
  candidate('undecodable', 'w1-dose', 'size', '{'),
] };
let root: string;
beforeEach(async () => { root = await mkdtemp(path.join(tmpdir(), 'model-compare-test-')); });
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

async function fixture() {
  const base = createFakeEhr(), params = FAKE_PERSONAS[0];
  if (!params) throw new Error('Missing test persona');
  const world = await loadWorld(await writeFakeWorld(path.join(root, 'world'), { days: 3, seed: 7 }));
  const program = personalize(fakeCanonical('v1'), params, 'P1'), spec = fakeSpec('v1'), source = path.join(root, 'source');
  const ehr = { ...base,
    check: vi.fn((i: CheckInput) => base.check({ ...i, specVersion: i.program.specVersion })),
    simulate: vi.fn((i: SimulateInput) => base.simulate({ ...i, specVersion: i.program.specVersion })),
    deploy: vi.fn(async () => { throw new Error('must not deploy'); }),
    renderScreens: vi.fn(async () => { throw new Error('must not capture geometry'); }),
  } satisfies typeof base;
  const agent = { name: 'scripted', model: 'fixture', async proposeCandidates() { throw new Error('must not rebuild'); }, async chooseCandidates() { throw new Error('must not rebuild'); } };
  const deps: LoopDeps = { ehr, agent, runId: 'fixture', store: new RunStore(source), screens: { mode: 'fake', async check() { throw new Error('must not screen check'); } },
    seedPolicy: 'none', seedState: { injected: 0, rejected: new Set() }, worldDir: world.dir, worldSeed: 7 };
  await writeJson(path.join(source, 'manifest.json'), { world: world.dir });
  await writeJson(path.join(source, 'programs/P1/v0.json'), program);
  await writeJson(path.join(source, 'certifications/P1/v0/inputs.json'), { specVersion: 'v1', canonical: program });
  await writeJson(path.join(source, 'certifications/P1/v0/spec.json'), spec);
  const train = [];
  for (const day of [1, 3]) {
    const full = await world.schedule(day, 'P1'); if (!full) throw new Error('Missing schedule');
    const result = await base.simulate({ specVersion: 'v1', program, persona: params, schedule: full, worldDir: world.dir, seed: 7000 + day });
    await writeJson(path.join(source, `days/day-0${day}/P1.json`), result);
    const schedule = calibrationPartition(full, 'train');
    train.push({ schedule, result: await base.simulate({ specVersion: 'v1', program, persona: params, schedule, worldDir: world.dir, seed: 7000 + day }) });
  }
  const backend: JsonLlm = { name: 'codex', model: 'recorded-model', async complete(req) { return { json: req.purpose === 'choose' ? { chosen: ['compact'], rationale: 'reference menu', rejected: [] } : response,
    backend: 'codex', model: 'recorded-model', servedBy: 'served-reference', usage: { input_tokens: 10, output_tokens: 5 }, replayOf: null, promptMatched: null }; } };
  const recording = new RecordingLlm(backend, source);
  const input: NightInput = { night: 1, persona: { id: 'P1', userId: 'P1', params }, current: program, programs: new Map([[0, program]]), train: train.slice(0, 1), history: [],
    release: { id: 'v1', specVersion: 'v1', spec, canonical: program, notes: '', leanSpecSource: null, fake: true }, holdout: { day: 1, async validate() { throw new Error('no validation'); } } };
  for (const night of [1, 2, 3]) {
    const days = train.filter(d => d.schedule.day <= night), evidence = summarizeTrain('P1', program, days, input.programs);
    const record = emptyRecord(deps, { ...input, night, specVersion: 'v1', spec }, evidence);
    record.backend = { name: 'codex', model: 'recorded-model', replayOf: null };
    if (night === 2) record.mode = 'migrate';
    else {
      for (const purpose of ['propose', 'choose']) {
        const req: JsonRequest = { callId: `night-0${night}/P1/${purpose}-0`, purpose, schemaName: purpose === 'propose' ? 'LlmProposal' : 'LlmChoice',
          system: 'frozen system', prompt: `frozen ${purpose} ${night}; no future or held-out traces`, schema: purpose === 'propose' ? LLM_PROPOSAL_JSON_SCHEMA : LLM_CHOICE_JSON_SCHEMA };
        const res = await recording.complete(req); record.llmCalls.push(recording.ref(req, res));
        if (purpose === 'propose') record.candidates = (await scoreProposal(res.json, req, { ...input, night, train: days }, deps, [])).candidates;
      }
    }
    await writeJson(path.join(source, `decisions/night-0${night}/P1.json`), record);
  }
  ehr.check.mockClear(); ehr.simulate.mockClear();
  return { source, ehr, input, deps };
}

it('replays frozen Codex calls and scores identically, preserving source bytes and training isolation', async () => {
  const { source, ehr } = await fixture(), before = await treeHash(source);
  const report = await compareRecordedNights({ source, backend: 'replay', nights: '1-3', personas: 'P1', choose: true, out: path.join(root, 'comparison') }, { ehr });
  expect(report.replayExact).toBe(true); expect(report.rows).toHaveLength(4);
  expect(report.excluded).toEqual([{ decisionId: 'night-02/P1', mode: 'migrate' }]);
  const first = report.rows.find(r => r.arm === 'model'), proposal = first?.calls[0]?.proposal;
  expect(first?.calls).toHaveLength(2);
  expect(first?.calls.every(c => c.schemaValid && c.responseMatchesReference)).toBe(true);
  expect(proposal).toMatchObject({ candidateCount: 4, undecodable: [{ id: 'undecodable' }] });
  expect(proposal?.candidates.find(c => c.candidate.id === 'compact')).toMatchObject({ densityOnly: true, check: { status: 'pass' }, trainEstimate: { days: [1] } });
  expect(proposal?.candidates.find(c => c.candidate.id === 'unsafe')?.check).toMatchObject({ status: 'fail', property: expect.any(String) });
  expect(proposal?.candidates.find(c => c.candidate.id === 'invalid')?.check.status).toBe('invalid-patch');
  expect(report.rows.find(r => r.decisionId === 'night-03/P1' && r.arm === 'model')?.calls[0]?.proposal?.candidates[0]?.duplicates).toContainEqual({ night: 1, id: 'compact' });
  for (const [i] of ehr.simulate.mock.calls) {
    expect(i.schedule.day % 2).toBe(1);
    const full = await (await loadWorld(path.join(root, 'world'))).schedule(i.schedule.day, 'P1');
    if (!full) throw new Error('Missing schedule');
    expect(i.schedule.tasks).toEqual(calibrationPartition(full, 'train').tasks);
    expect(i.worldDir).toContain('/comparison/inputs/world');
  }
  expect(ehr.deploy).not.toHaveBeenCalled(); expect(ehr.renderScreens).not.toHaveBeenCalled();
  expect(await treeHash(source)).toBe(before);
  expect(await readFile(path.join(root, 'comparison/report.md'), 'utf8')).toContain('recorded candidate menu');
});

it('records schema failure per call and still reports a reference arm', async () => {
  const { source, ehr } = await fixture();
  const llm: JsonLlm = { name: 'scripted', model: 'bad-model', async complete() { return { json: { candidates: 'invalid' }, backend: 'scripted', model: 'bad-model', servedBy: null, usage: null, replayOf: null, promptMatched: null }; } };
  const report = await compareRecordedNights({ source, backend: 'openai-compat', nights: '1', personas: 'P1', out: path.join(root, 'bad') }, { ehr, llm });
  expect(report.rows.find(r => r.arm === 'model')?.calls[0]).toMatchObject({ schemaValid: false, proposal: null, error: expect.stringContaining('request schema') });
  expect(report.rows.find(r => r.arm === 'recorded-reference')?.calls[0]?.schemaValid).toBe(true);
});

it('aborts native infrastructure failure rather than counting it as a model rejection', async () => {
  const { source, ehr } = await fixture(); ehr.simulate.mockRejectedValue(new Error('checker process unavailable'));
  await expect(compareRecordedNights({ source, backend: 'replay', nights: '1', personas: 'P1', out: path.join(root, 'failed') }, { ehr })).rejects.toThrow('checker process unavailable');
  expect(JSON.parse(await readFile(path.join(root, 'failed/manifest.json'), 'utf8')).status).toBe('aborted');
});

it('recovers the legacy named schema, prefers a sidecar and rejects drift', async () => {
  const { source } = await fixture(), file = path.join(source, 'llm/night-01/P1/propose-0.json');
  const rec = await readJson(file, llmRecordSchema);
  expect((await frozenRequest(source, rec)).schema).toEqual(LLM_PROPOSAL_JSON_SCHEMA);
  const sidecar = file.replace('.json', '.request.json');
  await rm(sidecar);
  expect((await frozenRequest(source, rec)).prompt).toBe(rec.prompt);
  await writeJson(sidecar, { ...rec, schema: { type: 'object' }, prompt: 'different prompt' });
  await expect(frozenRequest(source, rec)).rejects.toThrow('disagree');
});

it('guards output paths, including symlink escapes, and rejects invalid selections', async () => {
  const { source } = await fixture();
  await expect(comparisonOutput(source, source)).rejects.toThrow('NEW');
  await expect(comparisonOutput(source, path.join(source, 'nested'))).rejects.toThrow('NEW');
  await expect(comparisonOutput(source, '/var/tmp/outside-model-compare')).rejects.toThrow('NEW');
  await symlink('/var', path.join(root, 'escape'));
  await expect(comparisonOutput(source, path.join(root, 'escape', 'comparison'))).rejects.toThrow('escapes');
  await expect(compareRecordedNights({ source, backend: 'replay', nights: '1', personas: 'TYPO', out: path.join(root, 'unused') })).rejects.toThrow('Missing recorded decision');
  expect(parseNights('1-3,5,3')).toEqual([1, 2, 3, 5]);
  for (const range of ['0', '3-1', '1-no', '1-10001']) expect(() => parseNights(range)).toThrow();
});

it('flags density-only edits without calling unchanged, mixed or invalid patches dead', async () => {
  const { input } = await fixture();
  const req: JsonRequest = { callId: 'night-01/P1/propose-0', purpose: 'propose', system: '', prompt: '', schemaName: 'LlmProposal', schema: LLM_PROPOSAL_JSON_SCHEMA };
  const { decodeProposalResponse } = await import('../src/agent.js');
  const decoded = decodeProposalResponse(response, 'llm', req.callId).candidates[0];
  if (!decoded) throw new Error('Missing candidate');
  expect(densityOnly(input.current, decoded)).toBe(true);
  expect(densityOnly(input.current, { ...decoded, patch: [] })).toBe(false);
  expect(densityOnly(input.current, { ...decoded, patch: [...decoded.patch, { op: 'replace', path: '/screens/0/components/0/label', value: 'changed label' }] })).toBe(false);
});
