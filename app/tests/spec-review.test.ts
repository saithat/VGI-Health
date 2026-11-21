import { describe, expect, it } from "vitest";
import { buildSpecReview, parseLean } from "../scripts/spec-review.mjs";
import { filterItems } from "../src/dashboard/SpecReview";

const sample = `import Ehr.Core

namespace Demo

def before : Nat := 0

/-! New specification for owner review: every declaration in this section. -/

/-- Plain doc. -/
def covered (n : Nat) : Nat := n + 1

/-! ## A later header without the marker -/

/-- New specification for owner review. Statement only. -/
theorem stated (n : Nat) (h : n = (fun x => x) n) : covered n = n + 1 := by
  rfl

structure Config where
  /-- Local policy. Specification change for owner
  review (wrapped). -/
  budget : Nat := 2
  other : Nat := 0

def rules : List Nat :=
  [ 1,
    -- R3, new specification for owner review: copy budget
    2 ]

end Demo
`;

describe("spec review catalog", () => {
  const items = parseLean("lean/Ehr/Demo.lean", sample);
  it("attaches module, declaration, field and inline flags", () => {
    expect(items.map((i) => [i.name, i.kind, i.scope])).toEqual([
      ["Demo.covered", "def", "section"],
      ["Demo.stated", "theorem", "declaration"],
      ["Demo.Config", "inline", "inline"],
      ["Demo.rules", "inline", "inline"],
    ]);
  });
  it("shows a theorem's statement without its proof and a definition's body", () => {
    const stated = items.find((i) => i.name === "Demo.stated");
    expect(stated?.code).toBe(
      "theorem stated (n : Nat) (h : n = (fun x => x) n) : covered n = n + 1",
    );
    expect(items[0]?.code).toBe("def covered (n : Nat) : Nat := n + 1");
    expect(items[2]?.code).toContain("budget : Nat := 2");
    expect(items[3]?.note).toContain("copy budget");
  });
  it("is deterministic over the repository and lists the main guarantees", async () => {
    const a = await buildSpecReview();
    const b = await buildSpecReview();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const names = new Set(a.items.map((i) => i.name));
    for (const n of [
      "Ehr.Check.EntryWitness.accepted_actionableEntries",
      "Ehr.Check.ReviewTrace.accepted_clinicalScenarios",
      "Ehr.Check.EntryWitness.Realized",
      "Ehr.Check.ReviewTrace.Scenario",
    ])
      expect(names).toContain(n);
    expect(a.total).toBe(a.items.length);
  });
  it("filters by text, kind and area", () => {
    expect(
      filterItems(items, "wrapped", "all", "all").map((i) => i.name),
    ).toEqual(["Demo.Config"]);
    expect(filterItems(items, "", "Theorem", "all")).toHaveLength(1);
  });
});
