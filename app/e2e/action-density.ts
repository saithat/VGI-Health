import type { Page } from '@playwright/test';
import policy from '../../docs/design/screen-density.json' with { type: 'json' };

/** R5: measured DOM geometry, independent of the research text-card shell.
 * A target with any positive clipped area counts. Each scroll region is checked
 * independently; fixed/sticky targets reserve a slot in every scroll window.
 * The interval sweep checks every possible vertical offset, not sampled pages.
 */
export async function actionDensity(page: Page) {
  if (page.viewportSize()?.width !== 1440 || page.viewportSize()?.height !== 900)
    throw new Error('R5 requires a 1440×900 viewport');
  return page.evaluate(({ maxTargetsPerViewport }) => {
    const selector = "button, input:not([type='hidden']), select, textarea, a[href], [role='button'], [role='tab'], [role='checkbox'], [role='radio'], [role='switch'], [data-event], [tabindex='0']";
    const activeModal = [...document.querySelectorAll<HTMLElement>("[role='dialog'][aria-modal='true']")].at(-1);
    const active = (el: HTMLElement) => {
      if (activeModal && !activeModal.contains(el)) return false;
      if (el.closest('[hidden], [inert], [aria-hidden="true"]') || el.matches(':disabled') || el.closest('[aria-disabled="true"]')) return false;
      for (let p: HTMLElement | null = el; p; p = p.parentElement) {
        const css = getComputedStyle(p);
        if (css.display === 'none' || css.visibility !== 'visible' || Number(css.opacity) === 0) return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const targets = [...document.querySelectorAll<HTMLElement>(selector)].filter(active);
    const pinned = (el: HTMLElement) => {
      for (let p: HTMLElement | null = el; p; p = p.parentElement) {
        if (p !== el && scrolls.includes(p)) return false;
        if (['fixed', 'sticky'].includes(getComputedStyle(p).position)) return true;
      }
      return false;
    };
    const root = document.scrollingElement;
    if (!(root instanceof HTMLElement)) throw new Error("No document scroll viewport");
    const scrolls = [...document.querySelectorAll<HTMLElement>('body *')].filter(el =>
      el !== root && el.clientHeight > 0 && el.scrollHeight > el.clientHeight &&
      ['auto', 'scroll'].includes(getComputedStyle(el).overflowY));
    const regions = [root, ...scrolls];
    const closest = (el: HTMLElement) => {
      for (let p = el.parentElement; p; p = p.parentElement)
        if (scrolls.includes(p)) return p;
      return root;
    };
    // Apply the actual ancestor clipping for the first viewport. Other windows
    // use content rectangles in their own region, conservatively ignoring outer
    // clipping and horizontal occlusion; neither can increase the target count.
    const firstVisible = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      let left = Math.max(0, r.left), right = Math.min(innerWidth, r.right);
      let top = Math.max(0, r.top), bottom = Math.min(innerHeight, r.bottom);
      for (let p = el.parentElement; p; p = p.parentElement) {
        const css = getComputedStyle(p), b = p.getBoundingClientRect();
        if (['auto', 'scroll', 'hidden', 'clip'].includes(css.overflowX)) {
          left = Math.max(left, b.left + p.clientLeft); right = Math.min(right, b.left + p.clientLeft + p.clientWidth);
        }
        if (['auto', 'scroll', 'hidden', 'clip'].includes(css.overflowY)) {
          top = Math.max(top, b.top + p.clientTop); bottom = Math.min(bottom, b.top + p.clientTop + p.clientHeight);
        }
      }
      return right > left && bottom > top;
    };
    // The gate renders at zero scroll. Refuse stale caller state instead of
    // silently returning a different definition of the first viewport.
    if (regions.some(el => el.scrollTop !== 0 || el.scrollLeft !== 0))
      throw new Error('R5 measurement requires all scroll offsets at zero');
    const fixedTargets = targets.filter(pinned).length;
    const windows = regions.map((region, i) => {
      const box = region.getBoundingClientRect();
      const origin = region === root ? 0 : box.top + region.clientTop;
      const height = Math.min(900, region === root ? innerHeight : region.clientHeight);
      const maxOffset = Math.max(0, region.scrollHeight - (region === root ? innerHeight : region.clientHeight));
      const rects = targets.filter(el => !pinned(el) && closest(el) === region).map(el => {
        const r = el.getBoundingClientRect();
        return { top: r.top - origin, bottom: r.bottom - origin };
      });
      // Visibility intervals are open: (top-height, bottom). Their count is
      // constant between boundaries. Check each boundary and each midpoint,
      // including fractional CSS coordinates, so partial rows cannot evade R5.
      const boundaries = [...new Set([0, maxOffset, ...rects.flatMap(r => [r.top - height, r.bottom])]
        .filter(y => y >= 0 && y <= maxOffset))].sort((a, b) => a - b);
      const offsets = boundaries.flatMap((y, n) => n ? [y, (y + (boundaries[n - 1] ?? y)) / 2] : [y]);
      let count = fixedTargets, offset = 0;
      for (const y of offsets) {
        const value = fixedTargets + rects.filter(r => r.bottom > y && r.top < y + height).length;
        if (value > count) { count = value; offset = y; }
      }
      return { region: i === 0 ? 'document' : region.id || `scroll-${i}`, height, maxOffset, count, offset };
    });
    const first = targets.filter(firstVisible).length;
    const maximum = Math.max(first, ...windows.map(w => w.count));
    return { viewport: { width: 1440, height: 900 }, limit: maxTargetsPerViewport,
      first, maximum, fixedTargets, windows, pass: maximum <= maxTargetsPerViewport };
  }, policy);
}
