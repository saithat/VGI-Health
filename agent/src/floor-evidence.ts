/** Reporting only: bound train schedules, recorded metrics and their ideal floor.
 * Never loads schedules/results or consults validation/test evidence.
 */
import { zeroCost, addCost, actions, type Cost } from '../../app/src/dashboard/benefit-metrics.mjs';
import { expandProgram } from './composites.js';
import { componentById, gotoOf, isBackButton } from './program.js';
import type { TrainDay } from './observe.js';
import type { Program, TraceEvent } from './schema.js';

const categories = ['navigation', 'scrolling', 'alertAcknowledgments', 'entrySteps', 'unattributed'] as const;
type Category = typeof categories[number];
const emptyParts = () => Object.fromEntries(categories.map(k => [k, zeroCost()]));
const opMs: Record<string, number> = { key:200, point:1100, click:100, think:1350, scan:1500, wait:60000, scroll:1100 };
const device = (op:string) => op === 'key' ? 'key' : ['point','click','scroll'].includes(op) ? 'mouse' : null;

function traceParts(trace:readonly TraceEvent[], program:Program|undefined) {
  const parts = emptyParts();
  const comps = program ? componentById(expandProgram(program)) : new Map();
  let hand:string|null = null;
  for (const row of trace) {
    const e = row.event;
    const comp = 'click' in e ? comps.get(e.click.comp)?.component : undefined;
    const category:Category = 'scroll' in e ? 'scrolling' : 'ack' in e ? 'alertAcknowledgments'
      : 'selectTab' in e || 'search' in e || ('enter' in e && e.enter.comp==='workspace.search') || ('click' in e && (e.click.comp === 'back' || e.click.comp.startsWith('workspace.') || (comp && (gotoOf(comp) || isBackButton(comp))))) ? 'navigation'
      : 'enter' in e || 'confirm' in e || comp ? 'entrySteps' : 'unattributed';
    const cost = parts[category];
    if (!cost) throw Error('Missing trace category');
    const firstDevice = row.ops.map(device).find(x => x !== null);
    cost.clicks += 'scroll' in e ? 0 : 'enter' in e ? row.ops.includes('scan') ? 0 : Math.max(1, row.ops.filter(op=>op==='click').length + Number(firstDevice === 'key')) : 1;
    cost.scrolls += Number('scroll' in e);
    cost.popups += Number('ack' in e);
    for (const op of row.ops) {
      const next = device(op);
      cost.klmDeciSec += ((opMs[op] ?? 0) + (hand && next && hand !== next ? 400 : 0)) / 100;
      hand = next ?? hand;
    }
  }
  return parts;
}

export function workflowFloorGaps(persona:string, current:Program, days:readonly TrainDay[], programs:ReadonlyMap<number,Program>) {
  const groups = new Map<string, {tasks:number;completed:number;paired:number;actual:Cost;floor:Cost;parts:ReturnType<typeof emptyParts>}>();
  for (const d of days) {
    // Fail closed for accidental measurement-day inputs and unscheduled tasks.
    if (d.result.day % 2 === 0 || d.schedule.day !== d.result.day || d.schedule.persona !== persona || d.result.persona !== persona) continue;
    const schedule = new Map(d.schedule.tasks.map(t=>[t.id,t]));
    const floors = new Map(d.result.floor.map(t=>[t.task,t]));
    const traces = new Map<string,TraceEvent[]>();
    for (const row of d.result.trace) {
      const rows = traces.get(row.task) ?? []; rows.push(row); traces.set(row.task,rows);
    }
    const program = programs.get(d.result.programVersion) ?? (current.version === d.result.programVersion ? current : undefined);
    for (const t of d.result.tasks) {
      const scheduled = schedule.get(t.task);
      if (!scheduled) continue;
      const g = groups.get(scheduled.workflow) ?? {tasks:0,completed:0,paired:0,actual:zeroCost(),floor:zeroCost(),parts:emptyParts()};
      groups.set(scheduled.workflow,g); g.tasks++; g.completed += Number(t.completed);
      const floor = floors.get(t.task);
      if (!t.completed || !floor?.completed) continue;
      g.paired++; addCost(g.actual,t); addCost(g.floor,floor);
      const parts = traceParts(traces.get(t.task) ?? [],program);
      const attributed = Object.values(parts).reduce(addCost,zeroCost());
      // Use measured scrolling counts; operator time need not scale with pixels.
      // Keep active-service/rounding residuals separate, not inferred from clocks.
      const residual = parts['unattributed'];
      if (!residual) throw Error('Missing residual category');
      for (const key of ['clicks','scrolls','klmDeciSec','popups'] as const) residual[key] += t[key] - attributed[key];
      const scrolling = parts['scrolling'];
      if (scrolling) { scrolling.scrolls += residual.scrolls; residual.scrolls = 0; }
      for (const key of categories) {
        const a = g.parts[key], b = parts[key]; if (a && b) addCost(a,b);
      }
    }
  }
  return [...groups].map(([workflow,g]) => {
    const gap = {clicks:g.actual.clicks-g.floor.clicks,scrolls:g.actual.scrolls-g.floor.scrolls,klmDeciSec:g.actual.klmDeciSec-g.floor.klmDeciSec};
    return {workflow,tasks:g.tasks,completed:g.completed,paired:g.paired,actual:g.actual,floor:g.paired ? g.floor : null,gap:g.paired ? gap : null,
      breakdown:g.paired ? categories.map(category=>{
        const actual=g.parts[category] ?? zeroCost();
        // Floor has no navigation/scrolls; each required ack costs M+P+C.
        const floor = category==='alertAcknowledgments' ? {clicks:g.floor.popups,scrolls:0,klmDeciSec:g.floor.popups*25.5,popups:g.floor.popups}
          : category==='entrySteps' ? {clicks:g.floor.clicks-g.floor.popups,scrolls:g.floor.scrolls,klmDeciSec:g.floor.klmDeciSec-g.floor.popups*25.5,popups:0} : zeroCost();
        return {category,actual,floor,gap:{clicks:actual.clicks-floor.clicks,scrolls:actual.scrolls-floor.scrolls,klmDeciSec:Math.round((actual.klmDeciSec-floor.klmDeciSec)*10)/10}};
      }) : []};
  }).sort((a,b)=>actions(b.gap ?? zeroCost())-actions(a.gap ?? zeroCost()) || (b.gap?.klmDeciSec??0)-(a.gap?.klmDeciSec??0) || a.workflow.localeCompare(b.workflow));
}
