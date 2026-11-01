import { z } from "zod";
export const wrapperNames = ["Box", "Stack", "Group", "Paper", "Flex"] as const;
export const wrapperPropsSchema = z.record(z.string(), z.union([z.string(), z.number().finite(), z.boolean()])).superRefine((props, ctx) => {
  const allowed = new Set(["p", "px", "py", "pt", "pb", "pl", "pr", "m", "mx", "my", "mt", "mb", "ml", "mr", "gap", "align", "justify", "wrap", "direction", "radius", "withBorder", "shadow"]);
  for (const [key, value] of Object.entries(props)) {
    if (!allowed.has(key) || (typeof value === "string" && !/^[\w#.,%() /-]{1,80}$/.test(value)) || (typeof value === "string" && /url|expression|javascript/i.test(value)))
      ctx.addIssue({ code: "custom", message: `Forbidden presentation prop ${key}` });
  }
});
export type Layout = { leaf: true } | { wrapper: typeof wrapperNames[number]; props: z.infer<typeof wrapperPropsSchema>; child: Layout };
export const layoutSchema: z.ZodType<Layout> = z.lazy(() => z.union([
  z.strictObject({ leaf: z.literal(true) }),
  z.strictObject({ wrapper: z.enum(wrapperNames), props: wrapperPropsSchema, child: layoutSchema }).superRefine((layout, ctx) => {
    const spacing = /^(p|m)(x|y|t|b|l|r)?$/;
    const extras: Record<string, string[]> = { Box: [], Stack: ['gap', 'align', 'justify'], Group: ['gap', 'align', 'justify', 'wrap'], Paper: ['radius', 'withBorder', 'shadow'], Flex: ['gap', 'align', 'justify', 'wrap', 'direction'] };
    for (const [key, value] of Object.entries(layout.props)) {
      const permitted = spacing.test(key) || extras[layout.wrapper]?.includes(key);
      const correctType = key === 'withBorder' ? typeof value === 'boolean' : spacing.test(key) || ['gap', 'radius'].includes(key) ? typeof value !== 'boolean' : typeof value === 'string';
      if (!permitted || !correctType) ctx.addIssue({ code: 'custom', message: `Invalid ${layout.wrapper} prop ${key}` });
    }
  }),
]));
export const presentationSourceSchema = z.strictObject({ name: z.string().regex(/^[A-Z][A-Za-z0-9]{0,63}$/), key: z.string().regex(/^(presentation|rowAction|section|columns|tabs|stepper|field|info|alert|button|text|composite:[\w-]+)$/), source: z.string().max(30000) });
export type PresentationSource = z.infer<typeof presentationSourceSchema>;
export const presentationBundleSchema = z.strictObject({
  schemaVersion: z.literal(1), owner: z.string(), version: z.number().int().nonnegative(),
  components: z.array(presentationSourceSchema.extend({ layout: layoutSchema })),
  composites: z.array(z.strictObject({ id: z.string(), name: z.string() })),
});
export type PresentationBundle = z.infer<typeof presentationBundleSchema>;
