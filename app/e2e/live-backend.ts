import { request, expect, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
const env = {
  ...loadEnv("test", fileURLToPath(new URL("../../", import.meta.url)), ""),
  ...process.env,
};
export const backendDownReason =
  "The local commit authority is unavailable; start the isolated stack with make install";
export async function backendAvailable(): Promise<boolean> {
  const client = await request.newContext();
  try {
    return (
      await client.get(
        `${env.COMMIT_BASE_URL ?? "http://127.0.0.1:18090"}/health`,
        { timeout: 2500 },
      )
    ).ok();
  } catch {
    return false;
  } finally {
    await client.dispose();
  }
}
export async function completeKeycloakLogin(page: Page, persona: string) {
  await expect(page).toHaveURL(/\/realms\/vgi\/protocol\/openid-connect\/auth/);
  await page.getByLabel("Username or email").fill(persona.toLowerCase());
  if (!env.KEYCLOAK_PERSONA_PASSWORD) throw new Error("Run make setup first");
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.KEYCLOAK_PERSONA_PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).not.toHaveURL(/\/protocol\/openid-connect\/auth/);
}
export async function signInBaseline(
  page: Page,
  persona: string,
): Promise<void> {
  await page
    .getByLabel("Baseline clinician", { exact: true })
    .selectOption(persona);
  await page
    .getByRole("button", {
      name: "Original canonical EHR (baseline)",
      exact: true,
    })
    .click();
  await completeKeycloakLogin(page, persona);
}
export async function signInPersona(
  page: Page,
  persona: string,
): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${persona} ·`) }).click();
  await completeKeycloakLogin(page, persona);
}
