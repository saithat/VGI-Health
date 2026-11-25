import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  buildSpecReview,
  parseLean,
  classifyItems,
} from "../scripts/spec-review.mjs";
import { SpecReview, filterItems } from "../src/dashboard/SpecReview";

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
  const parsed = parseLean("lean/Ehr/Demo.lean", sample);
  const items = classifyItems(parsed, {
    declarations: ["Demo.covered"],
    locations: parsed
      .filter((i) => i.name === "Demo.covered")
      .map((i) => ({
        name: i.name,
        file: i.file,
        line: i.line,
        endLine: i.line,
      })),
  });
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
      "Ehr.Check.EntryWitness.diagnose",
      "Ehr.Check.EntryWitness.control",
    ])
      expect(names).toContain(n);
    expect(a.total).toBe(a.items.length);
    expect(a.classes.trusted + a.classes.proven + a.classes.unverified).toBe(
      a.total,
    );
    expect(
      a.items.find((i) => i.name === "Ehr.Check.EntryWitness.diagnose")
        ?.classification,
    ).toBe("trusted");
    expect(
      a.items.find(
        (i) => i.name === "Ehr.Check.ReviewTrace.tour_includes_destination",
      )?.classification,
    ).toBe("proven");
  });
  it("classifies types, private declarations, anonymous instances and inline rules by kernel ranges", () => {
    const source = `namespace Demo
/-! New specification for owner review. -/
private def hidden := 1
instance : Inhabited Nat := ⟨0⟩
structure Box where
  value : Nat
end Demo`;
    const parsed = parseLean("lean/Ehr/Demo.lean", source);
    const result = classifyItems(parsed, {
      declarations: ["_private.Ehr.Demo.0.Demo.hidden"],
      locations: [
        { file: "lean/Ehr/Demo.lean", line: 3, endLine: 3 },
        { file: "lean/Ehr/Demo.lean", line: 4, endLine: 4 },
      ],
    });
    expect(result.map((i) => i.classification)).toEqual([
      "trusted",
      "trusted",
      "unverified",
    ]);
    const collision = classifyItems(parsed, {
      declarations: ["Demo.hidden"],
      locations: [
        {
          name: "Demo.hidden",
          file: "lean/Ehr/Other.lean",
          line: 3,
          endLine: 3,
        },
      ],
    });
    expect(collision[0]?.classification).toBe("unverified");
    const inline = items.find((i) => i.name === "Demo.Config");
    if (!inline) throw new Error("Missing inline fixture");
    expect(
      classifyItems([inline], {
        declarations: [],
        locations: [{ file: "lean/Ehr/Demo.lean", line: 18, endLine: 23 }],
      })[0]?.classification,
    ).toBe("trusted");
    const inlineTheorem = parseLean(
      "lean/Ehr/Demo.lean",
      `theorem hidden : True := by
  -- New specification for owner review.
  trivial`,
    );
    expect(
      classifyItems(inlineTheorem, { declarations: [], locations: [] })[0]
        ?.classification,
    ).toBe("proven");
  });
  it("filters by text, kind and area", () => {
    expect(
      filterItems(items, "wrapped", "all", "all").map((i) => i.name),
    ).toEqual(["Demo.Config"]);
    expect(filterItems(items, "", "Theorem", "all")).toHaveLength(1);
    expect(filterItems(items, "", "all", "all", "trusted")).toHaveLength(1);
    expect(filterItems(items, "", "all", "all", "proven")).toHaveLength(1);
    expect(filterItems(items, "", "all", "all", "unverified")).toHaveLength(2);
  });
});

vi.mock("../src/dashboard/data", () => ({ loadSpecReview: vi.fn() }));

it("renders class counts, defaults to the trusted base and switches classes", async () => {
  const { loadSpecReview } = await import("../src/dashboard/data");
  const data = await buildSpecReview();
  vi.mocked(loadSpecReview).mockResolvedValue(data);
  render(createElement(SpecReview));
  const select = await screen.findByLabelText("Class");
  if (!(select instanceof HTMLSelectElement))
    throw new Error("Missing class selector");
  expect(select.value).toBe("trusted");
  expect(
    screen.getByText("No headline theorem", { exact: false }),
  ).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain(
    `${data.classes.trusted} shown`,
  );
  await userEvent.selectOptions(select, "proven");
  expect(screen.getByRole("status").textContent).toContain(
    `${data.classes.proven} shown`,
  );
  await userEvent.selectOptions(select, "unverified");
  expect(screen.getByRole("status").textContent).toContain(
    `${data.classes.unverified} shown`,
  );
  cleanup();
});
