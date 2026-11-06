import {
  enterPatientChart,
  navigateClinicalScreen,
} from "./clinical-navigation";
import { expect, test } from "@playwright/test";

const roleScreens = [
  ["P1", "w1Rooming", "w1Orders"],
  ["P2", "w3TrackBoard", "w3Triage"],
  ["P3", "w4Worklist", "w4Mar"],
  ["P4", "w5Rooming", "w5Growth"],
  ["P5", "w6Schedule", "w6PreOp"],
] as const;

for (const route of [
  "/browse",
  "/dashboard?run=core-10day-live",
  ...roleScreens.map(
    ([persona]) =>
      `/ehr?mode=replay&release=v3&persona=${persona}&program=releases/v3/personas/${persona}.json&audit=buttons`,
  ),
]) {
  test(`visible text contrast: ${route}`, async ({ page }) => {
    await page.goto(route);
    if (route === "/browse")
      await expect(page.locator('[data-node-key="P3-5"]')).toBeVisible();
    else if (route.startsWith("/dashboard"))
      await expect(
        page.getByRole("region", { name: "Version history" }),
      ).toBeVisible();
    else {
      await expect(page.locator(".clinical-app")).toBeVisible();
      const persona = new URL(route, "http://localhost").searchParams.get(
        "persona",
      );
      const selected = roleScreens.find(([role]) => role === persona);
      if (!selected) throw new Error(`No contrast screen for ${persona}`);
      const [, , destination] = selected;
      await enterPatientChart(page);
      await navigateClinicalScreen(page, destination);
    }
    const failures = await page.evaluate(() => {
      const rgb = (text: string) => (text.match(/[\d.]+/g) ?? []).map(Number);
      const luminance = (color: number[]) =>
        color.slice(0, 3).reduce((sum, channel, index) => {
          const value = channel / 255;
          return (
            sum +
            (value <= 0.04045
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4) *
              ([0.2126, 0.7152, 0.0722][index] ?? 0)
          );
        }, 0);
      const over = (foreground: number[], background: number[]) => {
        const alpha = foreground[3] ?? 1;
        return foreground
          .slice(0, 3)
          .map(
            (value, index) =>
              value * alpha + (background[index] ?? 255) * (1 - alpha),
          );
      };
      return Array.from(
        document.querySelectorAll<HTMLElement>("body *"),
      ).flatMap((element) => {
        const ownText = Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? "")
          .join("")
          .trim();
        const style = getComputedStyle(element);
        if (
          !ownText ||
          !element.getClientRects().length ||
          element.closest("svg, [aria-hidden=true], [inert]")
        )
          return [];
        if (style.visibility !== "visible" || Number(style.opacity) === 0)
          return [];
        const ancestors: Element[] = [];
        for (
          let parent: Element | null = element;
          parent;
          parent = parent.parentElement
        )
          ancestors.unshift(parent);
        let background = [255, 255, 255];
        for (const ancestor of ancestors)
          background = over(
            rgb(getComputedStyle(ancestor).backgroundColor),
            background,
          );
        const ink = luminance(over(rgb(style.color), background));
        const paper = luminance(background);
        const ratio =
          (Math.max(ink, paper) + 0.05) / (Math.min(ink, paper) + 0.05);
        const size = Number.parseFloat(style.fontSize);
        const required =
          size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700)
            ? 3
            : 4.5;
        return ratio + 0.01 < required
          ? [
              {
                text: ownText.slice(0, 100),
                ratio: Number(ratio.toFixed(2)),
                required,
                color: style.color,
              },
            ]
          : [];
      });
    });
    expect(failures).toEqual([]);
  });
}
