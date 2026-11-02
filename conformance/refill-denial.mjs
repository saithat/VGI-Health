import { assert } from './driver.mjs';
import { personaCommits, roles, context, facts, code } from './clinical.mjs';

/** Separate action/decision combinations must not bypass the denial reason. */
export const refillDenialScenario = {
  id: 'refill.denial-via-approval-action',
  rule: 'Core refill denial reason across every action route',
  expected: 'A deny decision cannot complete through approveRefill without a reason; dedicated denial with a reason and ordinary approval remain possible',
  intent: { commit: 'approveRefill', element: 'refillDecision', value: 'deny', omit: 'refillDenyReason' },
  applies: t => (personaCommits[t.persona] ?? Object.keys(roles).filter(c => roles[c].includes(t.program.role))).includes('approveRefill'),
  run(f) {
    const ctx = context('approveRefill', { facts: facts({ medToGive: 'metformin', record: [['requestMedication', 'metformin'], ['requestQuantity', '30']] }) });
    const d = f.prefix(ctx);
    d.enter('refillDecision', code('deny'));
    assert(!d.capture('refillDenyReason')?.confirmed, 'Fixture must not supply a denial reason');
    let result = d.clickCommit('approveRefill');
    for (let n = 0; d.state.popup && n < 30; n++) {
      d.step({ ack: { alert: d.state.popup[0] } }, 'acknowledge unrelated alert before retrying denial bypass');
      result = d.clickCommit('approveRefill');
    }
    assert(!d.state.commits.includes('approveRefill'), 'Deny decision completed through approveRefill with no denial reason');
    assert(result?.blocked, `Denial bypass was not refused: ${JSON.stringify(result)}`);
    d.enter('refillDenyReason', code('needs-visit')); d.finish('denyRefill');
    const ordinary = f.prefix(ctx); ordinary.finish('approveRefill');
    return { d, observed: 'Denial bypass refused; reasoned denial and ordinary approval completed' };
  },
};
