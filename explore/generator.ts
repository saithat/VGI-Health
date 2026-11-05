import { programSchema, type Program, type Spec } from '../agent/src/schema.js';
import { fieldElement, infoOf, kindTag, gotoOf } from '../agent/src/program.js';
import { parsePoint, unsupported, type DesignPoint, type Workflow } from './design.js';
import { taskContract } from './tasks.js';
import { bindTasks, type TaskBinding } from './bindings.js';
export interface Candidate {
  point: DesignPoint;
  workflows: Workflow[];
  program: Program;
  taskMapping: Record<string, TaskBinding>;
  sandbox: null | { deployable: false; customComponents: string[]; contract: ReturnType<typeof taskContract> };
}
/** No semantic escape strings. Unsupported concrete primitives live only in a sandbox manifest. */
export function generate(point: DesignPoint, workflows: Workflow[], baseline: Program, spec: Spec): Candidate {
  point = parsePoint(point);
  if (!workflows.length || workflows.some(w => !/^W[1-7]$/.test(w))) throw Error('Invalid workflow set');
  if (workflows.some(w => !baseline.screens.some(s => s.workflow === w))) throw Error('Workflow absent from source program');
  const missing = unsupported(point);
  if (missing.length && point.tier !== 'sandbox') throw Error(`Needs extension: ${missing.join(', ')}`);
  const program = structuredClone(baseline);
  program.version++;

  for (const screen of program.screens.filter(s => workflows.includes(s.workflow as Workflow))) {
    if (point.layout === 'document' && screen.components.some(c => fieldElement(c) === 'hpi') &&
      !screen.components.some(c => infoOf(c) === 'noteSummary')) {
      screen.components.push({id:`explore.${screen.id}.noteDocument`,kind:{panel:{info:'noteSummary'}},
        label:'Current encounter note — full document',tag:'layout.document',tab:0,size:'normal',visibility:'always'});
    }
    for (const c of screen.components) {
      if (point.density === 'compact' && kindTag(c.kind) === 'field') c.size = 'compact';
      // Navigation and context/sidebar groups keep their own structural contracts.
      const clinical = !/\.(nav|chart|patientSidebar|contextPanels)(\.|$)/.test(c.id);
      const layout = point.taskLayouts[c.id] ?? point.layout;
      if (clinical && kindTag(c.kind) === 'group' && screen.components.some(x => x.parent === c.id)) {
        c.tag = c.tag.replace(/(?:\.layout\.(?:columns|timeline|datedTimeline))+$/, '');
        if (layout === 'columns' || layout === 'timeline') c.tag += `.layout.${layout}`;
        if (layout === 'timeline' && point.temporalView === 'aligned') c.tag += '.layout.datedTimeline';
      }
      if (layout === 'document' && infoOf(c) === 'noteSummary') c.tag = 'layout.document';
      if (point.input === 'keyboard' && gotoOf(c)) {
        // Unique per screen; schema and checker retain action authority.
        c.hotkey = `Alt+${screen.components.filter(x => gotoOf(x)).indexOf(c) + 1}`;
      }
    }
  }
  const ids = new Set(program.screens.flatMap(s => s.components.map(c => c.id)));
  if (Object.keys(point.taskLayouts).some(k => !ids.has(k))) throw Error('Unknown task layout target');
  const candidate = { point, workflows, program: programSchema.parse(program), taskMapping: bindTasks(program, workflows, point),
    sandbox: point.tier === 'sandbox' ? { deployable: false as const, customComponents: missing,
      contract: taskContract(spec, baseline, workflows) } : null };
  validateCandidate(candidate, baseline, spec);
  return candidate;
}
/** Independent identity-based movement check avoids the tag-renaming budget loophole. */
export function validateCandidate(c: Candidate, baseline: Program, spec: Spec): void {
  programSchema.parse(c.program);
  parsePoint(c.point);
  if (unsupported(c.point).length && c.point.tier !== 'sandbox') throw Error('Unadmitted design');
  for (const key of ['id','owner','role','specVersion','patientSelection'] as const) {
    if (c.program[key] !== baseline[key]) throw Error(`Immutable metadata: ${key}`);
  }
  const old = new Map(baseline.screens.flatMap(s => s.components.map(x => [x.id, {screen:s.id,parent:x.parent,tab:x.tab}] as const)));
  let moved = 0;
  const ids = new Set<string>();
  for (const s of c.program.screens) for (const x of s.components) {
    if (ids.has(x.id)) throw Error(`Duplicate component: ${x.id}`);
    ids.add(x.id);
    const previous = old.get(x.id);
    if (previous && (previous.screen !== s.id || previous.parent !== x.parent || previous.tab !== x.tab)) moved++;
    const el = fieldElement(x);
    if (el && !spec.elements.some(e => e.id === el)) throw Error(`Unknown element: ${el}`);
  }
  if (moved > spec.design.stabilityBudget) throw Error(`Identity movement budget: ${moved}`);
  // Layout realization must survive LLM program edits; names alone cannot claim a niche.
  const cs = c.program.screens.filter(s => c.workflows.includes(s.workflow as Workflow)).flatMap(s => s.components);
  const signature = c.point.layout;
  if (['columns','timeline'].includes(signature) && !cs.some(x => x.tag.endsWith(`.layout.${signature}`) || signature==='timeline' && c.point.temporalView==='aligned' && x.tag.endsWith('.layout.datedTimeline'))) throw Error('Missing realized layout');
  if (signature === 'document' && !cs.some(x => x.tag === 'layout.document' && infoOf(x))) throw Error('Missing document realization');
}

/** Describe an existing patched program using realized, admitted descriptors.
 * Mixed layouts use a deterministic priority; task overrides remain explicit. */
export function describeProgram(program: Program, workflows: Workflow[]): Candidate {
  const cs = program.screens.filter(s => workflows.includes(s.workflow as Workflow)).flatMap(s => s.components);
  const clinicalGroups = cs.filter(c => kindTag(c.kind) === 'group' && !/\.(nav|chart|patientSidebar|contextPanels)(\.|$)/.test(c.id));
  const layout = clinicalGroups.some(c => c.tag.endsWith('.layout.timeline') || c.tag.endsWith('.layout.datedTimeline')) ? 'timeline' :
    clinicalGroups.some(c => c.tag.endsWith('.layout.columns')) ? 'columns' :
    cs.some(c => c.tag === 'layout.document' && infoOf(c)) ? 'document' : 'stack';
  const point: DesignPoint = { tier: 'proved', navigation: 'list', layout,
    input: cs.some(c => gotoOf(c) && c.hotkey) ? 'keyboard' : 'mouse', alertChannel: 'spec',
    density: cs.some(c => kindTag(c.kind) === 'field' && c.size === 'compact') ? 'compact' : 'normal',
    patientScope: 'single', temporalView: cs.some(c => c.tag.endsWith('.layout.datedTimeline')) ? 'aligned' : layout === 'timeline' ? 'longitudinal' : 'encounter', taskLayouts: {} };
  return { point, program, workflows, taskMapping: bindTasks(program, workflows, point), sandbox: null };
}
