import { describe,expect,it } from "vitest";
import { clinicalTokens } from "../src/theme";
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
});
