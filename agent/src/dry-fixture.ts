/** A certifiable variant of Lean's intentionally bad teaching UI; the spec is unchanged. */
import { tinyProgram } from '../../lean/generated/ehr-samples.js';
import { programSchema } from './schema.js';
import { infoOf, kindTag, kindPayload } from './program.js';
export function dryFixture() {
  const program = programSchema.parse(structuredClone(tinyProgram));
  program.macros = []; // Remove the teaching macro that attempts identity entry and signing.
  for (const screen of program.screens) {
    if (!screen.components.some((c) => kindTag(c.kind) === 'alert' && kindPayload(c.kind)?.['alert'] === 'careGap')) screen.components.push({ id: `${screen.id}.careGap`, kind: { alert: { alert: 'careGap', popup: false } }, label: 'Care gap', tag: 'fixture-alert', tab: 0, visibility: 'always', size: 'normal' });
    screen.components = screen.components.filter((c) => kindTag(c.kind) !== 'macro');
    for (const component of screen.components) {
      if (kindTag(component.kind) === 'alert') {
        const alert = kindPayload(component.kind)?.['alert'];
        if (typeof alert === 'string') component.kind = { alert: { alert, popup: false } };
      }
      if (kindTag(component.kind) === 'field' && kindPayload(component.kind)?.['element'] === 'weight') component.kind = { field: { element: 'weight', slot: { fixed: { n: 0 } }, prefill: 'none' } };
      if (infoOf(component) === 'allergyList') { component.tab = 0; delete component.parent; }
    }
  }
  const sign = program.screens.find((screen) => screen.id === 'sign');
  sign?.components.push({ id: 'returnRooming', kind: { button: { action: { goto: { screen: 'rooming' } } } }, label: 'Rooming', tag: 'fixture-navigation', tab: 0, visibility: 'always', size: 'normal' });
  return program;
}
