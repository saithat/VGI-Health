/** Read-only reporting. Costs use identical task IDs completed in both arms.
 * Floor coverage is explicit; missing/nonpositive headroom is unavailable.
 * Shared by the run report and dashboard; kept here to preserve the app binding.
 */
export const costKeys = ['clicks', 'scrolls', 'klmDeciSec', 'popups'];
export const zeroCost = () => ({ clicks: 0, scrolls: 0, klmDeciSec: 0, popups: 0 });
export function addCost(a, b) {
  for (const key of costKeys) a[key] += b[key];
  return a;
}
export const actions = (m) => m.clicks + m.scrolls;
const pct = (n, d) => d > 0 ? 100 * n / d : null;

export function compareDays(pairs) {
  const before = zeroCost(), after = zeroCost(), floor = zeroCost();
  const completion = { before: { tasks: 0, completed: 0 }, after: { tasks: 0, completed: 0 } };
  const failures = [], missingBefore = [], missingAfter = [];
  let paired = 0, floorTasks = 0;
  for (const { before: b, after: a } of pairs) {
    if (b.day !== a.day || b.persona !== a.persona) throw Error('Comparison day/persona mismatch');
    for (const [side, day] of [['before', b], ['after', a]]) {
      const ids = new Set();
      for (const task of day.tasks) {
        if (ids.has(task.task)) throw Error(`Duplicate task ${task.task}`);
        ids.add(task.task);
        completion[side].tasks++;
        completion[side].completed += Number(task.completed);
        if (!task.completed) failures.push({ side, day: day.day, task: task.task });
      }
    }
    const bm = new Map(b.tasks.map(t => [t.task, t])), am = new Map(a.tasks.map(t => [t.task, t]));
    const fm = new Map(b.floor.map(t => [t.task, t]));
    for (const t of b.tasks) if (!am.has(t.task)) missingAfter.push({ day: b.day, task: t.task });
    for (const t of a.tasks) {
      const control = bm.get(t.task);
      if (!control) missingBefore.push({ day: a.day, task: t.task });
      if (!t.completed || !control?.completed) continue;
      paired++;
      addCost(before, control); addCost(after, t);
      const f = fm.get(t.task);
      if (f?.completed) { floorTasks++; addCost(floor, f); }
    }
  }
  const saving = Object.fromEntries(costKeys.map(k => [k, before[k] - after[k]]));
  const covered = paired > 0 && floorTasks === paired;
  return { before, after, floor: covered ? floor : null, completion, paired, floorTasks, failures, missingBefore, missingAfter, saving,
    savedPct: { actions: pct(actions(saving), actions(before)), klmDeciSec: pct(saving.klmDeciSec, before.klmDeciSec) },
    alertSharePct: pct(saving.popups, actions(saving)),
    effortVsFloor: { before: covered && actions(floor) > 0 ? actions(before) / actions(floor) : null, after: covered && actions(floor) > 0 ? actions(after) / actions(floor) : null },
    gapCapturedPct: { actions: covered ? pct(actions(saving), actions(before) - actions(floor)) : null,
      klmDeciSec: covered ? pct(saving.klmDeciSec, before.klmDeciSec - floor.klmDeciSec) : null },
  };
}
