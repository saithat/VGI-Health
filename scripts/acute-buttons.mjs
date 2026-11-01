/** Audit every initially shown acute button through the real native interpreter.
 * Browser painting/event mapping is covered separately by the ARIA/painter gates.
 * No simulated clinical captures are inserted; blocked commits must explain why.
 */
import { selectAcutePatient, acuteChartFacts } from './acute-select.mjs';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const fixtureDir = process.argv[2] ?? '/tmp/acute-review-fixtures';
const binary = path.join(root, 'lean/.lake/build/bin/ehr');
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const call = (command, input) => JSON.parse(execFileSync(binary, [command], {
  cwd: root, input: JSON.stringify(input), encoding: 'utf8', timeout: 30000, maxBuffer: 32 * 1024 * 1024,
  env: { ...process.env, LEAN_NUM_THREADS: '4' },
}));
const reports = [];
const programs = [];
const uiNodes = node => [node, ...(node.section?.children ?? node.columns?.children ??
  node.presentation?.children ?? node.valueSet?.children ?? node.chartReferences?.children ?? node.rowAction?.children ?? node.tabs?.body ?? []).flatMap(uiNodes)];
const fixtures = ['P2', 'P3'].map(persona => ({ persona,
  files: ['', '-context', '-user'].map(suffix => {
    const file = `${persona}${suffix}.json`;
    return { file, sha256: createHash('sha256').update(readFileSync(path.join(fixtureDir, file))).digest('hex') };
  }),
}));
for (const release of ['v1', 'v2', 'v3']) {
  const spec = read(path.join(root, 'releases', release, 'spec.json'));
  for (const persona of ['P2', 'P3']) {
    const programPath = path.join(root, 'releases', release, 'personas', `${persona}.json`);
    const program = read(programPath);
    programs.push({ release, persona, path: path.relative(root, programPath), sha256: createHash('sha256').update(readFileSync(programPath)).digest('hex') });
    const user = read(path.join(fixtureDir, `${persona}-user.json`));
    const { facts, display } = acuteChartFacts(call, { bundle: read(path.join(fixtureDir, `${persona}.json`)), context: read(path.join(fixtureDir, `${persona}-context.json`)) });
    const input = { spec, program, facts, display, user };
    const initial = selectAcutePatient(call, input);
    const paths = new Map([[initial.screen, []]]);
    const pending = [initial.screen];
    while (pending.length) {
      const source = pending.shift();
      for (const comp of program.screens.find(screen => screen.id === source).components) {
        const target = comp.kind.button?.action?.goto?.screen;
        if (target && !paths.has(target)) {
          paths.set(target, [...paths.get(source), { click: { comp: comp.id } }]);
          pending.push(target);
        }
      }
    }
    for (const screen of program.screens.filter(screen => ['W3', 'W4'].includes(screen.workflow))) {
      const route = paths.get(screen.id);
      if (!route) throw new Error(`No real button path: ${screen.id}`);
      let state = initial;
      for (const event of route) {
        const step = call('step', { ...input, state, event });
        if (step.result !== 'ok') throw new Error(`Navigation failed: ${screen.id}: ${JSON.stringify(step.result)}`);
        state = step.state;
      }
      const view = call('view', { ...input, state });
      const result = { release, persona, screen: screen.id, clicked: [], disabled: [], tabs: [], searches: [] };
      for (const item of view.items.filter(item => item.shown)) {
        const comp = item.comp;
        const kind = typeof comp.kind === 'object' ? comp.kind : {};
        const clickable = 'button' in kind || 'macro' in kind || (kind.group?.collapsible === true);
        if ('search' in kind && !state.popup) {
          const query = 'a';
          const output = call('step', { ...input, state, event: { enter: { comp: comp.id, value: { text: { s: query } } } } });
          if (output.result !== 'ok') throw new Error(`Search entry failed: ${comp.id}`);
          for (const key of ['captured', 'receipts', 'commits', 'currentSlot'])
            if (JSON.stringify(output.state[key]) !== JSON.stringify(state[key]))
              throw new Error(`Search changed clinical state: ${comp.id}/${key}`);
          const ui = call('render-ui', { ...input, display, state: output.state });
          const nodes = [...ui.workspace, ...ui.side, ...(ui.modal ? [ui.modal] : [])].flatMap(uiNodes);
          if (!nodes.some(node => node.field?.comp === comp.id && node.field.value === query) ||
              !nodes.some(node => node.info?.comp === comp.id && node.info.infoId === 'searchResults' && node.info.rows.length))
            throw new Error(`Search has no semantic query/results: ${comp.id}`);
          result.searches.push(comp.id);
        }
        if (clickable) {
          if (!view.enabled.includes(comp.id)) {
            const blocked = view.blocked.find(([id]) => id === comp.id)?.[1];
            if (!blocked?.trim()) throw new Error(`No disabled reason: ${comp.id}`);
            result.disabled.push({ comp: comp.id, reason: blocked });
            continue;
          }
          const output = call('step', { ...input, state, event: { click: { comp: comp.id } } });
          if (output.result !== 'ok' || JSON.stringify(output.state) === JSON.stringify(state))
            throw new Error(`Enabled control has no successful observable effect: ${comp.id}: ${JSON.stringify(output.result)}`);
          result.clicked.push(comp.id);
        }
        if (comp.kind === 'tabs') {
          const indexes = [...new Set(view.items.filter(child => child.comp.parent === comp.id).map(child => child.comp.tab))];
          for (const idx of indexes.filter(idx => idx !== item.selectedTab)) {
            const output = call('step', { ...input, state, event: { selectTab: { comp: comp.id, idx } } });
            if (output.result !== 'ok' || JSON.stringify(output.state) === JSON.stringify(state))
              throw new Error(`Tab has no effect: ${comp.id}/${idx}`);
            result.tabs.push(`${comp.id}/${idx}`);
          }
        }
      }
      reports.push(result);
    }
  }
}
const report = {
  scope: 'Initially shown acute buttons, inactive tabs and unmasked search inputs, all three current releases and both role projections; native interpreter events. Search must return semantic query/results without changing captures, receipts, commits or the order slot. ARIA/visibility and painter event-mapping are separate gates. Empty-form disabled clinical commits are audited for a reason; completed clinical paths are covered by the full world simulation.',
  sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  sourceTreeDirty: execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim() !== '',
  binarySha256: createHash('sha256').update(readFileSync(binary)).digest('hex'),
  programs, fixtures, screens: reports.length, clicked: reports.reduce((sum, row) => sum + row.clicked.length, 0),
  tabs: reports.reduce((sum, row) => sum + row.tabs.length, 0),
  searches: reports.reduce((sum, row) => sum + row.searches.length, 0),
  disabled: reports.reduce((sum, row) => sum + row.disabled.length, 0), results: reports,
};
mkdirSync(path.join(root, 'docs/audits'), { recursive: true });
writeFileSync(path.join(root, 'docs/audits/acute-buttons.json'), JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify({ screens: report.screens, clicked: report.clicked, tabs: report.tabs, searches: report.searches, disabled: report.disabled }) + '\n');
