// Native synthetic exports for the optional time control and late-label boundary.
// Run with Node's TypeScript stripping, TMPDIR and the current native interpreter.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { draftsFixture } from '../services/commit/test/drafts-fixture.ts';
import { Lean } from '../services/commit/src/lean.ts';

if (!process.env.TMPDIR) throw new Error('Set TMPDIR to disk-backed scratch space');
const root = fileURLToPath(new URL('../', import.meta.url));
const out = resolve(process.argv[2] ?? resolve(process.env.TMPDIR, 'entry-time-screens'));
mkdirSync(out, { recursive: true });
const f = draftsFixture('entry-time-screen');
const spec = structuredClone(f.spec);
spec.alerts = [];
spec.design = { ...spec.design, lateEntryMinutes: 2 };
spec.elements = [{ ...spec.elements[0], label: 'Synthetic assessment', observation: true }, {
  id: 'hpi.observedAt', label: 'Time taken', kind: 'text', enteredBy: ['physician'],
  prefill: 'never', friction: 'compliance', humanOnly: true, observationOf: 'hpi',
  validation: { observationTime: { source: 'hpi' } }, fhirTarget: 'Provenance.extension.observedAt',
}];
const program = structuredClone(f.program);
program.patientSelection = false;
program.screens[0].components.push({ id: 'timeTaken', label: 'Time taken',
  kind: { field: { element: 'hpi.observedAt', slot: { fixed: { n: 0 } }, prefill: 'none' } },
  visibility: 'always', tab: 0, size: 'normal', tag: 'timeTaken' });
const lean = new Lean(process.env.EHR_BIN ?? resolve(root, 'lean/.lake/build/bin/ehr'), 20000);
try {
  const patient = f.patients[0];
  if (!patient) throw new Error('Synthetic patient missing');
  const projection = await lean.call('facts', { bundle: patient.bundle,
    context: { ...patient.context, today: '2026-11-12', now: 1200, encounterId: 'enc-draft-A' } });
  const base = { spec, program, user: f.actor.user, ...projection };
  let state = await lean.call('init', base);
  state = (await lean.call('step', { ...base, state, event: { enter: {
    comp: 'noteField', value: { text: { s: 'Synthetic assessment entered at 20:00 UTC.' } },
  } } })).state;
  const entered = projection.facts.epochMinute;
  if (!Number.isSafeInteger(entered)) throw new Error('Trusted entry clock missing');
  for (const [name, gap] of [['late', 3], ['boundary', 2]]) {
    const timed = await lean.call('step', { ...base, state, event: { enter: {
      comp: 'timeTaken', value: { text: { s: String(entered - gap) } },
    } } });
    if (timed.result !== 'ok') throw new Error('Native time override refused');
    const tree = await lean.call('render-ui', { ...base, state: timed.state });
    const labeled = JSON.stringify(tree).includes('"label":"Late entry"');
    if (labeled !== (gap > 2)) throw new Error('Native late-label boundary differs');
    const file = resolve(out, `${name}.json`);
    writeFileSync(file, JSON.stringify(tree));
    console.log(file);
  }
} finally { lean.close(); }
