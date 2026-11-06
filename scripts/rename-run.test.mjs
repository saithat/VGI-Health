import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  cp,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { renameRun } from "./rename-run.mjs";
import { contentDigest, writeDayDigest } from "../agent/src/content-digest.js";
const hash = (b) => createHash("sha256").update(b).digest("hex");
const put = async (root, file, value) => {
  await mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await writeFile(path.join(root, file), JSON.stringify(value));
};
test("rename on a copy preserves source/content, rewrites nested references, and repairs transitive bindings/digests", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "rename-run-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const original = path.join(root, "original"),
    source = path.join(root, "runs/old");
  await put(original, "manifest.json", {
    runId: "old",
    days: 1,
    personas: ["P1"],
    status: "completed",
    ehr: { mode: "real" },
    contentDigest: "stale",
  });
  await put(original, "days/day-01/P1.json", {
    day: 1,
    persona: "P1",
    programVersion: 0,
    task: "preserved",
  });
  const recorded = JSON.stringify({
    runId: "old",
    path: "runs/old/programs/P1/v0.json",
    unchanged: [1, 2, 3],
    old: "folder",
    method: "holdout",
  });
  await mkdir(path.join(original, "bindings"));
  await writeFile(path.join(original, "bindings/input.json"), recorded);
  const binding = JSON.stringify({ inputSha256: hash(recorded) });
  await writeFile(path.join(original, "bindings/link.json"), binding);
  await put(original, "bindings/receipt.json", {
    bindingSha256: hash(binding),
  });
  await writeFile(
    path.join(original, "compressed.json.gz"),
    gzipSync(recorded),
  );
  await writeFile(path.join(original, "journal.jsonl"), recorded + "\n");
  const { sha256, stableStringify } = await import("../agent/src/program.js");
  const spec = { version: "v1", clinical: "unchanged" },
    inputs = { path: "runs/old/programs/P1/v0.json" };
  await put(original, "certifications/P1/v0/spec.json", spec);
  await put(original, "certifications/P1/v0/inputs.json", inputs);
  await put(original, "certs/P1/v0.build.json", {
    certificationInputsSha256: sha256(stableStringify({ spec, inputs })),
  });
  await put(original, "certs/P1/v0.build.0.json", {
    certificationInputsSha256: "f".repeat(64),
    historical: true,
  });
  await writeDayDigest(original, 1, ["P1"]);
  await put(original, "digest.json", { stale: true });
  await cp(original, source, { recursive: true });
  const result = await renameRun("old", "new", { root });
  const target = path.join(root, "runs/new");
  assert.equal(result.newId, "new");
  await assert.rejects(access(source));
  assert.equal(
    JSON.parse(await readFile(path.join(original, "manifest.json"))).runId,
    "old",
  );
  assert.deepEqual(
    await readFile(path.join(original, "days/day-01/P1.json")),
    await readFile(path.join(target, "days/day-01/P1.json")),
  );
  const rewritten = await readFile(
    path.join(target, "bindings/input.json"),
    "utf8",
  );
  assert.deepEqual(JSON.parse(rewritten), {
    runId: "new",
    path: "runs/new/programs/P1/v0.json",
    unchanged: [1, 2, 3],
    old: "folder",
    method: "holdout",
  });
  const linked = await readFile(
    path.join(target, "bindings/link.json"),
    "utf8",
  );
  assert.equal(JSON.parse(linked).inputSha256, hash(rewritten));
  assert.equal(
    JSON.parse(await readFile(path.join(target, "bindings/receipt.json")))
      .bindingSha256,
    hash(linked),
  );
  assert.equal(
    gunzipSync(
      await readFile(path.join(target, "compressed.json.gz")),
    ).toString(),
    rewritten,
  );
  assert.equal(
    (await readFile(path.join(target, "journal.jsonl"), "utf8")).trim(),
    rewritten,
  );
  assert.equal(
    JSON.parse(await readFile(path.join(target, "certs/P1/v0.build.json")))
      .certificationInputsSha256,
    sha256(
      stableStringify({
        spec,
        inputs: { path: "runs/new/programs/P1/v0.json" },
      }),
    ),
  );
  assert.deepEqual(
    JSON.parse(await readFile(path.join(target, "certs/P1/v0.build.0.json"))),
    { certificationInputsSha256: "f".repeat(64), historical: true },
  );
  const digest = await contentDigest(target);
  assert.equal(digest.contentDigest, result.contentDigest);
  assert.equal(
    JSON.parse(await readFile(path.join(target, "digest.json"))).contentDigest,
    digest.contentDigest,
  );
  assert.equal(
    JSON.parse(await readFile(path.join(target, "manifest.json")))
      .contentDigest,
    digest.contentDigest,
  );
});
test("refuses active runs, occupied destinations, path traversal, and symlinks before moving data", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "rename-refuse-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await put(root, "runs/old/manifest.json", {
    runId: "old",
    status: "running",
  });
  await assert.rejects(renameRun("old", "new", { root }), /Stop the run/);
  await assert.rejects(renameRun("../old", "new", { root }), /Usage/);
  await put(root, "runs/old/manifest.json", {
    runId: "old",
    status: "completed",
  });
  const { symlink } = await import("node:fs/promises");
  await symlink("/tmp", path.join(root, "runs/old/link"));
  await assert.rejects(renameRun("old", "new", { root }), /Refusing symlink/);
  await mkdir(path.join(root, "runs/new"));
  await assert.rejects(
    renameRun("old", "new", { root }),
    /Destination already/,
  );
  await access(path.join(root, "runs/old/manifest.json"));
});
