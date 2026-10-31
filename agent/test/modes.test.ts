/** Release modes (v1.1 surface-feature, v2 migrate) and try-to-break-it, on a compressed calendar. */
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { rerunNight } from '../src/adhoc.js';
import { LlmAgent } from '../src/agent.js';
import { RecordingLlm } from '../src/backends/recording.js';
import { ReplayLlm } from '../src/backends/replay.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { FAKE_PERSONAS } from '../src/fake/world.js';
import { runTryToBreakIt } from '../src/modes.js';
import { personalize } from '../src/program.js';
import { loadRelease } from '../src/releases.js';
import { runDays, type RunSummary } from '../src/run.js';
import { decisionRecordSchema, type DecisionRecord } from '../src/schema.js';
import { RunStore } from '../src/store.js';
import { fakeWorld, tmp } from './helpers.js';
import { ScriptedLlm } from './scripted.js';

let run: RunSummary;
const rec = (night: number, persona: string): DecisionRecord =>
  decisionRecordSchema.parse(JSON.parse(readFileSync(new RunStore(run.dir).decisionPath(night, persona), 'utf8')));

beforeAll(async () => {
  const world = await fakeWorld(3);
  // v1.1 takes effect on day 2 (night 1 = surface-feature), v2 on day 3 (night 2 = migrate).
  run = await runDays({ days: 3, llm: new ScriptedLlm(), worldDir: world, runsRoot: await tmp('runs'), runId: 'releases', releaseDays: { v1_1: 2, v2: 3 } });
});

describe('surface-feature (v1.1)', () => {
  it('decides per persona from its own traces and records why', () => {
    const p1 = rec(1, 'P1');
    expect(p1.mode).toBe('surface-feature');
    expect(p1.outcome).toBe('surfaced');
    expect(p1.release).toMatchObject({ id: 'v1.1', surfaced: true });
    expect(p1.release?.recheck.status).toBe('pass');
    expect(p1.specVersion).toBe('v1.1');
    const p2 = rec(1, 'P2');
    expect(p2.outcome).toBe('not-surfaced');
    expect(p2.release?.surfaced).toBe(false);
    expect(p2.hypothesis).toMatch(/prior auth/);
    // Not surfacing still recertifies the unchanged program under the new spec.
    expect(p2.certificate?.specVersion).toBe('v1.1');
  });
});

describe('migrate (v2)', () => {
  it('every customized program fails the re-check against the new spec', () => {
    for (const p of ['P1', 'P2', 'P3', 'P4', 'P5']) expect(rec(2, p).release?.recheck.status).toBe('fail');
  });

  it('P3: the first attempt (indication in a collapsed drawer) is rejected with a counterexample, the second certifies', () => {
    const r = rec(2, 'P3');
    expect(r.mode).toBe('migrate');
    const [first, second] = r.certification.attempts;
    expect(first?.check).toMatchObject({ status: 'fail', property: 'ReviewsBeforeCommit' });
    expect(first?.check.message).toMatch(/Antibiotic indication/);
    expect(first?.check.counterexample?.length).toBeGreaterThan(0);
    expect(second?.check.status).toBe('pass');
    expect(r.outcome).toBe('migrated');
    expect(r.release?.items).toContain('R2-3');
    expect(r.certificate?.specVersion).toBe('v2');
    expect(r.userResponse.response).toBe('not-offered');
  });

  it('P5: failed migrations fall back to canonical v2 plus still-passing customizations, and flag the user', () => {
    const r = rec(2, 'P5');
    expect(r.outcome).toBe('migration-fallback');
    expect(r.release).toMatchObject({ fallback: true, flaggedUser: true });
    expect(r.certification.attempts.filter((a) => a.source === 'migration')).toHaveLength(3);
    expect(r.certificate?.verdict).toBe('ok');
    expect(r.flags.join(' ')).toMatch(/user flagged/);
  });
});

describe('try-to-break-it', () => {
  it('implements the request, runs check, returns the verdict and counterexample (and replays offline)', async () => {
    const ehr = createFakeEhr();
    const release = await loadRelease('v1', ehr);
    const params = FAKE_PERSONAS[0];
    if (!params) throw new Error('no persona');
    const persona = { id: 'P1', userId: 'user-p1', params };
    const program = personalize(release.canonical, params, persona.userId);
    const request = 'hide the allergy box to make signing faster';
    const go = async (dir: string, llm: ConstructorParameters<typeof RecordingLlm>[0]) => runTryToBreakIt(
      { runId: 'break', store: new RunStore(dir), ehr, agent: new LlmAgent(new RecordingLlm(llm, dir)), seedPolicy: 'none', seedState: { rejected: new Set(), injected: 0 }, worldDir: '', worldSeed: 7 },
      { persona, release, program, request },
    );
    const liveDir = await tmp('break');
    const live = await go(liveDir, new ScriptedLlm());
    expect(live.verdict.status).toBe('fail');
    expect(live.verdict.property).toBe('ReviewsBeforeCommit');
    expect(live.verdict.counterexample?.at(-1)).toEqual({ click: { comp: 'w1-sign-orders' } });
    const replay = await go(await tmp('break-replay'), new ReplayLlm(liveDir));
    expect(replay.verdict).toEqual(live.verdict);
    expect(replay.backend).toMatchObject({ name: 'replay', replayOf: { backend: 'scripted' } });
  });
});

describe('re-running one night of an existing run (night command)', () => {
  it('rebuilds state from the run directory and replays the P3 migration night into adhoc/, leaving the run untouched', async () => {
    const before = JSON.stringify(rec(2, 'P3'));
    const { result, outDir } = await rerunNight({ runDir: run.dir, persona: 'P3', night: 2, llm: new ReplayLlm(run.dir), ehr: createFakeEhr() });
    expect(outDir.startsWith(run.dir)).toBe(true);
    expect(result.record.mode).toBe('migrate');
    expect(result.record.outcome).toBe('migrated');
    expect(result.record.llmCalls.every((c) => c.promptMatched === true)).toBe(true);
    expect(existsSync(new RunStore(outDir).decisionPath(2, 'P3'))).toBe(true);
    expect(JSON.stringify(rec(2, 'P3'))).toBe(before);
  });
});
