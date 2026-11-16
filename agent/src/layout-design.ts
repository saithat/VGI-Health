/** Research design sidecar. Never serialized into the Lean Program wire format. */
import { z } from "zod";
import type { Program } from "./schema.js";
export const layoutCaseSchema = z.object({
  screen: z.string().min(1),
  shape: z.array(z.json()),
  layouts: z
    .array(
      z.object({
        viewport: z.object({
          w: z.number().int().positive(),
          h: z.number().int().positive(),
        }),
        tree: z.json(),
        components: z.json().optional(),
      }),
    )
    .min(1),
});
export const layoutDesignSchema = z.array(layoutCaseSchema);
export type LayoutDesign = z.infer<typeof layoutDesignSchema>;
const designs = new WeakMap<Program, LayoutDesign>();
export const designOf = (program: Program): LayoutDesign | undefined =>
  designs.get(program);
export function withDesign(
  program: Program,
  design: LayoutDesign = [],
): Program {
  designs.set(program, structuredClone(design));
  return program;
}
