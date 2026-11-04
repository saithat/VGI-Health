import type { DaySchedule } from './schema.js';
/** v1 lacks the v2 orderKind/orderCode captures. Select by clinical type,
 * before observing performance, and retain each selected task unchanged. */
export function primaryV1Schedule(schedule:DaySchedule):DaySchedule {
  const workflow=schedule.persona==='P1'?'W1':schedule.persona==='P2'?'W3':null;
  if(!workflow)throw Error('Offline comparison supports P1/P2');
  const tasks=schedule.tasks.filter(t=>t.workflow===workflow &&
    (workflow!=='W1' || t.choices.orders.every(o=>!o.kind || o.kind==='medication'))).slice(0,2);
  if(tasks.length!==2)throw Error(`Need two v1-compatible ${workflow} tasks for ${schedule.persona} day ${schedule.day}`);
  return {...schedule,tasks};
}
