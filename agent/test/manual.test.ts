import { RELEASE_IDS } from '../src/release-config.js';
import { capabilitiesManual, formalRuleContext, promptContext } from '../src/manual.js';
import { sha256 } from '../src/program.js';
import { createEhr } from '../src/ehr.js';
import { loadRelease, releaseForPersona } from '../src/releases.js';

it('generates the core manual and persona rules from active formal sources with reproducible hashes', async () => {
  const release = await releaseForPersona(await loadRelease(RELEASE_IDS.base, createEhr({ fake: false })), 'P3');
  const c = promptContext(release.spec, release.canonical);
  expect(c.manualHash).toBe(sha256(capabilitiesManual()));
  expect(c.ruleContextHash).toBe(sha256(formalRuleContext(release.spec, release.canonical)));
  expect(c.manual).toContain('One canonical');
  expect(c.manual).toContain('Catalog additions are switched off');
  expect(c.manual).toContain('Property 12');
  expect(c.manual).toContain('D5');
  expect(c.manual).toContain('accepted by checker (historical full-profile run1-P3');
  expect(c.manual).toContain('rejected (historical full-profile run1-P3');
  expect(c.rules).toContain('administerMed');
  expect(c.rules).toContain('Hospital policy');
  expect(c.rules).not.toContain('"commit":"signOrders"');
  expect(c.rules).toContain('human-only');
});
