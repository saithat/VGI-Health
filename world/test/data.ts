import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Presence only: malformed archive inputs must still fail their assertions. */
export function dataReason(...paths: string[]): string | undefined {
  const missing = paths.filter(
    (path) => !existsSync(resolve(import.meta.dirname, "../..", path)),
  );
  return missing.length
    ? `needs ${missing.join(", ")}; extract with \`git archive hackathon-final runs fixtures programs verdicts.json | tar -x\``
    : undefined;
}
