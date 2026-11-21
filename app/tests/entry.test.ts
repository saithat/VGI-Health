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
test("ADT, MAR, dashboard and browser keep their routes", () => {
  for (const path of [
    "/?workflow=adt",
    "/?workflow=mar",
    "/dashboard",
    "/browse",
    "/lean.html",
  ])
    expect(leanEntry(`${o}${path}`), path).toBeUndefined();
});

test("old encounter bookmarks open Lean", () => expect(leanEntry(o+"/?shell=encounter&persona=P3")).toBe("/lean.html?persona=P3"));
