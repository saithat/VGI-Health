import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTransactions, rewriteReferences } from '../../infra/scripts/synthetic-hospital-batches.mjs';

const bundle = { resourceType: 'Bundle', type: 'transaction', entry: Array.from({ length: 19 }, (_, i) => ({
  fullUrl: `urn:uuid:${String(i).padStart(8, '0')}-0000-5000-a000-000000000000`,
  resource: { resourceType: i === 0 ? 'Patient' : i === 18 ? 'Provenance' : 'Encounter',
    ...(i ? { subject: { reference: 'urn:uuid:00000000-0000-5000-a000-000000000000' } } : {}) },
  request: { method: 'POST', url: i ? 'Encounter' : 'Patient', ifNoneExist: `identifier=example%7C${i}` },
})) };
test('8-entry chunks resolve prior-chunk refs, recover interrupted loads, and rerun without duplication', async () => {
  const stored = new Map();
  let calls = 0;
  let interrupt = true;
  const client = { async executeBatch(chunk) {
    calls++;
    if (interrupt && calls === 2) throw new Error('interrupted');
    assert.ok(chunk.entry.length <= 8);
    if (calls > 1) assert.equal(chunk.entry[0].resource.subject.reference, 'Patient/id0');
    return { entry: chunk.entry.map((e) => {
      const existing = stored.get(e.fullUrl);
      const location = existing ?? `${e.resource.resourceType}/id${stored.size}`;
      stored.set(e.fullUrl, location);
      return { response: { status: existing ? '200 OK' : '201 Created', location: `${location}/_history/1` } };
    }) };
  } };
  await assert.rejects(loadTransactions(client, bundle), /interrupted/);
  assert.equal(stored.size, 8);
  interrupt = false;
  calls = 0;
  assert.equal((await loadTransactions(client, bundle)).created, 11);
  calls = 0;
  assert.equal((await loadTransactions(client, bundle)).created, 0);
  assert.equal(stored.size, 19);
  assert.equal(bundle.entry[8].resource.subject.reference, bundle.entry[0].fullUrl);
});
test('rejects forward references and missing/failed results instead of leaving dangling links', async () => {
  const forward = structuredClone(bundle);
  forward.entry[0].resource.subject = { reference: bundle.entry[18].fullUrl };
  await assert.rejects(loadTransactions({}, forward), /Forward/);
  await assert.rejects(loadTransactions({ executeBatch: async () => ({ entry: [] }) }, bundle), /failed/);
  await assert.rejects(loadTransactions({ executeBatch: async (chunk) => ({ entry: chunk.entry.map(() => ({ response: { status: '201' } })) }) }, bundle), /location/);
});
test('rewrites reference fields only, leaving source text and attachment data alone', () => {
  const value = { subject: { reference: 'urn:x' }, text: 'urn:x', nested: [{ reference: 'urn:x' }] };
  assert.deepEqual(rewriteReferences(value, new Map([['urn:x', 'Patient/abc']])), {
    subject: { reference: 'Patient/abc' }, text: 'urn:x', nested: [{ reference: 'Patient/abc' }],
  });
});
