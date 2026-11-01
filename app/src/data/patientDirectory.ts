import { z } from "zod";
import type {
  Event,
  PatientContext,
  PatientDirectory,
} from "../../../lean/generated/ehr-types";

const taskIdentity = z.object({
  resourceType: z.literal("Task"),
  id: z.string().optional(),
  for: z.object({ reference: z.string().optional() }).optional(),
});

/** Resolve transport identity from the exact Lean row. Lookup results carry no
 * work-item focus; a foreign patient or an unrecognized event cannot supply one.
 */
export function selectedRowSource(
  directory: PatientDirectory | undefined,
  context: PatientContext | undefined,
  event: Event | undefined,
  patient: string,
): string | undefined {
  if (!directory || !context || context.query || !event || !("click" in event))
    return undefined;
  const prefix = `workspace.open|${patient}|`;
  if (!event.click.comp.startsWith(prefix)) return undefined;
  const index = Number(event.click.comp.slice(prefix.length).split("|")[0]);
  if (!Number.isSafeInteger(index) || index < 0) return undefined;
  const row = directory.activities.find((a) => a.info === context.activity)
    ?.rows[index];
  return row?.patient === patient ? row.source : undefined;
}

/** Selecting a request supplies one exact work-item context to Lean; other
 * patients' department rows stay available. No clinical value is interpreted.
 */
export function keepFocusedTask(
  resource: unknown,
  source: string | undefined,
  patient: string,
): boolean {
  if (!source?.startsWith("Task/")) return true;
  const row = taskIdentity.safeParse(resource);
  return (
    !row.success ||
    row.data.for?.reference !== `Patient/${patient}` ||
    `Task/${row.data.id}` === source
  );
}
