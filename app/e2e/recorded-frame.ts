import { expect, type FrameLocator } from "@playwright/test";

/** Retained recordings start in the role's workspace before patient selection. */
export async function expectRecordedWorkspace(frame: FrameLocator) {
  await expect(frame.locator("html")).toHaveAttribute("data-replay-count", "0");
  const open = frame.locator('[data-comp-id^="workspace.open|"]').first();
  await expect(open).toBeVisible();
  await expect(open).toBeDisabled();
  await expect(frame.getByRole("banner", { name: "Patient banner" })).toHaveCount(0);
}
