import { describe, it, expect } from "vitest";
import { sourceAxis, sourceMinute } from "../src/ehr/ui/exotic-axis";
import type { UiScreen } from "../src/ehr/ui/types";
describe("research source-date index", () => {
  it("rejects impossible/ambiguous dates and honors UTC offsets", () => {
    expect(sourceMinute("2026-02-30")).toBeNull();
    expect(sourceMinute("Feb 30, 2026")).toBeNull();
    expect(sourceMinute("2026-11-02T08:00:00")).toBeNull();
    expect(sourceMinute("11/02/2026")).toBeNull();
    expect(sourceMinute("2026-11-02T08:00:00-08:00")).toBe(
      sourceMinute("2026-11-02T16:00:00Z"),
    );
    expect(sourceMinute("Nov 2, 2026")).toBe(sourceMinute("2026-11-02"));
  });
  it("orders dated source rows, retains ties and leaves full source untouched", () => {
    const screen: UiScreen = {
      title: "History",
      banner: [],
      nav: [],
      side: [],
      modal: null,
      workspace: [
        {
          info: {
            comp: "history",
            infoId: "history",
            display: "table",
            label: "History",
            rows: [
              [
                ["Date", "2026-11-02"],
                ["Reason", "A"],
              ],
              [["Date", "2026-10-31"]],
              [
                ["Date", "2026-11-02"],
                ["Reason", "B"],
              ],
              [["Date", "unknown"]],
            ],
          },
        },
      ],
    };
    const before = JSON.stringify(screen),
      axis = sourceAxis(screen);
    expect(axis.dated.map((x) => x.minute)).toEqual([
      29890080, 29892960, 29892960,
    ]);
    expect(axis.dated).toHaveLength(3);
    expect(JSON.stringify(screen)).toBe(before);
  });
});
