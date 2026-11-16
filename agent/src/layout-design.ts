/** Research design sidecar. Never serialized into the Lean Program wire format. */
import { z } from "zod";
import { layoutRuleSchema } from "./layout-rules.js";
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
export const layoutRuleCaseSchema = z.object({
  screen: z.string().min(1),
  screens: z.array(z.string().min(1)).min(1).optional(),
  rules: z.array(layoutRuleSchema).min(1),
  shape: z.array(z.json()).default([]),
  layouts: z.array(layoutCaseSchema.shape.layouts.element).default([]),
}).refine(c=>!c.shape.length&&!c.layouts.length,'rule entries cannot also carry literal shape/layouts');
export const layoutDesignSchema = z.array(z.union([layoutCaseSchema.strict(), layoutRuleCaseSchema.strict()]));
export const ruleCase = (c: LayoutDesign[number]): c is z.infer<typeof layoutRuleCaseSchema> => 'rules' in c;
export const appliesTo = (c: z.infer<typeof layoutRuleCaseSchema>, screen: string) =>
  c.screens ? c.screens.includes(screen) : c.screen === '*' || c.screen === screen;
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
