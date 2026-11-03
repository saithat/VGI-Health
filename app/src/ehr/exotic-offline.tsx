import "@mantine/core/styles.css";
import "./ui/clinical.css";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { MantineProvider } from "@mantine/core";
import {
  ResearchWorkspace,
  type ResearchView,
  type ScopedEvent,
} from "./ui/Exotic";
import { clinicalTheme } from "./ui/theme";
declare global {
  interface Window {
    renderResearch: (view: ResearchView) => void;
    researchEvents: ScopedEvent[];
  }
}
const element = document.getElementById("root");
if (!element) throw new Error("Missing laboratory root");
const root = createRoot(element);
window.researchEvents = [];
window.renderResearch = (view) =>
  flushSync(() =>
    root.render(
      <MantineProvider theme={clinicalTheme}>
        <ResearchWorkspace
          value={view}
          onEvent={(event) => {
            window.researchEvents.push(event);
            window.dispatchEvent(
              new CustomEvent("research-event", { detail: event }),
            );
          }}
        />
      </MantineProvider>,
    ),
  );

/** Interactive laboratory seam: each pane owns a complete independent Lean input.
No FHIR client is imported and no persistence endpoint exists here. */
import type {
  RenderInput,
  StepOutput,
} from "../../../lean/generated/ehr-types";
import { loadEhrInterp } from "../../public/ehr/interp-loader.mjs";
import { UiScreenView } from "./ui/Screen";
import { researchSchema } from "./ui/Exotic";
declare global {
  interface Window {
    startResearch: (
      mode: ResearchView["mode"],
      inputs: { patient: string; input: RenderInput }[],
      exampleAxis?: ResearchView["axis"],
    ) => Promise<void>;
    researchStates: Record<string, RenderInput>;
  }
}
window.startResearch = async (mode, inputs, exampleAxis) => {
  const wasm = await loadEhrInterp({
    locateFile: (filename) => `/ehr/${filename}`,
  });
  const sessions = new Map(
    inputs.map((p) => [p.patient, structuredClone(p.input)]),
  );
  if (sessions.size !== inputs.length)
    throw new Error("Duplicate patient session");
  for (const { patient, input } of inputs) {
    const source = input.facts.sourcePatientId;
    if ((source ?? input.facts.patientId) !== patient)
      throw new Error("Patient binding mismatch");
  }
  let boardReceipts: Record<string, unknown[]> = Object.fromEntries(
    inputs.map((p) => [p.patient, []]),
  );
  const nativeBoard = (patient?: string, event?: ScopedEvent["event"]) => {
    const result: {
      error?: string;
      node: ResearchView["ordinary"];
      sessions: { patient: string; input: RenderInput; receipts: unknown[] }[];
    } = JSON.parse(
      wasm.call(
        "ehr_exotic",
        JSON.stringify({
          op: "board",
          sessions: [...sessions].map(([key, input]) => ({
            patient: key,
            input,
            receipts: boardReceipts[key] ?? [],
          })),
          ...(patient && event ? { patient, event } : {}),
        }),
      ),
    );
    if (result.error) throw new Error(result.error);
    boardReceipts = Object.fromEntries(
      result.sessions.map((s: { patient: string; receipts: unknown[] }) => [
        s.patient,
        s.receipts,
      ]),
    );
    for (const s of result.sessions) sessions.set(s.patient, s.input);
    return result.node;
  };
  const emit = ({ patient, event }: ScopedEvent) => {
    if (mode === "board") {
      nativeBoard(patient, event);
      window.researchEvents.push({ patient, event });
      draw();
      return;
    }
    const input = sessions.get(patient);
    if (!input) throw new Error("Unknown patient session");
    const result: StepOutput = JSON.parse(
      wasm.step(JSON.stringify({ ...input, event })),
    );
    if (!result.state) throw new Error("Lean step failed");
    sessions.set(patient, { ...input, state: result.state });
    window.researchEvents.push({ patient, event });
    draw();
  };
  const draw = () => {
    // The native workspace owns lookup/open and validates hydration against the
    // selected source ID. Data arrival is not a second clinician activation.
    for (const [patient, input] of sessions) {
      const context = input.state.patientContext;
      if (
        input.program.patientSelection === true &&
        context?.patient &&
        context.patient === input.facts.sourcePatientId &&
        context.bound !== context.patient
      ) {
        if (mode === "board") {
          nativeBoard(patient, { scroll: { screen: input.state.screen } });
          continue;
        }
        const output: StepOutput = JSON.parse(
          wasm.step(
            JSON.stringify({
              ...input,
              event: { scroll: { screen: input.state.screen } },
            }),
          ),
        );
        if (!output.state) throw new Error("Patient hydration failed");
        sessions.set(patient, { ...input, state: output.state });
      }
    }
    const panes = [...sessions].map(([patient, input]) => {
      const result = JSON.parse(
        wasm.call(
          "ehr_exotic",
          JSON.stringify({
            op: mode === "dated" ? "dated" : "render",
            render: input,
          }),
        ),
      );
      if (result.error) throw new Error(result.error);
      return { patient, screen: result.screen };
    });
    window.researchStates = Object.fromEntries(sessions);
    // Lookup has no patient banner or clinical authority. Use its ordinary
    // native painter until the selected source is bound, retaining other panes.
    const landing = panes.find((pane) => pane.screen.banner.length === 0);
    if (landing && mode !== "board" && mode !== "dated") {
      flushSync(() =>
        root.render(
          <MantineProvider theme={clinicalTheme}>
            <UiScreenView
              screen={landing.screen}
              onEvent={(event) => emit({ patient: landing.patient, event })}
            />
          </MantineProvider>,
        ),
      );
      return;
    }
    const first = panes[0];
    const view = researchSchema.parse({
      mode,
      panes,
      ...(mode === "board" ? { ordinary: nativeBoard() } : {}),
      ...(mode === "dated" && first
        ? {
            ordinary: JSON.parse(
              wasm.call(
                "ehr_exotic",
                JSON.stringify({
                  op: "dated",
                  render: sessions.get(first.patient),
                }),
              ),
            ).node,
          }
        : {}),
      ...(mode === "dated" && first && exampleAxis
        ? { axis: exampleAxis }
        : {}),
    });
    flushSync(() =>
      root.render(
        <MantineProvider theme={clinicalTheme}>
          <ResearchWorkspace value={view} onEvent={emit} />
        </MantineProvider>,
      ),
    );
  };
  draw();
};

// A concrete, interactive canonical example is available without external data.
if (!new URLSearchParams(location.search).has("harness")) {
  const wasm = await loadEhrInterp({
    locateFile: (filename) => `/ehr/${filename}`,
  });
  const canonical: { input: RenderInput; axis: ResearchView["axis"] } =
    JSON.parse(wasm.call("ehr_exotic", JSON.stringify({ op: "canonical" })));
  const requested = new URLSearchParams(location.search).get("mode");
  const mode =
    (["command", "spatial", "board", "dated"] as const).find(
      (m) => m === requested,
    ) ?? "command";
  const inputs = Array.from({ length: mode === "board" ? 3 : 1 }, (_, i) => {
    const patient = `example-${i + 1}`;
    const input = structuredClone(canonical.input);
    input.facts.patientId = patient;
    input.facts.sourcePatientId = patient;
    input.display.sourcePatientId = patient;
    input.display.banner.name = `Example patient ${i + 1}`;
    input.display.banner.mrn = patient;
    return { patient, input };
  });
  await window.startResearch(
    mode,
    inputs,
    mode === "dated" ? canonical.axis : undefined,
  );
}
