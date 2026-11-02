import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint();
describe("enforced TypeScript and network boundaries", () => {
  it.each([
    "const x: any = 1;",
    "const x = document.body!;",
    "const x = unknownValue as string;",
    "const x = <string>unknownValue;",
    "// @ts-ignore\nconst x = 1;",
    'const x = <div dangerouslySetInnerHTML={{__html: "x"}} />;',
    'const x = {dangerouslySetInnerHTML: {__html: "x"}};',
    'fetch("/fhir");',
    'window.fetch("/fhir");',
    'globalThis["fetch"]("/fhir");',
    'import { MedplumClient } from "@medplum/core";',
    'import("@medplum/core");',
    'export { MedplumClient } from "@medplum/core";',
    'export * from "@medplum/core";',
    'export const x = {"dangerouslySetInnerHTML": {__html: "x"}};',
  ])("rejects %s", async (code) => {
    const [result] = await eslint.lintText(code, {
      filePath: code.includes("<string>")
        ? "src/forbidden.ts"
        : "src/forbidden.tsx",
    });
    expect(
      result?.messages.some((message) =>
        [
          "boundary/single-data-module",
          "@typescript-eslint/no-explicit-any",
          "@typescript-eslint/no-non-null-assertion",
          "@typescript-eslint/ban-ts-comment",
          "no-restricted-syntax",
        ].includes(message.ruleId ?? ""),
      ),
    ).toBe(true);
  });
  it("permits as const", async () => {
    const [result] = await eslint.lintText(
      'export const x = "fixed" as const;',
      { filePath: "src/allowed.ts" },
    );
    expect(result?.errorCount).toBe(0);
  });
  it("permits network access only in the data module", async () => {
    const [result] = await eslint.lintText(
      'import { MedplumClient } from "@medplum/core"; export const client = new MedplumClient();',
      { filePath: "src/data/medplum.ts" },
    );
    expect(result?.errorCount).toBe(0);
  });
});
