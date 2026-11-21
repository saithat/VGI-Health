// Install verified data on the same filesystem as the checkout. Only an
// unavailable download triggers regeneration. An integrity failure stops here.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cache, command, localEnvironment, root, withLocalLock } from './local-build.mjs';
import { completedPrefix } from './run-prefix.mjs';
import { regenerate } from './regenerate-data.mjs';

const release = JSON.parse(await readFile(join(root, 'data/release.json'), 'utf8'));
const dataDirs = ['fixtures', 'programs', 'runs/world/2'];
export const regeneratedSource = 'regenerated locally; recordings may not match';
const marker = 'fixtures/.vgi-data-source';
const inventory = 'fixtures/.vgi-data-files.json';
const stat = path => lstat(path).catch(error => {
  if (error.code !== 'ENOENT') throw error;
  return null;
});
const json = async path => JSON.parse(await readFile(path, 'utf8'));

export async function dataState(dir) {
  for (const parent of ['runs', 'runs/world']) {
    const entry = await stat(join(dir, parent));
    if (entry && !entry.isDirectory()) throw new Error(`Partial data: ${parent} is not a directory.`);
  }
  const present = await Promise.all(dataDirs.map(name => stat(join(dir, name))));
  if (present.every(entry => !entry)) return 'missing';
  if (present.some(entry => entry && !entry.isDirectory()))
    throw new Error('Partial data: expected fixtures, programs and runs/world/2 to be directories.');
  const required = ['fixtures/clinical/index.json', 'fixtures/clinical/overrides.json', 'fixtures/clinical/audit.json',
    'fixtures/synthea/index.json', 'fixtures/synthetic-hospital/index.json', 'programs/canonical/v1.json',
    'runs/world/2/manifest.json', 'runs/world/2/context/day-01.json'];
  async function check(paths) {
    const absent = [];
    for (const path of paths) if (!(await stat(join(dir, path)))?.isFile()) absent.push(path);
    if (absent.length) throw new Error(`Partial data: missing ${absent.slice(0, 5).join(', ')} (${absent.length} missing). Move the existing dataset aside or restore its missing files before retrying.`);
  }
  if (await stat(join(dir, marker))) {
    await check([inventory]);
    await check(await json(join(dir, inventory)));
    return (await readFile(join(dir, marker), 'utf8')).trim();
  }
  await check(required);
  for (const cohort of ['synthea', 'synthetic-hospital']) {
    const folder = `fixtures/${cohort}`;
    const index = await json(join(dir, folder, 'index.json'));
    if (!index.patients?.length || index.patients.length !== index.patientCount)
      throw new Error(`Partial data: incomplete ${folder}/index.json.`);
    await check(index.patients.map(patient => join(folder, patient.file)));
  }
  const world = await json(join(dir, 'runs/world/2/manifest.json'));
  if (!world.files?.length) throw new Error('Partial data: world 2 manifest has no files.');
  await check(world.files.map(path => join('runs/world/2', path)));
  return 'existing local data';
}

export async function verifyArchive(path, sums, asset) {
  const entries = sums.split(/\r?\n/).map(line => /^([a-f0-9]{64}) [ *](.+)$/.exec(line))
    .filter(match => match?.[2] === asset.file);
  if (entries.length !== 1 || entries[0][1] !== asset.sha256)
    throw new Error(`SHA256SUMS does not match the pinned checksum for ${asset.file}.`);
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  if (hash.digest('hex') !== asset.sha256) throw new Error(`SHA-256 mismatch for ${asset.file}.`);
}

class DownloadUnavailable extends Error {}
async function extract(stage, asset, compression) {
  const base = process.env.VGI_DATA_RELEASE_URL ?? `https://github.com/saithat/VGI-Health/releases/download/${release.tag}`;
  for (const name of ['SHA256SUMS', asset.file]) {
    const url = `${base.replace(/\/$/, '')}/${name}`;
    console.log(`Downloading ${url}`);
    await command('curl', ['-fsSL', '--connect-timeout', '15', '--speed-limit', '1', '--speed-time', '60',
      '-o', join(stage, name), url]).catch(error => { throw new DownloadUnavailable(`Download unavailable: ${url} (${error.message})`); });
  }
  const archive = join(stage, asset.file);
  await verifyArchive(archive, await readFile(join(stage, 'SHA256SUMS'), 'utf8'), asset);
  await command('tar', [compression, '-xf', archive, '-C', stage, '--no-same-owner']);
}

async function publish(stage, paths) {
  for (const path of paths) {
    if (await stat(join(root, path))) throw new Error(`Already present: ${path}. Move it aside to install a different dataset.`);
    await mkdir(dirname(join(root, path)), { recursive: true });
  }
  const moved = [];
  try {
    for (const path of paths) {
      await rename(join(stage, path), join(root, path));
      moved.push(path);
    }
  } catch (error) {
    for (const path of moved.reverse()) await rename(join(root, path), join(stage, path));
    throw error;
  }
}

async function checkSample(path) {
  // The dashboard derives completed days from durable day/night files, including
  // for older manifests that have no daysCompleted field.
  const { manifest } = await completedPrefix(path);
  if (manifest.runId !== release.sample.run || manifest.daysCompleted !== manifest.days)
    throw new Error('Incomplete sample recording');
}

export async function fetchData(sample = false) {
  await mkdir(cache, { recursive: true });
  return withLocalLock('data', async () => {
    const samplePath = join('runs', release.sample.run);
    if (!sample) {
      const source = await dataState(root);
      if (source !== 'missing') { console.log(`Data already present (${source}).`); return source; }
    } else {
      const runs = await stat(join(root, 'runs'));
      if (runs && !runs.isDirectory()) throw new Error('Partial data: runs is not a directory.');
      if (await stat(join(root, samplePath))) {
        await checkSample(join(root, samplePath)).catch(error => {
          throw new Error(`Partial recording at ${samplePath} (${error.message}). Restore its files or move it aside and retry.`);
        });
        console.log(`Sample recording already present at ${samplePath}.`);
        return;
      }
      await command('tar', ['--zstd', '-cf', '/dev/null', '-T', '/dev/null'], { quiet: true })
        .catch(() => { throw new Error('The sample recording requires tar with --zstd support and the zstd executable. Install both and retry.'); });
    }
    const stage = await mkdtemp(join(cache, 'restore-'));
    try {
      if (sample) {
        await extract(stage, release.sample, '--zstd');
        await checkSample(join(stage, samplePath));
        await publish(stage, [samplePath]);
        console.log(`Installed sample recording at ${samplePath}.`);
      } else {
        let source = release.tag;
        try { await extract(stage, release.data, '-z'); }
        catch (error) {
          if (!(error instanceof DownloadUnavailable)) throw error;
          console.warn(error.message);
          await regenerate(stage);
          source = regeneratedSource;
        }
        if (await dataState(stage) === 'missing') throw new Error('Archive contains no required data.');
        // Keep a file list for older release-only artifacts outside the world
        // and patient indexes, so deletion on a later start is also reported.
        const files = [];
        for (const dir of dataDirs) {
          const base = join(stage, dir);
          for (const entry of await readdir(base, { recursive: true, withFileTypes: true }))
            if (entry.isFile()) files.push(relative(stage, join(entry.parentPath, entry.name)));
        }
        await writeFile(join(stage, inventory), JSON.stringify(files));
        await writeFile(join(stage, marker), source + '\n');
        await publish(stage, dataDirs);
        console.log(`Installed synthetic data (${source}).`);
        return source;
      }
    } finally {
      await rm(stage, { recursive: true, force: true });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { await localEnvironment(); await fetchData(process.argv[2] === '--sample'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
