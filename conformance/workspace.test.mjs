import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Native } from './native.mjs';
import { Driver, field } from './driver.mjs';
import { canonicals } from './index.mjs';
import { facts } from './clinical.mjs';
import { directory } from './workspace.mjs';

const binary = process.env.EHR_BIN ?? path.resolve(import.meta.dirname, '../.cache/conformance/ehr');
const options = { skip: !existsSync(binary) };
const patient = { id: 'heldout-A', name: 'Ada Quill', mrn: 'HA-701' };
const input = () => ({ ...facts(), sourcePatientId: patient.id, patientDirectory: directory([patient]) });
const target = () => canonicals().find(t => t.persona === 'P3' && t.release === 'v3');

test('driver selects the scenario patient and counts selection/binding separately', options, () => {
  const { spec, program } = target(), d = new Driver(new Native(binary), spec, program, input());
  assert.equal(d.state.patientContext.bound, patient.id);
  assert.equal(d.selectionTrace.length, 1);
  assert.equal(d.hydrationTrace.length, 1);
  assert.equal(d.trace.length, 0);
  d.find(field('wristbandScan'), 'wristband scan');
  assert.equal(d.fork().selectionTrace.length, 1);
});
test('driver falls back to actual Patient Lookup when patient is absent from landing rows', options, () => {
  const { spec, program } = target(), f = input();
  for (const a of f.patientDirectory.activities) a.rows = [];
  const d = new Driver(new Native(binary), spec, program, f);
  assert.equal(d.state.patientContext.bound, patient.id);
  assert.equal(d.selectionTrace.length, 3);
  assert.match(d.selectionTrace[1].intent, /HA-701/);
});
test('selection failure and unselected clinical access have distinct diagnoses', options, () => {
  const { spec, program } = target(), f = input();
  f.patientDirectory = { patients: [], activities: [] };
  assert.throws(() => new Driver(new Native(binary), spec, program, f), e =>
    e.classification === 'could-not-open-patient' && /could not open patient/.test(e.message));
  const d = new Driver(new Native(binary), spec, program, input(), undefined, { autoOpen: false });
  assert.throws(() => d.find(field('wristbandScan'), 'wristband scan'), e =>
    e.classification === 'no-patient-open' && !e.message.includes('Workflow impossible'));
  d.openPatient(patient.id, { bind: false });
  assert.throws(() => d.find(field('wristbandScan'), 'wristband scan'), e => e.classification === 'patient-not-bound');
});
test('archived programs retain their original preselected start state', options, () => {
  const { spec, program } = target(); delete program.patientSelection;
  const d = new Driver(new Native(binary), spec, program, facts());
  assert.equal(d.selectionMode, 'legacy-preselected');
  assert.equal(d.selectionTrace.length, 0);
  assert.equal(d.hydrationTrace.length, 0);
  assert.equal(d.state.patientContext, undefined);
});
