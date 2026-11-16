import { URL } from "node:url";
import console from "node:console";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
const dist = new URL("../dist/", import.meta.url);
test("built Lean entry and every transitive chunk exclude React and Mantine", () => {
  const report = JSON.parse(
    readFileSync(new URL("lean-bundle-report.json", dist), "utf8"),
  );
  assert.ok(report.lean.chunks.length);
  assert.ok(
    report.lean.modules.some((id) => id.endsWith("/src/lean-ui/painter.ts")),
  );
  assert.ok(
    report.app.modules.some((id) => id.includes("/react/")),
    "comparison must include the existing app",
  );
  assert.deepEqual(
    report.lean.modules.filter((id) =>
      /\/(?:react|react-dom|@mantine)(?:\/|@)/.test(id),
    ),
    [],
  );
  for (const chunk of report.lean.chunks)
    assert.doesNotMatch(
      readFileSync(new URL(chunk, dist), "utf8"),
      /\breact\b|@mantine/i,
      chunk,
    );
  console.log(
    JSON.stringify({
      leanBytes: report.lean.bytes,
      leanGzipBytes: report.lean.gzipBytes,
      appBytes: report.app.bytes,
      appGzipBytes: report.app.gzipBytes,
    }),
  );
});
