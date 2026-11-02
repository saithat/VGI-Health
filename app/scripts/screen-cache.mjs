import { createHash, randomUUID } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
export const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const contextDigest = (parts) => digest(JSON.stringify(parts));
export function cachedTree(directory, context, sha256) {
  try {
    const receipt = JSON.parse(readFileSync(resolve(directory, `${sha256}.pass.json`), "utf8"));
    return receipt.context === context && receipt.sha256 === sha256 && receipt.passed === true &&
      JSON.stringify(receipt.projects) === JSON.stringify(["desktop", "narrow"]);
  } catch { return false; }
}
/** Only a completely passing two-viewport batch may mint receipts. */
export function recordBatch(directory, context, entries, checked, passed) {
  mkdirSync(directory, { recursive: true });
  const id = randomUUID();
  const receipt = { id, context, passed, projects: ["desktop", "narrow"], checkedAt: new Date().toISOString(), entries };
  const file = resolve(directory, `${id}.coverage.json`);
  writeFileSync(file, JSON.stringify(receipt, null, 2));
  if (passed) for (const sha256 of checked) {
    const target = resolve(directory, `${sha256}.pass.json`);
    const temporary = `${target}.${id}.tmp`;
    writeFileSync(temporary, JSON.stringify({ context, sha256, passed: true, projects: receipt.projects, batch: id }));
    renameSync(temporary, target);
  }
  return file;
}
