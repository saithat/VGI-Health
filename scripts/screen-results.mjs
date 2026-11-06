// Shared content-addressed results beside audit-speed's physical sample cache.
// Old pass-only receipts are deliberately not trusted by this protocol.
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

export const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export const contextDigest = (parts) => digest(canonical(parts));
export const treeDigest = (file) =>
  contextDigest(JSON.parse(readFileSync(file, "utf8")));
export function cacheRoot(env = process.env) {
  return resolve(
    env.EHR_SCREEN_CACHE_DIR ??
      resolve(env.TMPDIR ?? tmpdir(), "vgi-screen-check-cache"),
  );
}
export function resultKey(context, tree, probe = false) {
  return contextDigest({ protocol: 2, context, tree, probe });
}
export function readResult(directory, key) {
  try {
    const receipt = JSON.parse(
      readFileSync(resolve(directory, "results", `${key}.json`), "utf8"),
    );
    const { payload } = receipt;
    if (
      receipt.key !== key ||
      receipt.sha256 !== contextDigest(payload) ||
      !["pass", "fail"].includes(payload.status) ||
      !Array.isArray(payload.projects) ||
      canonical(payload.projects.map((p) => p.project)) !==
        canonical(["desktop", "narrow"]) ||
      payload.projects.some(
        (p) => !["pass", "fail"].includes(p.status) || !Array.isArray(p.errors),
      ) ||
      !Array.isArray(payload.geometry) ||
      !(
        payload.physical === null ||
        Array.isArray(payload.physical?.measurements)
      )
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}
export function writeResult(directory, key, payload) {
  if (!["pass", "fail"].includes(payload.status)) return; // Infrastructure is retried.
  const target = resolve(directory, "results", `${key}.json`);
  mkdirSync(resolve(directory, "results"), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  writeFileSync(
    temporary,
    JSON.stringify({ key, sha256: contextDigest(payload), payload }),
  );
  renameSync(temporary, target);
}

/** Every input that can affect the measured painter or its assertions is pinned.
 * Viewports include fidelity projects AND the physical matrix; font bytes are
 * hashed, not just their manifest. No run, persona, revision or filename enters. */
export function screenContext(appDir, browser, env = process.env) {
  const hash = (file) => digest(readFileSync(resolve(appDir, file)));
  const fonts = JSON.parse(
    readFileSync(resolve(appDir, "src/ehr/ui/fonts/manifest.json"), "utf8"),
  );
  return {
    protocol: 2,
    appBuild: JSON.parse(
      readFileSync(resolve(appDir, "dist/build.json"), "utf8"),
    ).appSha256,
    assetManifest: hash("dist/ehr/manifest.json"),
    // Bind actual served assets as well as the manifest's claims.
    assets: Object.keys(
      JSON.parse(
        readFileSync(resolve(appDir, "dist/ehr/manifest.json"), "utf8"),
      ).assets,
    )
      .sort()
      .map((file) => [file, hash(`dist/ehr/${file}`)]),
    fonts: [
      hash("src/ehr/ui/fonts/manifest.json"),
      ...fonts.map((font) => hash(`src/ehr/ui/fonts/${font.file}`)),
    ],
    captureEnvironment: [
      hash("e2e/capture-environment.ts"),
      digest(readFileSync(browser)),
      hash("node_modules/@playwright/test/package.json"),
      process.version,
      process.platform,
      process.arch,
    ],
    viewports: {
      desktop: [1440, 900],
      narrow: [390, 844],
      physicalHeight: 900,
      policy: hash("../docs/design/alert-urgency.json"),
    },
    physicalPolicy: {
      version: hash("../docs/design/alert-urgency.json"),
      enabled: env.EHR_PHYSICAL_POLICY !== "0",
      enforced:
        env.EHR_PHYSICAL_POLICY !== "0" && env.EHR_ENFORCE_PHYSICAL !== "0",
      minimumFont: env.EHR_MIN_FONT_PX ?? "12",
      urgentAlertIds: env.EHR_URGENT_ALERT_IDS ?? "[]",
    },
    presentations: env.EHR_PRESENTATION_BUNDLE
      ? contextDigest(
          JSON.parse(readFileSync(env.EHR_PRESENTATION_BUNDLE, "utf8")),
        )
      : null,
    assertions: [
      "e2e/ui-check.spec.ts",
      "e2e/physical-policy.ts",
      "e2e/geometry-capture.ts",
      "playwright.config.ts",
      "src/ehr/ui/fidelity.ts",
      "src/ehr/ui/display.tsx",
      "src/ehr/ui/types.ts",
      "scripts/screen-check.mjs",
      "scripts/audit-execution.mjs",
      "../scripts/screen-results.mjs",
    ].map((file) => [file, hash(file)]),
  };
}
