/** Select the supplied acute chart through the interpreter's patient workspace. */
export function selectAcutePatient(call, base) {
  let state = call('init', base);
  if (!base.program.patientSelection) return state;
  const descend = node => [node, ...(node.presentation?.children ?? node.rowAction?.children ?? node.section?.children ?? node.columns?.children ?? node.tabs?.body ?? []).flatMap(descend)];
  const ui = call('render-ui', { ...base, state });
  const patient = base.facts.sourcePatientId;
  const control = ui.workspace.flatMap(descend).find(node => node.button?.comp.startsWith(`workspace.open|${patient}|`))?.button;
  if (!control) throw new Error(`Missing source-bound acute patient choice: ${patient}`);
  for (const event of [{ click: { comp: control.comp } }, { scroll: { screen: state.screen } }]) {
    const result = call('step', { ...base, state, event });
    if (result.result !== 'ok') throw new Error(`Acute patient selection failed: ${JSON.stringify(result.result)}`);
    state = result.state;
  }
  if (state.patientContext?.bound !== patient) throw new Error('Acute chart did not bind to its source patient');
  const queue = [[state.screen, []]], seen = new Set([state.screen]);
  for (const [screen, route] of queue) {
    if (screen === base.program.start) {
      for (const comp of route) {
        const next = call('step', { ...base, state, event: { click: { comp } } });
        if (next.result !== 'ok') throw new Error('Acute start navigation failed');
        state = next.state;
      }
      return state;
    }
    for (const comp of base.program.screens.find(item => item.id === screen)?.components ?? []) {
      const destination = comp.kind.button?.action?.goto?.screen;
      if (destination && !seen.has(destination)) { seen.add(destination); queue.push([destination, [...route, comp.id]]); }
    }
  }
  throw new Error('No clinical navigation back to the acute landing screen');
}
