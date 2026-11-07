import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { webcrypto } from "node:crypto";
import fc from "fast-check";
import {
  screenCanonical,
  screenHash,
  screenJournal,
} from "../src/data/screenFingerprint";
import { UiScreenView } from "../src/ehr/ui/Screen";
import type { UiScreen } from "../src/ehr/ui/types";

beforeAll(() => {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
  window.matchMedia = vi
    .fn()
    .mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  window.scrollTo = vi.fn();
});
afterEach(cleanup);
it("hashes the exact painted object including a tampered alert, without re-rendering Lean", async () => {
  const native: UiScreen = {
    banner: [["Patient", "Alex"]],
    title: "Review",
    nav: [],
    workspace: [],
    side: [],
    modal: {
      alert: {
        comp: "allergy",
        alertId: "allergy",
        label: "Severe allergy",
        severity: "interruptive",
      },
    },
  };
  const painted: UiScreen = {
    ...native,
    modal: null,
    title: "Altered display",
    workspace: [{ text: { s: "Altered display" } }],
  };
  const serialize = vi.fn((input: string) =>
    JSON.stringify(screenCanonical(JSON.parse(input))),
  );
  const journal = screenJournal(serialize);
  const onPaint = vi.fn((value: UiScreen) => journal.observe(value, 3));
  render(
    <MantineProvider>
      <UiScreenView screen={painted} onPaint={onPaint} onEvent={() => {}} />
    </MantineProvider>,
  );
  expect(screen.getByText("Altered display")).toBeDefined();
  expect(onPaint.mock.calls[0]?.[0]).toBe(painted);
  const expected = await screenHash(screenCanonical(painted));
  painted.title = "Mutated after paint";
  const evidence = await journal.evidence("request-1");
  expect(evidence).toEqual({
    requestId: "request-1",
    frames: [{ step: 3, phase: "ready", hash: expected }],
  });
  expect(expected).not.toBe(await screenHash(screenCanonical(native)));
  expect(serialize.mock.calls[0]?.[0]).toContain('"modal":null');
});
it("refuses a faulty WASM serializer and missing export", async () => {
  for (const serialize of [undefined, () => JSON.stringify("hidden fault")]) {
    const journal = screenJournal(serialize);
    journal.observe({ modal: null }, 0);
    await expect(journal.evidence("r")).rejects.toThrow("painted object");
  }
});
it("retains every successive painted field edit, loading frame and command source", async () => {
  const journal = screenJournal((s) =>
    JSON.stringify(screenCanonical(JSON.parse(s))),
  );
  journal.observe({ value: "a" }, 0);
  journal.observe({ value: "b" }, 1, "loading");
  journal.observe({ value: "b", banner: "loaded" }, 1);
  journal.observe({ value: "c" }, 2);
  expect(
    (await journal.evidence("r")).frames.map((f) => [f.step, f.phase]),
  ).toEqual([
    [0, "ready"],
    [1, "loading"],
    [1, "ready"],
    [2, "ready"],
  ]);
  journal.clear();
  expect((await journal.evidence("next")).frames).toEqual([]);
});
it("canonical bytes distinguish structured values, Unicode, delimiters and array order", () => {
  const valuesArbitrary = fc
    .jsonValue()
    .map((value) =>
      JSON.parse(
        JSON.stringify(value, (_key, item: unknown) =>
          typeof item === "number" ? Math.trunc(item) % 1000000 : item,
        ),
      ),
    );
  fc.assert(
    fc.property(valuesArbitrary, (value) => {
      expect(decode(screenCanonical(value))).toEqual(value);
    }),
    { numRuns: 1000 },
  );
  const values = [
    null,
    false,
    true,
    0,
    "0",
    [],
    {},
    ["a", "b"],
    ["b", "a"],
    "a1:s2:",
    "é\u0000😀",
    "é\u0000😀",
  ];
  expect(new Set(values.map(screenCanonical)).size).toBe(values.length);
  expect(screenCanonical({ b: 1, a: [false] })).toBe(
    screenCanonical({ a: [false], b: 1 }),
  );
  expect(() => screenCanonical("\ud800")).toThrow("Unicode");
});

// Independent left-inverse test for the wire grammar, including byte lengths.
function decode(wire: string): unknown {
  const bytes = new TextEncoder().encode(wire);
  const text = new TextDecoder("utf-8", { fatal: true });
  let offset = new TextEncoder().encode("vgi-screen-v1:").length;
  function until(end: number) {
    const start = offset;
    while (offset < bytes.length && bytes[offset] !== end) offset++;
    if (offset === bytes.length) throw new Error("Truncated wire");
    return text.decode(bytes.slice(start, offset++));
  }
  function read(): unknown {
    const tag = bytes[offset++];
    if (tag === 110) return null;
    if (tag === 116) return true;
    if (tag === 102) return false;
    if (tag === 105) return Number(until(59));
    const length = Number(until(58));
    if (tag === 115) {
      const value = text.decode(bytes.slice(offset, offset + length));
      offset += length;
      return value;
    }
    if (tag === 97) return Array.from({ length }, read);
    if (tag === 111)
      return Object.fromEntries(
        Array.from({ length }, () => {
          const key = read();
          if (typeof key !== "string") throw new Error("Invalid key");
          return [key, read()];
        }),
      );
    throw new Error("Invalid wire tag");
  }
  const result = read();
  expect(offset).toBe(bytes.length);
  return result;
}
