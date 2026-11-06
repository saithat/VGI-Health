import { test } from "node:test";
import assert from "node:assert/strict";
import { compareScreenResults } from "./compare-screen-results.mjs";
const tree = (status) => ({
  sha256: "a".repeat(64),
  status,
  projects: ["desktop", "narrow"].map((project) => ({ project, status })),
});
test("compares every cached/uncached tree verdict while ignoring artifact paths and clocks", () => {
  const first = {
    status: "fail",
    controlsStatus: "pass",
    trees: [{ ...tree("pass"), file: "/cold/a" }, tree("fail")],
  };
  const second = {
    ...first,
    elapsedMs: 1,
    trees: [tree("fail"), { ...tree("pass"), file: "/warm/a" }],
  };
  assert.match(compareScreenResults([first, second]), /^[a-f0-9]{64}$/);
  assert.throws(
    () =>
      compareScreenResults([
        first,
        { ...second, trees: [tree("pass"), tree("pass")] },
      ]),
    /differ/,
  );
  assert.throws(
    () => compareScreenResults([first, { ...second, trees: [tree("fail")] }]),
    /differ/,
  );
  assert.throws(
    () =>
      compareScreenResults([
        first,
        { ...second, trees: [{ ...tree("pass"), status: "error" }] },
      ]),
    /Incomplete/,
  );
});
