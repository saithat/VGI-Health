import { request, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

// Playwright runs in Node, where import.meta.env is not Vite's environment.
const env = loadEnv(
  "test",
  fileURLToPath(new URL("../../", import.meta.url)),
  "",
);
export const backendDownReason = `Medplum is unavailable at ${env.VITE_MEDPLUM_BASE_URL ?? "http://localhost:8103/"}; live coverage requires the local stack`;

export async function backendAvailable(): Promise<boolean> {
  const client = await request.newContext();
  try {
    const response = await client.get(
      new URL(
        "healthcheck",
        env.VITE_MEDPLUM_BASE_URL ?? "http://localhost:8103/",
      ).href,
      { timeout: 2500 },
    );
    return response.ok();
  } catch {
    return false;
  } finally {
    await client.dispose();
  }
}

export async function signInBaseline(
  page: Page,
  persona: string,
): Promise<void> {
  if (!env.VGI_USER_PASSWORD || !env.VITE_MEDPLUM_CLIENT_ID)
    throw new Error(
      "Live browser tests need VGI_USER_PASSWORD and VITE_MEDPLUM_CLIENT_ID in the repo-root .env",
    );
  await page
    .getByLabel("Baseline clinician", { exact: true })
    .selectOption(persona);
  await page
    .getByRole("button", {
      name: "Original canonical EHR (baseline)",
      exact: true,
    })
    .click();
}
