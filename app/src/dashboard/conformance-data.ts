import { z } from "zod";

/** Recorded evidence only. The dashboard never executes the held-out suite. */
export const ruleConformanceSchema = z.object({
  schemaVersion: z.literal(1),
  runId: z.string(),
  generatedAt: z.string(),
  deploymentGate: z.literal(false),
  targets: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      persona: z.string().optional(),
      revision: z.number().optional(),
      release: z.string(),
      passed: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
      notApplicable: z.number().int().nonnegative(),
    }),
  ),
  results: z.array(
    z.object({
      target: z.string(),
      scenario: z.string(),
      status: z.enum(["pass", "fail", "not-applicable"]),
      observed: z.string(),
      scope: z.string().optional(),
    }),
  ),
});
export type RuleConformance = z.infer<typeof ruleConformanceSchema>;
