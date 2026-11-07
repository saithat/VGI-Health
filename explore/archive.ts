import { novelty } from './structure.js';
import type { Program } from '../agent/src/schema.js';
import { niche } from './design.js';
import type { Candidate } from './generator.js';
export interface Metrics { tasks: number; completed: number; clicks: number; scrolls: number; keystrokes: number; }
export interface Evaluation {
  id: string;
  candidate: Candidate;
  status: 'accepted' | 'static-rejected' | 'lean-rejected' | 'screen-rejected' | 'error';
  metrics?: Metrics;
  quality?: number;
  descriptor?: string;
  evidence: Record<string, unknown>;
}
/** Completion is lexicographic, so even very cheap incomplete designs cannot win. */
export function better(a: Evaluation, b: Evaluation): boolean {
  if (!a.metrics || !b.metrics) throw Error('Cannot compare unevaluated designs');
  const ar = a.metrics.completed / a.metrics.tasks, br = b.metrics.completed / b.metrics.tasks;
  return ar !== br ? ar > br : (a.quality ?? -Infinity) > (b.quality ?? -Infinity);
}
export class Archive {
  readonly cells = new Map<string, Evaluation>();
  insert(e: Evaluation): boolean {
    if (e.status !== 'accepted' || !e.metrics || e.metrics.tasks < 1 || !Number.isFinite(e.quality)) return false;
    if (e.candidate.point.tier !== 'sandbox' && e.evidence['leanVerdict'] !== 'ok') return false;
    if (e.candidate.point.tier === 'checked' && e.evidence['screenStatus'] !== 'pass') return false;
    const key = niche(e.candidate.point)+(e.descriptor ? `/${e.descriptor}` : ''), previous = this.cells.get(key);
    if (!previous || better(e, previous)) { this.cells.set(key, e); return true; }
    return false;
  }
  /** Ranking exploration does not change insertion, certification or release quality. */
  explorationRank(candidate:Candidate,current:Program,quality=0,weight=0.25):number {
    if(!Number.isFinite(weight)||weight<0)throw Error('Invalid novelty weight');
    return quality+weight*novelty(candidate.program,current,[...this.cells.values()].map(e=>e.candidate.program)).bonus;
  }
  /** Uniform niche cycling is reproducible and does not concentrate on the global winner. */
  parent(iteration: number): Evaluation | undefined { return [...this.cells.values()][iteration % this.cells.size]; }
  json() { return Object.fromEntries([...this.cells].map(([k,e])=>[k,e])); }
}
