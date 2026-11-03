import type { Page } from '@playwright/test';
import fontManifest from '../src/ehr/ui/fonts/manifest.json' with { type: 'json' };

/** Layout inputs shared by the collector and the screen/WCAG gate. */
export const captureSettings = {
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
  locale: 'en-US',
  timezoneId: 'America/Los_Angeles',
  colorScheme: 'light',
} as const;
export const captureCss = `*, *::before, *::after {
  animation: none !important;
  transition: none !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
}`;

export async function waitForCaptureFonts(page: Page) {
  await page.evaluate(async (faces) => {
    for (const { family, weights, probe } of faces) {
      for (const weight of weights) {
        const spec = `${weight} 16px "${family}"`;
        const loaded = await document.fonts.load(spec, probe);
        if (!loaded.length || loaded.some(face => face.status !== 'loaded'))
          throw new Error(`Bundled font failed to load: ${spec}`);
        await document.fonts.ready;
        if (!document.fonts.check(spec, probe))
          throw new Error(`Bundled font unavailable: ${spec}`);
      }
    }
    await document.fonts.ready;
    await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
  }, fontManifest);
}
