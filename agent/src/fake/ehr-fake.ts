import { RELEASE_IDS } from '../release-config.js';
/**
 * FAKE `ehr` (EHR_FAKE=1): FOR TESTS AND OFFLINE SMOKE RUNS ONLY.
 *
 * Returns plausible, deterministic outputs in the real formats so the agent
 * loop can be exercised before the Lean CLI exists. Its "checker" is a handful
 * of structural heuristics and its "simulator" is a crude cost model. It is
 * not the verified checker, proves nothing, and its certificates say
 * `checkerVersion: "FAKE"`. Never deploy anything it approves.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CheckInput, DeployInput, DeployResult, EhrClient, MinClicksInput, RenderInput, SimulateInput } from '../ehr.js';
import {
  type Component, type DayResult, type DaySchedule, type ElementSpec, type Event, type MinClicksResult, type PersonaParams,
  type Program, type Screen, type Spec, type TaskMetrics, type TraceEvent, type Verdict,
} from '../schema.js';
import { isRecord } from '../jsonpatch.js';
import {
  commitOf, componentsMoved, fieldElement, gotoOf, infoOf, kindPayload, kindTag, markReviewedOf, programHash, sha256,
} from '../program.js';
import { hash32, rng } from '../util.js';
import { fakeCanonical, fakeSpec } from './fixtures.js';

export function createFakeEhr(): EhrClient {
  return {
    mode: 'fake',
    binary: null,
    check: async (i) => fakeCheck(i),
    simulate: async (i) => fakeSimulate(i),
    minClicks: async (i) => fakeMinClicks(i),
    deploy: async (i) => fakeDeploy(i),
    runBatch: async (cases) => cases.map((_, i) => ({ case: i, fake: true })),
    renderScreens: async (i) => fakeRenderScreens(i),
    specExport: async (v) => fakeSpec(v),
  };
}

// ---------------------------------------------------------------- structure helpers
function screenMap(p: Program): Map<string, Screen> {
  return new Map(p.screens.map((s) => [s.id, s]));
}

/** Shortest goto path (as button clicks) from the start screen to every reachable screen. */
function pathsFromStart(p: Program): Map<string, Event[]> {
  const screens = screenMap(p);
  const paths = new Map<string, Event[]>([[p.start, []]]);
  const queue = [p.start];
  while (queue.length > 0) {
    const sid = queue.shift() ?? '';
    const s = screens.get(sid);
    if (!s) continue;
    for (const comp of s.components) {
      const target = gotoOf(comp);
      if (target && !paths.has(target) && screens.has(target)) {
        paths.set(target, [...(paths.get(sid) ?? []), { click: { comp: comp.id } }]);
        queue.push(target);
      }
    }
  }
  return paths;
}

function isShown(comp: Component, screen: Screen): boolean {
  if (comp.size === 'tiny') return false;
  const byId = new Map(screen.components.map((x) => [x.id, x]));
  let cur: Component | undefined = comp;
  let guard = 0;
  while (cur?.parent && guard++ < 32) {
    const parent = byId.get(cur.parent);
    if (!parent) return false;
    if (kindTag(parent.kind) === 'tabs' && cur.tab !== 0) return false;
    if (kindTag(parent.kind) === 'group' && kindPayload(parent.kind)?.['startCollapsed'] === true) return false;
    cur = parent;
  }
  return true;
}

function prefillOf(comp: Component): unknown {
  return kindPayload(comp.kind)?.['prefill'] ?? 'none';
}

function elementSpec(spec: Spec, id: string): ElementSpec | undefined {
  return spec.elements.find((e) => e.id === id);
}

function isHumanOnly(e: ElementSpec | undefined): boolean {
  if (!e) return false;
  return e.humanOnly || e.kind === 'identity' || e.kind === 'cosign' || (isRecord(e.kind) && 'scan' in e.kind);
}

function violation(property: string, message: string, counterexample: Event[], screens: string[]): Verdict {
  return { violation: { property, message, counterexample, screens } };
}

// ---------------------------------------------------------------- check
export function fakeCheck(i: CheckInput): Verdict {
  const spec = fakeSpec(i.specVersion);
  const p = i.program;
  const screens = screenMap(p);
  const paths = pathsFromStart(p);
  const pathTo = (sid: string): Event[] => paths.get(sid) ?? [];

  // wellFormed: start exists, banner landmark on every screen, catalog kinds, parents, goto targets.
  if (!screens.has(p.start)) return violation('WellFormed', `start screen ${p.start} does not exist`, [], []);
  for (const s of p.screens) {
    if (!s.components.some((x) => kindTag(x.kind) === 'banner' && isShown(x, s))) {
      return violation('WellFormed', `patient banner landmark missing on ${s.id}`, pathTo(s.id), [s.id]);
    }
    for (const comp of s.components) {
      if (!spec.design.catalog.includes(kindTag(comp.kind))) {
        return violation('WellFormed', `component ${comp.id} has kind ${kindTag(comp.kind)} outside the catalog`, pathTo(s.id), [s.id]);
      }
      if (comp.parent && !s.components.some((x) => x.id === comp.parent)) {
        return violation('WellFormed', `component ${comp.id} has parent ${comp.parent} not on ${s.id}`, pathTo(s.id), [s.id]);
      }
      const target = gotoOf(comp);
      if (target && !screens.has(target)) return violation('WellFormed', `button ${comp.id} goes to missing screen ${target}`, pathTo(s.id), [s.id]);
    }
  }

  // writesOnly: fields only for spec elements.
  for (const s of p.screens) {
    for (const comp of s.components) {
      const el = fieldElement(comp);
      if (el && !elementSpec(spec, el) && el !== 'visitDiagnosis') {
        return violation('WritesOnly', `field ${comp.id} writes element ${el}, which is not in spec ${spec.version}`, pathTo(s.id), [s.id]);
      }
    }
  }

  // humanOnlyKept: never prefill human-only elements; macros never do human-only steps or commits.
  for (const s of p.screens) {
    for (const comp of s.components) {
      const el = fieldElement(comp);
      if (!el) continue;
      const es = elementSpec(spec, el);
      if ((isHumanOnly(es) || es?.prefill === 'never') && prefillOf(comp) !== 'none') {
        return violation('HumanOnlyKept', `${es?.label ?? el} (${comp.id}) is pre-filled, but it must be entered by a human every time`,
          [...pathTo(s.id), { confirm: { comp: comp.id } }, ...commitClicks(s)], [s.id]);
      }
    }
  }
  const allComps = new Map(p.screens.flatMap((s) => s.components.map((x) => [x.id, { comp: x, screen: s }] as const)));
  for (const m of p.macros) {
    for (const step of m.steps) {
      const compId = 'setValue' in step ? step.setValue.comp : 'click' in step ? step.click.comp : null;
      const found = compId ? allComps.get(compId) : undefined;
      if (!found) continue;
      const el = fieldElement(found.comp);
      if ('setValue' in step && el && isHumanOnly(elementSpec(spec, el))) {
        return violation('HumanOnlyKept', `macro ${m.id} fills human-only element ${el}`, [...pathTo(found.screen.id)], [found.screen.id]);
      }
      if ('click' in step && commitOf(found.comp)) {
        return violation('HumanOnlyKept', `macro ${m.id} performs the commit ${commitOf(found.comp) ?? ''}`, [...pathTo(found.screen.id)], [found.screen.id]);
      }
    }
  }

  // units: weight (kg) never pre-filled from an lb source.
  for (const s of p.screens) {
    for (const comp of s.components) {
      const el = fieldElement(comp);
      const es = el ? elementSpec(spec, el) : undefined;
      if (!es || !isRecord(es.kind) || !('quantity' in es.kind)) continue;
      const pf = JSON.stringify(prefillOf(comp));
      if (/lb/i.test(pf)) {
        return violation('UnitsRight', `${es.label} (${comp.id}) can be filled from a pound value (${pf}); weight must be kg`,
          [...pathTo(s.id), { confirm: { comp: comp.id } }, ...commitClicks(s)], [s.id]);
      }
    }
  }

  // completable: every commit the canonical offers is still reachable.
  const canonicalCommits = new Set(i.canonical.screens.flatMap((s) => s.components.flatMap((x) => (commitOf(x) ? [commitOf(x) ?? ''] : []))));
  const reachableCommits = new Set<string>();
  for (const s of p.screens) {
    if (!paths.has(s.id)) continue;
    for (const comp of s.components) {
      const cm = commitOf(comp);
      if (cm && isShown(comp, s)) reachableCommits.add(cm);
    }
  }
  for (const cm of canonicalCommits) {
    if (!reachableCommits.has(cm)) return violation('Completable', `commit ${cm} is not reachable from ${p.start}`, [], []);
  }

  // reviewsBeforeCommit: required info shown on each commit screen (receipt-conditional allowed for shownOrReceipt).
  for (const s of p.screens) {
    for (const btn of s.components) {
      const cm = commitOf(btn);
      if (!cm) continue;
      for (const r of spec.reviews) {
        if (r.commit !== cm || !reviewApplies(r.when, s, spec, cm)) continue;
        const shown = s.components.some((x) => infoOf(x) === r.info && isShown(x, s) &&
          (x.visibility === 'always' || r.mode !== 'shownOnCommit'));
        if (!shown) {
          const label = spec.infos.find((x) => x.id === r.info)?.label ?? r.info;
          return violation('ReviewsBeforeCommit', `${label} is not shown on ${s.title} before "${cm}" (collapsed, in an unopened tab, tiny, or missing)`,
            [...pathTo(s.id), { click: { comp: btn.id } }], [s.id]);
        }
      }
    }
  }

  // capturesAllOnce: v3 abx indication captured on every sign-orders workflow; no element asked twice on a workflow.
  for (const e of spec.entries) {
    if (e.element !== 'abxIndication') continue;
    for (const s of p.screens) {
      const btn = s.components.find((x) => commitOf(x) === e.commit);
      if (!btn) continue;
      const wf = p.screens.filter((x) => x.workflow === s.workflow);
      if (!wf.some((x) => x.components.some((y) => fieldElement(y) === e.element && isShown(y, x)))) {
        return violation('CapturesAllOnce', `${e.element} is not captured on workflow ${s.workflow} before "${e.commit}"`,
          [...pathTo(s.id), { click: { comp: btn.id } }], [s.id]);
      }
    }
  }
  const byWorkflow = new Map<string, Map<string, string>>();
  for (const s of p.screens) {
    const seen = byWorkflow.get(s.workflow) ?? new Map<string, string>();
    byWorkflow.set(s.workflow, seen);
    for (const comp of s.components) {
      const el = fieldElement(comp);
      if (!el || comp.copyOf) continue;
      const prev = seen.get(el);
      if (prev && prefillOf(comp) === 'none') {
        return violation('CapturesAllOnce', `${el} is asked twice on workflow ${s.workflow} (${prev}, ${comp.id})`, pathTo(s.id), [s.id]);
      }
      seen.set(el, comp.id);
    }
  }

  // A4: passive alerts never pop up. A1: interruptive alerts keep their popup.
  for (const s of p.screens) {
    for (const comp of s.components) {
      if (kindTag(comp.kind) !== 'alert') continue;
      const a = spec.alerts.find((x) => x.id === kindPayload(comp.kind)?.['alert']);
      const popup = kindPayload(comp.kind)?.['popup'] === true;
      if (a?.tier === 'passive' && popup) return violation('SeverityTiers', `passive alert ${a.id} turned into a popup on ${s.id}`, pathTo(s.id), [s.id]);
    }
  }
  for (const s of i.canonical.screens) {
    for (const comp of s.components) {
      if (kindTag(comp.kind) !== 'alert') continue;
      const id = kindPayload(comp.kind)?.['alert'];
      const a = spec.alerts.find((x) => x.id === id);
      if (a?.tier !== 'interruptive') continue;
      const kept = p.screens.some((ps) => ps.workflow === s.workflow && ps.components.some((x) =>
        kindTag(x.kind) === 'alert' && kindPayload(x.kind)?.['alert'] === id && kindPayload(x.kind)?.['popup'] === true));
      if (!kept) return violation('AlertsFire', `interruptive alert ${a.id} no longer pops up on workflow ${s.workflow}`, pathTo(s.id), [s.id]);
    }
  }

  // budgets: stability.
  const moved = componentsMoved(i.prev, p);
  if (moved > spec.design.stabilityBudget) {
    return violation('WithinBudgets', `${moved} components moved; the stability budget is ${spec.design.stabilityBudget}`, [], []);
  }
  return 'ok';
}

function commitClicks(s: Screen): Event[] {
  return s.components.filter((x) => commitOf(x)).slice(0, 1).map((x) => ({ click: { comp: x.id } }));
}

function reviewApplies(when: Spec['reviews'][number]['when'], s: Screen, spec: Spec, commit: string): boolean {
  if (when === 'always') return true;
  if (when === 'abnormalResult') return commit === 'ackResult';
  if (isRecord(when) && 'medClass' in when) return spec.version === RELEASE_IDS.migration && s.workflow === 'W4';
  return false;
}

// ---------------------------------------------------------------- simulate (crude cost model)
interface Cost { clicks: number; keys: number; scrolls: number; scans: number; thinks: number; waits: number; popups: number; overrides: number; searches: number; backtracks: number }
const zero = (): Cost => ({ clicks: 0, keys: 0, scrolls: 0, scans: 0, thinks: 0, waits: 0, popups: 0, overrides: 0, searches: 0, backtracks: 0 });

/** KLM constants (Card, Moran & Newell 1980) plus labeled assumptions for scan and wait. Deciseconds. */
const KLM = { pointClick: 12, key: 2, scroll: 10, scan: 15, think: 14, wait: 300 };
const klm = (c: Cost): number =>
  c.clicks * KLM.pointClick + c.keys * KLM.key + c.scrolls * KLM.scroll + c.scans * KLM.scan + c.thinks * KLM.think + c.waits * KLM.wait;

interface Ctx {
  spec: Spec;
  program: Program;
  persona: PersonaParams | null; // null = persona-free (min-clicks / floor)
  rand: () => number;
  trace: TraceEvent[] | null;
  taskId: string;
  t: number;
}

function emit(ctx: Ctx, screen: string, event: Event, ops: TraceEvent['ops']): void {
  const add = ops.reduce((acc, op) => acc + (op === 'click' ? KLM.pointClick : op === 'key' ? KLM.key : op === 'scroll' ? KLM.scroll : op === 'scan' ? KLM.scan : op === 'think' ? KLM.think : op === 'wait' ? KLM.wait : 0), 0);
  ctx.t += add;
  ctx.trace?.push({ task: ctx.taskId, t: ctx.t, screen, event, ops, result: 'ok' });
}

function fieldCost(ctx: Ctx, s: Screen, comp: Component, cost: Cost, macroFilled: Set<string>): void {
  const el = fieldElement(comp);
  if (!el || macroFilled.has(comp.id)) return;
  const es = elementSpec(ctx.spec, el);
  const pf = prefillOf(comp);
  const kind = es?.kind;
  if (!isShown(comp, s)) {
    cost.clicks += 1; // open the group / tab first
    emit(ctx, s.id, { click: { comp: comp.parent ?? comp.id } }, ['click']);
  }
  if (kind === 'identity') {
    cost.clicks += 1; cost.keys += 6;
    emit(ctx, s.id, { enter: { comp: comp.id, value: { text: { s: 'AB/F/54' } } } }, ['click', 'key', 'key', 'key', 'key', 'key', 'key']);
  } else if (isRecord(kind) && 'scan' in kind) {
    cost.scans += 1;
    emit(ctx, s.id, { enter: { comp: comp.id, value: { code: { c: 'scan' } } } }, ['scan']);
  } else if (kind === 'cosign') {
    cost.clicks += 1; cost.keys += 8; cost.waits += 1;
    emit(ctx, s.id, { enter: { comp: comp.id, value: { user: { u: 'rn-2' } } } }, ['wait', 'click', 'key', 'key', 'key', 'key', 'key', 'key', 'key', 'key']);
  } else if (pf !== 'none') {
    cost.clicks += 1;
    emit(ctx, s.id, { confirm: { comp: comp.id } }, ['click']);
  } else {
    const keyboard = ctx.persona ? ctx.rand() * 100 < ctx.persona.keyboardShare : true;
    const isText = kind === 'text';
    const keys = isText ? 15 : isRecord(kind) && 'quantity' in kind ? 4 : 3;
    const clicks = keyboard ? 1 : 2;
    cost.clicks += clicks; cost.keys += keys;
    emit(ctx, s.id, { enter: { comp: comp.id, value: { text: { s: 'x' } } } }, [...Array<'click'>(clicks).fill('click'), ...Array<'key'>(keys).fill('key')]);
  }
}

function taskCost(ctx: Ctx, workflow: string, interruptive: boolean): Cost {
  const cost = zero();
  const p = ctx.program;
  const wfScreens = p.screens.filter((s) => s.workflow === workflow);
  const macros = p.macros.filter((m) => m.steps.some((st) => 'goto' in st || 'setValue' in st || 'click' in st));
  const wfIds = new Set(wfScreens.flatMap((s) => s.components.map((x) => x.id)));
  const macroFilled = new Set<string>();
  const macroNav = new Set<string>();
  for (const m of macros) {
    const touches = m.steps.some((st) => ('setValue' in st && wfIds.has(st.setValue.comp)) || ('goto' in st && wfScreens.some((s) => s.id === st.goto.screen)));
    if (!touches) continue;
    for (const st of m.steps) {
      if ('setValue' in st) macroFilled.add(st.setValue.comp);
      if ('goto' in st) macroNav.add(st.goto.screen);
    }
    cost.clicks += 1; // the macro button
  }
  // A toolbar copy of the commit button lets the user commit before the last screen.
  const lastCommitScreen = [...wfScreens].reverse().find((s) => s.components.some((x) => commitOf(x)));
  const commitCopyEarly = wfScreens.some((s) => s !== lastCommitScreen && s.components.some((x) => x.copyOf && commitOf(x)));
  const visit = commitCopyEarly && lastCommitScreen ? wfScreens.filter((s) => s !== lastCommitScreen) : wfScreens;

  for (const s of visit) {
    cost.thinks += 1;
    if (!macroNav.has(s.id)) {
      cost.clicks += 1;
      emit(ctx, s.id, { click: { comp: `goto-${s.id}` } }, ['think', 'click']);
    }
    const n = s.components.length;
    const sc = Math.max(0, Math.floor((n - 9) / 3));
    if (sc > 0) {
      cost.scrolls += sc;
      emit(ctx, s.id, { scroll: { screen: s.id } }, Array<'scroll'>(sc).fill('scroll'));
    }
    for (const comp of s.components) {
      fieldCost(ctx, s, comp, cost, macroFilled);
      const info = infoOf(comp);
      if (info && !isShown(comp, s) && ctx.persona) {
        if (ctx.persona.searchWhenBuried) {
          cost.searches += 1; cost.clicks += 1; cost.keys += 6;
          emit(ctx, s.id, { search: { query: info } }, ['click', 'key', 'key', 'key', 'key', 'key', 'key']);
        } else {
          cost.clicks += 1;
          emit(ctx, s.id, { selectTab: { comp: comp.parent ?? comp.id, idx: comp.tab } }, ['click']);
        }
      }
      const reviewed = markReviewedOf(comp);
      if (reviewed && ctx.persona?.reviewsAllergiesEarly !== false) {
        cost.clicks += 1;
        emit(ctx, s.id, { click: { comp: comp.id } }, ['click']);
      }
      if (kindTag(comp.kind) === 'alert' && kindPayload(comp.kind)?.['popup'] === true) {
        const a = ctx.spec.alerts.find((x) => x.id === kindPayload(comp.kind)?.['alert']);
        const fires = a?.tier === 'removable' ? ctx.persona !== null : a?.tier === 'interruptive' && interruptive;
        if (fires && a) {
          cost.popups += 1; cost.clicks += 1;
          if (ctx.persona && a.tier === 'removable' && ctx.rand() * 1000 < ctx.persona.overrideRate) cost.overrides += 1;
          emit(ctx, s.id, { ack: { alert: a.id } }, ['think', 'click']);
        }
      }
    }
    if (ctx.persona && ctx.rand() * 1000 < ctx.persona.backtrackRate) {
      cost.backtracks += 1; cost.clicks += 2;
      emit(ctx, s.id, { click: { comp: 'back' } }, ['click', 'click']);
    }
  }
  const commitBtn = (commitCopyEarly
    ? wfScreens.flatMap((s) => s.components).find((x) => x.copyOf && commitOf(x))
    : lastCommitScreen?.components.find((x) => commitOf(x)));
  if (commitBtn) {
    cost.clicks += 1;
    emit(ctx, lastCommitScreen?.id ?? workflow, { click: { comp: commitBtn.id } }, ['click']);
  }
  return cost;
}

function toMetrics(task: string, c: Cost): TaskMetrics {
  return {
    task, clicks: c.clicks, keystrokes: c.keys, scrolls: c.scrolls, popups: c.popups, overrides: c.overrides,
    searches: c.searches, backtracks: c.backtracks, klmDeciSec: klm(c), completed: true,
  };
}

function floorCost(spec: Spec, program: Program, workflow: string): Cost {
  const cost = zero();
  for (const s of program.screens.filter((x) => x.workflow === workflow)) {
    for (const comp of s.components) {
      const el = fieldElement(comp);
      const es = el ? elementSpec(spec, el) : undefined;
      if (!isHumanOnly(es)) continue;
      if (es?.kind === 'identity') { cost.clicks += 1; cost.keys += 6; }
      else if (es?.kind === 'cosign') { cost.clicks += 1; cost.keys += 8; cost.waits += 1; }
      else if (es && isRecord(es.kind) && 'scan' in es.kind) cost.scans += 1;
      else cost.clicks += 1;
    }
  }
  cost.clicks += 2; // one clinical choice + the commit
  return cost;
}

function complaintsFor(spec: Spec, program: Program, persona: PersonaParams, schedule: DaySchedule): string[] {
  const out: string[] = [];
  if (!persona.reviewsAllergiesEarly) return out;
  const workflows = new Set<string>(schedule.tasks.map((t) => t.workflow));
  for (const s of program.screens) {
    if (!workflows.has(s.workflow)) continue;
    const reviewedEarlier = program.screens.some((x) => x.workflow === s.workflow && x.components.some((y) => markReviewedOf(y)));
    if (!reviewedEarlier) continue;
    for (const comp of s.components) {
      const info = infoOf(comp);
      if (!info) continue;
      const review = spec.reviews.find((r) => r.info === info && r.mode !== 'shownOnCommit' && s.components.some((b) => commitOf(b) === r.commit));
      if (review && comp.visibility === 'always') {
        out.push(`${info} re-shown on ${s.id} although reviewed earlier this visit (receipt not used: panel is not receipt-conditional)`);
      }
    }
  }
  return out;
}

export function fakeSimulate(i: SimulateInput): DayResult {
  const spec = fakeSpec(i.specVersion);
  const trace: TraceEvent[] = [];
  const tasks: TaskMetrics[] = [];
  const floor: TaskMetrics[] = [];
  let t = 0;
  for (const task of i.schedule.tasks) {
    const rand = rng(hash32(`${i.seed}:${task.id}`));
    const interruptive = rand() < 0.25;
    const ctx: Ctx = { spec, program: i.program, persona: i.persona, rand, trace, taskId: task.id, t: Math.max(t, task.startMin * 600) };
    const cost = taskCost(ctx, task.workflow, interruptive);
    t = ctx.t;
    tasks.push(toMetrics(task.id, cost));
    floor.push(toMetrics(task.id, floorCost(spec, i.program, task.workflow)));
  }
  return {
    day: i.schedule.day,
    persona: i.schedule.persona,
    programVersion: i.program.version,
    trace,
    tasks,
    floor,
    complaints: complaintsFor(spec, i.program, i.persona, i.schedule),
  };
}

export function fakeMinClicks(i: MinClicksInput): MinClicksResult {
  const spec = fakeSpec(i.specVersion);
  return {
    tasks: i.schedule.tasks.map((task) => {
      const ctx: Ctx = { spec, program: i.program, persona: null, rand: () => 0, trace: null, taskId: task.id, t: 0 };
      const cost = taskCost(ctx, task.workflow, false);
      return { task: task.id, workflow: task.workflow, clicks: cost.clicks, keystrokes: cost.keys };
    }),
  };
}

export function fakeDeploy(i: DeployInput): DeployResult {
  const verdict = fakeCheck(i);
  if (verdict !== 'ok') return { deployed: false, verdict };
  return {
    deployed: true,
    certificate: {
      specVersion: i.specVersion,
      specHash: sha256(`FAKE-spec-${i.specVersion}`),
      programHash: programHash(i.program),
      verdict: 'ok',
      checkerVersion: 'FAKE (EHR_FAKE=1; not the verified checker)',
      time: new Date(0).toISOString(),
    },
  };
}

/** Crude page trees (Lean Html JSON shape): one file per screen, shown components only. */
export async function fakeRenderScreens(i: RenderInput): Promise<string[]> {
  await mkdir(i.outDir, { recursive: true });
  const text = (s: string) => ({ text: { s } });
  const node = (tag: string, attrs: { name: string; value: string }[], children: unknown[]) => ({ node: { tag, attrs, children } });
  const files: string[] = [];
  for (const s of i.program.screens) {
    const items = s.components.filter((comp) => isShown(comp, s)).map((comp) =>
      node('div', [{ name: 'class', value: `ehr-${kindTag(comp.kind)}` }, { name: 'data-comp-id', value: comp.id }], [text(comp.label)]));
    const tree = node('div', [{ name: 'class', value: 'ehr-main' }], [node('h1', [{ name: 'class', value: 'ehr-screen-title' }], [text(s.title)]), ...items]);
    const file = path.join(i.outDir, `${s.id}.json`);
    await writeFile(file, JSON.stringify(tree));
    files.push(file);
  }
  return files;
}

export { fakeCanonical, fakeSpec };
