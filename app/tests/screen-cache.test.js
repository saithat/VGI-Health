import { describe, it, expect } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { setTimeout } from "node:timers";
import { resolve } from "node:path";
import {
  canonical,
  screenContext,
  cacheRoot,
  contextDigest,
  treeDigest,
  resultKey,
  readResult,
  writeResult,
} from "../../scripts/screen-results.mjs";
import { orderedPool, screenWorkers } from "../../scripts/screen-pool.mjs";

const payload = (status) => ({
  status,
  projects: ["desktop", "narrow"].map((project) => ({
    project,
    status,
    errors: status === "fail" ? ["policy refusal"] : [],
  })),
  geometry: [],
  physical: {
    measurements: [
      { width: 320, findings: status === "fail" ? [{ sc: "1.4.10" }] : [] },
    ],
  },
});
describe("content-addressed screen results", () => {
  it("shares canonical trees across paths/revisions and misses every pinned input, including probes", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "screen-cache-test-"));
    try {
      const files = ["revision1.json", "persona2.json"].map((file) =>
        resolve(directory, file),
      );
      writeFileSync(files[0], '{"title":"Orders", "nav":[]}');
      writeFileSync(files[1], '{\n "nav":[], "title":"Orders"\n}');
      expect(treeDigest(files[0])).toBe(treeDigest(files[1]));
      const inputs = {
        appBuild: "app",
        assetManifest: "wasm",
        fonts: ["font"],
        captureEnvironment: "pin",
        viewports: [1440, 900],
        physicalPolicy: "v1",
        presentations: "bundle",
        assertions: "checks",
      };
      const tree = treeDigest(files[0]),
        key = resultKey(contextDigest(inputs), tree);
      writeResult(directory, key, payload("pass"));
      expect(readResult(directory, key)).toEqual(payload("pass"));
      for (const component of Object.keys(inputs))
        expect(
          readResult(
            directory,
            resultKey(
              contextDigest({ ...inputs, [component]: "changed" }),
              tree,
            ),
          ),
          component,
        ).toBe(null);
      expect(
        readResult(
          directory,
          resultKey(contextDigest(inputs), contextDigest({ title: "Changed" })),
        ),
      ).toBe(null);
      expect(
        readResult(directory, resultKey(contextDigest(inputs), tree, true)),
      ).toBe(null);
      expect(canonical({ a: 1, b: [2, 1] })).not.toBe(
        canonical({ b: [1, 2], a: 1 }),
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("pins actual build, asset, font, environment, viewport and policy inputs", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "screen-context-test-"));
    const app = resolve(directory, "app");
    const put = (file, content) => {
      const path = resolve(app, file);
      mkdirSync(resolve(path, ".."), { recursive: true });
      writeFileSync(path, content);
    };
    try {
      const data = {
        "dist/build.json": '{"appSha256":"app-a"}',
        "dist/ehr/manifest.json": '{"assets":{"ehr-interp.wasm":"wasm-a"}}',
        "dist/ehr/ehr-interp.wasm": "wasm bytes",
        "src/ehr/ui/fonts/manifest.json": '[{"file":"font.woff2"}]',
        "src/ehr/ui/fonts/font.woff2": "font bytes",
        "e2e/capture-environment.ts": "capture pin",
        "node_modules/@playwright/test/package.json": '{"version":"pinned"}',
        "../docs/design/alert-urgency.json":
          '{"physical":{"viewportWidths":[768,1440]}}',
        "e2e/ui-check.spec.ts": "assertions",
        "e2e/physical-policy.ts": "physical collector",
        "e2e/geometry-capture.ts": "geometry collector",
        "playwright.config.ts": "viewport configuration",
        "src/ehr/ui/fidelity.ts": "fidelity",
        "src/ehr/ui/display.tsx": "display",
        "src/ehr/ui/types.ts": "types",
        "scripts/screen-check.mjs": "runner",
        "scripts/audit-execution.mjs": "execution",
        "../scripts/screen-results.mjs": "protocol",
        browser: "browser bytes",
        "presentation.json": "[]",
      };
      for (const [file, content] of Object.entries(data)) put(file, content);
      const env = {
        EHR_PRESENTATION_BUNDLE: resolve(app, "presentation.json"),
      };
      const context = () =>
        contextDigest(screenContext(app, resolve(app, "browser"), env));
      const initial = context();
      for (const file of Object.keys(data).filter(
        (file) => !file.endsWith("manifest.json"),
      )) {
        const original = data[file];
        put(
          file,
          file === "dist/build.json"
            ? '{"appSha256":"app-b"}'
            : file === "presentation.json"
              ? '[{"changed":true}]'
              : original + " changed",
        );
        expect(context(), file).not.toBe(initial);
        put(file, original);
      }
      put("dist/ehr/manifest.json", '{"assets":{"ehr-interp.wasm":"wasm-b"}}');
      expect(context()).not.toBe(initial);
      put("dist/ehr/manifest.json", data["dist/ehr/manifest.json"]);
      for (const name of [
        "EHR_MIN_FONT_PX",
        "EHR_URGENT_ALERT_IDS",
        "EHR_PHYSICAL_POLICY",
        "EHR_ENFORCE_PHYSICAL",
      ]) {
        env[name] = name.endsWith("IDS") ? '["critical"]' : "0";
        expect(context(), name).not.toBe(initial);
        delete env[name];
      }
      expect(cacheRoot({ TMPDIR: directory })).toBe(
        resolve(directory, "vgi-screen-check-cache"),
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("reuses failures, rejects corrupt/incomplete receipts and never caches infrastructure errors", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "screen-cache-test-"));
    try {
      const key = resultKey("context", "tree");
      writeResult(directory, key, payload("fail"));
      expect(readResult(directory, key)).toEqual(payload("fail"));
      const file = resolve(directory, "results", `${key}.json`),
        original = readFileSync(file, "utf8");
      writeFileSync(file, "{");
      expect(readResult(directory, key)).toBe(null);
      const damaged = JSON.parse(original);
      damaged.payload.status = "pass";
      writeFileSync(file, JSON.stringify(damaged));
      expect(readResult(directory, key)).toBe(null);
      const incomplete = {
        ...payload("pass"),
        projects: payload("pass").projects.slice(0, 1),
      };
      writeResult(directory, key, incomplete);
      expect(readResult(directory, key)).toBe(null);
      const errorKey = resultKey("context", "error");
      writeResult(directory, errorKey, { ...payload("pass"), status: "error" });
      expect(readResult(directory, errorKey)).toBe(null);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("returns identical ordered results serially and in a bounded pool", async () => {
    const input = [5, 4, 3, 2, 1, 0];
    let active = 0,
      maximum = 0;
    const run = async (value, index) => {
      maximum = Math.max(maximum, ++active);
      await new Promise((resolve) => setTimeout(resolve, value));
      active--;
      return { index, status: value % 2 ? "pass" : "fail" };
    };
    const serial = await orderedPool(input, 1, run);
    maximum = 0;
    expect(await orderedPool(input, 4, run)).toEqual(serial);
    expect(maximum).toBe(4);
    await expect(
      orderedPool(input, 4, async (value) => {
        if (!value) throw Error("native failure");
        return value;
      }),
    ).rejects.toThrow("native failure");
    expect(screenWorkers({})).toBe(4);
    expect(screenWorkers({ EHR_SCREEN_WORKERS: "100" })).toBe(6);
  });
});
