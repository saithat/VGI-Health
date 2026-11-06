#!/usr/bin/env node
// Full audits hold $TMPDIR/vgi-browser-heavy.lock, passing its token to nested
// screen checks (EHR_BROWSER_LOCK=off opts out). Default: 4 memory-bounded
// workers (ceiling 6), 64-tree batches, shared atomic physical samples under
// $TMPDIR/vgi-screen-check-cache/physical. Timeout/crash-only retries halve
// workers, at most twice; exact tree/context/bundle dedupe maps every state.
// Iterate with targeted --grep/subsets. Full audits/timings belong to the final
// merged check. See README for defaults.
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
import { acquireBrowserLock } from "./browser-heavy-lock.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ehrBinary = process.env.EHR_BIN ?? resolve(root, "lean/.lake/build/bin/ehr");
if (!process.env.TMPDIR)
  throw new Error("Set TMPDIR to disk-backed scratch space");
const browserLock = process.argv.includes("--export-only")
  ? null
  : await acquireBrowserLock();
const destination = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const output = destination
  ? resolve(destination)
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
const urgencyOnly = process.argv.includes("--urgency-only");
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
        ehrBinary,
        args,
        { cwd: root, stdio: "inherit" },
      );
      if (result.status !== 0) process.exit(result.status ?? 1);
      const states = readdirSync(directory)
        .filter((name) => name.endsWith(".json"))
        .sort()
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
// Exercise workflow snapshots and simultaneous conditions through the same
// native semantic renderer, even when historical patient fixtures lack panic results.
const probeExport = spawnSync(ehrBinary, ["urgency-probes"], {
  cwd: root, encoding: "utf8",
});
if (probeExport.status !== 0) throw new Error(probeExport.stderr || "urgency-probes failed");
const probes = JSON.parse(probeExport.stdout).map(([name, tree]) => {
  const file = resolve(output, `${name}.json`);
  writeFileSync(file, JSON.stringify(tree));
  const sha256 = createHash("sha256").update(readFileSync(file)).digest("hex");
  if (!hashes.has(sha256)) hashes.set(sha256, file);
  return { file, sha256, checkedAs: hashes.get(sha256) };
});
exports.push({ version: "v1", candidate: "urgency-workflow", scenario: "critical-and-concurrent", states: probes });
writeFileSync(
  resolve(output, "exports.json"),
  JSON.stringify({ date: index.referenceDate, exports }, null, 2),
);
console.log(
  `Canonical policy audit: ${exports.reduce((n, entry) => n + entry.states.length, 0)} exports, ${hashes.size} unique trees. Output: ${output}`,
);
if (process.argv.includes("--export-only")) process.exit(0);
// Focused urgency audit: retain every distinct strip/modal/banner presentation,
// choosing the largest body as its scroll stress case. Critical workflow states
// are all retained. This is representative geometry, not whole-version approval.
let selected = [...hashes.values()];
if (urgencyOnly) {
  const groups = new Map();
  for (const file of selected) {
    const content = readFileSync(file, "utf8");
    const tree = JSON.parse(content);
    if (!tree.urgent?.length) continue;
    const key = JSON.stringify([tree.banner, tree.urgent, tree.modal]);
    const group = groups.get(key) ?? { file, bytes: 0, members: [] };
    group.members.push(file);
    if (content.length > group.bytes) { group.file = file; group.bytes = content.length; }
    groups.set(key, group);
  }
  selected = [...new Set([...groups.values()].map((group) => group.file).concat(probes.map((p) => p.file)))];
  writeFileSync(resolve(output, "urgency-selection.json"), JSON.stringify({
    scope: "representative distinct strip/modal/banner presentations; largest body per group; all critical workflow states",
    sourceTrees: hashes.size, selected, groups: [...groups.values()],
  }, null, 2));
  console.log(`Urgency audit: ${selected.length} representatives from ${hashes.size} unique source trees`);
}
const result = spawnSync(
  process.execPath,
  [resolve(root, "app/scripts/screen-check.mjs"), "--ui", ...selected],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      EHR_PHYSICAL_POLICY: "1",
      EHR_ENFORCE_PHYSICAL: "1",
      EHR_PHYSICAL_REPORT: resolve(output, "physical.json"),
      EHR_SCREEN_RESULT: resolve(output, "result.json"),
    },
  },
);
browserLock?.release();
process.exit(result.status ?? 1);
