import { describe, expect, it } from 'vitest';
import { interruptionTotals } from '../src/dashboard/interruptions';
import { dayResultSchema, type DayResult } from '../src/dashboard/agent-evidence';

const metadata = {
  model: 'interrupting-work-v1', profile: 'wardNurse', ratePerHourMilli: 5500, exposureMinutes: 6, offered: [], closureWaitMs: 0, idle: [], reorientations: [],
  handled: 2, deferred: 1, workMs: 80000, resumptionDelayMs: 45000, reorientationMs: 5000,
  revalidationPrevented: 1, abandoned: 0, handoffs: [],
  work: [{ work: { id: 'call', patient: 'B', kind: 'page', urgency: 'urgent', arrivedAtMs: 0, essential: true, message: 'Care-team call' },
    startedAtMs: 1000, completedAtMs: 40000, deferred: false,
    steps: ['identifyPatient', 'readMessage', 'assess', 'reply', 'document'], outcome: 'responded', completed: true }],
  frames: [{ task: 'A-task', owner: 'clinician', patient: 'A', suspendedAtMs: 1000, closedAtMs: 46000,
    disposition: 'resumed', reason: 'returned after revalidation' }],
};
function sample(interruptions?: unknown): DayResult {
  return dayResultSchema.parse({ day: 1, persona: 'P1', programVersion: 0, trace: [], floor: [], complaints: [],
    tasks: [{ task: 'A-task', completed: false, clicks: 1, keystrokes: 0, scrolls: 0, popups: 0,
      overrides: 0, searches: 0, backtracks: 0, klmDeciSec: 100,
      ...(interruptions ? { interruptions } : {}) }] });
}
describe('interruption measurement data', () => {
  it('preserves native typed work through the shared day schema', () => {
    expect(sample(metadata).tasks[0]?.interruptions).toEqual(metadata);
  });
  it('retains clock-driven channel service and explicit recipient acceptance', () => {
    const handoffs=[{task:'call',patient:'B',sender:'clinician',recipient:'on-call',offeredAtMs:40000,acceptedAtMs:41000,reason:'clinical follow-through'}];
    const measured={...metadata,model:'interrupting-work-v3',handoffs,
      work:metadata.work.map(w=>({...w,work:{...w.work,serviceMs:39000}}))};
    expect(sample(measured).tasks[0]?.interruptions).toEqual(measured);
    const {handoffs: omitted,...historical}=metadata;
    expect(omitted).toEqual([]);
    expect(sample(historical).tasks[0]?.interruptions?.handoffs).toEqual([]);
  });
  it('distinguishes historical absence from measured zero and includes failed tasks', () => {
    expect(interruptionTotals([sample()], 'P1')).toBeNull();
    expect(interruptionTotals([sample(metadata), sample()], 'P1')).toMatchObject({
      handled: 2, deferred: 1, measuredTasks: 1, totalTasks: 2, meanResumptionDelayMs: 45000, essential: 1,
    });
    expect(interruptionTotals([sample(metadata)], 'P2')).toBeNull();
    expect(interruptionTotals([sample({ ...metadata, handled: 0, work: [], frames: [], resumptionDelayMs: 0 })], 'P1'))
      .toMatchObject({ handled: 0, meanResumptionDelayMs: null });
  });
  it('rejects unknown work types and malformed timing values', () => {
    expect(() => sample({ ...metadata, workMs: -1 })).toThrow();
    expect(() => sample({ ...metadata, work: [{ ...metadata.work[0], work: { ...metadata.work[0]?.work, kind: 'noise' } }] })).toThrow();
  });
});
