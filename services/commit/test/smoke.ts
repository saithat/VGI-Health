/** Smoke the actual main.ts listener after the documented synthetic import. */
import assert from 'node:assert/strict';
const base = process.argv[2] ?? 'http://127.0.0.1:18090';
const headers = { Authorization: 'Bearer synthetic-only-actor-token-000', 'Content-Type': 'application/json' };
const read = await fetch(base + '/patients/pt-1', { headers });
assert.equal(read.status, 200);
assert.ok((await read.json()).version >= 1);
const opened = await fetch(base + '/sessions', { method: 'POST', headers,
  body: JSON.stringify({ patient: 'pt-1', release: 'nurse', workflow: 'dose' }) });
assert.equal(opened.status, 201);
const session = await opened.json();
assert.ok(session.shared.version >= 0);
assert.equal(session.state.screen, 'home');
const model = await fetch(base + '/patients/pt-1', { headers });
assert.equal(model.status, 200);
assert.equal((await model.json()).snapshot.bundle.type, 'collection');
console.log('PASS main.ts listener, primary read, native session/init and versioned journal read');
