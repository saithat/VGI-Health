import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { buildSeeded, rejectionKind } from '../src/seeded.js';
import { applyToProgram, commitOf, infoOf } from '../src/program.js';
import { expandProgram } from '../src/composites.js';
import { fakeCanonical, fakeSpec } from '../src/fake/fixtures.js';
import { createEhr, DEFAULT_EHR_BIN } from '../src/ehr.js';
import { programSchema, specSchema } from '../src/schema.js';
import { toCheckResult } from '../src/night.js';

function present<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('missing fixture value');
  return value;
}

it('hides duplicate and composite providers without hiding the commit or duplicating IDs', () => {
  const p = fakeCanonical('v1');
  const s = present(p.screens.find((s) => s.components.some((c) => commitOf(c) === 'signOrders')));
  const panel = present(s.components.find((c) => infoOf(c) === 'allergyList'));
  s.components.push({ ...panel, id: 'sidebar', kind: { table: { info: 'allergyList' } } });
  s.components.push({ ...panel, id: 'prior', kind: { priorAuth: { info: 'allergyList' } } });
  p.componentDefs = [{ name: 'allergyCard', params: [], body: [{ ...panel, id: 'data' }] }];
  s.components.push({ ...panel, id: 'context', kind: { use: { name: 'allergyCard', args: [] } } });
  s.components.push({ ...panel, id: `seeded-tabs-${s.id}`, kind: 'tabs' });
  const seed = present(buildSeeded('allergyHidden', p, fakeSpec('v1')));
  expect(seed.targets).toEqual([panel.id, 'sidebar', 'prior', 'context.data']);
  const q = present(expandProgram(applyToProgram(p, seed.patch, { version: 1 }).program).screens.find((x) => x.id === s.id));
  const providers = q.components.filter((c) => seed.targets.includes(c.id));
  expect(providers).toHaveLength(4);
  expect(new Set(q.components.map((c) => c.id)).size).toBe(q.components.length);
  for (const c of providers) {
    expect(c.tab).toBe(1);
    expect(q.components.find((p) => p.id === c.parent)?.kind).toBe('tabs');
  }
  expect(q.components.filter((c) => commitOf(c))).toEqual(s.components.filter((c) => commitOf(c)));
});

it('skips commits without a non-waived allergy-list review obligation', () => {
  const p = fakeCanonical('v1'), spec = fakeSpec('v1');
  const other = structuredClone(present(p.screens.find((s) => s.components.some((c) => commitOf(c) === 'signOrders'))));
  other.id = 'unrelated';
  other.components = other.components.map((c) => commitOf(c) ? { ...c, kind: { button: { action: { commit: { commit: 'signNote' } } } } } : c);
  p.screens.unshift(other);
  const seed = present(buildSeeded('allergyHidden', p, spec));
  expect(applyToProgram(p, seed.patch, { version: 1 }).program.screens[0]).toEqual(other);
  spec.reviews = spec.reviews.map((r) => ({ ...r, waivedBy: 'waiver' }));
  expect(buildSeeded('allergyHidden', p, spec)).toBeNull();
  spec.reviews = [];
  expect(buildSeeded('allergyHidden', p, spec)).toBeNull();
});

const binary = process.env['EHR_BIN'] ?? DEFAULT_EHR_BIN;
it.skipIf(!existsSync(binary))('native checker accepts hiding one duplicate but rejects the full probe across releases', async () => {
  const ehr = createEhr({ fake: false, binary });
  for (const release of ['v1', 'v2', 'v3']) {
    const dir = path.resolve(import.meta.dirname, '../../releases', release);
    const p = programSchema.parse(JSON.parse(readFileSync(path.join(dir, 'personas/P1.json'), 'utf8')));
    const specVersion = path.join(dir, 'spec.json');
    const spec = specSchema.parse(JSON.parse(readFileSync(specVersion, 'utf8')));
    expect(await ehr.check({ specVersion, program: p, prev: p, canonical: p })).toBe('ok');
    const seed = present(buildSeeded('allergyHidden', p, spec));
    expect(seed.targets.length).toBeGreaterThan(1);
    const q = applyToProgram(p, seed.patch, { version: p.version + 1 }).program;
    const check = toCheckResult(await ehr.check({ specVersion, program: q, prev: p, canonical: p }));
    expect(check.property).toBe('reviewsBeforeCommit');
    expect(rejectionKind(check)).toBe('allergyHidden');
    const one = structuredClone(p);
    for (const s of one.screens) {
      const first = s.components.find((c) => c.id === seed.targets[0]);
      if (!first) continue;
      s.components.push({ id: 'historical-tabs', kind: 'tabs', label: 'Summary | Allergies', tab: 0, visibility: 'always', size: 'normal', tag: 'secondaryTabs' });
      first.parent = 'historical-tabs';
      first.tab = 1;
    }
    expect(await ehr.check({ specVersion, program: one, prev: p, canonical: p })).toBe('ok');
  }
});
