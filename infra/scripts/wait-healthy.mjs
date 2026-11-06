#!/usr/bin/env node
import { loadEnv } from './lib.mjs';
loadEnv();
const identity = process.argv.includes('--identity');
const base = identity ? (process.env.KEYCLOAK_ISSUER ?? 'http://localhost:18180/realms/vgi') : (process.env.COMMIT_BASE_URL ?? 'http://127.0.0.1:18090');
const path = identity ? '/.well-known/openid-configuration' : '/health';
const deadline = Date.now() + 120000;
while (true) {
  try { if ((await fetch(base + path, { signal: AbortSignal.timeout(2000) })).ok) break; } catch {}
  if (Date.now() >= deadline) throw new Error(`Commit service unavailable at ${base}; inspect docker compose -f infra/docker-compose.yml logs`);
  await new Promise(r => setTimeout(r, 1000));
}
console.log(identity ? 'Keycloak is healthy' : 'Commit service and native guard are healthy');
