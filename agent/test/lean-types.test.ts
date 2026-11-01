import { readFileSync } from 'node:fs';
import { REPO_ROOT } from '../src/util.js';
/**
 * The hand-written validators in src/lean-types.ts against real JSON written
 * by Lean (lean/generated/ehr-samples.ts): every sample parses, and the round
 * trip is exact (so programs the agent writes back are in Lean's encoding).
 */
import {
  sampleCertificate, sampleDay, sampleEvents, sampleTask, tinyProgram, tinySpec,
} from '../../lean/generated/ehr-samples.js';
import { applyToProgram } from '../src/program.js';
import { certificateSchema, dayScheduleSchema, eventSchema, programSchema, specSchema, verdictSchema } from '../src/schema.js';
import { stableStringify } from '../src/program.js';

const same = (a: unknown, b: unknown) => expect(stableStringify(a)).toBe(stableStringify(b));

describe('validators vs Lean-written samples', () => {
  it('Spec, Program, Certificate, Verdict, DaySchedule, Events round-trip exactly', () => {
    same(specSchema.parse(tinySpec), tinySpec);
    same(programSchema.parse(tinyProgram), tinyProgram);
    same(certificateSchema.parse(sampleCertificate), sampleCertificate);
    same(verdictSchema.parse(sampleCertificate.verdict), sampleCertificate.verdict);
    same(dayScheduleSchema.parse(sampleDay), sampleDay);
    for (const e of sampleEvents) same(eventSchema.parse(e), e);
    expect(sampleTask.id.length).toBeGreaterThan(0);
  });

  it('real vendor specs and programs round-trip without dropping constrained values or release actions', () => {
    for (const version of ['v1', 'v1.1', 'v2']) {
      const spec: unknown = JSON.parse(readFileSync(`${REPO_ROOT}/releases/${version}/spec.json`, 'utf8'));
      same(specSchema.parse(spec), spec);
      for (const file of ['canonical', ...['P1', 'P2', 'P3', 'P4', 'P5'].map(id => `personas/${id}`)]) {
        const program: unknown = JSON.parse(readFileSync(`${REPO_ROOT}/releases/${version}/${file}.json`, 'utf8'));
        same(programSchema.parse(program), program);
      }
    }
  });

  it('patched programs keep Lean encoding: null options from an LLM are dropped, not emitted', () => {
    const screen = tinyProgram.screens[0];
    if (!screen) throw new Error('no screen');
    const { program } = applyToProgram(programSchema.parse(tinyProgram), [{
      op: 'add', path: `/screens/[id=${screen.id}]/components/-`,
      value: { id: 'new-panel', kind: { panel: { info: 'allergyList' } }, label: 'Allergies', parent: null, hotkey: null, copyOf: null, tag: 'allergyList' },
    }], { version: tinyProgram.version + 1 });
    const added = program.screens[0]?.components.at(-1);
    expect(added).toEqual({ id: 'new-panel', kind: { panel: { info: 'allergyList' } }, label: 'Allergies', tab: 0, visibility: 'always', size: 'normal', tag: 'allergyList' });
    expect(JSON.stringify(program)).not.toContain('null');
  });
});
