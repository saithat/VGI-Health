import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runDays } from '../src/run.js';
import { createFakeEhr } from '../src/fake/ehr-fake.js';
import { RunStore } from '../src/store.js';
import { dayResultSchema } from '../src/schema.js';
import { designOf, withDesign } from '../src/layout-design.js';
import { attachGeometry, loadGeometry } from '../src/geometry.js';
import { LeanScreenChecker } from '../src/lean-screencheck.js';
import { fakeWorld, tmp } from './helpers.js';
import { RulesScript, ruleFixtureStates } from './layout-rule-fixture.js';
import { compactProgramScreens, leanTrainingLog } from '../src/lean-layout-prompt.js';
import { z } from 'zod';
import { sha256, stableStringify } from '../src/program.js';
function required<T>(v: T | undefined): T { if (v === undefined)
    throw Error('missing fixture'); return v; }
it('ships a scripted mixed layout move; day scroll/travel come from the admitted rule geometry', async () => {
    const worldDir = await fakeWorld(2), runsRoot = await tmp('rules-run'), backend = new RulesScript(true);
    const result = await runDays({ screenMode: 'lean', leanOptions: { states: ruleFixtureStates, limits: async () => ({}) }, worldDir, runsRoot, runId: 'rules', days: 2, personas: ['P1'], seedPolicy: 'none', ehr: createFakeEhr(), llm: backend });
    expect(result.infrastructureErrors).toEqual([]);
    expect(result.llmErrors).toEqual([]);
    const store = new RunStore(result.dir, path.join(result.dir, 'custom'), true);
    const record = await store.readDecision(1, 'P1');
    expect(record.outcome, record.validation.reason ?? '').toBe('deployed');
    expect(record.candidates.some(c => c.candidate.moveType === 'layout' && c.check.status === 'pass')).toBe(true);
    expect(backend.prompts.some(p => p.purpose === 'repair' && p.prompt.includes('missing-rule-target') && p.prompt.includes('layout-rule'))).toBe(true);
    const day = dayResultSchema.parse(JSON.parse(await readFile(path.join(result.dir, 'days/day-02/P1.json'), 'utf8')));
    const program = await store.readProgram('P1', day.programVersion);
    expect(designOf(program)?.[0]).toHaveProperty('rules');
    const meta = required(day.geometry);
    const atlas = await loadGeometry(path.join(result.dir, 'geometry', `${meta.programHash}.${meta.componentsSha256}.json`), day, path.join(result.dir, 'geometry'));
    expect(attachGeometry(day, atlas).tasks).toEqual(day.tasks);
    const checker = new LeanScreenChecker(createFakeEhr(), { states: ruleFixtureStates, limits: async () => ({}) });
    const reference = await checker.geometry({ program: withDesign(structuredClone(program)), specVersion: 'v1' });
    if (!reference)
        throw Error('missing reference');
    const before = attachGeometry(day, reference);
    const sum = (tasks: typeof day.tasks, k: 'scrolls' | 'mouseTravelPx') => tasks.reduce((n, t) => n + (t[k] ?? 0), 0);
    expect(sum(day.tasks, 'scrolls')).toBeLessThan(sum(before.tasks, 'scrolls'));
    expect(sum(day.tasks, 'mouseTravelPx')).not.toEqual(sum(before.tasks, 'mouseTravelPx'));
    const logs = JSON.parse(await leanTrainingLog(result.dir, 'P1', 1));
    expect(logs.perScreen.some((s: {
        scrollPx: number | null;
        mouseTravelPx: number | null;
    }) => s.scrollPx !== null && s.mouseTravelPx !== null)).toBe(true);
}, 180000);
it('losslessly interns repeated screen fragments and declares default fields', () => {
    const make = (id: string) => ({ id, title: id, workflow: 'W1', components: [{ id: id + '.go', tag: id + '.go', label: 'Go', tab: 0, size: 'normal', visibility: 'always', kind: { button: { action: { goto: { screen: 'next' } } } } }] });
    const input = [make('one'), make('two')], compact = compactProgramScreens(input);
    expect(compact.templates).toHaveLength(1);
    const expand = (v: unknown, id: string): unknown => {
        if (Array.isArray(v))
            return v.map(x => expand(x, id));
        if (v && typeof v === 'object') {
            const record = z.record(z.string(), z.unknown()).parse(v);
            if ('$screen' in record)
                return id + String(record['$screen']);
            return Object.fromEntries(Object.entries(record).map(([k, x]) => [k, expand(x, id)]));
        }
        return v;
    };
    const actual = compact.screens.map(s => ({ ...s, components: s.components.map(i => {
            const c = z.record(z.string(), z.unknown()).parse(expand(compact.templates[i], s.id));
            return { tab: 0, size: 'normal', visibility: 'always', tag: c['id'], ...c };
        }) }));
    expect(actual).toEqual(input);
});
it('attributes a legacy flat atlas only to the committed trace, rebuilding overwritten aliases', async () => {
    const directory = await tmp('legacy-rule-log');
    const trace = [{ task: 't', screen: 's', t: 0, event: { click: { comp: 'a' } }, ops: ['point', 'click'], result: 'ok' }];
    const traceKey = sha256(stableStringify(trace)).slice(0, 12), alias = `lean-event-0-${traceKey}`;
    const geometry = { programHash: 'p', componentsSha256: 'c', appSha256: 'lean-layout:test', source: 'recorded-fixture', viewport: { width: 1440, height: 900 }, missingTargets: [] };
    const day = { day: 1, persona: 'P1', programVersion: 0, trace, tasks: [{ task: 't', clicks: 1, keystrokes: 0, scrolls: 0, popups: 0, overrides: 0, searches: 0, backtracks: 0, klmDeciSec: 1, completed: true }], floor: [], complaints: [], geometry };
    const box = (x: number, y: number) => ({ center: { x, y }, reveal: { x, y }, chain: [], offsets: {} });
    const state = (suffix: string, id: string, x: number, y: number) => ({ screen: 's', state: `trace-0-${suffix}`, viewport: geometry.viewport, components: { a: box(x, y), [id]: box(x, y) }, scrollers: {} });
    const atlas = { schemaVersion: 1, ...geometry, traceTargets: { '0': 'lean-event-0-other' }, states: [state(traceKey, alias, 100, 100), state('other', 'lean-event-0-other', 1400, 800)] };
    await mkdir(path.join(directory, 'training/day-1'), { recursive: true });
    await mkdir(path.join(directory, 'geometry'), { recursive: true });
    await writeFile(path.join(directory, 'training/day-1/P1.json'), JSON.stringify(day));
    const file = path.join(directory, 'geometry/p.c.json');
    await writeFile(file, JSON.stringify(atlas));
    const log = JSON.parse(await leanTrainingLog(directory, 'P1', 1));
    expect(log.perScreen[0].mouseTravelPx).toBe(Math.round(Math.hypot(620, 350) * 100) / 100);
    await writeFile(file, JSON.stringify({ ...atlas, states: [atlas.states[1]] }));
    const missing = JSON.parse(await leanTrainingLog(directory, 'P1', 1));
    expect(missing.perScreen[0].mouseTravelPx).toBeNull();
    expect(missing.perScreen[0].scrolls).toBeNull();
});
