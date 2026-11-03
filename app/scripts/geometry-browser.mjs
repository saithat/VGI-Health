import { Buffer } from 'node:buffer';
/* global window */
// One browser per batch, one isolated context per state. Never mints gate receipts.
import { preview } from 'vite';
import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { captureGeometry } from '../e2e/geometry-capture.ts';
import { captureSettings, captureCss } from '../e2e/capture-environment.ts';
const appDir = path.resolve(import.meta.dirname, '..');
const app = JSON.parse(await readFile(path.join(appDir, 'dist/build.json'), 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
// launchServer exposes the actual child executable (headless shell by default),
// whereas chromium.executablePath() names the regular Chrome executable.
const browserServer = await chromium.launchServer({ headless: true });
const browser = await chromium.connect(browserServer.wsEndpoint());
try {
  const sources = ['scripts/geometry-browser.mjs', 'e2e/geometry-capture.ts', 'e2e/capture-environment.ts', 'src/ehr/ui/fonts/manifest.json'];
  const manifest = JSON.parse(await readFile(path.join(appDir, 'src/ehr/ui/fonts/manifest.json'), 'utf8'));
  const inputs = {
    appSha256: app.appSha256,
    settings: captureSettings,
    stylesheet: captureCss,
    sources: await Promise.all(sources.map(async file => [file, digest(await readFile(path.join(appDir, file)))])),
    fonts: await Promise.all(manifest.map(async ({ file }) => [file, digest(await readFile(path.join(appDir, 'src/ehr/ui/fonts', file)))])),
    chromiumVersion: browser.version(),
    chromiumSha256: digest(await readFile(browserServer.process().spawnfile)),
  };
  const context = digest(JSON.stringify(inputs));
  const cache = path.join(process.env.EHR_GEOMETRY_CACHE ?? path.join(appDir, '../runs/screen-check-cache'), 'geometry', context);
  await mkdir(cache, { recursive: true });
  await writeFile(path.join(cache, 'context.json'), JSON.stringify(inputs));
  const server = await preview({ root: appDir, configFile: false, preview: { port: 0, host: '127.0.0.1' } });
  try {
    const address = server.httpServer.address();
    if (!address || typeof address === 'string') throw new Error('No geometry preview address');
    const measure = async (tree, bundle, screen, state) => {
      const isolated = await browser.newContext(captureSettings);
      try {
        const page = await isolated.newPage();
        await page.goto(`http://127.0.0.1:${address.port}/screen-check.html`);
        await page.waitForFunction(() => typeof window.renderUi === 'function');
        await page.addStyleTag({ content: captureCss });
        await page.evaluate(({ tree, bundle }) => 'workspace' in tree ? window.renderUi(tree, bundle) : window.renderEhr(tree), { tree, bundle });
        return await captureGeometry(page, screen, state);
      } finally { await isolated.close(); }
    };
    for await (const line of createInterface({ input: process.stdin })) {
      const req = JSON.parse(line);
      try {
        const states = [];
        for (const file of req.files) {
          const bytes = await readFile(file);
          const state = digest(Buffer.concat([bytes, Buffer.from(JSON.stringify(req.bundle ?? null))]));
          const cached = path.join(cache, `${state}.json`);
          // Cache only coordinates, never filename-derived identities: equal trees can have different names.
          let geometry;
          try { if (process.env.EHR_GEOMETRY_CACHE_READ === '0') throw new Error('Fresh capture requested'); geometry = JSON.parse(await readFile(cached, 'utf8')); }
          catch {
            const tree = JSON.parse(bytes);
            const screen = tree.screen ?? tree.node?.attrs.find(a => a.name === 'data-screen-id')?.value ?? path.basename(file, '.json');
            geometry = [await measure(tree, req.bundle ?? null, screen, state)];
            if ('workspace' in tree && tree.modal)
              geometry.push(await measure({ ...tree, modal: null }, req.bundle ?? null, screen, state));
            await writeFile(cached, JSON.stringify(geometry));
          }
          const tree = JSON.parse(bytes);
          const screen = tree.screen ?? tree.node?.attrs.find(a => a.name === 'data-screen-id')?.value ?? path.basename(file, '.json');
          const sample = /^(workspace-d\d+)-/.exec(path.basename(file))?.[1];
          states.push(...geometry.map((entry, index) => ({ ...entry, screen, state: `${path.basename(file)}:${index ? 'background:' : ''}${state}`, ...(sample ? { sample } : {}) })));
        }
        process.stdout.write(JSON.stringify({ id: req.id, appSha256: app.appSha256, context, states }) + '\n');
      } catch (error) { process.stdout.write(JSON.stringify({ id: req.id, error: String(error) }) + '\n'); }
    }
  } finally { await new Promise(resolve => server.httpServer.close(resolve)); }
} finally {
  try { await browser.close(); } finally { await browserServer.close(); }
}
