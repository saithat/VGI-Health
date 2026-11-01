import { z } from "zod";
import { readArtifact } from "../browser/data";

const resource = z
  .object({ resourceType: z.string(), id: z.string().optional() })
  .passthrough();
const bundleSchema = z
  .object({
    resourceType: z.literal("Bundle"),
    entry: z.array(
      z.object({ fullUrl: z.string().optional(), resource: resource }),
    ),
  })
  .passthrough();
const overlaySchema = z.object({
  entry: z.array(
    z.object({
      source: z.string(),
      sourceFullUrl: z.string().nullable().optional(),
      key: z.string(),
      action: z.enum(["replace", "create", "withdraw"]),
      resource: resource.optional(),
    }),
  ),
});
const taskSchema = z.object({
  patientId: z.string(),
  workflow: z.string(),
  todayResources: z.array(resource),
});
const scheduleSchema = z.object({ tasks: z.array(taskSchema) });
const dates = [
  "2026-11-02",
  "2026-11-03",
  "2026-11-04",
  "2026-11-05",
  "2026-11-06",
  "2026-11-09",
  "2026-11-10",
  "2026-11-11",
  "2026-11-12",
  "2026-11-13",
];

/** The living workday is declared by the world, independently of the historical fixture cutoff. */
export async function worldWorkDate() {
  const manifest = z
    .object({ startDate: z.string() })
    .parse(await readArtifact("/runs/world/2/manifest.json"));
  if (!dates.includes(manifest.startDate))
    throw new Error("The world work date is outside the supplied schedule");
  return manifest.startDate;
}

export async function worldDirectory(today: string) {
  const day = dates.indexOf(today) + 1;
  return day
    ? readArtifact(
        `/runs/world/2/context/day-${String(day).padStart(2, "0")}.json`,
      )
    : { resourceType: "Bundle", entry: [] };
}

export async function worldSchedule(persona: string, today: string) {
  const day = dates.indexOf(today) + 1;
  return day
    ? scheduleSchema.parse(
        await readArtifact(`/runs/world/2/day-${day}-${persona}.json`),
      )
    : undefined;
}

/** Identity-based replacements precede Lean's chart projection. The department
 * graph stays a separate API input; no other patient's records enter the chart.
 */
export async function prepareWorldChart(
  raw: unknown,
  source: string,
  today: string,
  task?: z.infer<typeof taskSchema>,
) {
  const bundle = bundleSchema.parse(raw);
  const overlay = overlaySchema.parse(
    await readArtifact("/fixtures/clinical/overrides.json"),
  );
  let entry = bundle.entry;
  for (const change of overlay.entry.filter((e) => e.source === source)) {
    entry = entry.filter((e) => {
      const id = e.resource.id ?? e.fullUrl?.replace(/^urn:uuid:/, "");
      return (
        `${e.resource.resourceType}/${id}` !== change.key &&
        (!change.sourceFullUrl || e.fullUrl !== change.sourceFullUrl)
      );
    });
    if (change.action !== "withdraw" && change.resource)
      entry.push({ fullUrl: change.key, resource: change.resource });
  }
  for (const resource of task?.todayResources ?? []) {
    entry = entry.filter(
      (e) =>
        e.resource.resourceType !== resource.resourceType ||
        e.resource.id !== resource.id,
    );
    entry.push({ resource });
  }
  const day = dates.indexOf(today) + 1;
  const worldContext = day
    ? await readArtifact(
        `/runs/world/2/context/day-${String(day).padStart(2, "0")}.json`,
      )
    : undefined;
  return { bundle: { ...bundle, entry }, worldContext };
}

/** Timeline days follow the committed simulation calendar, including weekends. */
export function chartDateForTimelineDay(day: number, fallback: string): string {
  return dates[day === 0 ? 0 : day - 1] ?? fallback;
}
