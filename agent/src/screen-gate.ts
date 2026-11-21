import type { GeometryProvider } from './geometry.js';
import type { SimulateInput } from './ehr.js';
import type { CheckResult,Program } from './schema.js';
import type { ScreenCheckResult } from '../../app/src/dashboard/agent-evidence.js';
export type { ScreenCheckResult } from '../../app/src/dashboard/agent-evidence.js';

export type ScreenCheckInput = { specVersion: string; program: Program; referenceProgram?: Program } & Partial<Pick<SimulateInput,'schedule'|'worldDir'>>;
export type ReferenceProvider = (input: ScreenCheckInput) => Promise<Program | null>;

export interface ScreenChecker {
  readonly mode: 'real' | 'fake' | 'lean';
  geometry?:GeometryProvider;
  check(input: ScreenCheckInput): Promise<ScreenCheckResult>;
}

/** A failed screen check, in the same shape as a checker rejection (for the record). */
export function screenCheckRejection(r: ScreenCheckResult): CheckResult {
  return {
    status: r.status === 'error' ? 'error' : 'fail', property: 'ScreenCheck', message: r.message, counterexample: null,
    screens: r.failingScreens, verdict: null,
  };
}
