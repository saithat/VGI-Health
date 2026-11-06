/** Synthetic W4 provisioning. Generated clinical/operator data stays outside git. */
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fixture, patient } from './helpers.ts';
import { configSchema } from '../src/types.ts';
const f = await fixture();
const dir = resolve(process.argv[2] ?? process.env.TMPDIR!);
await mkdir(dir, { recursive: true });
const ids = ['P1', 'P2', 'P3', 'RN2', 'P4', 'P5'];
const roles = ['physician', 'physician', 'rn', 'rn', 'np', 'surgeon'];
const scheduledTime = '2026-11-02T10:00:00Z';
const config = configSchema.parse({ tenant: process.env.MAR_TENANT ?? 'mar-dev',
  oidc: { issuer: 'http://localhost:18180/realms/vgi', audience: 'vgi-commit', clientId: 'vgi-mar' },
  actors: ids.map((id, n) => ({ subject: `00000000-0000-4000-8000-${String(n + 1).padStart(12, '0')}`,
    user: { id, role: roles[n] }, modelId: n + 1, patients: ['mar-patient'] })),
  releases: { nurse: { spec: f.hospitalSpec, program: f.nurseProgram,
    workflows: { dose: { commit: 'administerMed', shared: { kind: 'dose', order: 9, occurrence: 600 },
      mar: { patient: 'mar-patient', medicationRequest: 'mar-order', encounter: 'enc-1', scheduledTime } } } } } });
const p = patient(f, 'mar-patient', 1, true);
p.bundle.entry[1].resource.class = { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP' };
p.bundle.entry.push({ resource: { resourceType: 'MedicationRequest', id: 'mar-order', meta: { versionId: '1' },
  status: 'active', intent: 'order', subject: { reference: 'Patient/mar-patient' }, encounter: { reference: 'Encounter/enc-1' },
  medicationCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '723' }], text: 'amoxicillin' },
  dosageInstruction: [{ timing: { event: [scheduledTime] }, route: { text: 'PO' }, doseAndRate: [{ doseQuantity: { value: 500, unit: 'mg' } }] }] } });
await writeFile(resolve(dir, 'mar-config.json'), JSON.stringify(config, null, 2));
await writeFile(resolve(dir, 'mar-patient.json'), JSON.stringify(p, null, 2));
process.stdout.write(`Synthetic W4 inputs: ${dir}/mar-{config,patient}.json\n`);
