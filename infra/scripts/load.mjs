#!/usr/bin/env node
// Offline initial-state import; no clinical write HTTP route.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { loadEnv, REPO_ROOT } from './lib.mjs';
loadEnv();
const result = spawnSync(process.execPath, ['--experimental-strip-types', resolve(REPO_ROOT, 'services/commit/src/provision.ts'), ...process.argv.slice(2)], { cwd: REPO_ROOT, env: process.env, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
