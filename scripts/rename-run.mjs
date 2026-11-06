#!/usr/bin/env node
/** Rename a stopped local recording. Only identity references and their hashes
 * change; no simulation, certification, measurements or model calls run here.
 */
import { readFile, readdir, rename, access, open, rm } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
const hash = (b) => createHash("sha256").update(b).digest("hex");
const stable = (v) =>
  JSON.stringify(
    Array.isArray(v)
      ? v.map((x) => JSON.parse(stable(x)))
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, JSON.parse(stable(v[k]))]),
          )
        : v,
  );
function replaceIdentity(text, oldId, newId, json) {
  const escaped = oldId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const token = new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "g");
  if (!json) return text.replace(token, newId);
  // Preserve serialization and property names; path-indexed object keys may
  // contain an ID, while ordinary keys such as rebind's "old" must not change.
  return text.replace(/"(?:[^"\\]|\\.)*"/g, (literal, offset) => {
    const value = JSON.parse(literal),
      key = /^\s*:/.test(text.slice(offset + literal.length));
    if (key && !value.includes("/")) return literal;
    const next = value.replace(token, newId);
    return next === value ? literal : JSON.stringify(next);
  });
}
async function walk(dir, prefix = "") {
  const files = [];
  for (const entry of await readdir(path.join(dir, prefix), {
    withFileTypes: true,
  })) {
    const file = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Refusing symlink: ${file}`);
    if (entry.isDirectory()) files.push(...(await walk(dir, file + "/")));
    else if (
      entry.isFile() &&
      /\.(?:json|jsonl|json\.gz|jsonl\.gz|md|txt)$/.test(file)
    )
      files.push(file);
  }
  return files.sort();
}
export async function renameRun(
  oldId,
  newId,
  { root = path.resolve(import.meta.dirname, "..") } = {},
) {
  if (
    !/^[\w-]+$/.test(oldId ?? "") ||
    !/^[\w-]+$/.test(newId ?? "") ||
    oldId === newId
  )
    throw new Error(
      "Usage: rename-run.mjs <old> <new> (distinct local run IDs)",
    );
  const source = path.join(root, "runs", oldId),
    target = path.join(root, "runs", newId);
  if (
    await access(target).then(
      () => true,
      () => false,
    )
  )
    throw new Error("Destination already exists");
  const manifest = JSON.parse(
    await readFile(path.join(source, "manifest.json"), "utf8"),
  );
  if (manifest.runId !== oldId)
    throw new Error("Source manifest identity mismatch");
  if (["running", "initializing"].includes(manifest.status))
    throw new Error("Stop the run before renaming it");
  const files = await walk(source);
  // The lock is outside the source so it cannot enter content digests.
  const lockFile = path.join(root, "runs", `.rename-${oldId}.lock`),
    lock = await open(lockFile, "wx");
  const { writeFileAtomic, writeJsonAtomic } =
    await import("../agent/src/util.js");
  const { contentDigest, writeDayDigest, writeNightDigest } =
    await import("../agent/src/content-digest.js");
  const replacements = new Map();
  let changed = 0,
    moved = false;
  const remember = (before, after) => {
    if (before === after) return;
    replacements.set(hash(before), hash(after));
    try {
      replacements.set(
        hash(stable(JSON.parse(before))),
        hash(stable(JSON.parse(after))),
      );
    } catch {
      /* Text/JSONL has only a byte digest. */
    }
  };
  try {
    await lock.writeFile(String(process.pid));
    // A certification binding hashes a pair of frozen files. Map only the
    // exact original pair, preserving historical generations bound to other
    // inputs; renaming must never repair an unrelated stale certificate.
    for (const file of files) {
      if (!/^certifications\/P[1-5]\/v\d+\/inputs\.json$/.test(file)) continue;
      const inputText = await readFile(path.join(source, file), "utf8"),
        specText = await readFile(
          path.join(source, path.dirname(file), "spec.json"),
          "utf8",
        );
      const nextInput = replaceIdentity(inputText, oldId, newId, true),
        nextSpec = replaceIdentity(specText, oldId, newId, true);
      if (nextInput !== inputText || nextSpec !== specText)
        replacements.set(
          hash(
            stable({
              spec: JSON.parse(specText),
              inputs: JSON.parse(inputText),
            }),
          ),
          hash(
            stable({
              spec: JSON.parse(nextSpec),
              inputs: JSON.parse(nextInput),
            }),
          ),
        );
    }
    // Rename first; a failed rewrite remains on this target and is explicitly
    // reported, never silently restored to a misleading old identity.
    await rename(source, target);
    moved = true;
    for (const file of files) {
      if (/(^|\/)digest\.json$/.test(file)) continue;
      const absolute = path.join(target, file),
        bytes = await readFile(absolute),
        text = (file.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString();
      const next = replaceIdentity(
        text,
        oldId,
        newId,
        /\.jsonl?(?:\.gz)?$/.test(file),
      );
      if (next === text) continue;
      const output = file.endsWith(".gz") ? gzipSync(next) : Buffer.from(next);
      remember(text, next);
      remember(bytes, output);
      await writeFileAtomic(absolute, output);
      changed++;
    }
    // Repair transitive raw/semantic SHA-256 references, including input bindings
    // and append-only receipts. Content digests are regenerated separately below.
    for (let round = 0; round < 16; round++) {
      let updates = 0;
      for (const file of files) {
        if (/(^|\/)digest\.json$/.test(file)) continue;
        const absolute = path.join(target, file),
          bytes = await readFile(absolute),
          text = (file.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString();
        const next = text.replace(
          /[a-f0-9]{64}/g,
          (value) => replacements.get(value) ?? value,
        );
        if (next === text) continue;
        const output = file.endsWith(".gz")
          ? gzipSync(next)
          : Buffer.from(next);
        remember(text, next);
        remember(bytes, output);
        await writeFileAtomic(absolute, output);
        updates++;
      }
      if (!updates) break;
      if (round === 15)
        throw new Error("Cyclic digest references; manual recovery required");
    }
    for (const file of files) {
      const day = /^days\/day-(\d+)\/digest\.json$/.exec(file);
      if (day) await writeDayDigest(target, +day[1], manifest.personas);
      const night = /^completion\/night-(\d+)\.json$/.exec(file);
      if (night) await writeNightDigest(target, +night[1], manifest.personas);
    }
    const digest = await contentDigest(target);
    if (files.includes("digest.json"))
      await writeJsonAtomic(path.join(target, "digest.json"), digest);
    const rewritten = JSON.parse(
      await readFile(path.join(target, "manifest.json"), "utf8"),
    );
    if ("contentDigest" in rewritten)
      await writeJsonAtomic(path.join(target, "manifest.json"), {
        ...rewritten,
        contentDigest: digest.contentDigest,
      });
    return { oldId, newId, changed, contentDigest: digest.contentDigest };
  } catch (error) {
    throw new Error(
      `${moved ? `Rename stopped at ${target}; preserve it for recovery` : source}: ${error.message}`,
      { cause: error },
    );
  } finally {
    await lock.close();
    await rm(lockFile, { force: true });
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const { register } =
    await import("../agent/node_modules/tsx/dist/esm/api/index.mjs");
  register();
  console.log(await renameRun(...process.argv.slice(2)));
}
