import { createEhr } from '../src/ehr.js';
import { loadRelease } from '../src/releases.js';
import { personalize, applyToProgram } from '../src/program.js';
import { tinyProgram } from '../../lean/generated/ehr-samples.js';

describe('certified role baselines', () => {
  it.each(['v1', 'v2', 'v3'])('loads the %s persona view for an authenticated user', async id => {
    const ehr = createEhr({ fake: false });
    const release = await loadRelease(id, ehr);
    const preset = release.personaCanonicals?.['P2'];
    expect(preset).toBeDefined();
    if (!preset) throw new Error('missing P2 preset');
    const p = personalize(preset, { id: 'P2', role: 'physician', keyboardShare: 50,
      reviewsAllergiesEarly: true, scansSidebar: true, backtrackRate: 0,
      searchWhenBuried: false, overrideRate: 0 }, 'authenticated-user-id');
    expect(p.owner).toBe('authenticated-user-id');
    expect(p.id).toBe('P2');
    expect(p.screens).toHaveLength(8);
    expect(p.screens.every(s => ['shell', 'chart', 'W3'].includes(s.workflow))).toBe(true);
    expect(release.specVersion).toBe(id);
    expect(await ehr.check({ specVersion: id, program: p, prev: p, canonical: release.canonical })).toBe('ok');
  });
  it.each(['id', 'owner', 'role'])('keeps fork %s immutable', key => {
    expect(() => applyToProgram(tinyProgram, [{ op: 'replace', path: `/${key}`,
      value: key === 'role' ? 'np' : 'someone-else' }], { version: 2 })).toThrow(`metadata: ${key}`);
  });
});
