import { MantineProvider } from "@mantine/core";
import { MedplumProvider } from "@medplum/react-hooks";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { medplum } from "../src/data/medplum";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(cleanup);

function openApp() {
  return render(
    <MantineProvider env="test">
      <MedplumProvider medplum={medplum}>
        <App />
      </MedplumProvider>
    </MantineProvider>,
  );
}

describe("offline clinician workspace", () => {
  it("supports rooming → documentation → orders → sign and chart activities without a backend", async () => {
    openApp();
    expect(await screen.findByText("Morgan, Alexandra M.")).toBeDefined();
    const chiefComplaint = screen.getByLabelText("Chief complaint");
    fireEvent.change(chiefComplaint, {
      target: { value: "Routine follow-up" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "History & prevention" }));
    expect(screen.queryByLabelText("Chief complaint")).toBeNull();
    expect(screen.getByText("Immunization history")).toBeDefined();
    fireEvent.click(screen.getByRole("tab", { name: "Rooming & intake" }));
    expect(screen.getByDisplayValue("Routine follow-up")).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to documentation →" }),
    );
    expect(screen.getByLabelText("History of present illness")).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to orders →" }),
    );
    expect(screen.getByLabelText("Destination pharmacy")).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Laboratory orders & diagnosis association",
      }),
    );
    expect(screen.getByLabelText("Associated diagnosis")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Review & sign →" }));
    const sign = screen.getByRole("button", { name: "Sign orders" });
    expect(sign.hasAttribute("disabled")).toBe(true);
    expect(
      screen.getAllByText("Human only · unskippable").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/Lean WASM required/).length).toBeGreaterThan(0);
    const activities = screen.getByRole("navigation", {
      name: "Chart activities",
    });
    fireEvent.click(
      within(activities).getByRole("button", { name: "Results" }),
    );
    expect(
      screen.getByRole("heading", { name: "Results", level: 2 }),
    ).toBeDefined();
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
    fireEvent.click(
      within(activities).getByRole("button", { name: "Chart Review" }),
    );
    expect(screen.getByDisplayValue("Routine follow-up")).toBeDefined();
  });
  it("switches all five development personas and opens Medplum SignInForm", async () => {
    openApp();
    const picker = screen.getByLabelText("DEV PERSONA");
    for (const id of ["P2", "P3", "P4", "P5", "P1"])
      fireEvent.change(picker, { target: { value: id } });
    expect(screen.getAllByText("Jordan Lee, MD")[0]).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(
      await screen.findByText("Sign in to your local Medplum instance."),
    ).toBeDefined();
    expect(screen.getByLabelText(/Email/)).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Continue with offline demonstration",
      }),
    );
    expect(screen.getByText("Morgan, Alexandra M.")).toBeDefined();
  });
});
