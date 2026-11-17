import { describe, expect, it } from "vitest";
import { LeanReference } from "../src/lean-reference.js";
import { z } from "zod";
import { replySchema, type LayoutRunner } from "../src/lean-layout-native.js";

// A screen whose shape differs by its number of buttons.
const screen = (n: number) => ({
  banner: [["Patient", "Synthetic"]],
  nav: [],
  title: "Shape",
  side: [],
  modal: null,
  workspace: Array.from({ length: n }, (_, i) => ({
    button: { comp: `b${i}`, label: "Go", role: "secondary", enabled: true, blockedReason: null, hotkey: null },
  })),
});
function runner() {
  const calls = { check: 0, paint: 0 };
  const run: LayoutRunner = async (requests) =>
    requests.map((r) => {
      const op = z.object({ op: z.string() }).parse(r).op;
      if (op === "family-check") {
        calls.check++;
        return { accepted: true };
      }
      calls.paint++;
      // A large, varied paint: about 200 KB of JSON per entry.
      return replySchema.parse({
        accepted: true,
        boxes: Array.from({ length: 2000 }, (_, i) => ({ id: `${calls.paint}-${i}-${Math.random()}` })),
      });
    });
  return { run, calls };
}

describe("Lean reference cache", () => {
  it("keeps retained bytes within its budget across many shapes and still serves hits", async () => {
    const { run, calls } = runner();
    const reference = new LeanReference(run, 256 * 1024);
    for (let n = 1; n <= 40; n++) await reference.get(screen(n), 15);
    expect(calls.paint).toBe(40);
    expect(reference.retainedBytes).toBeLessThanOrEqual(256 * 1024);
    expect(reference.stats.evictions).toBeGreaterThan(0);
    // The most recent shape is a hit; a long-evicted one is admitted again.
    const recent = await reference.get(screen(40), 15);
    expect(recent.paint.accepted).toBe(true);
    expect(calls.paint).toBe(40);
    await reference.get(screen(1), 15);
    expect(calls.paint).toBe(41);
  });
  it("shares one admission between concurrent requests for a shape and decodes compressed entries", async () => {
    const { run, calls } = runner();
    const reference = new LeanReference(run);
    const [a, b] = await Promise.all([reference.get(screen(3), 15), reference.get(screen(3), 15)]);
    expect(a).toBe(b);
    expect(calls.paint).toBe(1);
    // Push the decoded entry out of the small hot set; the compressed copy remains.
    for (let n = 10; n < 20; n++) await reference.get(screen(n), 15);
    const again = await reference.get(screen(3), 15);
    expect(again).toEqual(a);
    expect(calls.paint).toBe(11);
  });
});
