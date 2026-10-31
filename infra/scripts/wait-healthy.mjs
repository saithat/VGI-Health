#!/usr/bin/env node
// Blocks until the Medplum server healthcheck passes (and, optionally, the admin app answers).
//
// Usage: node infra/scripts/wait-healthy.mjs [--timeout 600] [--no-app]
// Env:   MEDPLUM_BASE_URL (default http://localhost:8103/), MEDPLUM_APP_URL (default http://localhost:3000/)
//
// Exit code 0 when healthy, 1 on timeout.

const args = process.argv.slice(2);
const timeoutSec = Number(argValue('--timeout') ?? process.env.WAIT_TIMEOUT_SECONDS ?? 600);
const checkApp = !args.includes('--no-app');
const baseUrl = withSlash(process.env.MEDPLUM_BASE_URL ?? 'http://localhost:8103/');
const appUrl = withSlash(process.env.MEDPLUM_APP_URL ?? 'http://localhost:3000/');

function argValue(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function withSlash(u) {
  return u.endsWith('/') ? u : u + '/';
}

async function serverHealthy() {
  try {
    const res = await fetch(new URL('healthcheck', baseUrl), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}` };
    const body = await res.json();
    return body.ok === true ? { ok: true, body } : { ok: false, why: JSON.stringify(body) };
  } catch (err) {
    return { ok: false, why: err.cause?.code ?? err.message };
  }
}

async function appUp() {
  try {
    const res = await fetch(appUrl, { signal: AbortSignal.timeout(5000) });
    return { ok: res.ok, why: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, why: err.cause?.code ?? err.message };
  }
}

const started = Date.now();
const deadline = started + timeoutSec * 1000;
let lastWhy = '';

async function waitFor(label, probe) {
  process.stdout.write(`Waiting for ${label}`);
  for (;;) {
    const r = await probe();
    if (r.ok) {
      const secs = ((Date.now() - started) / 1000).toFixed(0);
      process.stdout.write(` ok (${secs}s)\n`);
      return r;
    }
    if (Date.now() > deadline) {
      process.stdout.write('\n');
      console.error(`Timed out after ${timeoutSec}s waiting for ${label}; last status: ${r.why}`);
      console.error('Inspect with: docker compose -f infra/docker-compose.yml logs medplum-server');
      process.exit(1);
    }
    if (r.why !== lastWhy) {
      process.stdout.write(` [${r.why}]`);
      lastWhy = r.why;
    } else {
      process.stdout.write('.');
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

const server = await waitFor(`Medplum server ${baseUrl}healthcheck`, serverHealthy);
console.log(`  server: ${JSON.stringify(server.body)}`);
if (checkApp) {
  await waitFor(`Medplum app ${appUrl}`, appUp);
}
