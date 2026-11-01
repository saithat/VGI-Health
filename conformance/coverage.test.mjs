import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scenarioCatalog } from './scenarios.mjs';
import { entries } from './clinical.mjs';
const read = name => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), 'utf8'));

test('hand-written scenarios account for every exported core entry, review and alert', () => {
  const spec = read('releases/v3/spec.json');
  const ids = new Set(scenarioCatalog.map(s => s.id));
  assert.equal(ids.size, scenarioCatalog.length, 'Scenario ids must be unique');
  for (const r of spec.entries) {
    const specialized = ['abxIndication', 'naloxoneOffer', 'naloxoneEducation', 'consentVerified', 'hpUpdate', 'medsToHold'].includes(r.element);
    // Full-profile specialist issuance entries are not in the active core.
    assert.ok(entries[r.commit]?.includes(r.element) || specialized, `Uncovered entry ${r.commit}/${r.element}`);
  }
  for (const r of spec.reviews) assert.ok(ids.has(`review.${r.commit}.${r.info}`) || ids.has('v3.mar-indication-shown') && r.info === 'abxIndication', `Uncovered review ${r.commit}/${r.info}`);
  for (const a of spec.alerts) assert.ok(ids.has(`alert.${a.id}`) || ids.has(`alert.passive.${a.id}`) || a.id === 'weightInLb' && ids.has('weight.lb') || a.tier === 'removable', `Uncovered alert ${a.id}`);
});

test('scenario definitions contain semantic intents rather than canonical component ids', () => {
  const source = readFileSync(new URL('./scenarios.mjs', import.meta.url), 'utf8');
  const components = ['v1', 'v2', 'v3'].flatMap(v => ['P1', 'P2', 'P3', 'P4', 'P5'].flatMap(p => read(`releases/${v}/personas/${p}.json`).screens.flatMap(s => s.components.map(c => c.id))));
  for (const id of new Set(components)) {
    if (id.length > 8) assert.ok(!source.includes(`'${id}'`) && !source.includes(`"${id}"`), `Hard-coded component id ${id}`);
  }
});
