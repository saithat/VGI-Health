/**
 * The three required tests (EHR_FAKE=1 + the replay backend):
 *  1. one full fake night per persona produces a valid decision record;
 *  2. a rejected candidate is logged with its counterexample;
 *  3. validation and test traces never appear in LLM prompts.
 *
 * Recordings are produced once by the test-only scripted backend through the
 * normal recorder; the runs under test then use the real replay backend.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ReplayLlm } from '../src/backends/replay.js';
import { runDays, type RunSummary } from '../src/run.js';
import { decisionRecordSchema, type DecisionRecord } from '../src/schema.js';
import { RunStore } from '../src/store.js';
import { LEAK_MARKER, fakeWorld, markingEhr, readLlmRecords, tmp } from './helpers.js';
import { ScriptedLlm } from './scripted.js';

const PERSONAS = ['P1', 'P2', 'P3', 'P4', 'P5'];
let world: string;
let runsRoot: string;
let recorded: RunSummary;
let replayed: RunSummary;

function record(run: RunSummary, night: number, persona: string): DecisionRecord {
  return decisionRecordSchema.parse(JSON.parse(readFileSync(new RunStore(run.dir).decisionPath(night, persona), 'utf8')));
}

beforeAll(async () => {
  world = await fakeWorld(4);
  runsRoot = await tmp('runs');
  // Releases pushed out of the window so these nights are all nightly-mode.
  const common = { days: 4, worldDir: world, runsRoot, releaseDays: { v2: 99, v3: 99 } };
  recorded = await runDays({ ...common, llm: new ScriptedLlm(), runId: 'recorded', ehr: markingEhr() });
  replayed = await runDays({ ...common, llm: new ReplayLlm(recorded.dir), runId: 'replayed', ehr: markingEhr() });
});

describe('one full fake night per persona (replay backend)', () => {
  it.each(PERSONAS)('%s: night 1 writes a schema-valid, complete decision record', (persona) => {
    const r = record(replayed, 1, persona);
    expect(r.mode).toBe('nightly');
    expect(r.backend).toMatchObject({ name: 'replay', model: 'scripted-test', replayOf: { backend: 'scripted' } });
    expect(r.ehr.mode).toBe('fake');
    expect(r.evidence.trainDays).toEqual([1]);
    expect(r.hypothesis.length).toBeGreaterThan(0);
    expect(r.candidates.length).toBeGreaterThanOrEqual(3);
    for (const e of r.candidates) expect(['pass', 'fail', 'invalid-patch']).toContain(e.check.status);
    expect(r.llmCalls.length).toBeGreaterThan(0);
    expect(r.llmCalls.every((c) => c.promptMatched === true)).toBe(true);
    if (r.outcome === 'deployed') {
      expect(r.certificate?.verdict).toBe('ok');
      expect(r.deployed && existsSync(path.join(replayed.dir, r.deployed.program))).toBe(true);
      expect(r.validation.accepted).toBe(true);
      expect(r.measured.validation?.day).toBe(1);
      expect(r.measured.test?.day).toBe(2);
      expect(r.versionAfter).toBe(r.versionBefore + 1);
    } else {
      expect(r.versionAfter).toBe(r.versionBefore);
      expect(r.deployed).toBeNull();
    }
  });

  it('replay reproduces the recorded decisions exactly', () => {
    for (const p of PERSONAS) {
      for (let night = 1; night <= 3; night++) {
        const a = record(recorded, night, p);
        const b = record(replayed, night, p);
        expect({ outcome: b.outcome, chosen: b.chosen?.candidateIds, v: b.versionAfter }).toEqual({ outcome: a.outcome, chosen: a.chosen?.candidateIds, v: a.versionAfter });
      }
    }
  });

  it('the repair loop feeds a counterexample back and logs every attempt', () => {
    const r = record(replayed, 1, 'P5');
    const [merged, repaired] = r.certification.attempts;
    expect(merged?.source).toBe('merged');
    expect(merged?.check).toMatchObject({ status: 'fail', property: 'WithinBudgets' });
    expect(repaired?.source).toBe('repair');
    expect(repaired?.check.status).toBe('pass');
    expect(r.certification.result).toBe('certified');
    const repairCall = readLlmRecords(replayed.dir).find((c) => c.callId === 'night-01/P5/repair-1');
    expect(repairCall?.prompt).toContain('WithinBudgets');
  });
});

describe('rejections are logged with counterexamples', () => {
  it('an LLM-proposed unsafe candidate is rejected with property, message, and a replayable click path', () => {
    const r = record(replayed, 1, 'P1');
    const bad = r.candidates.find((e) => e.candidate.id === 'p1-toolbar-sign');
    expect(bad?.candidate.seeded).toBe(false);
    expect(bad?.check.status).toBe('fail');
    expect(bad?.check.property).toBe('ReviewsBeforeCommit');
    expect(bad?.check.message).toMatch(/Allergies/);
    expect(bad?.check.counterexample?.length).toBeGreaterThan(0);
    expect(bad?.check.counterexample?.at(-1)).toEqual({ click: { comp: 'w1-tb-sign' } });
    expect(bad?.check.screens).toEqual(['w1-orders']);
  });

  it('seeded tempting moves are labeled seeded: true, never deployed, and all three kinds end up rejected', () => {
    const seeded = PERSONAS.flatMap((p) => record(replayed, 1, p).candidates.filter((e) => e.candidate.seeded));
    expect(seeded.length).toBeGreaterThan(0);
    for (const e of seeded) {
      expect(e.candidate.source).toBe('seeded');
      expect(e.candidate.seededKind).not.toBeNull();
      expect(e.check.status).toBe('fail');
      expect(e.check.counterexample?.length).toBeGreaterThan(0);
    }
    expect(new Set(replayed.seededRejectedKinds)).toEqual(new Set(['allergyHidden', 'idReentryPrefilled', 'lbWeightAccepted']));
    for (const p of PERSONAS) {
      const r = record(replayed, 1, p);
      for (const id of r.chosen?.candidateIds ?? []) expect(id.startsWith('seeded-')).toBe(false);
    }
  });
});

describe('offline screen check gates deploy', () => {
  it('a certified, validated version that fails the screen check is not deployed and is logged like a rejection', () => {
    const r = record(replayed, 1, 'P4');
    expect(r.outcome).toBe('screen-check-failed');
    expect(r.screenCheck).toMatchObject({ status: 'fail', mode: 'fake', failingScreens: ['w5-growth'] });
    const attempt = r.certification.attempts.find((a) => a.source === 'screen-check');
    expect(attempt?.check).toMatchObject({ status: 'fail', property: 'ScreenCheck', screens: ['w5-growth'] });
    expect(r.certification.result).toBe('rejected');
    expect(r.deployed).toBeNull();
    expect(r.certificate).toBeNull();
    expect(r.versionAfter).toBe(r.versionBefore);
    expect(replayed.rejections.some((x) => x.property === 'ScreenCheck')).toBe(false);
    expect(replayed.screenFailures.some((x)=>x.persona==='P4')).toBe(true);
  });

  it('deployed versions carry a passing screen-check result next to the certificate', () => {
    const r = record(replayed, 1, 'P1');
    expect(r.outcome).toBe('deployed');
    expect(r.screenCheck?.status).toBe('pass');
    expect(r.certificate?.verdict).toBe('ok');
  });
});

describe('evaluation integrity: no validation or test data in prompts', () => {
  it.each([['recorded'], ['replayed']])('%s run: night-d prompts mention only days <= d', (which) => {
    const run = which === 'recorded' ? recorded : replayed;
    const calls = readLlmRecords(run.dir);
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      const night = Number(/^night-(\d+)\//.exec(c.callId)?.[1]);
      expect(Number.isInteger(night)).toBe(true);
      const text = c.system + c.prompt;
      const days = [...text.matchAll(new RegExp(`${LEAK_MARKER}(\\d+)`, 'g'))].map((m) => Number(m[1]));
      // The marker channel works (train days do show up) ...
      if (c.purpose === 'propose') expect(days).toContain(night % 2 ? night : night - 1);
      // ... and nothing from the validation day (d+1) or test days (> d+1) ever does.
      expect(days.filter((d) => d > night || d % 2 === 0), `${c.callId} leaked days`).toEqual([]);
      for (let later = night + 1; later <= 4; later++) expect(text).not.toContain(`d${String(later).padStart(2, '0')}-P`);
    }
  });

  it('validation and test replays did run (so there was something to leak)', () => {
    const r = record(replayed, 1, 'P1');
    expect(r.measured.validation?.day).toBe(1);
    expect(existsSync(new RunStore(replayed.dir).dayPath(4, 'P1'))).toBe(true);
  });
});


it('sends only physical-interaction metrics and binds the documented geometry objective',()=>{
 const records=readLlmRecords(recorded.dir);
 expect(records.length).toBeGreaterThan(0);
 for(const call of records){
  const prompt=call.system+call.prompt;
  expect(prompt).not.toMatch(/klmDeciSec|avgKlmSec|klmSec|KLM time|timeSinksByScreen/);
  expect(prompt).toContain('1440');
  expect(prompt).toContain('mouseTravelPx');
 }
});
