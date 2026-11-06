/** Fill explicitly authored idle shifts, then fence the synthetic example. */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { dayResultSchema, decisionRecordSchema } from "../../agent/src/schema";
import { writeJsonAtomic } from "../../agent/src/util";
import {
  writeDayDigest,
  writeNightDigest,
} from "../../agent/src/content-digest";

export async function completeMock(root: string) {
  const read = async (file: string) =>
    JSON.parse(await readFile(join(root, file), "utf8"));
  const manifest = z.object({
    runId: z.literal("mock"),
    ehr: z.object({ mode: z.literal("fake") }).passthrough(),
    days: z.literal(10),
    personas: z.array(z.enum(["P1", "P2", "P3", "P4", "P5"])).length(5),
  }).passthrough().parse(await read("manifest.json"));
  const missing = (error: unknown) => error instanceof Error && "code" in error && error.code === "ENOENT";
  for (const persona of manifest.personas) {
    const records = (
      await Promise.all(
        (await readdir(join(root, "decisions"))).sort().map(async (night) => {
          try {
            return decisionRecordSchema.parse(
              await read(`decisions/${night}/${persona}.json`),
            );
          } catch (error) {
            if (!missing(error)) throw error;
            return null;
          }
        }),
      )
    ).filter((record) => record !== null);
    const sample = dayResultSchema.parse(
      await read(`days/day-03/${persona}.json`),
    );
    for (let day = 1; day <= 10; day++) {
      const previous = records.filter((r) => r.night < day).at(-1);
      const version = previous?.versionAfter ?? 0;
      const dayFile = `days/day-${String(day).padStart(2, "0")}/${persona}.json`;
      try {
        await read(dayFile);
      } catch (error) {
        if (!missing(error)) throw error;
        // These are authored example shifts, never measured simulator evidence.
        await writeJsonAtomic(
          join(root, dayFile),
          dayResultSchema.parse({ ...sample, day, programVersion: version }),
        );
      }
      if (day === 10 || records.some((r) => r.night === day)) continue;
      const prior = records.filter((r) => r.night < day).at(-1);
      if (!prior) throw new Error("Missing initial authored decision");
      await writeJsonAtomic(
        join(
          root,
          `decisions/night-${String(day).padStart(2, "0")}/${persona}.json`,
        ),
        decisionRecordSchema.parse({
          ...prior,
          night: day,
          mode: "nightly",
          versionBefore: prior.versionAfter,
          versionAfter: prior.versionAfter,
          hypothesis: "MOCK idle night; retain the authored layout.",
          candidates: [],
          chosen: null,
          predicted: null,
          certification: { result: "skipped", attempts: [] },
          certificate: null,
          deployed: null,
          release: null,
          validation: {
            replay: null,
            improved: null,
            stabilityOk: null,
            accepted: false,
            reason: "MOCK idle night.",
          },
          measured: {
            validation: null,
            test: null,
            minClicks: [],
            predictionHeld: null,
            predictionNote: "No measurement on an authored idle night.",
          },
          userResponse: {
            response: "not-offered",
            probability: 0,
            reason: "MOCK idle night.",
          },
          outcome: "no-change",
        }),
      );
    }
  }
  for (let day = 1; day <= 10; day++) {
    await writeDayDigest(root, day, manifest.personas);
    if (day < 10) await writeNightDigest(root, day, manifest.personas);
  }
  await writeJsonAtomic(join(root, "manifest.json"), {
    ...manifest,
    completionProtocol: "atomic-prefix-v1",
  });
}
