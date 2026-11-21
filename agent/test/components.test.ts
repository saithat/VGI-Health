import { RELEASE_IDS } from '../src/release-config.js';
import { expandProgram } from '../src/composites.js';
import { applyToProgram } from '../src/program.js';
import { fakeCanonical } from '../src/fake/fixtures.js';
it('expands finite composite instances with parameters and isolated ids, preserving editable source', () => {
  const source = fakeCanonical(RELEASE_IDS.base);
  const screen = source.screens[0];
  if (!screen) throw new Error('screen');
  source.componentDefs = [{ name: 'summary', params: ['info'], body: [{ id: 'body', kind: { panel: { info: '{{info}}' } }, label: 'Summary', tab: 0, size: 'normal', tag: 'summary', visibility: 'always' }] }];
  screen.components.push({ id: 'copied-summary', kind: { use: { name: 'summary', args: [['info', 'allergyList']] } }, label: 'Summary', tab: 0, size: 'normal', tag: 'summary', visibility: 'always' });
  const result = expandProgram(source);
  expect(result.screens[0]?.components.find((c) => c.id === 'copied-summary.body')).toMatchObject({ parent: 'copied-summary', kind: { panel: { info: 'allergyList' } } });
  expect(result.componentDefs).toBeUndefined();
  expect(source.componentDefs).toHaveLength(1);
  expect(applyToProgram(source, [], { version: 1 }).program.componentDefs).toEqual(source.componentDefs);
  source.componentDefs[0]?.body.push({ ...screen.components[0], id: 'nested', kind: { use: { name: 'summary', args: [] } }, label: '', tab: 0, size: 'normal', tag: '', visibility: 'always' });
  expect(() => expandProgram(source)).toThrow('Nested');
});
it('keeps identity, role and release metadata under loop control', () => {
  const source = fakeCanonical(RELEASE_IDS.base);
  for (const [key, value] of [['owner', 'other-user'], ['role', 'surgeon'], ['id', 'other'], ['version', 99], ['specVersion', 'untrusted']] as const) {
    expect(() => applyToProgram(source, [{ op: 'replace', path: `/${key}`, value }], { version: 1 })).toThrow('metadata');
  }
});
