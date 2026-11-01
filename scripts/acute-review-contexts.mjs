import { selectAcutePatient } from './acute-select.mjs';
/** Export additional selected chart tabs through real native navigation events. */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const [fixtures = '/tmp/acute-review-fixtures', output = '/tmp/acute-populated-ui'] = process.argv.slice(2);
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const native = (command, input) => JSON.parse(execFileSync(path.join(root, 'lean/.lake/build/bin/ehr'), [command], {
  input: JSON.stringify(input), maxBuffer: 32e6, timeout: 30000,
  env: { ...process.env, LEAN_NUM_THREADS: '4' },
}));
for (const [persona, target] of [['P2', 'w3Provider'], ['P3', 'w4Mar']]) {
  const program = read(path.join(root, 'releases/v1/personas', `${persona}.json`));
  const input = {
    spec: read(path.join(root, 'releases/v1/spec.json')), program,
    user: read(path.join(fixtures, `${persona}-user.json`)),
    ...native('facts', { bundle: read(path.join(fixtures, `${persona}.json`)), context: read(path.join(fixtures, `${persona}-context.json`)) }),
  };
  const routes = new Map([[program.start, []]]), pending = [program.start];
  while (pending.length) {
    const source = pending.shift();
    for (const comp of program.screens.find(screen => screen.id === source).components) {
      const dest = comp.kind.button?.action?.goto?.screen;
      if (dest && !routes.has(dest)) {
        routes.set(dest, [...routes.get(source), { click: { comp: comp.id } }]);
        pending.push(dest);
      }
    }
  }
  const route = routes.get(target);
  if (!route) throw new Error(`No real navigation to ${target}`);
  let encounter = selectAcutePatient(native, input);
  for (const event of route) {
    const step = native('step', { ...input, state: encounter, event });
    if (step.result !== 'ok') throw new Error(`Failed chart navigation: ${JSON.stringify(step.result)}`);
    encounter = step.state;
  }
  for (const [tab, idx] of [['results', 2], ['imaging', 6]]) {
    const step = native('step', { ...input, state: encounter, event: { selectTab: { comp: `${target}.chart`, idx } } });
    if (step.result !== 'ok') throw new Error(`Failed chart navigation: ${JSON.stringify(step.result)}`);
    const ui = native('render-ui', { ...input, state: step.state });
    const file = path.join(output, persona, `${target}-chart-${tab}.json`);
    writeFileSync(file, JSON.stringify(ui, null, 2) + '\n');
    process.stdout.write(`${file}\n`);
  }
  if (persona === 'P3') for (const [screen, button] of [['w4Flowsheet', 'copyAssessment'], ['w4Handoff', 'template']]) {
    let draft = selectAcutePatient(native, input);
    for (const event of [...routes.get(screen), { click: { comp: `${screen}.${button}` } }]) {
      const step = native('step', { ...input, state: draft, event });
      if (step.result !== 'ok') throw new Error(`Failed outline action: ${JSON.stringify(step.result)}`);
      draft = step.state;
    }
    const file = path.join(output, persona, `${screen}-outline.json`);
    writeFileSync(file, JSON.stringify(native('render-ui', { ...input, state: draft }), null, 2) + '\n');
    process.stdout.write(`${file}\n`);
  }
}
