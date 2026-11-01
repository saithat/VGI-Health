import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { spawnSync } from "node:child_process";
const files = process.argv
  .slice(2)
  .map((file) => resolve(process.env.INIT_CWD ?? process.cwd(), file));
if (!files.length || files.some((file) => !existsSync(file))) {
  process.stderr.write(
    "Usage: pnpm --filter app screen-check <page-tree.json …>\nPaths are relative to the invoking directory (or absolute). Every input must exist.\n",
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
const result = spawnSync(
  process.execPath,
  [
    resolve(appDir, "node_modules/@playwright/test/cli.js"),
    "test",
    "screen-check.spec.ts",
    "--fully-parallel",
    "--workers",
    process.env.EHR_SCREEN_WORKERS ?? "4",
    "--config",
    resolve(appDir, "playwright.config.ts"),
  ],
  {
    cwd: appDir,
    stdio: "inherit",
    env: { ...process.env, APP_TEST_PORT: port, EHR_SCREEN_FILES: JSON.stringify(files) },
  },
);
if (result.error) process.stderr.write(`${result.error.message}\n`);
process.exit(result.status ?? 1);
