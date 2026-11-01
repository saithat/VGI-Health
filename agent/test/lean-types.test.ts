/**
 * The hand-written validators in src/lean-types.ts against real JSON written
 * by Lean (lean/generated/ehr-samples.ts): every sample parses, and the round
 * trip is exact (so programs the agent writes back are in Lean's encoding).
 */
import { readFileSync } from 'node:fs';
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

  it('preserves optional encounter role policy and accepts legacy commits', () => {
    const reason = 'Pre-op orders are signed by a physician or surgeon';
    const withPolicy = { ...tinySpec, commits: tinySpec.commits.map((commit) => ({
      ...commit, encounterRoles: [{ encounter: 'preop', roles: ['physician', 'surgeon'], reason }],
    })) };
    same(specSchema.parse(withPolicy), withPolicy);
    same(specSchema.parse(tinySpec), tinySpec);
  });

  it('preserves the controlled-drug applicability alias and allowed refill values', () => {
    const spec = { ...tinySpec, entries: [{
      commit: 'signOrders', element: 'refills', when: { drugClass: { cls: 'scheduleII' } },
      perOrderLine: true, allowed: ['0'],
    }] };
    same(specSchema.parse(spec), spec);
  });

  it('loads every committed real release and canonical program', () => {
    for (const version of ['v1', 'v2', 'v3']) {
      const base = new URL(`../../releases/${version}/`, import.meta.url);
      expect(() => specSchema.parse(JSON.parse(readFileSync(new URL('spec.json', base), 'utf8')))).not.toThrow();
      expect(() => programSchema.parse(JSON.parse(readFileSync(new URL('canonical.json', base), 'utf8')))).not.toThrow();
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

it.each(['v1', 'v2', 'v3'])('preserves the entire active %s spec, including dose and signing policies', release => {
  const spec = JSON.parse(readFileSync(new URL(`../../releases/${release}/spec.json`, import.meta.url), 'utf8'));
  same(specSchema.parse(spec), spec);
  expect(spec.entries.some((r: { allowed?: string[] }) => r.allowed?.includes('0'))).toBe(true);
  expect(spec.elements.find((e: { id: string }) => e.id === 'dose').kind).toBe('medicationDose');
});
