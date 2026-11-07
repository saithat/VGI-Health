import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { fixture, host, configuration, patient, ready, intent, api } from './helpers.ts';
import { migrate } from '../src/store.ts';
import type { UiScreen, UiNode } from '../../../lean/generated/ehr-types.ts';
import { screenCanonical } from '../../../app/src/data/screenFingerprint.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL required: real native/Postgres fingerprint test');
test('screen evidence binds exact journal order, survives stale caches, and refuses atomically with same-ID retry', async () => {
  const f = await fixture();
  const config = configuration(f, `fingerprint-${randomUUID()}`, ['pt-1']);
  const a = await host(url, config);
  const actor = config.actors[20];
  try {
    await migrate(a.db);
    await a.store.importPatient(patient(f, 'pt-1', 1));
    const s = await ready(a.base, actor, 'pt-1', 'tiny', 'sign', f.tinyEvents);
    const command = intent(s, 'fingerprint-retry', { click: { comp: 'signButton' } });
    const originalFrames = structuredClone(command.screens.frames);
    assert.equal(originalFrames.length, f.tinyEvents.length + 1);
    const unchanged = async () => {
      const read = await api(a.base, actor, '/patients/pt-1');
      assert.equal(read.body.version, 1);
      assert.equal(read.body.events.length, 1); // import only
      assert.equal((await a.db.query('SELECT 1 FROM commit_requests WHERE tenant=$1 AND request_id=$2', [config.tenant, command.requestId])).rowCount, 0);
    };
    const cases = [
      { ...command, screens: undefined },
      { ...command, screens: { ...command.screens, requestId: 'different-request' } },
      { ...command, screens: { ...command.screens, frames: originalFrames.slice(1) } },
      { ...command, screens: { ...command.screens, frames: originalFrames.map((frame: { hash: string }, i: number) => i === 2 ? { ...frame, hash: '0'.repeat(64) } : frame) } },
      { ...command, screens: { ...command.screens, frames: [originalFrames[1], originalFrames[0], ...originalFrames.slice(2)] } },
    ];
    for (const bad of cases) {
      const refused = await api(a.base, actor, '/commands', bad);
      assert.deepEqual(refused, { status: 422, body: { error: 'screen_fingerprint_mismatch' } });
      await unchanged();
    }
    // Poison a cache at the right patient version. Native replay must ignore it.
    await a.db.query('UPDATE commit_sessions SET native_state=$3,native_facts=$4,native_version=base_version WHERE tenant=$1 AND id=$2',
      [config.tenant, s.sessionId, f.tiny.state, { bogus: true }]);
    // Corrupt the journal itself without changing its revision: matching cached
    // evidence must not authorize a newly reordered step.
    await a.db.query('UPDATE commit_sessions SET events=$3 WHERE tenant=$1 AND id=$2',
      [config.tenant, s.sessionId, JSON.stringify([f.tinyEvents[1], f.tinyEvents[0], ...f.tinyEvents.slice(2)])]);
    assert.equal((await api(a.base, actor, '/commands', command)).body.error, 'screen_fingerprint_mismatch');
    await unchanged();
    await a.db.query('UPDATE commit_sessions SET events=$3 WHERE tenant=$1 AND id=$2', [config.tenant, s.sessionId, JSON.stringify(f.tinyEvents)]);
    let reconstructionMs = 0;
    let verificationStart: number | undefined;
    let addedVerificationMs = 0;
    const call = a.lean.call.bind(a.lean);
    a.lean.call = async (op, input) => {
      const started = performance.now();
      if (op === 'facts' && verificationStart === undefined) verificationStart = started;
      if (op === 'commit-check' && verificationStart !== undefined) addedVerificationMs = started - verificationStart;
      const result = await call(op, input);
      if (['facts', 'init', 'step', 'render-screen'].includes(op)) reconstructionMs += performance.now() - started;
      return result;
    };
    const started = performance.now();
    const response = await fetch(a.base + '/commands', { method: 'POST', headers: {
      Authorization: `Bearer ${actor.token}`, 'Content-Type': 'application/json',
    }, body: JSON.stringify(command) });
    const match = { status: response.status, body: await response.json() };
    const elapsed = performance.now() - started;
    assert.equal(match.status, 201, JSON.stringify(match));
    console.log(JSON.stringify({ measurement: 'seven-step order journal, one warm command; no load', journalSteps: f.tinyEvents.length,
      addedVerificationMs: +addedVerificationMs.toFixed(2), nativeReconstructionAndScreensMs: +reconstructionMs.toFixed(2), commandRoundTripMs: +elapsed.toFixed(2) }));
    assert.deepEqual(await api(a.base, actor, '/commands', command), match);
    const read = await api(a.base, actor, '/patients/pt-1');
    assert.equal(read.body.version, 2);
    assert.equal(read.body.events.length, 2);
    const screen = await call('render-screen', { spec: s.spec, program: s.program, ...s.projection, user: s.user, state: s.state });
    assert.equal(screen.canonical, screenCanonical(screen.screen));
    const roundtrip = await call('screen-canonical', screen.screen);
    assert.equal(roundtrip, screen.canonical);
  } finally {
    await a.db.query('DELETE FROM commit_requests WHERE tenant=$1', [config.tenant]);
    await a.db.query('DELETE FROM commit_sessions WHERE tenant=$1', [config.tenant]);
    await a.db.query('DELETE FROM commit_events WHERE tenant=$1', [config.tenant]);
    await a.db.query('DELETE FROM commit_streams WHERE tenant=$1', [config.tenant]);
    await a.close();
  }
});

test('native/WASM/host canonical bytes agree on real screens, Unicode, alerts and all metadata', async () => {
  const { readFile } = await import('node:fs/promises');
  const { Lean } = await import('../src/lean.ts');
  const { resolve } = await import('node:path');
  const native = new Lean(resolve(process.env.EHR_BIN ?? '../../lean/.lake/build/bin/ehr'));
  const { loadEhrInterp } = await import('../../../app/public/ehr/interp-loader.mjs');
  const wasm = await loadEhrInterp();
  try {
    const corpus = completeScreen();
    const bytes = screenCanonical(corpus);
    assert.equal(await native.call('screen-canonical', corpus), bytes);
    assert.equal(JSON.parse(wasm.call('ehr_screen_canonical', JSON.stringify(corpus))), bytes);
    for (const name of ['w1Rooming', 'w1Orders', 'w1Sign', 'p1-alert', 'bad-sign']) {
      const screen = JSON.parse(await readFile(new URL(`../../../app/src/fixtures/ui/${name}.json`, import.meta.url), 'utf8'));
      screen.title = 'Delimiters :;{}[]\\"\n\u0000 — é é 😀';
      const expected = screenCanonical(screen);
      assert.equal(await native.call('screen-canonical', screen), expected);
      assert.equal(JSON.parse(wasm.call('ehr_screen_canonical', JSON.stringify(screen))), expected);
      for (const key of Object.keys(screen)) {
        // Removing any top-level painter field must change the bytes, including
        // optional metadata; the canonical form never projects away a field.
        const altered = { ...screen }; delete altered[key];
        assert.notEqual(screenCanonical(altered), expected, `${name}/${key}`);
      }
    }
  } finally { native.close(); }
});

test('success resets the evidence interval; a new step still requires comparison', async () => {
  const { readFile } = await import('node:fs/promises');
  const { configSchema } = await import('../src/types.ts');
  const f = await fixture();
  const spec = JSON.parse(await readFile(new URL('../../../releases/v3/spec.json', import.meta.url), 'utf8'));
  const program = JSON.parse(await readFile(new URL('../../../releases/v3/personas/P1.json', import.meta.url), 'utf8'));
  program.start = 'w1Rooming'; program.patientSelection = false;
  const config = configSchema.parse({ tenant: `screen-interval-${randomUUID()}`, actors: [{ persona: 'P1', token: 'synthetic-screen-interval-test-token',
    user: { id: 'P1', role: 'physician' }, modelId: 1, patients: ['pt-1'] }],
    releases: { P1: { spec, program, workflows: { chart: { commit: 'markReviewed', project: true } } } } });
  const a = await host(url, config); const actor = config.actors[0];
  try {
    await migrate(a.db); await a.store.importPatient(patient(f, 'pt-1', 1));
    const opened = await api(a.base, actor, '/sessions', { patient: 'pt-1', release: 'P1', workflow: 'chart', encounter: 'enc-1', expectedVersion: 1 });
    const first = await api(a.base, actor, '/commands', intent(opened.body, 'first', { click: { comp: 'w1Rooming.review.allergyList' } }));
    assert.equal(first.status, 201, JSON.stringify(first));
    let s = { ...opened.body, ...first.body };
    const next = await api(a.base, actor, `/sessions/${s.sessionId}/events`, { revision: s.revision, event: { click: { comp: 'w1Rooming.nav.w1MedRec' } } });
    assert.equal(next.status, 200); s = { ...s, ...next.body };
    const command = intent(s, 'second', { click: { comp: 'w1MedRec.review.currentMeds' } });
    assert.deepEqual(command.screens.frames.map((f: { step: number }) => f.step), [1, 2]);
    const missingNew = { ...command, screens: { ...command.screens, frames: command.screens.frames.slice(0, 1) } };
    assert.equal((await api(a.base, actor, '/commands', missingNew)).body.error, 'screen_fingerprint_mismatch');
    const second = await api(a.base, actor, '/commands', command);
    assert.equal(second.status, 201, JSON.stringify(second));
    assert.equal(second.body.version, 3);
  } finally {
    await a.db.query('DELETE FROM commit_requests WHERE tenant=$1', [config.tenant]);
    await a.db.query('DELETE FROM commit_sessions WHERE tenant=$1', [config.tenant]);
    await a.db.query('DELETE FROM commit_events WHERE tenant=$1', [config.tenant]);
    await a.db.query('DELETE FROM commit_streams WHERE tenant=$1', [config.tenant]);
    await a.close();
  }
});

/** Every UiNode constructor and UiScreen metadata field, including both strip
 * atoms and the bounded nanosecond reader. This is codec evidence, not a layout. */
function completeScreen(): UiScreen {
  const text: UiNode = { text: { s: "full-detail :; é 😀\u0000" } };
  const alert: UiNode = { alert: { comp: "alert", alertId: "severe", label: "Severe allergy", severity: "interruptive" } };
  const button: UiNode = { button: { comp: "ack", label: "Acknowledge", role: "ack", enabled: true, blockedReason: null, hotkey: "A" } };
  const pair: [string, string][] = [["source", "caption"]];
  const choice = { options: pair, showCode: true, allowOther: false };
  const source = { resource: "Observation/o", field: "effectiveDateTime", timestamp: "1960-01-01T00:00:00.123456789Z" };
  return { screen: "screen", compact: ["field"], fieldSources: pair, banner: pair, viewer: "Physician", nav: [["Workflow", pair]], activeNav: "nav",
    sourceLabels: pair, entryHints: pair, fieldChoices: [["field", choice]], title: "Canonical corpus", side: [text], modal: alert, urgent: [alert, button],
    workspace: [
      { board: { urgent: [{ patient: "p", banner: pair, alertId: "a", label: "urgent", severity: "severe" }], children: [text] } },
      { patientPane: { patient: "p", banner: pair, metadata: { sourceLabels: pair, fieldSources: pair, entryHints: pair, fieldChoices: [["field", choice]], compact: ["field"], urgent: [alert, button] }, children: [text], modal: [alert] } },
      { datedTimeline: { title: "Index", dated: [{ source, utcSecond: -315619200, nanosecond: 123456789 }], undated: [source], children: [text] } },
      { timeline: { title: "Timeline", children: [text] } },
      { presentation: { kind: "table", children: [text] } },
      { valueSet: { options: [{ code: "c", label: "Label" }], allowCustom: false, children: [text] } },
      { chartReferences: { references: [{ measure: "height", unit: "cm", percentile: "50", source: "published", population: "reference", points: [[1, 2]] }], children: [text] } },
      { rowAction: { target: "field", row: 2, children: [button] } },
      { section: { id: "section", title: "Section", children: [text] } },
      { columns: { children: [text] } },
      { tabs: { id: "tabs", labels: ["First", "Second"], selected: 1, body: [text] } },
      { stepper: { steps: pair, current: 1 } },
      { field: { comp: "field", label: "Weight", kind: "qty", value: "80", unit: "kg", provenance: "human", pendingConfirm: true, humanOnly: true, required: true } },
      { info: { comp: "info", label: "Review", infoId: "allergyList", display: "table", rows: [pair] } }, alert, button, text,
    ] };
}
