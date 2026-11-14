import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { autoApprove, CADENCE_PROTOCOL, parseCadence, releaseDue, usageWeightedSwitchCost, type ReviewGate } from '../src/cadence.js';
import { DesignArchiveStore, archiveFeedback } from '../src/design-archive.js';
import { runFakeCadence } from '../src/fake/cadence.js';
import { fakeCanonical } from '../src/fake/fixtures.js';
import { FAKE_PERSONAS, fakeSchedule } from '../src/fake/world.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { decisionRecordSchema } from '../src/schema.js';
import { calibrationPartition } from '../src/protocol.js';
import { tmp } from './helpers.js';
import { runNight, type NightInput, type LoopDeps } from '../src/night.js';
import { LlmAgent } from '../src/agent.js';
import { RecordingLlm } from '../src/backends/recording.js';
import { CadenceFakeLlm } from '../src/fake/cadence.js';
import { RunStore } from '../src/store.js';
import { createScreenChecker } from '../src/screencheck.js';
import { RELEASE_IDS } from '../src/release-config.js';
import { loadRelease } from '../src/releases.js';

async function decision(dir: string, night: number) {
  return decisionRecordSchema.parse(JSON.parse(await readFile(new RunStore(dir).decisionPath(night, 'P1'), 'utf8')));
}
const archiveStore = (dir: string) => new DesignArchiveStore(path.join(dir, 'archives'),
  { clinician: 'P1', owner: 'user-p1', department: 'primary-care', role: 'physician' });

it('uses a fixed day calendar and rejects invalid cadences', () => {
  expect(releaseDue(1)).toBe(true);
  expect([1,6,7,8,14].filter(day => releaseDue(day, { kind: 'weekly' }))).toEqual([7,14]);
  expect([1,2,3,6].filter(day => releaseDue(day, parseCadence('3')))).toEqual([3,6]);
  expect(releaseDue(0)).toBe(false);
  for (const value of ['0','-1','1.2','nope']) expect(() => parseCadence(value)).toThrow();
});

it('weights control displacement by this clinician’s observed train use', async () => {
  const prev = fakeCanonical(RELEASE_IDS.base), next = structuredClone(prev);
  const field = next.screens.flatMap(s => s.components).find(c => c.id === 'w1-note');
  if (!field) throw Error('fixture control missing');
  field.tab = 1;
  const params = FAKE_PERSONAS[0];
  if (!params) throw Error('fixture persona missing');
  const schedule = fakeSchedule(1, 'P1', 7);
  const result = await createFakeEhr().simulate({ specVersion: prev.specVersion, program: prev, persona: params, schedule, worldDir: '', seed: 1 });
  const day = { schedule, result: { ...result, trace: [
    { task: 'train', t: 1, screen: 'w1-notes', event: { click: { comp: 'w1-note' } }, ops: [], result: 'ok' as const },
    { task: 'train', t: 2, screen: 'w1-notes', event: { confirm: { comp: 'w1-note' } }, ops: [], result: 'ok' as const },
  ] } };
  const context = { clinician: 'P1', department: 'primary-care', role: prev.role, train: [day] };
  expect(await usageWeightedSwitchCost(prev, next, context)).toMatchObject({ cost: 2, assumption: expect.stringContaining('simulation assumption') });
  expect((await usageWeightedSwitchCost(prev, prev, context)).cost).toBe(0);
  const grouped = structuredClone(prev), changedGroup = structuredClone(prev);
  for (const p of [grouped,changedGroup]) {
    const screen = p.screens.find(s => s.id === 'w1-notes');
    const child = screen?.components.find(c => c.id === 'w1-note');
    if (!screen || !child) throw Error('fixture group');
    screen.components.push({ id: 'layout-group', kind: { group: { collapsible: true, startCollapsed: false } },
      label: 'Layout', tab: 0, visibility: 'always', size: 'normal', tag: p === grouped ? 'clinical' : 'clinical.layout.columns' });
    child.parent = 'layout-group';
  }
  expect((await usageWeightedSwitchCost(grouped,changedGroup,context)).cost).toBe(2);
  expect((await usageWeightedSwitchCost(prev, next, { ...context, train: [day, { ...day, result: { ...day.result, trace: [] } }] })).cost).toBe(1);
});

it('R7 charges deletion of an original after a copy was added on the previous night', async () => {
  const base = fakeCanonical(RELEASE_IDS.base), nightN = structuredClone(base);
  const source = base.screens.find(s => s.components.some(c => c.id === 'w1-note'));
  const original = source?.components.find(c => c.id === 'w1-note');
  const target = nightN.screens.find(s => s.id !== source?.id);
  if (!source || !original || !target) throw Error('fixture control missing');
  target.components.push({ ...original, id: 'note-copy', copyOf: original.id });
  const next = structuredClone(nightN);
  for (const screen of next.screens) screen.components = screen.components.filter(c => c.id !== original.id);
  const params = FAKE_PERSONAS[0];
  if (!params) throw Error('fixture persona missing');
  const schedule = fakeSchedule(1, 'P1', 7);
  const result = await createFakeEhr().simulate({ specVersion: base.specVersion, program: nightN,
    persona: params, schedule, worldDir: '', seed: 1 });
  const context = { clinician: 'P1', department: 'primary-care', role: base.role,
    train: [{ schedule, result: { ...result, trace: [
      { task: 'train', t: 1, screen: source.id, event: { click: { comp: original.id } }, ops: [], result: 'ok' as const },
      { task: 'train', t: 2, screen: source.id, event: { confirm: { comp: original.id } }, ops: [], result: 'ok' as const },
    ] } }] };
  expect((await usageWeightedSwitchCost(base, nightN, context)).cost).toBe(0);
  // Leaving copyOf set must not make the deletion free to the proxy.
  expect((await usageWeightedSwitchCost(nightN, next, context)).cost).toBe(2);
  const promoted = structuredClone(next);
  for (const c of promoted.screens.flatMap(s => s.components)) if (c.id === 'note-copy') delete c.copyOf;
  expect((await usageWeightedSwitchCost(nightN, promoted, context)).cost).toBe(2);
});

describe('standing archive and weekly shipping (no live backend)', () => {
  let dir: string;
  let fixture: Awaited<ReturnType<typeof runFakeCadence>>;
  beforeAll(async () => { dir = await tmp('cadence'); fixture = await runFakeCadence(dir); });

  it('accumulates, refreshes train scores, bundles prior nights and ships only on night 7', async () => {
    const nights = fixture.summary.timelines[0]?.nights;
    expect(nights?.filter(n => n.outcome === 'deployed').map(n => n.night)).toEqual([7]);
    expect(nights?.slice(0,6).every(n => n.outcome === 'release-deferred')).toBe(true);
    const snapshot = await archiveStore(fixture.summary.dir).before(8, 'fake');
    expect(Object.keys(snapshot.cells).length).toBeGreaterThan(1);
    expect(snapshot.entries.some(e => e.candidateIds.includes('usual-order') && e.candidateIds.includes('labs-visible'))).toBe(true);
    expect(snapshot.entries.find(e => e.candidate.id === 'known-dud')?.observations.length).toBe(7);
    expect(snapshot.entries.find(e => e.candidate.id === 'unsafe-banner')?.observations[0]?.check.status).toBe('fail');
    const r = await decision(fixture.summary.dir,7);
    expect(r.cadence).toMatchObject({ protocol: CADENCE_PROTOCOL, due: true, review: { gate: 'auto-approve-v1' } });
    expect(r.certificate?.checkerVersion).toContain('FAKE');
    expect(r.screenCheck?.status).toBe('pass');
    expect(r.measured.test?.day).toBe(8);
    expect(r.cadence?.offers.every(o => o.score > 0 && o.assumption.startsWith('simulation assumption'))).toBe(true);
    const latest = snapshot.entries.find(e => e.candidate.id === 'usual-order')?.observations.at(-1);
    expect(latest?.trainEstimate?.days).toEqual([5,7]);
    // Separate clinician shards make the department×role archive browseable.
    const groups = await readdir(path.join(fixture.summary.dir,'archives/departments'));
    expect(groups).toHaveLength(1);
  });

  it('feeds unchosen known duds back without validation/test evidence', async () => {
    const prompt = fixture.llm.prompts.find(p => p.callId.includes('night-03'))?.prompt;
    expect(prompt).toContain('known-dud'); expect(prompt).toContain('"knownDud":true');
    expect(prompt).toContain('trainEstimate');
    const snapshot = await archiveStore(fixture.summary.dir).before(8, 'fake');
    const feedback = JSON.stringify(archiveFeedback(snapshot));
    expect(feedback).not.toContain('validation'); expect(feedback).not.toContain('measured');
    expect(feedback).not.toContain('"review":');
    for (const request of fixture.llm.prompts) {
      const night = Number(/night-(\d+)/.exec(request.callId)?.[1]);
      const days = [...request.prompt.matchAll(/d(\d{2})-P1-t/g)].map(m => Number(m[1]));
      expect(days.every(day => day <= night && day % 2 === 1)).toBe(true);
    }
  });

  it('ignores same-night snapshots on retry and isolates clinician/department/backend scopes', async () => {
    const store = archiveStore(fixture.summary.dir);
    expect((await store.before(7,'fake')).night).toBe(6);
    await expect(store.before(8,'real')).rejects.toThrow('scope/backend');
    const other = new DesignArchiveStore(path.join(fixture.summary.dir,'archives'),
      { clinician: 'P1', owner: 'user-p1', department: 'ED', role: 'physician' });
    expect((await other.before(8,'fake')).entries).toEqual([]);
  });

  it('refuses a single-night rerun that would lose archive and review policy', async () => {
    const { rerunNight } = await import('../src/adhoc.js');
    const llm = new CadenceFakeLlm();
    await expect(rerunNight({ runDir: fixture.summary.dir, persona: 'P1', night: 7, llm, ehr: createFakeEhr() }))
      .rejects.toThrow('Cadence runs require run-days --resume');
    expect(llm.prompts).toEqual([]);
  });

  it('resumes completed runs without new proposals or review', async () => {
    const resumed = await runFakeCadence(dir, { resume: true });
    expect(resumed.llm.prompts).toEqual([]);
    const manifest = JSON.parse(await readFile(path.join(resumed.summary.dir,'manifest.json'),'utf8'));
    expect(manifest.completionProtocol).toBe('atomic-prefix-v1');
    const {completedPrefix}=await import('../../scripts/run-prefix.mjs');
    const prefix=await completedPrefix(resumed.summary.dir);
    expect(prefix.manifest.daysCompleted).toBe(manifest.days);
    expect(prefix.manifest.nightsCompleted).toBe(manifest.days-1);
    expect(resumed.summary.timelines).toEqual(fixture.summary.timelines);
    await expect(runFakeCadence(dir, { resume: true, switchCost: () => ({ cost: 0, model: 'different', assumption: 'test' }), switchCostModel: 'different' }))
      .rejects.toThrow('policy must match');
  });
});

it('a weekly veto retains candidates until the next slot and cannot mutate certified bytes', async () => {
  const calls: number[] = [];
  const gate: ReviewGate = { id: 'veto-first-v1', async review(request) {
    calls.push(request.night);
    expect(request.bundles.length).toBeGreaterThanOrEqual(1);
    expect(request.bundles.length).toBeLessThanOrEqual(3);
    if (request.night === 7) return { chosenBundle: null, reason: 'Wait one more week' };
    const selected = request.bundles[0];
    selected.program.screens = [];
    return { chosenBundle: selected.id, reason: 'Reviewed after deferral' };
  } };
  const fixture = await runFakeCadence(await tmp('cadence-veto'), { days: 15, reviewGate: gate });
  expect(calls).toEqual([7,14]);
  expect((await decision(fixture.summary.dir,7)).outcome).toBe('review-declined');
  expect((await decision(fixture.summary.dir,14)).outcome).toBe('deployed');
});

it('isolates switch-cost callback mutations from certified programs and training context', async () => {
  const fixture = await runFakeCadence(await tmp('cadence-cost-mutation'), {
    switchCost: (prev,next,context) => {
      prev.screens = []; next.screens = [];
      const first = context.train[0]; if (first) first.schedule.tasks = [];
      return { cost: 0, model: 'mutation-test', assumption: 'simulation assumption: test' };
    }, switchCostModel: 'mutation-test',
  });
  expect((await decision(fixture.summary.dir,7)).outcome).toBe('deployed');
  const snapshot = await archiveStore(fixture.summary.dir).before(8,'fake');
  expect(snapshot.entries.every(e => !e.program || e.program.screens.length > 0)).toBe(true);
});

it('switch cost can remove every offer before review', async () => {
  const review = vi.fn(autoApprove.review);
  const fixture = await runFakeCadence(await tmp('cadence-cost'), {
    switchCost: () => ({ cost: 1_000_000, model: 'high-cost-test', assumption: 'simulation assumption: test' }),
    switchCostModel: 'high-cost-test', reviewGate: { id: 'must-not-run', review },
  });
  expect(review).not.toHaveBeenCalled();
  expect((await decision(fixture.summary.dir,7)).outcome).toBe('archived');
  expect(fixture.summary.timelines[0]?.nights.some(n => n.outcome === 'deployed')).toBe(false);
});

async function directNight() {
  const dir = await tmp('cadence-direct'), ehr = createFakeEhr(), store = new RunStore(dir);
  const release = await loadRelease(RELEASE_IDS.base,ehr);
  const params = FAKE_PERSONAS[0]; if (!params) throw Error('fixture persona');
  const current = { ...release.canonical, owner: 'user-p1', id: 'P1' };
  const schedule = calibrationPartition(fakeSchedule(1,'P1',7),'train');
  const result = await ehr.simulate({ specVersion: release.specVersion, program: current, persona: params, schedule, worldDir: '', seed: 7 });
  const deps: LoopDeps = { runId: 'direct', store, ehr, screens: createScreenChecker(ehr),
    agent: new LlmAgent(new RecordingLlm(new CadenceFakeLlm(),dir)), seedState: { rejected: new Set(), injected: 0 }, seedPolicy: 'none', worldDir: '', worldSeed: 7 };
  const holdout = vi.fn(async () => { throw Error('must not reach holdout'); });
  const input: NightInput = { night: 1, persona: { id: 'P1', userId: 'user-p1', params }, release, current,
    train: [{ schedule,result }], programs: new Map([[current.version,current]]), history: [], holdout: { day: 1, validate: holdout } };
  return { deps,input,holdout };
}

it('screen failures and invalid switch costs cannot enter release offers', async () => {
  const { deps,input,holdout } = await directNight();
  deps.screens = { mode: 'fake', async check() { return { status: 'fail', mode: 'fake', message: 'test screen failure', pages: 1, bundles: [], failingFiles: [], failingScreens: ['w1-notes'] }; } };
  const result = await runNight(deps,input,{ cadence: { structure:false, department: 'primary-care' } });
  expect(result.deployed).toBeNull(); expect(result.record.cadence?.offers).toEqual([]); expect(holdout).not.toHaveBeenCalled();
  const fresh = await directNight();
  await expect(runNight(fresh.deps,fresh.input,{ cadence: { structure:false, department: 'primary-care', switchCost: () => ({ cost: NaN, model: 'bad', assumption: 'bad' }) } }))
    .rejects.toThrow('finite and nonnegative');
});

it('rejects future/even train days and unknown review IDs', async () => {
  const { deps,input } = await directNight();
  const day = input.train[0]; if (!day) throw Error('fixture day');
  await expect(runNight(deps,{ ...input, train: [{ ...day, schedule: { ...day.schedule, day: 2 } }] },{ cadence: { structure:false, department: 'primary-care' } }))
    .rejects.toThrow('past odd train days');
  const fixture = await tmp('cadence-invalid-review');
  await expect(runFakeCadence(fixture,{ reviewGate: { id: 'invalid', async review() { return { chosenBundle: 'unoffered', reason: 'invalid' }; } } }))
    .rejects.toThrow('invalid choice');
});

it('preserves the default historical nightly decisions under an explicit legacy protocol', async () => {
  const { runDays } = await import('../src/run.js');
  const { ScriptedLlm } = await import('./scripted.js');
  const { fakeWorld, markingEhr } = await import('./helpers.js');
  const root = await tmp('legacy-protocol'), world = await fakeWorld(4);
  const common = { days: 4, worldDir: world, runsRoot: root, personas: ['P1'], releaseDays: { v2: 99, v3: 99 } };
  const implicit = await runDays({ ...common, llm: new ScriptedLlm(), runId: 'implicit', ehr: markingEhr() });
  const explicit = await runDays({ ...common, protocol: 'core-10day', llm: new ScriptedLlm(), runId: 'explicit', ehr: markingEhr() });
  expect(explicit.timelines).toEqual(implicit.timelines);
  for (const night of [1,2,3]) {
    const a = await decision(implicit.dir,night), b = await decision(explicit.dir,night);
    expect(b.mode).toBe('nightly'); expect(b.cadence).toBeUndefined();
    expect({ chosen: b.chosen, outcome: b.outcome, version: b.versionAfter }).toEqual({ chosen: a.chosen, outcome: a.outcome, version: a.versionAfter });
  }
});

it('keeps department × role shards and train estimates separate under parallel clinicians', async () => {
  const { runDays } = await import('../src/run.js');
  const { writeFakeWorld } = await import('../src/fake/world.js');
  const { markingEhr } = await import('./helpers.js');
  const root = await tmp('cadence-department'), world = await writeFakeWorld(path.join(root,'world'),{ days: 3, personas: ['P1','P2'] });
  const run = await runDays({ days: 3, worldDir: world, runsRoot: root, runId: 'department', llm: new CadenceFakeLlm(), ehr: markingEhr(),
    structurePolicy:false, parallel: true, protocol: CADENCE_PROTOCOL, cadence: { kind: 'weekly' }, departments: { P1: 'shared', P2: 'shared' }, seedPolicy: 'none', releaseDays: { v2: 99,v3: 99 } });
  const groups = path.join(run.dir,'archives/departments');
  const [group] = await readdir(groups); if (!group) throw Error('department archive missing');
  expect(await readdir(path.join(groups,group))).toHaveLength(2);
  const first = await new DesignArchiveStore(path.join(run.dir,'archives'),{ clinician: 'P1', owner: 'user-p1', department: 'shared', role: 'physician' }).before(3,'fake');
  const second = await new DesignArchiveStore(path.join(run.dir,'archives'),{ clinician: 'P2', owner: 'user-p2', department: 'shared', role: 'physician' }).before(3,'fake');
  expect(first.entries.every(e => !e.program || e.program.owner === 'user-p1')).toBe(true);
  expect(second.entries.every(e => !e.program || e.program.owner === 'user-p2')).toBe(true);
  expect(first.entries.find(e => e.candidate.id === 'labs-visible')?.observations.at(-1)?.trainEstimate?.before.tasks)
    .not.toBe(second.entries.find(e => e.candidate.id === 'labs-visible')?.observations.at(-1)?.trainEstimate?.before.tasks);
});
