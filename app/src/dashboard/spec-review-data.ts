import { z } from "zod";

/** Owner-review catalog served by the spec-review plugin from the Lean sources. */
const itemSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  kind: z.string(),
  name: z.string(),
  note: z.string(),
  code: z.string(),
  scope: z.enum(["declaration", "section", "inline"]),
  docstring: z.string().nullable().optional(),
  truncated: z.boolean(),
});
export const specReviewSchema = z.object({
  schemaVersion: z.literal(1),
  sourceDigest: z.string(),
  filesScanned: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  kinds: z.record(z.string(), z.number()),
  items: z.array(itemSchema),
});
export type SpecReviewData = z.infer<typeof specReviewSchema>;
