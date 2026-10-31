import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
const files = process.argv.slice(2).map((file) => resolve(file));
if (!files.length || files.some((file) => !existsSync(file))) {
  process.stderr.write(
    "Usage: pnpm --filter app screen-check <page-tree.json …>\nPaths are relative to app/ (or absolute). Every input must exist.\n",
  );
  process.exit(1);
}
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  process.execPath,
  [
    resolve(appDir, "node_modules/@playwright/test/cli.js"),
    "test",
    "--config",
    resolve(appDir, "playwright.config.ts"),
  ],
  {
    cwd: appDir,
    stdio: "inherit",
    env: { ...process.env, EHR_SCREEN_FILES: JSON.stringify(files) },
  },
);
if (result.error) process.stderr.write(`${result.error.message}\n`);
process.exit(result.status ?? 1);
