/** Zero-model rerun of frozen density candidates through the real TrainEstimator. */
import path from "node:path";
import { z } from "zod";
import { RunStore } from "../../agent/src/store.js";
import { loadRelease } from "../../agent/src/releases.js";
import { mkdir, readFile } from "node:fs/promises";
import { browserGeometry } from "../../agent/src/browser-geometry.js";
import { fileHash, treeHash } from "../../agent/src/fingerprints.js";
import { geometryProgramHash, geometryEhr } from "../../agent/src/geometry.js";
import { createEhr } from "../../agent/src/ehr.js";
import {
  TrainEstimator,
  type LoopDeps,
  type NightInput,
} from "../../agent/src/night.js";
import { applyToProgram } from "../../agent/src/program.js";
import { loadWorld } from "../../agent/src/world.js";
import { calibrationPartition } from "../../agent/src/protocol.js";
import {
  dayResultSchema,
  decisionRecordSchema,
  programSchema,
  specSchema,
} from "../../agent/src/schema.js";
import { writeJson } from "../../agent/src/util.js";

const root = path.resolve(import.meta.dirname, "../..");
if (!process.env.TMPDIR) throw new Error("Set disk-backed TMPDIR");
const output = path.resolve(
  process.argv[2] ?? path.join(process.env.TMPDIR, "density-estimates"),
);
const world = await loadWorld(
  path.resolve(process.argv[3] ?? path.join(root, "runs/world/2")),
);
const run = path.join(root, "runs/core-10day");
await mkdir(output, { recursive: true });
await mkdir(path.join(output, "replays"), { recursive: true });
const json = async (file: string) => JSON.parse(await readFile(file, "utf8"));
const catalog = z
  .object({
    patients: z.array(
      z.object({
        file: z.string(),
        flags: z.object({ pediatric: z.boolean(), surgical: z.boolean() }),
      }),
    ),
  })
  .parse(await json(path.join(root, "fixtures/synthea/index.json")));
const surgical = catalog.patients.find((p) => p.flags.surgical);
if (!surgical) throw new Error("Missing surgical sample");
const surgicalFile = surgical.file;
const bundleFor = (owner: string) =>
  path.join(
    root,
    "fixtures/synthea",
    owner === "P5" ? surgicalFile : "Ashly_Rippin_149fcc1f.json",
  );
const native = createEhr({ fake: false });
const browser = browserGeometry(
  native,
  (i) => [bundleFor(i.program.owner)],
  path.join(output, "cache"),
);
const measuredEhr = geometryEhr(native, browser.provider, output);
const ehr = {
  ...measuredEhr,
  async simulate(input: Parameters<typeof measuredEhr.simulate>[0]) {
    console.log(
      JSON.stringify({
        stage: "simulate",
        owner: input.program.owner,
        version: input.program.version,
        day: input.schedule.day,
      }),
    );
    const result = await measuredEhr.simulate(input);
    await writeJson(
      path.join(
        output,
        "replays",
        `${input.program.owner}-v${input.program.version}-d${input.schedule.day}.json`,
      ),
      result,
    );
    return result;
  },
};
const rows = [];
try {
  for (const [night, persona, id] of [
    [1, "P1", "p1-compact-order-entry"],
    [4, "P5", "p5-compact-postoperative-editor"],
    [2, "P3", "p3-compact-administration"],
  ] as const) {
    const record = decisionRecordSchema.parse(
      await json(
        path.join(
          run,
          `decisions/night-${String(night).padStart(2, "0")}/${persona}.json`,
        ),
      ),
    );
    const candidate = record.candidates.find((c) => c.candidate.id === id);
    if (!candidate?.trainEstimate)
      throw new Error(`Missing historical candidate estimate: ${id}`);
    const specFile = path.join(
      run,
      `trajectories/specs/${record.specVersion}.json`,
    );
    const frozenSpec = specSchema.parse(await json(specFile));
    const current = programSchema.parse(
      await json(
        path.join(run, `programs/${persona}/v${record.versionBefore}.json`),
      ),
    );
    const after = applyToProgram(current, candidate.candidate.patch, {
      version: current.version + 1,
      specVersion: record.specVersion,
    }).program;
    const train = await Promise.all(
      candidate.trainEstimate.days.map(async (day) => {
        const schedule = await world.schedule(day, persona);
        if (!schedule) throw new Error(`Missing day ${day}/${persona}`);
        return {
          schedule: calibrationPartition(schedule, "train"),
          result: dayResultSchema.parse(
            await json(
              path.join(
                run,
                `days/day-${String(day).padStart(2, "0")}/${persona}.json`,
              ),
            ),
          ),
        };
      }),
    );
    const params = world.personas.get(persona);
    if (!params) throw new Error(`Missing persona: ${persona}`);
    const disabled = async (): Promise<never> => {
      throw new Error("Only training estimates are authorized in this harness");
    };
    const input: NightInput = {
      night,
      current,
      train,
      persona: { id: persona, userId: world.userId(persona), params },
      release: {
        ...(await loadRelease(record.specVersion, native)),
        spec: frozenSpec,
        canonical: current,
      },
      programs: new Map([[current.version, current]]),
      history: [],
      holdout: { day: null, validate: disabled },
    };
    const deps: LoopDeps = {
      runId: "density-estimates",
      store: new RunStore(output),
      ehr,
      worldDir: world.dir,
      worldSeed: world.manifest.seed,
      screens: { mode: "real", check: disabled },
      seedPolicy: "none",
      seedState: { rejected: new Set(), injected: 0 },
      agent: {
        name: "disabled",
        model: "none",
        proposeCandidates: disabled,
        chooseCandidates: disabled,
      },
    };
    // Export compact variants for a subsequent independent screen/physical gate.
    const files = await native.renderScreens({
      specVersion: specFile,
      program: after,
      fhir: bundleFor(persona),
      ui: true,
      outDir: path.join(output, "screens", id),
    });
    const measured = await new TrainEstimator(deps, input, specFile).estimate(
      after,
    );
    const row = {
      night,
      persona,
      id,
      specFile,
      specSha256: await fileHash(specFile),
      beforeProgramHash: geometryProgramHash(current),
      afterProgramHash: geometryProgramHash(after),
      patch: candidate.candidate.patch,
      old: candidate.trainEstimate,
      new: measured,
      screenFiles: files,
    };
    rows.push(row);
    await writeJson(path.join(output, `${id}.json`), row);
    console.log(
      JSON.stringify({ id, days: measured?.days, saving: measured?.saving }),
    );
  }
  await writeJson(path.join(output, "results.json"), {
    scope:
      "Historical programs, frozen historical specs, current native/React renderer, training partitions only, no model calls; savings per training day",
    bindings: {
      nativeSha256: native.binary ? await fileHash(native.binary) : null,
      worldSha256: await treeHash(world.dir),
      worldSeed: world.manifest.seed,
      harnessSha256: await fileHash(
        path.join(root, "app/scripts/density-estimates.ts"),
      ),
      build: await json(path.join(root, "app/dist/build.json")),
      viewport: [1440, 900],
    },
    rows,
  });
} finally {
  await browser.close();
}
