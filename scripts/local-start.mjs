import { fetchData } from './fetch-data.mjs';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnv } from '../infra/scripts/lib.mjs';
import { checkNode, command, localEnvironment, prepareBuild, root, withLocalLock } from './local-build.mjs';

const app = join(root, 'app');
const composeFile = join(root, 'infra/docker-compose.yml');
const project = process.env.COMPOSE_PROJECT_NAME || 'vgi-local';
const envPath = join(root, '.env');
const compose = (args, options) => command('docker', ['compose', '-p', project,
  '--env-file', envPath, '-f', composeFile, '--profile', 'app', ...args], options);
const credentials = ['KEYCLOAK_ADMIN_PASSWORD', 'KEYCLOAK_PERSONA_PASSWORD', 'KEYCLOAK_4WEST_PASSWORD'];

async function dockerProblem() {
  const quiet = { quiet: true, timeout: 10000 };
  if (!await command('docker', ['compose', 'version'], quiet).then(() => true, () => false))
    return 'Install Docker with the Compose plugin to enable live EHR sign-in.';
  if (!await command('docker', ['info', '--format', '{{.ServerVersion}}'], quiet).then(() => true, () => false))
    return 'Start Docker and ensure your account can access it, then run pnpm start again.';
  return '';
}

function port(name, fallback) {
  const result = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(result) || result < 1 || result > 65535)
    throw new Error(`${name} must be a port between 1 and 65535.`);
  return result;
}

function configurePorts() {
  const pg = port('COMMIT_PG_PORT', 55532);
  const commit = port('COMMIT_PORT', 18090);
  const keycloak = port('KEYCLOAK_PORT', 18180);
  const base = process.env.KEYCLOAK_BASE_URL ?? `http://localhost:${keycloak}`;
  process.env.KEYCLOAK_BASE_URL = base;
  process.env.KEYCLOAK_URL = base;
  process.env.KEYCLOAK_ISSUER = new URL('/realms/vgi', base).href;
  process.env.VITE_KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER;
  process.env.DATABASE_URL = `postgres://vgi:vgi-dev-only@127.0.0.1:${pg}/vgi_commit`;
  process.env.COMMIT_BASE_URL = `http://127.0.0.1:${commit}`;
  process.env.COMMIT_INTERNAL_URL = process.env.COMMIT_BASE_URL;
  process.env.COMMIT_DATA_DIR = join(root, '.cache/commit');
  process.env.KEYCLOAK_SUBJECTS = join(process.env.COMMIT_DATA_DIR, 'keycloak-subjects.json');
  process.env.TAILSCALE_SERVE = '0';
}

async function ready(url) {
  return fetch(url, { signal: AbortSignal.timeout(2000) }).then((response) => response.ok, () => false);
}

async function waitForIdentity() {
  await command(process.execPath, ['infra/scripts/wait-healthy.mjs', '--identity']);
}

async function startStack() {
  const projects = JSON.parse(await command('docker', ['compose', 'ls', '--all', '--format', 'json'], { quiet: true }));
  const existing = projects.find(({ Name }) => Name === project);
  if (existing && existing.ConfigFiles !== composeFile) {
    if (!await ready(process.env.COMMIT_BASE_URL + '/health') ||
        !await ready(process.env.KEYCLOAK_ISSUER + '/.well-known/openid-configuration')) {
      // Compose start uses the project's existing containers and mount paths.
      await command('docker', ['compose', '-p', project, '-f', existing.ConfigFiles, '--profile', 'app', 'start'], {
        cwd: resolve(existing.ConfigFiles, '../..'),
      });
      await waitForIdentity();
      await command(process.execPath, ['infra/scripts/wait-healthy.mjs']);
    }
    console.log(`Using existing Docker project ${project}. Sign-in credentials are in its checkout's .env.`);
    return existing.ConfigFiles;
  }
  if (!existsSync(envPath) || credentials.some((key) => !process.env[key])) {
    await command(process.execPath, ['infra/scripts/setup.mjs']);
    loadEnv();
  }
  await compose(['up', '-d', '--wait', 'postgres', 'keycloak']);
  await waitForIdentity();
  const sql = (query) => compose(['exec', '-T', 'postgres', 'psql', '-U', 'vgi', '-d', 'vgi_commit',
    '-X', '-Atq', '-v', 'ON_ERROR_STOP=1', '-c', query], { quiet: true });

  const tenant = process.env.COMMIT_TENANT ?? 'local';
  const literal = "'" + tenant.replaceAll("'", "''") + "'";
  const hasStreams = await sql("SELECT to_regclass('public.commit_streams') IS NOT NULL") === 't';
  const count = hasStreams ? Number(await sql(`SELECT count(*) FROM commit_streams WHERE kind='patient' AND tenant=${literal}`)) : 0;
  const configPath = join(process.env.COMMIT_DATA_DIR, 'config.json');
  const config = await readFile(configPath, 'utf8').then(JSON.parse).catch(() => null);
  const expected = config?.actors?.[0]?.patients;
  const complete = count > 0 && config?.tenant === tenant && Array.isArray(expected) &&
    count === expected.length && config.oidc?.issuer === process.env.KEYCLOAK_ISSUER &&
    (!config.adt || await sql(`SELECT EXISTS(SELECT 1 FROM commit_streams WHERE kind='bed' AND tenant=${literal})`) === 't');
  if (!complete) {
    const hasClinicalEvents = hasStreams &&
      await sql(`SELECT EXISTS(SELECT 1 FROM commit_events WHERE tenant=${literal} AND event->>'kind' IS DISTINCT FROM 'import' AND event->>'kind' IS DISTINCT FROM 'adt-initial')`) === 't';
    if (hasClinicalEvents)
      throw new Error(`Docker project ${project} has live history. Restore its .cache/commit/config.json and original ports before restarting.`);
    await command(process.execPath, ['infra/keycloak/provision-adt.mjs']);
    await command(process.execPath, ['infra/scripts/load.mjs', '--hospital']);
  } else {
    console.log('Patient baseline: already provisioned');
  }
  await compose(['up', '-d', 'commit']);
  await command(process.execPath, ['infra/scripts/wait-healthy.mjs']);
  return composeFile;
}

async function stop() {
  const problem = await dockerProblem();
  if (problem) throw new Error(problem);
  // Stop by project label so this also works from a checkout without credentials.
  const active = await command('docker', ['ps', '--quiet', '--filter',
    `label=com.docker.compose.project=${project}`], { quiet: true });
  if (active) await command('docker', ['stop', ...active.split(/\s+/)], { quiet: true });
  console.log(`Docker project ${project} stopped. Volumes kept.`);
}

async function start() {
  checkNode();
  await localEnvironment();
  configurePorts();
  const appPort = port('APP_PORT', 5173);
  await fetchData();
  await prepareBuild();
  const { preview } = await import(pathToFileURL(join(app, 'node_modules/vite/dist/node/index.js')));
  process.env.VGI_STACK_STATUS = 'starting';
  process.chdir(app);
  const server = await preview({ root: app, logLevel: 'error', preview: {
    host: '127.0.0.1', port: appPort, strictPort: true,
  } });
  console.log(`VGI Health: http://127.0.0.1:${appPort}/`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    // Match Vite's foreground shutdown. Docker remains available for the next start.
    server.httpServer.close();
  });

  const problem = await dockerProblem();
  if (problem) {
    process.env.VGI_STACK_STATUS = 'docker-missing';
    process.env.VGI_STACK_MESSAGE = problem;
    console.warn(`Live EHR: ${problem}`);
    return;
  }
  try {
    const file = await withLocalLock(`stack-${project}`, startStack);
    // Read the actual project's snapshot date, including when reusing its DB
    // from another checkout. Only the date is exposed to the start page.
    const tenant = (process.env.COMMIT_TENANT ?? 'local').replaceAll("'", "''");
    process.env.VGI_STACK_DATE = await command('docker', ['compose', '-p', project, '-f', file,
      'exec', '-T', 'postgres', 'psql', '-U', 'vgi', '-d', 'vgi_commit', '-X', '-Atq', '-c',
      `SELECT snapshot->'context'->>'today' FROM commit_streams WHERE kind='patient' AND tenant='${tenant}' LIMIT 1`],
      { cwd: resolve(file, '../..'), quiet: true });
    process.env.VGI_STACK_STATUS = 'running';
  } catch (error) {
    process.env.VGI_STACK_STATUS = 'unavailable';
    process.env.VGI_STACK_MESSAGE = error.message;
    console.error(`Live EHR setup: ${error.message}`);
  }
}

try {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(project))
    throw new Error('COMPOSE_PROJECT_NAME must be a valid Docker Compose project name.');
  if (process.argv[2] === 'stop') await stop();
  else await start();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
