import { describe, expect, it } from "vitest";
import { clinicalTokens } from "../src/ehr/ui/theme";
import { sectionTone, severityTone, statusTone } from "../src/ehr/ui/display";
const luminance = (hex: string) => {
  const rgb = (hex.slice(1).match(/../g) ?? [])
    .map((part) => parseInt(part, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb.reduce(
    (sum, channel, index) =>
      sum + channel * ([0.2126, 0.7152, 0.0722][index] ?? 0),
    0,
  );
};
const contrast = (a: string, b: string) =>
  (Math.max(luminance(a), luminance(b)) + 0.05) /
  (Math.min(luminance(a), luminance(b)) + 0.05);
describe("meaningful clinical palette", () => {
  it("meets AA for ink on tint and white on filled colors", () => {
    for (const color of [
      "blue",
      "red",
      "orange",
      "yellow",
      "green",
      "violet",
      "gray",
    ] as const) {
      expect(
        contrast(clinicalTokens[color].ink, clinicalTokens[color].tint),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(clinicalTokens[color].ink, "#FFFFFF"),
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(clinicalTokens.appBar, "#FFFFFF")).toBeGreaterThanOrEqual(
      4.5,
    );
  });
  it("maps only explicitly supplied statuses", () => {
    expect(["Final", "Certified", "Signed"].map(statusTone)).toEqual([
      "green",
      "green",
      "green",
    ]);
    expect(["Pending", "Due soon", "Held"].map(statusTone)).toEqual([
      "yellow",
      "yellow",
      "yellow",
    ]);
    expect(["Rejected", "Overdue"].map(statusTone)).toEqual(["red", "red"]);
    expect(["Draft", "Cancelled"].map(statusTone)).toEqual(["gray", "gray"]);
    expect(["In Basket", "Cosign required"].map(statusTone)).toEqual([
      "violet",
      "violet",
    ]);
    expect(statusTone("Active")).toBeUndefined();
    expect(severityTone("passive")).toBe("yellow");
    expect(severityTone("warning")).toBe("orange");
    expect(severityTone("interruptive")).toBe("red");
  });
  it("uses clinical section categories rather than alternating decoration", () => {
    expect(
      [
        "Allergies",
        "Medications",
        "Lab results",
        "Assessment & Plan",
        "Progress Notes",
        "Schedule",
      ].map(sectionTone),
    ).toEqual(["red", "green", "orange", "yellow", "violet", "blue"]);
  });
});
