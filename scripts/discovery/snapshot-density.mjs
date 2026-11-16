#!/usr/bin/env node
/** Freeze only exact vendor-reference measurements. Reads existing reports;
 * never launches a browser or reads candidate density as a limit. */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
const sha = (data) => createHash("sha256").update(data).digest("hex");
const stable = (x) =>
  Array.isArray(x)
    ? `[${x.map(stable).join(",")}]`
    : x && typeof x === "object"
      ? `{${Object.keys(x)
          .sort()
          .map((k) => JSON.stringify(k) + ":" + stable(x[k]))
          .join(",")}}`
      : JSON.stringify(x);
const root = resolve(process.argv[2] ?? "/home/saithat/Projects/VGI-Health");
const expected = new Map(),
  measurements = {};
for (const version of ["v1", "v2", "v3"])
  for (const persona of ["P1", "P2", "P3", "P4", "P5"]) {
    const vendor = JSON.parse(
      await readFile(`releases/${version}/personas/${persona}.json`, "utf8"),
    );
    const hash = sha(stable({ ...vendor, id: persona, owner: persona }));
    expected.set(hash, `${version}/${persona}`);
  }
async function files(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? files(join(dir, e.name)) : join(dir, e.name),
      ),
    )
  ).flat();
}
for (const run of [
  "rules4-10day",
  "rules3-10day-invalid-simloop",
  "rules2-10day-invalid-r5ref",
])
  for (const path of (await files(join(root, "runs", run, "reports/screens")))
    .filter((p) => p.endsWith("/screen-policy.json"))
    .sort()) {
    const bytes = await readFile(path),
      text = bytes.toString();
    // Reference receipts occur first; avoid decoding large, irrelevant geometry.
    const start = text.indexOf('"densityReference"');
    if (start < 0) continue;
    const colon = text.indexOf(":", start),
      suffix = text.slice(colon + 1).trimStart();
    if (suffix[0] !== "{") continue;
    let end = 0,
      depth = 0,
      string = false,
      escape = false;
    for (; end < suffix.length; end++) {
      const c = suffix[end];
      if (string) {
        if (escape) escape = false;
        else if (c === "\\") escape = true;
        else if (c === '"') string = false;
      } else if (c === '"') string = true;
      else if (c === "{") depth++;
      else if (c === "}" && !--depth) {
        end++;
        break;
      }
    }
    const receipt = JSON.parse(suffix.slice(0, end)),
      key = expected.get(receipt.programSha256);
    if (!key) continue;
    const measurement = (measurements[key] ??= {
      vendorProgramSha256: receipt.programSha256,
      limits: {},
      sources: {},
    });
    for (const [screen, limit] of Object.entries(receipt.limits)) {
      if (!Number.isInteger(limit) || limit < 0)
        throw Error("Malformed vendor density measurement");
      if (
        measurement.limits[screen] !== undefined &&
        measurement.limits[screen] >= limit
      )
        continue;
      measurement.limits[screen] = limit;
      measurement.sources[screen] = {
        source: relative(root, path),
        reportSha256: sha(bytes),
        measurementContext: receipt.context,
        referenceSource: receipt.source,
      };
    }
  }
if (Object.keys(measurements).length !== 15)
  throw Error("Missing persona/release vendor reference");
const output = {
  description:
    "Per-screen maxima over existing exact vendor-reference contexts. Only densityReference receipts with an exact release persona Program hash qualify. No candidate counts set a limit.",
  measurements: Object.fromEntries(Object.entries(measurements).sort()),
};
await writeFile(
  "docs/methods/lean-screen-density.json",
  JSON.stringify(output, null, 2) + "\n",
);
console.log(
  `Frozen ${Object.keys(measurements).length} vendor persona/release references`,
);
