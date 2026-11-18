import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { defaultScreenMode, recordedScreenGate } from '../src/screen-mode.js';

describe('run-days screen gate default', () => {
  const base = { resume: false, archive: false, generatorOnly: false };
  it('drives the Lean page layout unless browser screens are chosen', () => {
    expect(defaultScreenMode(base)).toBe('lean');
    expect(defaultScreenMode({ ...base, screens: 'browser' })).toBe('browser');
    expect(defaultScreenMode({ ...base, screens: 'lean' })).toBe('lean');
    expect(() => defaultScreenMode({ ...base, screens: 'react' })).toThrow();
  });
  it('keeps a resumed run on its recorded gate, legacy runs on browser', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'screen-mode-'));
    await writeFile(path.join(dir, 'legacy.json'), JSON.stringify({ createdAt: 'x' }));
    await writeFile(path.join(dir, 'lean.json'), JSON.stringify({ screenGate: 'lean' }));
    expect(await recordedScreenGate(path.join(dir, 'legacy.json'))).toBe('browser');
    expect(await recordedScreenGate(path.join(dir, 'lean.json'))).toBe('lean');
    expect(await recordedScreenGate(path.join(dir, 'absent.json'))).toBeUndefined();
    expect(defaultScreenMode({ ...base, resume: true, recordedGate: 'browser' })).toBe('browser');
  });
  it('requires an explicit browser gate for archive and generator-only runs', () => {
    expect(() => defaultScreenMode({ ...base, archive: true })).toThrow('--screens browser');
    expect(() => defaultScreenMode({ ...base, generatorOnly: true })).toThrow('--screens browser');
    expect(defaultScreenMode({ ...base, archive: true, screens: 'browser' })).toBe('browser');
  });
});
