// Integration test: invoke under the shared browser-heavy flock after app build.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
const root = resolve(import.meta.dirname, "..");
const read = async (file) => JSON.parse(await readFile(file, "utf8"));
test(
  "real serial, parallel, cold, warm and uncached gates retain identical per-tree passes and failures",
  { timeout: 180_000 },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "screen-cache-browser-"));
    try {
      const bad = await read(join(root, "app/src/fixtures/ui/w1Rooming.json"));
      bad.workspace = [
        {
          button: {
            comp: "critical",
            label: "Acknowledge",
            role: "ack",
            enabled: false,
            blockedReason: "Test disabled acknowledgment",
            hotkey: null,
          },
        },
      ];
      const badFile = join(directory, "disabled-ack.json");
      await writeFile(badFile, JSON.stringify(bad));
      const files = [join(root, "app/src/fixtures/ui/w1Rooming.json"), badFile];
      const results = [];
      for (const [name, workers, cache] of [
        ["serial", 1, "0"],
        ["parallel", 4, "0"],
        ["cold", 4, "1"],
        ["warm", 4, "1"],
      ]) {
        const output = join(directory, `${name}.json`);
        const result = spawnSync(
          process.execPath,
          [join(root, "app/scripts/screen-check.mjs"), "--ui", ...files],
          {
            cwd: root,
            env: {
              ...process.env,
              CI: "true",
              EHR_SCREEN_WORKERS: String(workers),
              EHR_SCREEN_CACHE: cache,
              EHR_SCREEN_CACHE_DIR: join(directory, "cache"),
              EHR_SCREEN_RESULT: output,
              EHR_URGENT_ALERT_IDS: '["critical"]',
            },
            encoding: "utf8",
            maxBuffer: 10 * 1024 ** 2,
          },
        );
        assert.equal(
          result.status,
          1,
          `${name}: ${result.stdout}\n${result.stderr}`,
        );
        const report = await read(output);
        assert.equal(report.status, "fail");
        const normalized = report.trees.map((tree) => ({
          sha256: tree.sha256,
          status: tree.status,
          projects: tree.projects.map(({ project, status }) => ({
            project,
            status,
          })),
          measurements: tree.physical.measurements,
        }));
        assert.deepEqual(
          normalized.map((tree) => tree.status),
          ["pass", "fail"],
        );
        if (results.length) assert.deepEqual(normalized, results[0], name);
        results.push(normalized);
        assert.deepEqual(report.cache, {
          hits: name === "warm" ? 2 : 0,
          misses: name === "warm" ? 0 : 2,
        });
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
