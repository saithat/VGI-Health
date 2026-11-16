import { z } from "zod";
import { output } from "../ui-library/schema";
const costs = z.object({
  clicks: z.number(),
  scrolls: z.number(),
  completed: z.number(),
  tasks: z.number(),
});
export const discoveryRun = z.object({
  runId: z.string(),
  status: z.string(),
  mode: z.string(),
  personas: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      days: z.array(
        z.object({
          day: z.number(),
          version: z.number(),
          agent: costs,
          noAgent: costs,
        }),
      ),
      versions: z.array(
        z.object({
          version: z.number(),
          night: z.number(),
          reason: z.string(),
          screens: z.array(
            z.object({
              screen: z.string(),
              title: z.string(),
              before: z.string().nullable(),
              after: z.string().nullable(),
              unavailable: z.string().nullable(),
            }),
          ),
        }),
      ),
    }),
  ),
});
export const discoveryPreview = z.object({ paint: output });
export type Run = z.infer<typeof discoveryRun>;
