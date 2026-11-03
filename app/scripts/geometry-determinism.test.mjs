import { test } from 'node:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkDeterminism } from './geometry-determinism.mjs';

test('fresh captures are identical under repeat and Liberation fontconfig', { timeout: 180000 }, async () => {
  const output = await mkdtemp(path.join(tmpdir(), 'geometry-determinism-test-'));
  const legacy = path.join(output, 'legacy.json');
  await writeFile(legacy, JSON.stringify({ node: { tag: 'div', attrs: [{ name: 'class', value: 'ehr-shell' }], children: [
    { node: { tag: 'button', attrs: [{ name: 'class', value: 'ehr-button' }, { name: 'data-comp-id', value: 'legacy-review' }], children: [{ text: { s: 'Review patient and laboratory results' } }] } },
    { node: { tag: 'span', attrs: [{ name: 'class', value: 'ehr-hotkey' }], children: [{ text: { s: 'Ctrl+K' } }] } },
  ] } }));
  await checkDeterminism(['w1Orders.json', 'p1-alert.json', 'semantic-timeline.json'].map(name => path.resolve(import.meta.dirname, '../src/fixtures/ui', name)).concat(legacy), output);
});
