import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scenarioCatalog } from './scenarios.mjs';
import { entries } from './clinical.mjs';
import { context, facts, personaCommits, personaWorkflows } from './clinical.mjs';
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
  const source = ['scenarios.mjs', 'refill-denial.mjs', 'selection.mjs'].map(file => readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')).join('\n');
  const components = ['v1', 'v2', 'v3'].flatMap(v => ['P1', 'P2', 'P3', 'P4', 'P5'].flatMap(p => read(`releases/${v}/personas/${p}.json`).screens.flatMap(s => s.components.map(c => c.id))));
  for (const id of new Set(components)) {
    if (id.length > 8) assert.ok(!source.includes(`'${id}'`) && !source.includes(`"${id}"`), `Hard-coded component id ${id}`);
  }
});

test('projected absence of today’s weight is never replaced by a fixture default', () => {
  const projected = facts(); delete projected.weightToday;
  assert.equal(context('signOrders', { facts: projected }).facts.weightToday, undefined);
});

test('fixed persona workflow contracts cover every commit exposed by all 15 canonicals', () => {
  for (const release of ['v1', 'v2', 'v3']) for (const persona of Object.keys(personaCommits)) {
    const p = read(`releases/${release}/personas/${persona}.json`);
    const exposed = new Set(p.screens.flatMap(s => s.components.flatMap(c => c.kind?.button?.action?.commit ? [c.kind.button.action.commit.commit] : [])));
    assert.deepEqual([...exposed].sort(), [...personaCommits[persona]].sort(), `${release}/${persona}`);
    assert.deepEqual([...new Set(p.screens.map(s => s.workflow).filter(w => w !== 'shell'))].sort(),
      [...personaWorkflows[persona], 'chart'].sort(), `${release}/${persona} workflow scope`);
  }
});
