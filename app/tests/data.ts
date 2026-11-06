import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, type TestFunction } from "vitest";

/** Skip only absent archive inputs; corrupt or incomplete present data still fails. */
export function withData(...paths: string[]) {
  const missing = paths.filter(
    (path) => !existsSync(resolve(import.meta.dirname, "../..", path)),
  );
  const reason = missing.length
    ? `needs ${missing.join(", ")}; restore these local files with their matching frozen recording inputs`
    : null;
  const title = (name: string) => (reason ? `${name} (${reason})` : name);
  return {
    it: (name: string, fn: TestFunction, timeout?: number) =>
      it.skipIf(reason !== null)(title(name), fn, timeout),
    describe: (name: string, fn: () => void) =>
      describe.skipIf(reason !== null)(title(name), fn),
  };
}
