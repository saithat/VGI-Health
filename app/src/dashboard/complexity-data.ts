import { z } from "zod";

const metricsSchema = z.object({
  clicks: z.number().nonnegative(),
  keystrokes: z.number().nonnegative(),
  scrolls:z.number().nonnegative().nullable().default(null),scrollPx:z.number().nonnegative().nullable().default(null),mouseTravelPx:z.number().nonnegative().nullable().default(null),
  screens: z.number().nonnegative(),
  requiredFields: z.number().nonnegative(),
  popups: z.number().nonnegative(),
});
const workflowSchema = z.object({
  workflow: z.string(),
  metrics: metricsSchema,
  floor: metricsSchema,
});
export const complexitySchema = z.object({
  schemaVersion: z.literal(1),
  releaseNaming: z.string().optional(),
  runId: z.string(),
  suite: z.string(),
  search: z.string(),
  personas: z
    .array(
      z.object({
        persona: z.string(),
        iterations: z
          .array(
            z.object({
              version: z.number().int().nonnegative(),
              label: z.string(),
              specVersion: z.string(),
              total: metricsSchema,
              floor: metricsSchema,
              workflows: z.array(workflowSchema),
              tasks: z.array(
                z.object({
                  space: z.enum(["full", "goalDirected", "navigationDirected"]),
                  exact: z.boolean(),
                }),
              ),
            }),
          )
          .min(1),
        markers: z.array(
          z.object({
            kind: z.enum(["release", "rejection"]),
            version: z.number(),
            night: z.number(),
            label: z.string(),
            properties: z.array(z.string()),
          }),
        ),
      }),
    )
    .min(1),
});
export type ComplexityData = z.infer<typeof complexitySchema>;
export type ComplexityPersona = ComplexityData["personas"][number];
export type Metric = keyof z.infer<typeof metricsSchema>;
export const metricOptions:{key:Metric;label:string;unit:string}[]=[
 {key:'clicks',label:'Clicks',unit:'clicks'},{key:'scrolls',label:'Scrolls',unit:'scrolls'},
 {key:'scrollPx',label:'Scroll distance',unit:'px'},{key:'mouseTravelPx',label:'Mouse travel',unit:'px'},
 {key:'keystrokes',label:'Keystrokes (secondary)',unit:'keys'},
];
export const formatComplexity = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value);
