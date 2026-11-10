/** Arm H budget and per-sample loop statistics (schema only; no runtime dependencies). */
import { z } from 'zod';

export const HARNESSES = ['codex', 'claude'] as const;
export type HarnessKind = (typeof HARNESSES)[number] | 'script';
export const harnessBudgetSchema = z.object({
  /** night CLI requests per decision (every subcommand counts; submit and status are always served). */
  maxCommands: z.number().int().positive().max(500),
  maxChecks: z.number().int().nonnegative().max(50),
  maxEstimates: z.number().int().nonnegative().max(30),
  /** Agent turns per launch, where the CLI supports a limit (claude --max-turns). Codex exec has no turn flag. */
  maxTurns: z.number().int().positive().max(1000),
  /** CLI launches per decision, shared by propose and repairs; a second launch is a fresh session told to finish. */
  maxLaunches: z.number().int().positive().max(5),
  /** Wall time per decision, shared by every launch. */
  wallMs: z.number().int().positive().max(14_400_000),
});
export type HarnessBudget = z.infer<typeof harnessBudgetSchema>;
export const DEFAULT_HARNESS_BUDGET: HarnessBudget = { maxCommands: 120, maxChecks: 12, maxEstimates: 8, maxTurns: 150, maxLaunches: 2, wallMs: 1_200_000 };

const tokens = z.object({ input: z.number().nullable(), output: z.number().nullable(), cachedInput: z.number().nullable() });
export const harnessLoopSchema = z.object({
  harness: z.enum(['codex', 'claude', 'script']), interpreter: z.literal('node').optional(), model: z.string(), servedModels: z.array(z.string()),
  budget: harnessBudgetSchema, launches: z.number(), turns: z.number().nullable(), commands: z.number(), checks: z.number(), estimates: z.number(),
  tally: z.record(z.string(), z.number()), complaints: z.array(z.string()), wallMs: z.number(), exceeded: z.string().nullable(), submitted: z.boolean(),
  tokens, egress: z.object({ allowed: z.number(), denied: z.record(z.string(), z.number()) }),
  audit: z.object({ status: z.enum(['pass', 'fail']), findings: z.number(), permissionDenials: z.number() }),
  workspaceSha256: z.string(), agentFiles: z.number(),
});
export type HarnessLoopStats = z.infer<typeof harnessLoopSchema>;
