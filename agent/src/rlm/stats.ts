/** Arm R budget and per-sample loop statistics (schema only; no runtime dependencies). */
import { z } from 'zod';

export const rlmBudgetSchema = z.object({
  /** Root structured calls per decision, shared by propose and every final-gate repair. */
  maxRootTurns: z.number().int().positive().max(200),
  maxSubCalls: z.number().int().nonnegative().max(100),
  maxChecks: z.number().int().nonnegative().max(50),
  maxEstimates: z.number().int().nonnegative().max(30),
  /** Hard bound on each root request (system + prompt), UTF-8 bytes. */
  maxRootPromptBytes: z.number().int().min(16_000).max(400_000),
  /** Hard bound on each sub-call request (system + prompt), UTF-8 bytes. */
  maxSubPromptBytes: z.number().int().min(2_000).max(400_000),
  /** Cell stdout shown to the root, per turn. */
  maxStdoutBytes: z.number().int().min(256).max(32_000),
  /** Root-written code accepted per cell. */
  maxCodeBytes: z.number().int().min(256).max(64_000),
  wallMs: z.number().int().positive().max(14_400_000),
});
export type RlmBudget = z.infer<typeof rlmBudgetSchema>;
export const DEFAULT_RLM_BUDGET: RlmBudget = {
  maxRootTurns: 30, maxSubCalls: 12, maxChecks: 12, maxEstimates: 8,
  maxRootPromptBytes: 48_000, maxSubPromptBytes: 64_000, maxStdoutBytes: 3_000, maxCodeBytes: 8_000, wallMs: 3_600_000,
};
export const rlmLoopSchema = z.object({
  budget: rlmBudgetSchema, rootTurns: z.number(), subCalls: z.number(), checks: z.number(), estimates: z.number(), hostCalls: z.number(),
  cells: z.number(), cellErrors: z.number(), restarts: z.number(), wallMs: z.number(), exceeded: z.string().nullable(),
  maxRootPromptBytes: z.number(), totalRootPromptBytes: z.number(), totalStdoutBytes: z.number(),
  tally: z.record(z.string(), z.number()), complaints: z.array(z.string()),
  tokens: z.object({ root: z.object({ input: z.number().nullable(), output: z.number().nullable(), cachedInput: z.number().nullable() }),
    sub: z.object({ input: z.number().nullable(), output: z.number().nullable(), cachedInput: z.number().nullable() }) }),
});
export type RlmLoopStats = z.infer<typeof rlmLoopSchema>;

