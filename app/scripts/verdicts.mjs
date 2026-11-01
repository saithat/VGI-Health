import { spawnSync } from "node:child_process";
import { access, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { buildCatalog, root } from "./catalog.mjs";

const binary = resolve(root, "lean/.lake/build/bin/ehr");
let available = false;
try {
  await access(binary);
  const usage = spawnSync(binary, [], { encoding: "utf8" });
  available = /\bcheck\b/.test(`${usage.stdout}${usage.stderr}`);
} catch {
  /* Native checker is optional. */
}
const verdicts = {};
for (const program of (await buildCatalog()).programs) {
  const source = await readFile(resolve(root, program.path));
  const sha256 = createHash("sha256").update(source).digest("hex");
  if (/^releases\/[^/]+\/canonical\.json$/.test(program.path) ||
      program.path === "programs/canonical/v1.json") {
    verdicts[program.path] = { status: "reference", sha256,
      output: "Vendor master for comparison; mixed clinician roles make it a reference, not a deployable single-role program." };
    continue;
  }
  if (!available) {
    verdicts[program.path] = { status: "verdict not computed", sha256 };
    continue;
  }
  const previousRelease = { "v1.1": "v1", v2: "v1.1" }[program.release];
  const previousPath = previousRelease && program.path.startsWith(`releases/${program.release}/personas/`)
    ? program.path.replace(`releases/${program.release}/`, `releases/${previousRelease}/`)
    : undefined;
  const result = spawnSync(
    binary,
    [
      "check",
      "--spec",
      `releases/${program.release}/spec.json`,
      "--program",
      program.path,
      "--canonical",
      `releases/${program.release}/canonical.json`,
      ...(previousPath ? ["--prev", previousPath] : []),
    ],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  let output;
  try {
    output = JSON.parse(result.stdout);
  } catch {
    output = result.stdout || result.stderr || result.error?.message;
  }
  verdicts[program.path] = {
    status:
      result.status === 0
        ? "certified"
        : result.status === 1 &&
            typeof output === "object" &&
            output !== null &&
            "violation" in output
          ? "rejected"
          : "checker failed",
    sha256,
    output,
  };
}
await writeFile(
  resolve(root, "app/public/verdicts.json"),
  JSON.stringify(
    {
      checker: available ? "lean ehr check" : "unavailable",
      programs: verdicts,
    },
    null,
    2,
  ) + "\n",
);
process.stdout.write(
  `Recorded verdicts for ${Object.keys(verdicts).length} programs (${available ? "native checker" : "verdict not computed: ehr check unavailable"}).\n`,
);
