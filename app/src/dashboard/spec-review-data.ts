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
  lineCount: z.number().int().positive(),
  declarationKind: z.string().optional(),
  classification: z.enum(["trusted", "proven", "unverified"]),
});
export const specReviewSchema = z.object({
  schemaVersion: z.literal(2),
  classes: z.object({
    trusted: z.number(),
    proven: z.number(),
    unverified: z.number(),
  }),
  trustedDeclarations: z.number().int().nonnegative(),
  trustedReviewLines: z.number().int().nonnegative(),
  sourceDigest: z.string(),
  filesScanned: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  kinds: z.record(z.string(), z.number()),
  items: z.array(itemSchema),
});
export type SpecReviewData = z.infer<typeof specReviewSchema>;
