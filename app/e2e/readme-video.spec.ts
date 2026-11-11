import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";

// Opt-in: records the primary-care visit workflow (P1, W1) for the README.
// README_VIDEO=1 playwright test e2e/readme-video.spec.ts --project desktop
// writes shots/video/p1-visit.mp4 and a smaller p1-visit.gif preview (needs ffmpeg).
test("record the primary-care visit workflow", async ({ browser }) => {
  test.skip(!process.env.README_VIDEO, "Opt-in README video recording");
  test.setTimeout(180000);
  const size = { width: 1440, height: 900 };
  const context = await browser.newContext({
    viewport: size,
    recordVideo: { dir: "test-results/readme-video", size },
  });
  const page = await context.newPage();
  const started = Date.now();
  const pause = (ms = 700) => page.waitForTimeout(ms);
  const button = (name: string) =>
    page.getByRole("button", { name, exact: true }).first();
  const type = async (label: string, text: string) => {
    const field = page.getByRole("textbox", { name: label, exact: true });
    await field.click();
    await field.pressSequentially(text, { delay: 60 });
    await field.press("Tab");
    await pause(250);
  };

  await page.goto(
    "/ehr?mode=replay&persona=P1&program=releases/v3/personas/P1.json",
  );
  await expect(
    page.getByRole("textbox", { name: "Patient search by name or MRN" }),
  ).toBeVisible({ timeout: 60000 });
  const landing = (Date.now() - started) / 1000;
  await pause(1500);
  await page
    .getByRole("button", { name: /^Open chart:/ })
    .first()
    .click();
  await expect(
    page.getByRole("banner", { name: "Patient banner" }),
  ).toBeVisible({ timeout: 30000 });
  await pause(1500);

  await button("Visit workflow").click();
  await pause(1200);
  await type("Chief complaint", "Cough and fever for 4 days");
  await type("Weight (kg)", "80.9");
  await type("Systolic BP (mmHg)", "128");
  await type("Diastolic BP (mmHg)", "78");
  await type("Pulse (beats/min)", "92");
  await type("Respirations (/min)", "18");
  await type("Temperature (°C)", "38.2");
  await type("SpO₂ (%)", "96");
  await button("Mark allergies reviewed").click();
  await pause(1500);

  await button("Orders").click();
  await pause(1500);
  await button("Amoxicillin 1 g TID × 10 days").click();
  await pause(1500);
  // Automated prefills need a human confirmation before they can be signed.
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: "Confirm prefilled value", exact: true }).first().click();
    await pause(500);
  }
  await pause(1000);
  await button("Review and sign").click();
  await pause(3000);

  const video = page.video();
  await context.close();
  const path = await video?.path();
  if (!path) throw new Error("No video recorded");
  mkdirSync("shots/video", { recursive: true });
  const start = Math.max(0, landing - 0.3).toFixed(2);
  const ffmpeg = (...args: string[]) =>
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", start, "-i", path, ...args]);
  ffmpeg("-c:v", "libopenh264", "-pix_fmt", "yuv420p", "-b:v", "900k",
    "-movflags", "+faststart", "shots/video/p1-visit.mp4");
  ffmpeg("-vf", "fps=6,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=none",
    "shots/video/p1-visit.gif");
  rmSync(path);
});
