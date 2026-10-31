import { applyPatch, PatchError } from '../src/jsonpatch.js';

const doc = {
  screens: [
    { id: 'a', components: [{ id: 'x', tag: 'banner' }, { id: 'y', tag: 'allergyList', size: 'normal' }] },
    { id: 'b', components: [] },
  ],
};

describe('JSON Patch with selectors', () => {
  it('resolves [key=value] selectors to indexes and reports the plain RFC 6902 patch', () => {
    const { doc: out, resolved } = applyPatch(doc, [{ op: 'replace', path: '/screens/[id=a]/components/[tag=allergyList]/size', value: 'compact' }]);
    expect(out).toMatchObject({ screens: [{ components: [{ id: 'x' }, { id: 'y', size: 'compact' }] }, { id: 'b' }] });
    expect(resolved[0]).toEqual({ op: 'replace', path: '/screens/0/components/1/size', value: 'compact' });
  });

  it('inserts after a selected element with "+" and appends with "-"', () => {
    const { doc: out } = applyPatch(doc, [
      { op: 'add', path: '/screens/[id=a]/components/[id=x]+', value: { id: 'new' } },
      { op: 'add', path: '/screens/[id=b]/components/-', value: { id: 'z' } },
    ]);
    expect(out).toMatchObject({ screens: [{ components: [{ id: 'x' }, { id: 'new' }, { id: 'y' }] }, { components: [{ id: 'z' }] }] });
  });

  it('supports move, copy, test, and remove, and never mutates the input', () => {
    const before = JSON.stringify(doc);
    const { doc: out } = applyPatch(doc, [
      { op: 'test', path: '/screens/[id=a]/components/[id=y]/tag', value: 'allergyList' },
      { op: 'copy', from: '/screens/[id=a]/components/[id=y]', path: '/screens/[id=b]/components/-' },
      { op: 'move', from: '/screens/[id=a]/components/[id=x]', path: '/screens/[id=b]/components/0' },
      { op: 'remove', path: '/screens/[id=a]/components/[id=y]' },
    ]);
    expect(out).toMatchObject({ screens: [{ components: [] }, { components: [{ id: 'x' }, { id: 'y' }] }] });
    expect(JSON.stringify(doc)).toBe(before);
  });

  it('fails loudly on missing selectors and failed tests', () => {
    expect(() => applyPatch(doc, [{ op: 'remove', path: '/screens/[id=nope]' }])).toThrow(PatchError);
    expect(() => applyPatch(doc, [{ op: 'test', path: '/screens/0/id', value: 'b' }])).toThrow(/test failed/);
  });
});
