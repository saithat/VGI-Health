import type {RunData} from './data';
export function WorkloadClock({run,persona}:{run:RunData;persona:string}) {
  const days=run.days.filter(d=>d.persona===persona&&(!run.manifest.measurementProtocol||d.day%2===0));
  const measured=days.flatMap(d=>d.workload?[d.workload]:[]);
  if(!measured.length) return <p>Queue and shift measurements are unavailable for this recording.</p>;
  const sum=(key:'queueDelayMs'|'overtimeMs'|'tasksCarriedOver'|'overdueScheduledDoses'|'resultResponseMs'|'resultsResponded')=>measured.reduce((n,d)=>n+d[key],0);
  const n=measured.reduce((n,d)=>n+d.timings.filter(t=>t.startMs!==undefined).length,0);
  const results=sum('resultsResponded');
  const mins=(ms:number)=> (ms/60000).toFixed(1);
  return <section aria-label="Workload clock measurements">
    <h3>Queues and shift boundaries</h3>
    <table><thead><tr><th>Measured schedules</th><th>Mean queue delay (min)</th><th>Overdue scheduled doses</th><th>Mean result response (min)</th><th>Overtime (min)</th><th>Tasks handed over</th></tr></thead>
      <tbody><tr><td>{measured.length}/{days.length}</td><td>{n?mins(sum('queueDelayMs')/n):'Unavailable'}</td>
        <td>{sum('overdueScheduledDoses')}</td><td>{results?mins(sum('resultResponseMs')/results):'Unavailable'}</td>
        <td>{mins(sum('overtimeMs'))}</td><td>{sum('tasksCarriedOver')}</td></tr></tbody></table>
    <p>Continuous workload v1. Queue delay starts at max(arrival, ready); result response ends at completed task documentation.
      Overdue doses use documentation finish against each distinct MAR occurrence window, including carried work at the coverage horizon.
      Overtime covers active work beyond its assigned shift. Handovers include waiting work transferred to successor coverage.
      {measured.some(d=>d.pending.length>0)?' Unfinished source tasks remain pending at the coverage horizon.':''}</p>
  </section>;
}
