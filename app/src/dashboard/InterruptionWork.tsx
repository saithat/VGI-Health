import type { DayResult } from './agent-evidence';
import { interruptionTotals } from './interruptions';

export function InterruptionWork({ days, persona }: { days: readonly DayResult[]; persona: string }) {
  const m = interruptionTotals(days, persona);
  return <section aria-label="Interrupting work">
    <h3>Interrupting work</h3>
    {m ? <>
      <p>{m.handled} handled ({m.essential} essential care) · {m.deferred} deferred · {m.handedOver} handed over · {m.abandoned} abandoned drafts</p>
      <p>{Math.round(m.workMs / 1000)} s communication work · {Math.round(m.reorientationMs / 1000)} s reorientation · mean return delay {m.meanResumptionDelayMs === null ? 'unavailable' : `${Math.round(m.meanResumptionDelayMs / 1000)} s`}</p>
      <p>{m.revalidationPrevented} stale evidence or confirmations invalidated. This is a prevention proxy, not observed clinical errors.</p>
      <p>Coverage: {m.measuredTasks}/{m.totalTasks} tasks, including incomplete tasks. Rates and timing are provisional simulation assumptions.</p>
    </> : <p>Interruption work was not measured in these recorded tasks.</p>}
  </section>;
}
