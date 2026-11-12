import { readFileSync } from 'node:fs';
import { configSchema, obj, objs, required } from '../src/types.ts';

/** Small synthetic release using the shipped note element and native guards.
 * No recorded layouts or expectations are changed. */
export function draftsFixture(tenant: string) {
  const shipped = JSON.parse(readFileSync(new URL('../../../releases/v3/spec.json', import.meta.url), 'utf8'));
  const element = { ...objs(shipped.elements).find(e => e.id === 'hpi'), humanOnly: true, prefill: 'never' };
  const spec = { ...shipped, elements: [element], infos: [], reviews: [],
    commits: [{ id: 'signNote', label: 'Sign note', roles: ['physician'] }],
    entries: [{ commit: 'signNote', element: 'hpi', when: 'always', perOrderLine: false }],
    alerts: [{ id: 'draftAlert', label: 'Care gaps due', commit: 'signNote', cond: 'careGap', tier: 'interruptive', screens: ['clinical'] }] };
  const component = (id: string, label: string, kind: unknown) => ({ id, label, kind, tag: id, visibility: 'always', tab: 0, size: 'normal' });
  const program = { id: 'drafts-test', version: 1, owner: 'P1', role: 'physician', specVersion: spec.version,
    start: 'clinical', patientSelection: true, macros: [], screens: [{ id: 'clinical', title: 'Draft note', workflow: 'W1', components: [
      component('banner', 'Patient banner', 'banner'),
      component('noteField', 'HPI', { field: { element: 'hpi', slot: { fixed: { n: 0 } }, prefill: 'none' } }),
      component('sign', 'Sign note', { button: { action: { commit: { commit: 'signNote' } } } }),
      component('alert', 'Care gaps due', { alert: { alert: 'draftAlert', popup: false } }),
    ] }] };
  const config = configSchema.parse({ tenant, actors: [{ token: 'synthetic-drafts-test-token-only', persona: 'P1',
    user: { id: 'P1', role: 'physician' }, modelId: 1, patients: ['draft-A', 'draft-B'] }],
    releases: { P1: { spec, program, workflows: { chart: { commit: 'signNote', project: true } } } } });
  const patients = ['draft-A', 'draft-B'].map((id, i) => ({ patient: id, modelId: i + 1,
    context: { today: '2026-11-02', now: 600, receipts: [], record: [], encounterId: `enc-${id}` },
    bundle: { resourceType: 'Bundle', type: 'collection', entry: [
      { resource: { resourceType: 'Patient', id, meta: { versionId: '1' }, name: [{ text: id, family: id }],
        identifier: [{ system: 'http://hospital.example/mrn', value: id }], birthDate: '1992-01-01', gender: 'female' } },
      { resource: { resourceType: 'Encounter', id: `enc-${id}`, meta: { versionId: '1' }, status: 'in-progress',
        class: { code: 'AMB' }, subject: { reference: `Patient/${id}` } } },
    ] } }));
  return { config, actor: required(config.actors[0]), spec: obj(required(config.releases.P1).spec), program: obj(required(config.releases.P1).program), patients };
}
export const leave = { click: { comp: 'workspace.return' } };
export const search = (patient: string) => ({ enter: { comp: 'workspace.search', value: { text: { s: patient } } } });
export const open = (patient: string) => ({ click: { comp: `workspace.open|${patient}|0|lookup` } });
export const entry = { enter: { comp: 'noteField', value: { text: { s: 'Patient A unsigned note' } } } };
export const alert = { click: { comp: 'alert' } };
export const ack = { ack: { alert: 'draftAlert' } };
export const sign = { click: { comp: 'sign' } };
