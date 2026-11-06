import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { recertifyRuns } from "./recertify-runs.mjs";
import { contextDigest } from "./screen-results.mjs";
const write = async (file, value) => {
  await mkdir(join(file, ".."), { recursive: true });
  await writeFile(file, JSON.stringify(value));
};
const read = async (file) => JSON.parse(await readFile(file, "utf8"));
test("batch recertification retains frozen inputs, native refusals, deterministic ordering and screen refusals", async () => {
  const root = await mkdtemp(join(tmpdir(), "recertify-test-"));
  const program = await read(
    new URL("../releases/v1/personas/P1.json", import.meta.url),
  );
  const run = join(root, "runs/recording");
  try {
    await write(join(run, "manifest.json"), {
      ehr: { mode: "real" },
      personas: ["P1"],
    });
    await write(join(root, "fixtures/synthea/index.json"), {
      patients: [
        { file: "p.json", flags: { pediatric: true, surgical: true } },
      ],
    });
    const originals = [];
    for (const version of [0, 1, 2]) {
      const p = { ...program, version };
      await write(join(run, `programs/P1/v${version}.json`), p);
      const frozen = join(run, `certifications/P1/v${version}/spec.json`);
      await write(frozen, { frozen: version });
      await write(join(run, `certifications/P1/v${version}/inputs.json`), {
        program: p,
        prev: program,
        canonical: program,
      });
      originals.push(await readFile(frozen, "utf8"));
    }
    const calls = [],
      rendered = [];
    const ehr = {
      deploy: async (input) => {
        calls.push({
          version: input.program.version,
          spec: await read(input.specVersion),
          canonical: input.canonical,
          prev: input.prev,
        });
        return input.program.version === 2
          ? { deployed: false, verdict: { status: "fail", property: "frozen" } }
          : {
              deployed: true,
              certificate: {
                verdict: "ok",
                programHash: String(input.program.version),
              },
            };
      },
      renderScreens: async (input) => {
        rendered.push(input.program.version);
        const file = join(input.outDir, "orders.json");
        await write(file, { screen: "orders", version: input.program.version });
        return [file];
      },
    };
    let batches = 0;
    const executeScreens = async (_command, args, env) => {
      batches++;
      assert.equal(args.at(-2), "--manifest");
      const files = await read(args.at(-1));
      assert.equal(files.length, 4); // Two bundles for each native-accepted revision.
      const trees = await Promise.all(
        files.map(async (file) => {
          const tree = await read(file);
          return {
            file,
            sha256: contextDigest(tree),
            status: tree.version === 1 ? "fail" : "pass",
            projects: ["desktop", "narrow"].map((project) => ({
              project,
              status: tree.version === 1 ? "fail" : "pass",
            })),
          };
        }),
      );
      await write(env.EHR_SCREEN_RESULT, {
        trees,
        status: "fail",
        controlsStatus: "pass",
        cache: { hits: 0, misses: 4 },
      });
      return 1;
    };
    const result = await recertifyRuns({
      runs: ["recording"],
      root,
      output: join(root, "out"),
      ehr,
      build: { appSha256: "test" },
      executeScreens,
    });
    assert.equal(batches, 1);
    assert.deepEqual(calls.map((call) => call.version).sort(), [0, 1, 2]);
    for (const call of calls) {
      assert.deepEqual(call.spec, { frozen: call.version });
      assert.deepEqual(call.canonical, program);
      assert.deepEqual(call.prev, program);
    }
    assert(!rendered.includes(2));
    assert.deepEqual(
      result.certificates.map((certificate) => certificate.version),
      [0, 1, 2],
    );
    assert.equal(result.certificates[1].screen, "fail");
    assert.equal(result.certificates[2].native.status, "fail");
    assert.equal(result.certificates[0].status, "certified"); // Failed siblings retain their own refusals.
    for (const version of [0, 1, 2])
      assert.equal(
        await readFile(
          join(run, `certifications/P1/v${version}/spec.json`),
          "utf8",
        ),
        originals[version],
      );
    const savedWorkers = process.env.EHR_SCREEN_WORKERS;
    try {
      process.env.EHR_SCREEN_WORKERS = "1";
      const serial = await recertifyRuns({
        runs: ["recording"],
        root,
        output: join(root, "serial"),
        ehr,
        build: { appSha256: "test" },
        executeScreens,
      });
      assert.deepEqual(serial.certificates, result.certificates);
    } finally {
      if (savedWorkers === undefined) delete process.env.EHR_SCREEN_WORKERS;
      else process.env.EHR_SCREEN_WORKERS = savedWorkers;
    }
    const failedControls = async (command, args, env) => {
      await executeScreens(command, args, env);
      const report = await read(env.EHR_SCREEN_RESULT);
      await write(env.EHR_SCREEN_RESULT, { ...report, controlsStatus: "fail" });
      return 1;
    };
    const refused = await recertifyRuns({
      runs: ["recording"],
      root,
      output: join(root, "controls"),
      ehr,
      build: {},
      executeScreens: failedControls,
    });
    assert(
      refused.certificates.every(
        (certificate) => certificate.status === "rejected",
      ),
    );
    await assert.rejects(
      recertifyRuns({
        runs: ["recording"],
        root,
        output: join(root, "infrastructure"),
        ehr,
        build: {},
        executeScreens: async () => null,
      }),
      /ENOENT/,
    );
    const changed = await read(join(run, "certifications/P1/v0/inputs.json"));
    changed.program.version = 99;
    await write(join(run, "certifications/P1/v0/inputs.json"), changed);
    await assert.rejects(
      recertifyRuns({
        runs: ["recording"],
        root,
        output: join(root, "out2"),
        ehr,
        build: {},
        executeScreens,
      }),
      /Recorded program differs/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
