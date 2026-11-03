import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { uiScreenSchema } from '../src/ehr/ui/types';
import { captureSettings, captureCss, waitForCaptureFonts } from './capture-environment';
import { captureGeometry } from './geometry-capture';

const screen = uiScreenSchema.parse(JSON.parse(readFileSync('src/fixtures/ui/w1Orders.json', 'utf8')));
test.use(captureSettings);

test('geometry uses the pinned environment and loaded webfonts', async ({ page }) => {
  await page.goto('/screen-check.html');
  await page.waitForFunction(() => typeof window.renderUi === 'function');
  await page.addStyleTag({ content: captureCss });
  await page.evaluate(screen => window.renderUi(screen), screen);
  await waitForCaptureFonts(page);
  expect(await page.evaluate(() => ({
    dpr: devicePixelRatio,
    locale: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    light: matchMedia('(prefers-color-scheme: light)').matches,
  }))).toEqual({ dpr: 1, locale: 'en-US', timezone: 'America/Los_Angeles', reduced: true, light: true });
  const first = await captureGeometry(page, 'orders', 'same');
  await page.locator('button').first().focus();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect(await captureGeometry(page, 'orders', 'same')).toEqual(first);
});

test('missing bundled font fails capture instead of using a fallback', async ({ page }) => {
  await page.route('**/*.woff2', route => route.abort());
  await page.goto('/screen-check.html');
  await page.waitForFunction(() => typeof window.renderUi === 'function');
  await page.evaluate(screen => window.renderUi(screen), screen);
  await expect(captureGeometry(page, 'orders', 'missing-font')).rejects.toThrow(/font|network/i);
});

test('legacy HTML names the bundled sans and mono families first', async ({ page }) => {
  await page.goto('/screen-check.html');
  await page.waitForFunction(() => typeof window.renderEhr === 'function');
  await page.evaluate(() => window.renderEhr({ node: {
    tag: 'div', attrs: [{ name: 'class', value: 'ehr-shell' }], children: [
      { node: { tag: 'span', attrs: [{ name: 'class', value: 'ehr-hotkey' }], children: [{ text: { s: 'Ctrl+K' } }] } },
    ],
  } }));
  await waitForCaptureFonts(page);
  expect(await page.locator('.ehr-shell').evaluate(el => getComputedStyle(el).fontFamily)).toMatch(/^"VGI Noto Sans"/);
  expect(await page.locator('.ehr-hotkey').evaluate(el => getComputedStyle(el).fontFamily)).toMatch(/^"VGI Noto Sans Mono"/);
});
