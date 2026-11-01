import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { readFileSync } from "node:fs";
import { compilePresentations } from "../../agent/src/presentation-compiler";
import { fakeCanonical } from "../../agent/src/fake/fixtures";
import { UiNodeView } from "../src/ehr/ui/nodes";
import { PresentationProvider } from "../src/ehr/ui/presentations";
import { presentationBundleSchema } from "../src/ehr/ui/presentation-types";
import Review from "../src/ehr/ui/custom/example/v0/Review";
import type { UiNode } from "../src/ehr/ui/types";
beforeAll(() => {
  window.matchMedia = vi
    .fn()
    .mockImplementation(() => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }));
});
afterEach(cleanup);
it("renders compiled presentation and typed TSX with the same subtree/action contract", () => {
  const node: UiNode = {
    button: {
      comp: "save",
      label: "Save",
      role: "primary",
      enabled: true,
      blockedReason: null,
      hotkey: null,
    },
  };
  const source = readFileSync(
    "src/ehr/ui/custom/example/v0/Review.tsx",
    "utf8",
  );
  const bundle = compilePresentations({
    ...fakeCanonical("v1"),
    presentationComponents: [{ name: "Review", key: "button", source }],
  });
  const onEvent = vi.fn();
  const compiled = render(
    <MantineProvider>
      <PresentationProvider bundle={bundle}>
        <UiNodeView node={node} onEvent={onEvent} />
      </PresentationProvider>
    </MantineProvider>,
  );
  expect(screen.getAllByRole("button", { name: "Save" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onEvent).toHaveBeenLastCalledWith({ click: { comp: "save" } });
  compiled.unmount();
  render(
    <MantineProvider>
      <Review node={node} onEvent={onEvent} />
    </MantineProvider>,
  );
  expect(screen.getAllByRole("button", { name: "Save" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onEvent).toHaveBeenCalledTimes(2);
});
it("rejects unsafe manifest props even at the browser boundary", () => {
  expect(() =>
    presentationBundleSchema.parse({
      schemaVersion: 1,
      owner: "P1",
      version: 1,
      composites: [],
      components: [
        {
          name: "Bad",
          key: "info",
          source: "",
          layout: {
            wrapper: "Box",
            props: JSON.parse('{"dangerouslySetInnerHTML":"bad"}'),
            child: { leaf: true },
          },
        },
      ],
    }),
  ).toThrow();
});
