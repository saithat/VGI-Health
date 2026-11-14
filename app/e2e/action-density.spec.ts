import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { actionDensity } from './action-density';
import { waitForCaptureFonts, captureCss } from './capture-environment';
import { uiScreenSchema } from '../src/ehr/ui/types';

test.describe.configure({ mode: 'parallel' });

test('R5 counts partial rows, fixed controls, nested scrollers and modal activity', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.setContent(`<style>body{margin:0}button{width:60px;height:30px}#pin{position:fixed;top:0;right:0}#scroll{height:100px;overflow:auto;margin-top:950px}.row{height:40px}</style>
    <button id="pin">Fixed</button><button hidden>Hidden</button><button disabled>Disabled</button>
    <div id="scroll">${Array.from({ length: 12 }, (_, i) => `<div class="row"><button>${i}</button></div>`).join('')}</div>`);
  const density = await actionDensity(page);
  expect(density.first).toBe(1);
  expect(density.fixedTargets).toBe(1);
  // A fractional offset shows the end of one row and the start of the fourth.
  expect(density.windows.find(w => w.region === 'scroll')?.count).toBe(5);
  await page.evaluate(() => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
    dialog.style.cssText = 'position:fixed;top:0'; dialog.innerHTML = '<button>Acknowledge</button>';
    document.body.append(dialog);
  });
  const modal = await actionDensity(page);
  expect(modal.first).toBe(1);
  expect(modal.maximum).toBe(1);
});

test('R5 finds dense later windows and reserves sticky controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.setContent(`<style>body{margin:0}header{position:sticky;top:0;height:30px}button{height:30px}#gap{height:1000px}</style>
    <header><button>Sticky</button></header><div id="gap"></div><div>${'<button>Action</button>'.repeat(80)}</div>`);
  const density = await actionDensity(page);
  expect(density.first).toBe(1);
  expect(density.maximum).toBe(81);
  expect(density.windows[0]?.offset).toBeGreaterThan(0);
});

const files: string[] = process.env.EHR_DENSITY_MANIFEST
  ? JSON.parse(readFileSync(process.env.EHR_DENSITY_MANIFEST, 'utf8')) : [];
for (let start = 0; start < files.length; start += 32) {
  test(`R5 measurement batch ${start}`, async ({ page }, testInfo) => {
    testInfo.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/screen-check.html');
    await page.waitForFunction(() => typeof window.renderUi === 'function');
    await page.addStyleTag({ content: captureCss });
    const samples = [];
    for (const file of files.slice(start, start + 32)) {
      const screen = uiScreenSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
      for (const phase of screen.modal ? ['active', 'background-probe'] : ['active']) {
        await page.evaluate(({ screen, phase }) => {
          window.scrollTo(0, 0);
          window.renderUi(phase === 'active' ? screen : { ...screen, modal: null });
        }, { screen, phase });
        await waitForCaptureFonts(page);
        await page.evaluate(() => {
          window.scrollTo(0, 0);
          for (const el of document.querySelectorAll('body *')) el.scrollTo(0, 0);
        });
        samples.push({ file, screen: screen.screen ?? null, phase, ...await actionDensity(page) });
      }
    }
    await testInfo.attach('action-density-batch', { body: JSON.stringify(samples), contentType: 'application/json' });
  });
}
