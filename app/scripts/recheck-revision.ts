import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { expandProgram } from "../../agent/src/composites";
import { DEFAULT_EHR_BIN } from "../../agent/src/ehr";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { CURRENT_RELEASE } from "../src/core/currentRelease";
import { propertyReason } from "../src/browser/revision-diff";
import { createEhr } from "../../agent/src/ehr";
import {
  programSchema,
  specSchema,
  verdictSchema,
} from "../../agent/src/schema";
import { buildCatalog, root } from "./catalog.mjs";

/** The live login and check-only history share the current release. */
const currentRelease = CURRENT_RELEASE;
/** Read committed artifacts and invoke `ehr check`. No deploy or run-data writes. */
export async function recheckRevision(
  path: string,
  persona: string,
  binary?: string,
) {
  const catalog = z
    .object({
      programs: z.array(
        z.object({ path: z.string(), persona: z.string(), mock: z.boolean() }),
      ),
    })
    .parse(await buildCatalog());
  const entry = catalog.programs.find(
    (p) => p.path === path && p.persona === persona && !p.mock,
  );
  if (!entry)
    throw new Error("Choose a recorded revision or certified role baseline.");
  const read = async (file: string) => {
    const raw = z
      .record(z.string(), z.unknown())
      .parse(JSON.parse(await readFile(resolve(root, file), "utf8")));
    const parsed = programSchema.parse(raw);
    // Retain new optional program metadata, including workspace opt-in flags.
    return { ...raw, ...parsed };
  };
  const program = await read(entry.path);
  const canonical = await read(
    `releases/${currentRelease}/personas/${persona}.json`,
  );
  const checker = createEhr({
    fake: false,
    ...(binary ? { binary } : {}),
  });
  const expectedSpec = specSchema.parse(
    JSON.parse(
      await readFile(
        resolve(root, `releases/${currentRelease}/spec.json`),
        "utf8",
      ),
    ),
  );
  const nativeSpec = await checker.specExport(currentRelease);
  if (!isDeepStrictEqual(nativeSpec, expectedSpec))
    throw new Error(
      "The native checker does not match the current release. Rebuild the server checker before re-checking history.",
    );
  const temporary = await mkdtemp(resolve(tmpdir(), "vgi-check-only-"));
  let verdict;
  try {
    const source = resolve(temporary, "revision.json"),
      baseline = resolve(temporary, "baseline.json");
    await writeFile(source, JSON.stringify(expandProgram(program)));
    await writeFile(baseline, JSON.stringify(expandProgram(canonical)));
    const stdout = await new Promise<string>((done, reject) =>
      execFile(
        binary ?? process.env.EHR_BIN ?? DEFAULT_EHR_BIN,
        [
          "check",
          "--spec",
          resolve(root, `releases/${currentRelease}/spec.json`),
          "--program",
          source,
          "--prev",
          source,
          "--canonical",
          baseline,
        ],
        { timeout: 60000, maxBuffer: 8 * 1024 * 1024, encoding: "utf8" },
        (error, output, stderr) => {
          if (error && typeof error.code !== "number")
            reject(new Error(`Native check unavailable: ${error.message}`));
          else if (!output.trim())
            reject(
              new Error(
                `Native check returned no verdict: ${stderr.slice(0, 200)}`,
              ),
            );
          else done(output);
        },
      ),
    );
    verdict = verdictSchema.parse(JSON.parse(stdout));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }

  return {
    release: currentRelease,
    verdict,
    reason:
      verdict === "ok"
        ? null
        : propertyReason(
            verdict.violation.property,
            verdict.violation.message,
            [program],
          ),
    checkOnly: true as const,
  };
}
