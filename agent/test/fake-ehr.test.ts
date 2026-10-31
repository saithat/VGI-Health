/** Sanity of the FAKE ehr fixtures the other tests rely on (not a test of the real checker). */
import { fakeCheck } from '../src/fake/ehr-fake.js';
import { fakeCanonical } from '../src/fake/fixtures.js';
import { applyToProgram } from '../src/program.js';
import { buildSeeded, rejectionKind, SEEDED_ORDER } from '../src/seeded.js';
import { fakeSpec } from '../src/fake/fixtures.js';
import { toCheckResult } from '../src/night.js';

describe('fake ehr fixtures', () => {
  it('canonical programs pass their own spec; the old canonical fails v2 with a counterexample', () => {
    for (const v of ['v1', 'v1.1', 'v2']) {
      const c = fakeCanonical(v);
      expect(fakeCheck({ specVersion: v, program: c, prev: c, canonical: c })).toBe('ok');
    }
    const v1 = fakeCanonical('v1');
    const verdict = fakeCheck({ specVersion: 'v2', program: v1, prev: v1, canonical: fakeCanonical('v2') });
    expect(verdict).not.toBe('ok');
    expect(toCheckResult(verdict).counterexample?.length).toBeGreaterThan(0);
  });

  it('each tempting-but-unsafe move is rejected under the property it should violate', () => {
    const canon = fakeCanonical('v1');
    const spec = fakeSpec('v1');
    for (const kind of SEEDED_ORDER) {
      const c = buildSeeded(kind, canon, spec);
      expect(c, kind).not.toBeNull();
      if (!c) continue;
      expect(c.seeded).toBe(true);
      const { program } = applyToProgram(canon, c.patch, { version: 1 });
      const check = toCheckResult(fakeCheck({ specVersion: 'v1', program, prev: canon, canonical: canon }));
      expect(check.status, kind).toBe('fail');
      expect(rejectionKind(check)).toBe(kind);
    }
  });
});
