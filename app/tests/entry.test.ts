import { expect, test } from "vitest";
import { leanEntry } from "../src/entry";

const o = "http://127.0.0.1:5173";
test("default clinical entry points open the Lean page with their parameters", () => {
  expect(leanEntry(`${o}/`)).toBe("/lean.html");
  expect(leanEntry(`${o}/?persona=P2&date=2026-11-15`)).toBe(
    "/lean.html?persona=P2&date=2026-11-15",
  );
  expect(leanEntry(`${o}/?workflow=chart&persona=P1`)).toBe(
    "/lean.html?persona=P1",
  );
  expect(leanEntry(`${o}/ehr?persona=P3`)).toBe("/lean.html?persona=P3");
});
test("ADT, MAR dose list, replay, the encounter shell, callbacks, dashboard and browser stay", () => {
  for (const path of [
    "/?workflow=adt",
    "/?workflow=mar",
    "/?mode=replay",
    "/?shell=encounter",
    "/?workflow=chart&code=x&state=y",
    "/?error=access_denied",
    "/dashboard",
    "/browse",
    "/lean.html",
  ])
    expect(leanEntry(`${o}${path}`), path).toBeUndefined();
});
