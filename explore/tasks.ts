import type { Program, Spec } from '../agent/src/schema.js';
import { commitOf, programHash, sha256, stableStringify } from '../agent/src/program.js';
import type { TaskExpr, Workflow } from './design.js';
const atom = (id: string): TaskExpr => ({ op: 'atom', id });
const seq = (...ids: string[]): TaskExpr => ({ op: 'seq', tasks: ids.map(atom) });
/** Canonical phase order; guard requirements below are the authoritative prerequisites. */
export const taskModels: Record<Workflow, TaskExpr> = {
  W1: seq('select','room','reconcile','history-exam-assessment','orders','review-sign-orders','close-sign-note'),
  W2: seq('select-result','review-result-trend','action-message-followup','ack-result'),
  W3: seq('select-track-board','triage','provider-and-orders','review-sign-orders','disposition-and-note'),
  W4: seq('select-task','mar','scan-assess-independent-check','record-administration','flowsheet-sbar'),
  W5: seq('select-room','growth','note','weight-based-orders','review-sign-orders','vaccines','close-sign-visit'),
  W6: seq('consult-or-case','consult-sign','preop','review-sign-orders','operative-note-sign','postop-rounding','discharge'),
  W7: seq('select-request','review-labs-visit-adherence','choose-response','approve-or-deny'),
};
// Independent draft work is explicitly concurrent; branch optionality never changes K(S,c,x,u).
taskModels.W3 = { op:'seq', tasks:[atom('select-track-board'), atom('triage'),
  {op:'parallel',tasks:[atom('provider-documentation'),{op:'optional',task:{op:'repeat',task:atom('draft-order')}}]},
  {op:'optional',task:atom('review-sign-orders')},
  {op:'choice',tasks:['admit','discharge','transfer','observe','consult'].map(atom)},atom('finalize-note')] };
export function taskContract(spec: Spec, canonical: Program, workflows: Workflow[]) {
  const commits = [...new Set(canonical.screens.filter(s => workflows.includes(s.workflow as Workflow))
    .flatMap(s => s.components.map(commitOf).filter((c): c is string => c !== null)))];
  return { source: { specSha256: sha256(stableStringify(spec)), canonicalSha256: programHash(canonical) },
    models: Object.fromEntries(workflows.map(w => [w, taskModels[w]])),
    contracts: commits.map(id => ({ id, role: spec.commits.find(c => c.id === id),
      entries: spec.entries.filter(e => e.commit === id), reviews: spec.reviews.filter(r => r.commit === id),
      alerts: spec.alerts.filter(a => a.commit === id),
      elements: spec.elements.filter(e => spec.entries.some(r => r.commit === id && r.element === e.id)),
    })) };
}
