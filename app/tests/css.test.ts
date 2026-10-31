// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classes } from "../src/ehr/html";
import { lintCss } from "./css-policy";
const spec =
  readFileSync(
    new URL("../../docs/design/core-model.md", import.meta.url),
    "utf8",
  )
    .split("### 9.1")[1]
    ?.split("Event attributes")[0] ?? "";
const expected = new Set(
  [...spec.matchAll(/`(ehr-[a-z-]+)`/g)].map((m) => m[1] ?? ""),
);
describe("fixed EHR stylesheet", () => {
  it("defines exactly §9.1 classes and contains no concealing declarations", () => {
    expect(expected.size).toBeGreaterThan(50);
    expect(new Set(classes)).toEqual(expected);
    expect(
      lintCss(
        readFileSync(new URL("../src/ehr.css", import.meta.url), "utf8"),
        expected,
      ),
    ).toEqual([]);
  });
  it.each([
    "display: none",
    "visibility: hidden",
    "visibility: collapse",
    "opacity: 0",
    "opacity: 0.0",
    "height: 0",
    "height: 0.0px",
    "width: .0%",
    "opacity: 0%",
    "max-height: 0px",
    "width: 0%",
    "left: -100px",
    "margin-left: -10em",
    "overflow: hidden",
    "overflow-x: clip",
    "clip-path: inset(100%)",
    "transform: translateX(-100%)",
    "position: absolute",
    "font-size: 0",
    "content-visibility: hidden",
  ])("rejects %s", (decl) => {
    expect(
      lintCss(`.ehr-shell {${decl}}`, new Set(["ehr-shell"])),
    ).toHaveLength(1);
  });
  it("rejects added or missing classes", () =>
    expect(lintCss(".extra{}", new Set(["ehr-shell"]))).toEqual([
      "Missing class ehr-shell",
      "Extra class extra",
    ]));
});
