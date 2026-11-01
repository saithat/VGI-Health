import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { spawnSync } from "node:child_process";
const ui = process.argv[2] === "--ui";
const files = process.argv
  .slice(ui ? 3 : 2)
  .map((file) => resolve(process.env.INIT_CWD ?? process.cwd(), file));
if (!files.length || files.some((file) => !existsSync(file))) {
  process.stderr.write(
    "Usage: pnpm --filter app screen-check [--ui] <screen.json …>\nPaths are relative to the invoking directory (or absolute). Every input must exist.\n",
  );
  process.exit(1);
}
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.APP_TEST_PORT ?? await new Promise((resolve, reject) => {
  const server = createServer();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    server.close(() => resolve(String(port)));
  });
});
const output = mkdtempSync(resolve(tmpdir(), "ehr-visibility-"));
const result = spawnSync(
  process.execPath,
  [
    resolve(appDir, "node_modules/@playwright/test/cli.js"),
    "test",
    ui ? "ui-check.spec.ts" : "screen-check.spec.ts",
    "--output", output, "--max-failures=1", "--workers", "1",
    "--config",
    resolve(appDir, "playwright.config.ts"),
  ],
  {
    cwd: appDir,
    stdio: "inherit",
    env: {
      ...process.env, APP_TEST_PORT: port, APP_TEST_PREVIEW: "1",
      [ui ? "EHR_UI_FILES" : "EHR_SCREEN_FILES"]: JSON.stringify(files),
    },
  },
);
if (result.status === 0) rmSync(output, { recursive: true, force: true });
else process.stderr.write(`Screen-check artifacts: ${output}\n`);
if (result.error) process.stderr.write(`${result.error.message}\n`);
process.exit(result.status ?? 1);
