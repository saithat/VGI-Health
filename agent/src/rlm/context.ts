/** Arm R partition boundary and effectful capabilities. Only these values enter the REPL. */
import { z } from 'zod';
import type { RlmBudget } from './stats.js';
export { DEFAULT_RLM_BUDGET, rlmBudgetSchema, type RlmBudget } from './stats.js';
import { checkPatch, TrainEstimator, type LoopDeps, type NightInput } from '../night.js';
import { expandProgram } from '../composites.js';
import type { QueryBundle } from '../quality-queries.js';
import { SAFETY_PROPERTIES, SUBMIT_SCHEMA, currentRenderSamples, specRules, validateSubmission, wirePatch } from '../agent-loop.js';
import { MOVE_TYPES } from '../../../app/src/dashboard/agent-evidence.js';

export class RlmBudgetError extends Error {}

/** The same train-only QueryBundle E receives, current program/spec projections, and nothing else.
 * No holdout closure, history, earlier program, world path or raw NightInput.train is read here. */
export function rlmReplData(input: Pick<NightInput, 'night' | 'persona' | 'current' | 'release'>, bundle: QueryBundle) {
  const current = structuredClone(input.current), spec = structuredClone(input.release.spec), executable = expandProgram(current);
  const files = structuredClone(bundle.files);
  const parse = (name: string): unknown => { const text = files[name]; if (text === undefined) throw new Error(`Missing ${name}`); return JSON.parse(text); };
  const data = {
    meta: { night: input.night, persona: input.persona.id, role: current.role, version: current.version, specVersion: input.release.spec.version,
      stabilityBudget: input.release.spec.design.stabilityBudget, start: current.start },
    program: current,
    screens: current.screens.map(({ id, title, workflow, components }) => ({ id, title, workflow, components: components.length })),
    specRules: Object.fromEntries(current.screens.map(s => [s.id, specRules(current, executable, spec, s)])),
    render: Object.fromEntries(current.screens.map(s => [s.id, currentRenderSamples(current, files, s.id)])),
    train: { traces: parse('traces.json'), attribution: parse('attribution.json'), geometry: parse('geometry.json'), ledger: parse('ledger.json'), locality: parse('locality.json') },
    SAFETY_PROPERTIES, MOVE_TYPES: [...MOVE_TYPES], SUBMIT_SCHEMA,
  };
  return { data: JSON.stringify(data), files: JSON.stringify(files) };
}

export interface HostEvent { index: number; turn: number; name: string; args: unknown; result: unknown; error: string | null }
/** charge() is called only once the request fits and an LLM call will be made. */
export type SubCall = (prompt: string, data: unknown, charge: () => void) => Promise<string>;

/** Effectful functions routed from the REPL back to the harness, with per-decision quotas. */
export class RlmHost {
  readonly events: HostEvent[] = [];
  readonly complaints: string[] = [];
  checks = 0; estimates = 0; subCalls = 0;
  turn = 0;
  private submission: unknown = undefined;
  private submitted = false;
  private readonly gate;
  private readonly current;
  private readonly estimator;
  constructor(input: NightInput, private readonly deps: LoopDeps, readonly budget: RlmBudget, private readonly sub: SubCall) {
    this.current = structuredClone(input.current);
    this.gate = { specVersion: input.release.specVersion, prev: this.current, canonical: input.release.canonical, nextVersion: this.current.version + 1 };
    this.estimator = new TrainEstimator(deps, input, input.release.specVersion);
  }
  get done() { return this.submitted; }
  get final() { if (!this.submitted) throw new Error('No FINAL submission'); return this.submission; }
  beginLoop() { this.submitted = false; this.submission = undefined; }
  submit(value: unknown) {
    if (this.submitted) throw new Error('Already submitted');
    this.submission = validateSubmission(value); this.submitted = true;
  }
  handler = async (name: string, args: unknown): Promise<unknown> => {
    const event: HostEvent = { index: this.events.length, turn: this.turn, name, args: structuredClone(args), result: null, error: null };
    this.events.push(event);
    try { event.result = await this.dispatch(name, args); return structuredClone(event.result); }
    catch (error) { event.error = error instanceof Error ? error.message : 'Host call failed'; throw error; }
  };
  private async dispatch(name: string, args: unknown): Promise<unknown> {
    if (this.submitted) throw new Error('Loop has ended; no calls after FINAL');
    if (name === 'check_patch' || name === 'estimate_patch') {
      const patch = wirePatch(args);
      if (name === 'check_patch' && ++this.checks > this.budget.maxChecks) throw new RlmBudgetError('check budget exhausted');
      if (name === 'estimate_patch' && ++this.estimates > this.budget.maxEstimates) throw new RlmBudgetError('estimate budget exhausted');
      const checked = await checkPatch(this.deps.ehr, this.current, patch, this.gate);
      if (name === 'check_patch') return checked.check;
      return { check: checked.check, estimate: checked.program && checked.check.status === 'pass' ? await this.estimator.estimate(checked.program) : null };
    }
    if (name === 'complain') {
      const text = z.object({ text: z.string().max(4000) }).parse(args).text;
      this.complaints.push(text); return { recorded: true };
    }
    if (name === 'llm_query') {
      const a = z.object({ prompt: z.string(), data: z.unknown() }).parse(args);
      if (this.subCalls >= this.budget.maxSubCalls) throw new RlmBudgetError('sub-call budget exhausted');
      return this.sub(a.prompt, a.data, () => { this.subCalls++; });
    }
    if (name === 'FINAL') { this.submit(args); return { submitted: true }; }
    throw new Error('Unknown host function');
  }
  stats() {
    return { checks: this.checks, estimates: this.estimates, subCalls: this.subCalls, hostCalls: this.events.length,
      tally: Object.fromEntries([...new Set(this.events.map(e => e.name))].map(n => [n, this.events.filter(e => e.name === n).length])),
      complaints: [...new Set(this.complaints)] };
  }
}
export { SAFETY_PROPERTIES };
