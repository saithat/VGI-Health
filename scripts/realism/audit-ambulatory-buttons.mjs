// Button effects are checked through the public native interpreter, not a UI clone.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '../..');
const binary = `${root}/lean/.lake/build/bin/ehr`;
const input = process.argv[2] ?? '/tmp/amb-review';
const output = process.argv[3] ?? '/tmp/amb-button-audit.json';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
function call(command, value) {
  const result = spawnSync(binary, [command], { cwd: root, input: JSON.stringify(value), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env: { ...process.env, LEAN_NUM_THREADS: '4' } });
  if (result.status) throw new Error(result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}
function nodes(tree) {
  if (tree.valueSet) return [tree, ...tree.valueSet.children.flatMap(nodes)];
  if (tree.chartReferences) return [tree, ...tree.chartReferences.children.flatMap(nodes)];
  if (tree.rowAction) return [tree, ...tree.rowAction.children.flatMap(nodes)];
  if (tree.section) return [tree, ...tree.section.children.flatMap(nodes)];
  if (tree.columns) return [tree, ...tree.columns.children.flatMap(nodes)];
  if (tree.presentation) return [tree, ...tree.presentation.children.flatMap(nodes)];
  if (tree.tabs) return [tree, ...tree.tabs.body.flatMap(nodes)];
  return [tree];
}
const audit = [];
const reviewCases = read(`${input}/review-cases.json`);
for (const { persona, workflow } of reviewCases.cases) {
  const spec = read(`${root}/releases/v1/spec.json`);
  const program = read(`${root}/releases/v1/personas/${persona}.json`);
  const bundle = read(`${input}/${persona}-${workflow}-bundle.json`);
  const projection = call('facts', { bundle, context: { today: reviewCases.today, now: 540, receipts: [], record: [] } });
  const user = { id: persona, role: program.role };
  const base = { spec, program, facts: projection.facts, user };
  const initial = call('init', base);
  const queue = [[program.start, []]];
  const visited = new Map(queue);
  for (let i = 0; i < queue.length; i++) {
    const [id, path] = queue[i];
    for (const c of program.screens.find(screen => screen.id === id).components) {
      const target = c.kind?.button?.action?.goto?.screen;
      if (target && !visited.has(target)) { const next = [...path, c.id]; visited.set(target, next); queue.push([target, next]); }
    }
  }
  for (const screen of program.screens.filter(screen => screen.workflow === workflow || screen.id === 'home')) {
    let state = initial;
    for (const comp of visited.get(screen.id) ?? []) {
      const result = call('step', { ...base, state, event: { click: { comp } } });
      if (result.result !== 'ok') throw new Error(`Navigation blocked: ${comp}`);
      state = result.state;
    }
    if (state.screen !== screen.id) throw new Error(`No actual path to ${screen.id}`);
    const ui = call('render-ui', { ...base, display: projection.display, state });
    const buttons = [...ui.workspace, ...ui.side, ...(ui.modal ? [ui.modal] : [])].flatMap(nodes).flatMap(n => n.button ? [n.button] : []);
    buttons.push(...ui.nav.flatMap(([, rows]) => rows.map(([comp, label]) => ({ comp, label, role: 'nav', enabled: true }))));
    for (const button of buttons) {
      if (!button.enabled) {
        if (!button.blockedReason) throw new Error(`Disabled without reason: ${button.comp}`);
        audit.push({ persona, screen: screen.id, comp: button.comp, enabled: false, reason: button.blockedReason });
        continue;
      }
      const event = button.role === 'confirm' ? { confirm: { comp: button.comp } } : button.role === 'ack' ? { ack: { alert: button.comp } } : { click: { comp: button.comp } };
      const result = call('step', { ...base, state, event });
      if (result.result === 'ignored' || JSON.stringify(result.state) === JSON.stringify(state))
        throw new Error(`No effect: ${button.comp}: ${JSON.stringify(result.result)}`);
      audit.push({ persona, screen: screen.id, comp: button.comp, enabled: true, result: result.result });
    }
  }
}
writeFileSync(output, JSON.stringify({ checked: audit.length, enabled: audit.filter(row => row.enabled).length, rows: audit }, null, 2) + '\n');
console.log(`Ambulatory buttons: ${audit.length} checked; every enabled button changes interpreter state; every disabled button has a reason`);
