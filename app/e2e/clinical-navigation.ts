import { expect, type Page } from "@playwright/test";
/** Patient choice stays inside the source-declared workspace, including in tests. */
export async function enterPatientChart(
  page: Page,
  query?: string,
): Promise<boolean> {
  await expect(page.locator(".clinical-app")).toBeVisible({ timeout: 30000 });
  const search = page.locator('[data-comp-id="workspace.search"]');
  if (!(await search.count())) return false;
  if (
    query ||
    !(await page.getByRole("button", { name: /^Open chart:/ }).count())
  ) {
    const lookup = page.getByRole("button", {
      name: "Patient Lookup",
      exact: true,
    });
    if (await lookup.count()) await lookup.click();
    await page
      .getByLabel("Patient search by name or MRN", { exact: true })
      .fill(query ?? "a");
  }
  await page
    .getByRole("button", { name: /^Open chart:/ })
    .first()
    .click();
  await expect(
    page.getByRole("banner", { name: "Patient banner", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  return true;
}

/** Follow real declared goto edges, including a Summary before the navigator. */
export async function navigateClinicalScreen(
  page: Page,
  destination: string,
): Promise<void> {
  const { z } = await import("zod");
  const programSchema = z.object({
    screens: z.array(
      z.object({
        id: z.string(),
        components: z.array(z.object({ id: z.string(), kind: z.unknown() })),
      }),
    ),
  });
  const goto = z.object({
    button: z.object({
      action: z.object({ goto: z.object({ screen: z.string() }) }),
    }),
  });
  const program = programSchema.parse(
    await page.evaluate(() => window.__buttonAuditSession?.program),
  );
  const edges = program.screens.flatMap((screen) =>
    screen.components.flatMap((component) => {
      const action = goto.safeParse(component.kind);
      return action.success
        ? [
            {
              from: screen.id,
              to: action.data.button.action.goto.screen,
              comp: component.id,
            },
          ]
        : [];
    }),
  );
  for (let step = 0; step < program.screens.length; step++) {
    const current = await page.evaluate(
      () => window.__buttonAuditSession?.snapshot().state.screen,
    );
    if (current === destination) return;
    const available = [];
    for (const edge of edges.filter((edge) => edge.from === current)) {
      const control = page.locator(
        `button[data-comp-id=${JSON.stringify(edge.comp)}]`,
      );
      if ((await control.isVisible()) && (await control.isEnabled()))
        available.push(edge);
    }
    const queue = available.map((edge) => ({ at: edge.to, first: edge.comp })),
      seen = new Set([current]);
    let next: string | undefined;
    while (queue.length) {
      const item = queue.shift();
      if (!item || seen.has(item.at)) continue;
      if (item.at === destination) {
        next = item.first;
        break;
      }
      seen.add(item.at);
      queue.push(
        ...edges
          .filter((edge) => edge.from === item.at)
          .map((edge) => ({ at: edge.to, first: item.first })),
      );
    }
    if (!next)
      throw new Error(
        `No visible source goto path from ${current} to ${destination}`,
      );
    await page.locator(`button[data-comp-id=${JSON.stringify(next)}]`).click();
  }
  throw new Error(`Source navigation did not reach ${destination}`);
}
