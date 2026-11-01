import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  [
    "node_modules/@playwright/test/cli.js",
    "test",
    "ui-shots.spec.ts",
    "--project=desktop",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, EHR_SHOTS: "1" },
  },
);
if (result.error) process.stderr.write(`${result.error.message}\n`);
process.exit(result.status ?? 1);
