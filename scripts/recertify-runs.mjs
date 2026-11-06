#!/usr/bin/env node
// Check frozen recorded revisions through one cross-revision screen batch per
// presentation bundle. Native certificates are staged only in the output dir;
// migrate-neutral-terms installs them and performs measurement/replay refresh.
import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  access,
  rm,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import { acquireBrowserLock } from "./browser-heavy-lock.mjs";
import { contextDigest, canonical } from "./screen-results.mjs";
import { orderedPool, screenWorkers } from "./screen-pool.mjs";

const root = resolve(import.meta.dirname, "..");
const read = async (file) => JSON.parse(await readFile(file, "utf8"));
const exists = async (file) =>
  access(file).then(
    () => true,
    () => false,
  );
const write = async (file, data) => {
  await mkdir(resolve(file, ".."), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + "\n");
};
const run = (cmd, args, env) =>
  new Promise((accept, reject) => {
    const child = spawn(cmd, args, { cwd: root, stdio: "inherit", env });
    child.once("error", reject);
    child.once("close", (code) => accept(code));
  });
export async function recertifyRuns({
  runs,
  output,
  root: runRoot = root,
  ehr: suppliedEhr,
  build: suppliedBuild,
  executeScreens = run,
}) {
  const root = runRoot;
  const started = performance.now();
  const { createEhr } = await import("../agent/src/ehr.ts");
  const { installedBuild } = await import("../agent/src/build-binding.ts");
  const { compilePresentations } =
    await import("../agent/src/presentation-compiler.ts");
  const { programSchema } = await import("../agent/src/schema.ts");
  const build = suppliedBuild ?? (await installedBuild());
  const ehr = suppliedEhr ?? createEhr({ fake: false });
  const revisions = [];
  const workers = screenWorkers();
  for (const name of runs) {
    if (!/^[-\w]+$/.test(name)) throw Error(`Invalid run: ${name}`);
    const dir = join(root, "runs", name),
      manifest = await read(join(dir, "manifest.json"));
    if (manifest.ehr?.mode !== "real")
      throw Error(`Not a real recording: ${name}`);
    for (const persona of manifest.personas) {
      const folder = join(dir, "programs", persona);
      for (const file of (await readdir(folder))
        .filter((file) => /^v\d+\.json$/.test(file))
        .sort((a, b) => Number(a.slice(1, -5)) - Number(b.slice(1, -5)))) {
        const stem = file.slice(0, -5),
          source = join(folder, `${stem}.source.json`);
        const program = programSchema.parse(
          await read((await exists(source)) ? source : join(folder, file)),
        );
        const inputDir = join(dir, "certifications", persona, stem);
        // Recorded, frozen checker inputs are mandatory: never substitute a new rulebook.
        const specFile = join(inputDir, "spec.json"),
          spec = await read(specFile),
          inputs = await read(join(inputDir, "inputs.json"));
        if (!inputs.canonical || !inputs.prev)
          throw Error(
            `Missing frozen canonical/previous input: ${name}/${persona}/${stem}`,
          );
        if (canonical(inputs.program) !== canonical(program))
          throw Error(`Recorded program differs: ${name}/${persona}/${stem}`);
        revisions.push({
          name,
          persona,
          stem,
          dir,
          program,
          specFile,
          spec,
          inputs,
        });
      }
    }
  }
  await mkdir(output, { recursive: true });
  const fixtureIndex = await read(join(root, "fixtures/synthea/index.json"));
  const bundles = [
    process.env.EHR_SAMPLE_FHIR?.split(",")
      .map((file) => file.trim())
      .filter(Boolean) ?? [
      join(root, "fixtures/synthea/Ashly_Rippin_149fcc1f.json"),
    ],
  ]
    .flat()
    .map((file) => resolve(file));
  for (const flag of ["pediatric", "surgical"]) {
    const patient = fixtureIndex.patients.find(
      (patient) => patient.flags[flag],
    );
    if (!patient) throw Error(`Missing mandatory ${flag} screen bundle`);
    const file = join(root, "fixtures/synthea", patient.file);
    if (!bundles.includes(file)) bundles.push(file);
  }
  const prepared = await orderedPool(
    revisions,
    workers,
    async (revision, index) => {
      const directory = join(output, "revisions", String(index));
      await rm(directory, { recursive: true, force: true });
      const native = await ehr.deploy({
        specVersion: revision.specFile,
        program: revision.program,
        canonical: revision.inputs.canonical,
        prev: revision.inputs.prev,
        outDir: join(directory, "native"),
      });
      const presentations = compilePresentations(revision.program);
      const files = [];
      if (native.deployed)
        for (const [index, fhir] of bundles.entries())
          files.push(
            ...(await ehr.renderScreens({
              specVersion: revision.specFile,
              program: revision.program,
              fhir,
              ui: true,
              outDir: join(directory, `b${index}`),
            })),
          );
      return { ...revision, directory, native, presentations, files };
    },
  );
  for (const [index, revision] of prepared.entries())
    console.log(
      `Prepared ${index + 1}/${revisions.length}: ${revision.name}/${revision.persona}/${revision.stem}; native ${revision.native.deployed ? "pass" : "fail"}, ${revision.files.length} trees`,
    );
  const groups = new Map();
  for (const revision of prepared.filter(
    (revision) => revision.native.deployed,
  )) {
    const key = contextDigest(revision.presentations ?? null);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(revision);
  }
  const resultsByFile = new Map(),
    batches = [];
  for (const [key, revisions] of groups) {
    const bundle = join(output, `${key}.presentations.json`),
      result = join(output, `${key}.screens.json`);
    if (revisions[0].presentations)
      await write(bundle, revisions[0].presentations);
    const manifest = join(output, `${key}.files.json`);
    await write(
      manifest,
      revisions.flatMap((revision) => revision.files),
    );
    await rm(result, { force: true });
    const code = await executeScreens(
      process.execPath,
      [
        join(root, "app/scripts/screen-check.mjs"),
        "--ui",
        "--manifest",
        manifest,
      ],
      {
        ...process.env,
        EHR_SCREEN_WORKERS: String(workers),
        EHR_PRESENTATION_BUNDLE: revisions[0].presentations ? bundle : "",
        EHR_SCREEN_RESULT: result,
      },
    );
    const report = await read(result);
    batches.push({
      key,
      code,
      status: report.status,
      controlsStatus: report.controlsStatus,
      cache: report.cache,
      coverage: report.coverage,
      elapsedMs: report.elapsedMs,
    });
    if (
      !["pass", "fail"].includes(report.status) ||
      !["pass", "fail"].includes(report.controlsStatus) ||
      !Array.isArray(report.trees) ||
      code === null
    )
      throw Error(`Screen infrastructure failed: ${result}`);
    for (const tree of report.trees) resultsByFile.set(tree.file, tree);
  }
  const certificates = [];
  for (const revision of prepared) {
    const trees = revision.files.map((file) => resultsByFile.get(file));
    const screen =
      trees.length && trees.every((tree) => tree?.status === "pass")
        ? "pass"
        : "fail";
    const status =
      revision.native.deployed &&
      screen === "pass" &&
      batches.every((batch) => batch.controlsStatus === "pass")
        ? "certified"
        : "rejected";
    certificates.push({
      run: revision.name,
      persona: revision.persona,
      version: revision.program.version,
      status,
      native: revision.native.deployed ? "pass" : revision.native.verdict,
      screen,
      nativeResult: revision.native,
      trees: trees.map((tree) => ({
        sha256: tree?.sha256,
        probe: tree?.probe ?? false,
        status: tree?.status,
        projects: tree?.projects.map((project) => ({
          project: project.project,
          status: project.status,
        })),
      })),
    });
  }
  const report = {
    build,
    workers,
    elapsedMs: Math.round(performance.now() - started),
    batches,
    certificates,
  };
  await write(join(output, "recertification.json"), report);
  console.log(
    `Recertified ${certificates.filter((certificate) => certificate.status === "certified").length}/${certificates.length} revisions in ${(report.elapsedMs / 1000).toFixed(2)}s; ${join(output, "recertification.json")}`,
  );
  return report;
}
async function main() {
  if (!process.argv.includes("--worker")) {
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        join(root, "agent/node_modules/tsx/dist/loader.mjs"),
        fileURLToPath(import.meta.url),
        "--worker",
        ...process.argv.slice(2),
      ],
      { cwd: root, stdio: "inherit", env: process.env },
    );
    process.exitCode = result.status ?? 1;
    return;
  }
  const { values } = parseArgs({
    options: {
      worker: { type: "boolean" },
      runs: { type: "string" },
      out: { type: "string" },
    },
  });
  if (!values.runs || !values.out || !process.env.TMPDIR)
    throw Error("Use --runs core-10day-live --out <scratch>; set TMPDIR");
  const lock = await acquireBrowserLock();
  try {
    const report = await recertifyRuns({
      runs: values.runs.split(","),
      output: resolve(values.out),
    });
    if (
      report.certificates.some(
        (certificate) => certificate.status !== "certified",
      )
    )
      process.exitCode = 2;
  } finally {
    lock.release();
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
