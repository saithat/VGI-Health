import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { digest, contextDigest, cachedTree, recordBatch } from "../scripts/screen-cache.mjs";

describe("whole-version screen receipts", () => {
  it("reuses only exact trees under the same checks/build and only after a passing whole batch", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "screen-cache-test-"));
    try {
      const context = contextDigest({ app: "a", browser: "b", assertions: "c", font: 12 });
      const tree = digest('{"title":"Orders"}');
      recordBatch(directory, context, [{ sha256: tree }], [tree], false);
      expect(cachedTree(directory, context, tree)).toBe(false);
      recordBatch(directory, context, [{ sha256: tree }], [tree], true);
      expect(cachedTree(directory, context, tree)).toBe(true);
      expect(cachedTree(directory, context, digest('{"title":"Changed"}'))).toBe(false);
      for (const key of ["app", "browser", "assertions", "font"]) {
        const changed = contextDigest({ ...{ app: "a", browser: "b", assertions: "c", font: 12 }, [key]: "changed" });
        expect(cachedTree(directory, changed, tree)).toBe(false);
      }
      const file = resolve(directory, `${tree}.pass.json`);
      const receipt = JSON.parse(readFileSync(file, "utf8"));
      writeFileSync(file, JSON.stringify({ ...receipt, projects: ["desktop"] }));
      expect(cachedTree(directory, context, tree)).toBe(false);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
