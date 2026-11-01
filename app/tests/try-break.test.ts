// @vitest-environment node
import { describe, expect, it } from "vitest";
import { worldInCheckout } from "../scripts/try-break-plugin";

describe("portable local agent world", () => {
  it("maps a recorded absolute world into this checkout", () => {
    expect(
      worldInCheckout("/home/alice/VGI-run/runs/world/1", "/checkout"),
    ).toBe("/checkout/runs/world/1");
    expect(worldInCheckout("runs/world/seed-7", "/checkout")).toBe(
      "/checkout/runs/world/seed-7",
    );
  });
  it("rejects paths outside the committed world tree", () => {
    expect(() => worldInCheckout("/tmp/world", "/checkout")).toThrow();
    expect(() =>
      worldInCheckout("runs/world/../../secret", "/checkout"),
    ).toThrow();
  });
});
