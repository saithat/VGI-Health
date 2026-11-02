#!/usr/bin/env node
// Canonical release audit; exports representative native states without editing releases/data.
import { createHash } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  mkdtempSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.TMPDIR)
  throw new Error("Set TMPDIR to disk-backed scratch space");
const output = process.argv[2]
  ? resolve(process.argv[2])
  : mkdtempSync(resolve(process.env.TMPDIR, "policy-canonical-"));
mkdirSync(output, { recursive: true });
const index = JSON.parse(
  readFileSync(resolve(root, "fixtures/synthea/index.json"), "utf8"),
);
const cases = [
  [
    "adult-allergic",
    index.patients.find((p) => p.flags.allergic && !p.flags.pediatric),
  ],
  ["pediatric", index.patients.find((p) => p.flags.pediatric)],
];
const personaMode = process.argv.includes("--personas");
const hashes = new Map();
const exports = [];
for (const version of ["v1", "v2", "v3"]) {
  const candidates = personaMode
    ? ["P1", "P2", "P3", "P4", "P5"]
    : ["canonical"];
  for (const candidate of candidates) {
    const program =
      candidate === "canonical"
        ? `releases/${version}/canonical.json`
        : `releases/${version}/personas/${candidate}.json`;
    const projected = JSON.parse(readFileSync(resolve(root, program), "utf8"));
    const userPath = resolve(output, `${version}-${candidate}-user.json`);
    writeFileSync(
      userPath,
      JSON.stringify({ id: projected.owner, role: projected.role }),
    );
    const selectedCases = personaMode
      ? cases.filter(
          ([name]) =>
            name === (candidate === "P4" ? "pediatric" : "adult-allergic"),
        )
      : cases;
    for (const [scenario, patient] of selectedCases) {
      if (!patient) throw new Error(`No ${scenario} fixture`);
      const directory = resolve(output, version, candidate, scenario);
      const args = [
        "render-screens",
        "--spec",
        `releases/${version}/spec.json`,
        "--program",
        program,
        ...(personaMode ? ["--user", userPath] : []),
        "--fhir",
        `fixtures/synthea/${patient.file}`,
        "--today",
        index.referenceDate,
        "--ui",
        "--out",
        directory,
      ];
      const result = spawnSync(
        resolve(root, "lean/.lake/build/bin/ehr"),
        args,
        { cwd: root, stdio: "inherit" },
      );
      if (result.status !== 0) process.exit(result.status ?? 1);
      const states = readdirSync(directory)
        .filter((name) => name.endsWith(".json"))
        .map((name) => {
          const file = resolve(directory, name);
          const sha256 = createHash("sha256")
            .update(readFileSync(file))
            .digest("hex");
          if (!hashes.has(sha256)) hashes.set(sha256, file);
          return { file, sha256, checkedAs: hashes.get(sha256) };
        });
      exports.push({
        version,
        candidate,
        scenario,
        patient: patient.file,
        args,
        states,
      });
    }
  }
}
writeFileSync(
  resolve(output, "exports.json"),
  JSON.stringify({ date: index.referenceDate, exports }, null, 2),
);
console.log(
  `Canonical policy audit: ${exports.reduce((n, entry) => n + entry.states.length, 0)} exports, ${hashes.size} unique trees. Output: ${output}`,
);
if (process.argv.includes("--export-only")) process.exit(0);
const result = spawnSync(
  process.execPath,
  [resolve(root, "app/scripts/screen-check.mjs"), "--ui", ...hashes.values()],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      EHR_SCREEN_WORKERS: process.env.EHR_SCREEN_WORKERS ?? "4",
      EHR_SCREEN_CACHE: "0",
      EHR_PHYSICAL_REPORT: resolve(output, "physical.json"),
      EHR_SCREEN_RESULT: resolve(output, "result.json"),
    },
  },
);
process.exit(result.status ?? 1);
