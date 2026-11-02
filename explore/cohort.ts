import { createHash } from 'node:crypto';
import { type ChoiceRequest, type DecisionModel, type Distribution, type ScreenRequest, validateDistribution } from './decision.js';
export interface Physician {
  id: string; split: 'search'|'heldout'; seed: number;
  keyboardShare: number; searchOrder: 'forward'|'reverse'|'center';
  errorRate: number; backtrackRate: number; learningRate: number;
}
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
/** Split assignment is fixed before any proposal or outcome is observed. */
export function physicians(seed = 20261102, count = 24): Physician[] {
  if (count < 20 || count % 2) throw Error('Use an even cohort of at least twenty');
  const random = rng(seed);
  return Array.from({ length: count }, (_, i) => ({ id: `ED-${String(i + 1).padStart(2, '0')}`,
    split: i % 2 ? 'heldout' : 'search', seed: Math.floor(random() * 0x7fffffff),
    keyboardShare: i % 3 === 0 ? .8 + random() * .15 : i % 3 === 1 ? .05 + random() * .2 : .4 + random() * .2,
    searchOrder: (['forward','reverse','center'] as const)[i % 3]!,
    errorRate: .01 + random() * .07, backtrackRate: .01 + random() * .1, learningRate: .12 + random() * .4 }));
}
export const digest = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Memoization depends only on the presented state/options, never on outcomes or split.
The shared open model is frozen. Held-out calls occur only after archive selection. */
export class CachedDecision implements DecisionModel {
  readonly rows: { key: string; input: ChoiceRequest; prediction: Distribution }[] = [];
  private readonly cache = new Map<string, Promise<Distribution>>();
  calls = 0;
  constructor(readonly base: DecisionModel) {}
  prime(rows: { key: string; input: ChoiceRequest; prediction: Distribution }[]) {
    for (const row of rows) {
      if (row.key !== digest(row.input)) throw Error('Decision cache identity mismatch');
      validateDistribution(row.input.options.map(o => o.id), row.prediction.probabilities);
      this.cache.set(row.key, Promise.resolve(row.prediction));
      this.rows.push(row);
    }
    this.calls = rows.length;
  }
  async choice(input: ChoiceRequest) {
    if (input.options.length === 1) return { probabilities: { [input.options[0]!.id]: 1 }, abstain: false, model: 'forced-singleton' };
    const key = digest(input);
    if (!this.cache.has(key)) this.cache.set(key, (async () => {
      this.calls++;
      const prediction = await this.base.choice(input);
      if (prediction.abstain) throw Error('Decision model abstained');
      this.rows.push({ key, input, prediction }); return prediction;
    })());
    return this.cache.get(key)!;
  }
  screen(input: ScreenRequest) { return this.base.screen(input); }
}
/** Explicit simulator behavior layer. This is neither clinical nor human calibration. */
export class PhysicianDecision implements DecisionModel {
  experience = 0;
  readonly random: () => number;
  constructor(readonly model: DecisionModel, readonly physician: Physician) { this.random = rng(physician.seed); }
  async choice(input: ChoiceRequest): Promise<Distribution> {
    const goal = input.options.filter(o => o.id !== 'detour');
    const raw = await this.model.choice({ ...input, options: goal });
    const error = this.physician.errorRate / (1 + this.physician.learningRate * this.experience);
    const backtrack = input.options.some(o => o.id === 'detour') ? this.physician.backtrackRate / (1 + this.physician.learningRate * this.experience) : 0;
    const order = this.physician.searchOrder;
    const weights = goal.map((o, i) => {
      const rank = order === 'forward' ? i : order === 'reverse' ? goal.length - i - 1 : Math.abs(i - (goal.length - 1) / 2);
      return ((1 - error) * raw.probabilities[o.id]! + error / goal.length) * Math.exp(-rank * .3);
    });
    const sum = weights.reduce((a, b) => a + b, 0);
    const probabilities = Object.fromEntries(goal.map((o, i) => [o.id, (1 - backtrack) * weights[i]! / sum]));
    if (backtrack) probabilities['detour'] = backtrack;
    return { probabilities: validateDistribution(input.options.map(o => o.id), probabilities), abstain: false, model: `${raw.model}+seeded-simulator` };
  }
  sample(d: Distribution): string {
    let draw = this.random();
    for (const [id, p] of Object.entries(d.probabilities)) { draw -= p; if (draw <= 0) return id; }
    return Object.keys(d.probabilities).at(-1)!;
  }
  screen(input: ScreenRequest) { return this.model.screen(input); }
}
export function spread(values: number[]) {
  if (!values.length || values.some(x => !Number.isFinite(x))) throw Error('Nonempty finite sample required');
  const sorted = [...values].sort((a,b) => a-b), mean = values.reduce((a,b) => a+b,0)/values.length;
  return { n: values.length, mean, sd: Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/values.length),
    min: sorted[0], median: sorted[Math.floor(sorted.length/2)], max: sorted.at(-1) };
}
