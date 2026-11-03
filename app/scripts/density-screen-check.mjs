/** Audit every emitted compact historical state plus cascading fixture controls. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = resolve(process.argv[2]);
const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const results = read(resolve(output, "results.json"));
const files = results.rows
  .flatMap((row) => row.screenFiles)
  .filter((file) => read(file).compact?.length);
if (!files.length) throw new Error("No emitted compact states to audit");
const ids = (nodes) =>
  nodes.flatMap((node) => {
    const payload = Object.values(node)[0];
    if (!payload || typeof payload !== "object") return [];
    return [
      payload.comp,
      payload.id,
      ...ids(payload.children ?? payload.body ?? []),
    ].filter((id) => typeof id === "string" && id.length);
  });
const fixtures = resolve(output, "compact-fixtures");
mkdirSync(fixtures, { recursive: true });
for (const [name, file] of [
  ["long-form", "punch/P5-op-note.json"],
  ["table", "presentations/table.json"],
]) {
  const normal = { ...read(resolve(root, "app/src/fixtures", file)), side: [] };
  for (const scope of ["components", "sections"]) {
    const compact = ids(normal.workspace).filter(
      (id) =>
        scope === "components" ||
        normal.workspace.some((node) => node.section?.id === id),
    );
    if (!compact.length) continue;
    const destination = resolve(fixtures, `${name}-${scope}.json`);
    writeFileSync(destination, JSON.stringify({ ...normal, compact }));
    files.push(destination);
  }
}
writeFileSync(
  resolve(output, "compact-screen-files.json"),
  JSON.stringify(files, null, 2),
);
const checked = spawnSync(
  process.execPath,
  [resolve(root, "app/scripts/screen-check.mjs"), "--ui", ...files],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      EHR_SCREEN_CACHE: "0",
      EHR_PHYSICAL_POLICY: "1",
      EHR_ENFORCE_PHYSICAL: "1",
      EHR_SCREEN_RESULT: resolve(output, "compact-screen-result.json"),
      EHR_PHYSICAL_REPORT: resolve(output, "compact-physical.json"),
    },
  },
);
process.exit(checked.status ?? 1);
