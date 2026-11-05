import { withData } from "./data.js";
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
    expect(p.screens).toHaveLength(10);
    expect(p.screens.filter(s => s.workflow === 'chart').map(s => s.id).sort()).toEqual(['chartHistory', 'chartSummary']);
    expect(p.screens.every(s => ['shell', 'chart', 'W3'].includes(s.workflow))).toBe(true);
    expect(release.specVersion).toBe(id);
    expect(await ehr.check({ specVersion: id, program: p, prev: p, canonical: release.canonical })).toBe('ok');
  });
  it.each(['id', 'owner', 'role'])('keeps fork %s immutable', key => {
    expect(() => applyToProgram(tinyProgram, [{ op: 'replace', path: `/${key}`,
      value: key === 'role' ? 'np' : 'someone-else' }], { version: 2 })).toThrow(`metadata: ${key}`);
  });
});
withData("runs/world/2").it('all fifteen certified role presets bind the exact program hash and active release',async()=>{
 const {loadWorld}=await import('../src/world.js');const {assertCertified}=await import('../src/certification.js');
 const {tmp}=await import('./helpers.js');const {REPO_ROOT}=await import('../src/util.js');const path=await import('node:path');
 const world=await loadWorld(path.join(REPO_ROOT,'runs/world/2')), ehr=createEhr({fake:false}), out=await tmp('role-hashes');
 for(const id of ['v1','v2','v3']){
 const release=await loadRelease(id,ehr);
 for(const persona of ['P1','P2','P3','P4','P5']){
 const preset=release.personaCanonicals?.[persona],params=world.personas.get(persona);if(!preset||!params)throw new Error('Missing role');
 const program=personalize(preset,params,world.userId(persona));
 const result=await ehr.deploy({specVersion:id,program,prev:program,canonical:preset,outDir:path.join(out,id,persona)});
 expect(result.deployed).toBe(true);if(result.deployed)expect(()=>assertCertified(program,result.certificate,id,'real')).not.toThrow();
 }
 }
});
