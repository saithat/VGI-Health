import { expect, type Page, type Locator } from "@playwright/test";
import { z } from "zod";
import type { Output } from "./layout";
import type {} from "../core/buttonAudit";

/** Test-only helpers for the live `/lean.html` regressions: authenticated
 * transport to an isolated commit service and Lean-target interaction. */
declare global {
  interface Window {
    __leanPaint?: Output;
  }
}
export const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
];
export const control = (page: Page, id: string, event?: string) =>
  page.locator(
    `[data-comp-id=${JSON.stringify(id)}]${event ? `[data-event=${JSON.stringify(event)}]` : "[data-event]"}`,
  );
export async function idle(page: Page) {
  await expect(page.locator("#root")).not.toHaveAttribute("aria-busy", "true");
}
/** Scrolls a control's Lean scroll region until it lies inside its clip. */
export async function reveal(page: Page, target: Locator) {
  const scroll = await target.first().evaluate((element) => {
    const parent = element.closest<HTMLElement>("[data-box]");
    const output = window.__leanPaint;
    const drawn = output?.boxes.find(
      (d) => d.box.info.id === parent?.dataset.box,
    );
    const clip = drawn?.box.clips[0]?.[1];
    if (!clip || !drawn) return null;
    const rect = element.getBoundingClientRect();
    const delta =
      rect.y < clip.y / 64
        ? rect.y - clip.y / 64
        : rect.bottom > (clip.y + clip.h) / 64
          ? rect.bottom - (clip.y + clip.h) / 64
          : 0;
    const scrollId = drawn.box.clips[0]?.[0];
    const scroller = output?.boxes.find((d) => d.box.info.id === scrollId);
    if (!scroller) return null;
    return { id: scroller.box.info.id, delta };
  });
  if (scroll?.delta)
    await page.locator(`[data-box="${scroll.id}"]`).evaluate((e, delta) => {
      e.scrollTop += delta;
      e.dispatchEvent(new Event("scroll"));
    }, scroll.delta);
}
export async function act(page: Page, target: Locator) {
  await reveal(page, target);
  await target.first().click();
  await idle(page);
}
export async function fill(page: Page, target: Locator, value: string) {
  await reveal(page, target);
  const tag = await target.first().evaluate((e) => e.tagName);
  if (tag === "SELECT") await target.first().selectOption(value);
  else if ((await target.first().getAttribute("type")) === "checkbox")
    await target.first().setChecked(value === "true");
  else {
    await target.first().fill(value);
    await target.first().press("Tab");
  }
  await idle(page);
}
/** Token exchange and service transport only; native replay, guards and
 * Postgres are the isolated real service. The page still runs its own PKCE
 * login code; `code`/`state` in the URL complete the callback. */
export async function connectService(
  page: Page,
  persona: string,
  base: string,
  token: string,
  options: { pending?: boolean } = {},
) {
  await page.addInitScript(
    ({ pending }) => {
      if (pending) {
        const target = new URL(location.href);
        target.searchParams.delete("code");
        target.searchParams.delete("state");
        if (!sessionStorage.getItem("vgi.mar.login"))
          sessionStorage.setItem(
            "vgi.mar.login",
            JSON.stringify({
              verifier: "synthetic-painter",
              state: "painter",
              returnTo: target.pathname + target.search,
            }),
          );
      }
      document.addEventListener(
        "lean-paint",
        (event) => {
          if (event instanceof CustomEvent) window.__leanPaint = event.detail;
        },
        true,
      );
    },
    { pending: options.pending ?? true },
  );
  await page.route("**/protocol/openid-connect/token", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        access_token: token,
        refresh_token: `synthetic-${persona}`,
        expires_in: 1800,
      }),
    }),
  );
  await page.route("**/commit/**", async (route) => {
    const url = new URL(route.request().url());
    // SSE is independent notification transport; sessions also refresh
    // immediately after their own accepted command.
    if (url.pathname.endsWith("/events") && route.request().method() === "GET")
      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: ": test connection\n\n",
      });
    // eslint-disable-next-line boundary/single-data-module
    const response = await page.request.fetch(
      base + url.pathname.replace(/^\/commit/, "") + url.search,
      {
        method: route.request().method(),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(route.request().postData()
          ? { data: route.request().postData() ?? "" }
          : {}),
      },
    );
    await route.fulfill({ response });
  });
}
export const saved = (page: Page) =>
  page.waitForResponse(
    (r) =>
      r.url().endsWith("/commit/commands") && r.request().method() === "POST",
  );
const routeSchema = z.object({
  screens: z.array(
    z.object({
      id: z.string(),
      components: z.array(z.object({ id: z.string(), kind: z.unknown() })),
    }),
  ),
});
const gotoSchema = z.object({
  button: z.object({
    action: z.object({ goto: z.object({ screen: z.string() }) }),
  }),
});
/** Navigates through the Program's own goto buttons (each a Lean target box)
 * to `screen`; `audit=buttons` exposes the read-only program and screen. */
export async function navigate(page: Page, screen: string) {
  if ((await page.locator("#root").getAttribute("data-screen")) === screen)
    return;
  const observed = await page.evaluate(() => ({
    program: window.__buttonAuditSession?.program,
    screen: window.__buttonAuditSession?.snapshot().state.screen,
  }));
  const program = routeSchema.parse(observed.program);
  const pending: { screen: string; path: string[] }[] = [
    { screen: observed.screen ?? "", path: [] },
  ];
  const visited = new Set<string>();
  let path: string[] | undefined;
  while (pending.length) {
    const next = pending.shift();
    if (!next || visited.has(next.screen)) continue;
    if (next.screen === screen) {
      path = next.path;
      break;
    }
    visited.add(next.screen);
    for (const c of program.screens.find((s) => s.id === next.screen)
      ?.components ?? []) {
      const parsed = gotoSchema.safeParse(c.kind);
      if (parsed.success)
        pending.push({
          screen: parsed.data.button.action.goto.screen,
          path: [...next.path, c.id],
        });
    }
  }
  if (!path?.length) throw new Error(`No navigation path to ${screen}`);
  for (const comp of path) await act(page, control(page, comp, "click"));
  await expect(page.locator("#root")).toHaveAttribute("data-screen", screen);
}
