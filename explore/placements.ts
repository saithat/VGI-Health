import type { Program, Spec } from '../agent/src/schema.js';
import { fieldElement, infoOf, kindTag } from '../agent/src/program.js';
import { describeProgram, validateCandidate, type Candidate } from './generator.js';
import type { Workflow } from './design.js';

export interface PlacementMove {
  component: string;
  screen: string;
  parent?: string | undefined;
  tab: number;
  /** Anchor is an existing destination sibling. Omit to append. */
  before?: string;
  after?: string;
}

/** Move identities, never copies or clinical values. Groups carry their complete subtree.
 * This constructs a candidate only: native check, screen, replay and deploy gates still apply.
 */
export function movePlacement(baseline: Program, spec: Spec, workflows: Workflow[], move: PlacementMove): Candidate {
  if (move.before && move.after) throw Error('Choose one placement anchor');
  if (!Number.isSafeInteger(move.tab) || move.tab < 0) throw Error('Invalid destination tab');
  const program = structuredClone(baseline);
  const source = program.screens.find(s => s.components.some(c => c.id === move.component));
  const destination = program.screens.find(s => s.id === move.screen);
  if (!source || !destination) throw Error('Unknown placement source or destination');
  if (!workflows.includes(source.workflow as Workflow) || !workflows.includes(destination.workflow as Workflow)) throw Error('Placement outside selected workflows');
  const root = source.components.find(c => c.id === move.component)!;
  const ids = new Set([root.id]);
  for (let changed = true; changed;) {
    changed = false;
    for (const c of source.components) if (c.parent && ids.has(c.parent) && !ids.has(c.id)) { ids.add(c.id); changed = true; }
  }
  if (move.parent && ids.has(move.parent)) throw Error('Placement would create a container cycle');
  if (move.parent) {
    const parent = destination.components.find(c => c.id === move.parent);
    if (!parent || !['group','tabs'].includes(kindTag(parent.kind))) throw Error('Destination parent is not a container');
  }
  const branch = source.components.filter(c => ids.has(c.id));
  source.components = source.components.filter(c => !ids.has(c.id));
  const anchorId = move.before ?? move.after;
  const anchor = anchorId ? destination.components.find(c => c.id === anchorId) : undefined;
  if (anchorId && (!anchor || anchor.parent !== move.parent || anchor.tab !== move.tab)) throw Error('Destination anchor must be a sibling');
  if (move.parent === undefined) delete root.parent; else root.parent = move.parent;
  root.tab = move.tab;
  const position = anchor ? destination.components.indexOf(anchor) + Number(!!move.after) : destination.components.length;
  if (move.parent && destination.components.findIndex(c => c.id === move.parent) >= position) throw Error('Container must precede its children');
  destination.components.splice(position, 0, ...branch);
  program.version++;
  const candidate = describeProgram(program, workflows);
  validateCandidate(candidate, baseline, spec);
  return candidate;
}

/** Public clinical structure only. No actor memory, hidden preferences or holdout data.
 * First offer a required review beside a medication/task entry; then group reorderings.
 */
export function placementVariants(baseline: Program, spec: Spec, workflows: Workflow[]): {candidate: Candidate; hypothesis: string}[] {
  const variants: {candidate: Candidate; hypothesis: string}[] = [];
  const propose = (move: PlacementMove, hypothesis: string) => {
    try { variants.push({candidate: movePlacement(baseline, spec, workflows, move), hypothesis}); }
    catch { /* Unsupported structural moves are not admitted candidates. */ }
  };
  for (const screen of baseline.screens.filter(s => workflows.includes(s.workflow as Workflow))) {
    const entry = ['dose','medScan','resultAction','refillDecision'].flatMap(element => screen.components.filter(c => fieldElement(c) === element))[0];
    if (entry) for (const review of ['allergyList','currentMeds','doseCheck']) {
      const panel = screen.components.filter(c => infoOf(c) === review)
        .sort((a,b) => Number(b.parent?.endsWith('.patientSidebar')) - Number(a.parent?.endsWith('.patientSidebar')))[0];
      if (panel) propose({component:panel.id, screen:screen.id, parent:entry.parent, tab:entry.tab, after:entry.id}, `Place ${review} beside ${fieldElement(entry)} in its clinical region`);
    }
    const groups = screen.components.filter(c => kindTag(c.kind) === 'group' && !c.parent && !/\.(nav|chart|patientSidebar|contextPanels)/.test(c.id));
    const anchor = groups[0];
    if (anchor) for (const group of groups.slice(1)) propose({component:group.id, screen:screen.id, parent:anchor.parent, tab:anchor.tab, before:anchor.id}, `Move the complete ${group.label || group.id} group earlier in ${screen.title}`);
  }
  return variants.sort((a,b) => Number(a.hypothesis.startsWith('Move')) - Number(b.hypothesis.startsWith('Move')));
}
