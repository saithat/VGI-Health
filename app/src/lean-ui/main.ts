import { createReferencePainter, referenceLimit } from "./reference";
import { version as referenceGeneratorVersion } from "../../../scripts/layout-reference/generator.mjs";
import { z } from "zod";
import { loadWasmInterp } from "../core/wasmInterp";
import { createLiveSession } from "../core/liveSession";
import { clinicalDate } from "../data/clinicalDate";
import {
  loadListContext,
  restoreUser,
  searchPatients,
  signOut,
  type Bundle,
} from "../data/liveStore";
import { loginMar, marRequest } from "../data/commitService";
import { readArtifact } from "../browser/data";
import { createBoardTransport } from "./board";
import { createPainter } from "./painter";
import type { KeyboardState, Output } from "./layout";
import "./painter.css";

/** The application host has no framework. Clinical state and authorization use
 * the same live session and sole-writer service as the existing clinical page. */
async function main() {
  const rootElement = document.getElementById("root"),
    statusElement = document.getElementById("status");
  if (!rootElement || !statusElement)
    throw new Error("Missing clinical page root");
  const root = rootElement,
    status = statusElement;
  const report = (value: unknown) => {
    status.textContent = value instanceof Error ? value.message : String(value);
  };
  if (new URLSearchParams(location.search).has("program")) {
    const {openCatalogProgram} = await import("./catalog");
    return openCatalogProgram(root, status);
  }
  // The exact registered callback has no query; the page's own address,
  // with its patient/MAR/board parameters, is the return URL kept across the
  // identity provider's redirect (`returnTo`).
  const callback = new URL("lean.html", location.href).href;
  const user = await restoreUser(callback);
  // After a callback the address is the return URL again (restoreMar).
  const query = new URLSearchParams(location.search);
  if (!user) {
    status.textContent = "";
    const login = document.createElement("button");
    login.className = "lean-host-login";
    login.textContent = `Sign in as ${query.get("persona") ?? "P1"}`;
    login.onclick = () => {
      void loginMar(
        query.get("persona")?.toLowerCase() ?? "p1",
        callback,
      ).catch(report);
    };
    root.append(login);
    return;
  }
  const persona = user.persona === "RN2" ? "P3" : user.persona;
  const date = query.get("date") ?? clinicalDate();
  const baseline =
    query.get("baseline") ?? sessionStorage.getItem("vgi.baseline") ?? "0";
  sessionStorage.setItem("vgi.baseline", baseline);
  const [interp, release, graph, patients, references] = await Promise.all([
    loadWasmInterp(),
    marRequest(
      `/release?persona=${encodeURIComponent(persona)}&baseline=${baseline}`,
    ),
    loadListContext(user, date),
    searchPatients(""),
    query.get("family") ? readArtifact(query.get("family") ?? "") : undefined,
  ]);
  const content = z
    .object({
      spec: z.unknown(),
      program: z.record(z.string(), z.unknown()),
    })
    .parse(release);
  if (!interp.layout) throw new Error("Rebuild WASM: ehr_layout is required");
  const layout = interp.layout;
  const referencePaint = createReferencePainter(layout);
  const directory: Bundle = {
    ...graph,
    entry: [
      ...(graph.entry ?? []).filter(
        (e) => e.resource?.resourceType !== "Patient",
      ),
      ...patients.map((resource) => ({ resource })),
    ],
  };
  const session = await createLiveSession(
    interp,
    content.spec,
    { ...content.program, patientSelection: true },
    directory,
    user,
    undefined,
    date,
    query.get("marPatient")
      ? {
          patient: query.get("marPatient") ?? "",
          release: query.get("marRelease") ?? "mar",
          workflow: query.get("marWorkflow") ?? "dose",
          onUpdate: report,
        }
      : undefined,
  );
  const patientIds = query.get("patients")?.split(",").filter(Boolean) ?? [];
  if (new Set(patientIds).size !== patientIds.length)
    throw Error("Duplicate patient panes");
  const boardSessions = new Map(
    await Promise.all(
      patientIds.map(
        async (patient) =>
          [
            patient,
            await createLiveSession(
              interp,
              content.spec,
              { ...content.program, patientSelection: true },
              directory,
              user,
              undefined,
              date,
            ),
          ] as const,
      ),
    ),
  );
  const board = boardSessions.size
    ? createBoardTransport(boardSessions)
    : undefined;
  let queue = Promise.resolve();
  let pending = 0;
  let admitted = false;
  const painter = createPainter(root, {
    keyboard(profile, rows, cols, state, key): KeyboardState {
      return JSON.parse(
        layout(
          JSON.stringify({ op: "keyboard", profile, rows, cols, state, key }),
        ),
      );
    },
    dispatch: (event) => dispatch(event),
    ...(board
      ? {
          dispatchPatient: (
            patient: string,
            event: Parameters<typeof session.dispatch>[0],
          ) => dispatch(event, patient),
        }
      : {}),
  });
  // Sign out is a Lean navigation target (`Layout.withSession`); its click
  // ends the identity session and never reaches the clinical interpreter.
  let signOutComp = "";
  function dispatch(
    event: Parameters<typeof session.dispatch>[0],
    patient?: string,
  ) {
    if (
      patient === undefined &&
      signOutComp &&
      "click" in event &&
      event.click.comp === signOutComp
    ) {
      void signOut(callback);
      return;
    }
    const target = patient ? boardSessions.get(patient) : session;
    const generation =
      target && "getGeneration" in target ? target.getGeneration() : undefined;
    pending++;
    root.setAttribute("aria-busy", "true");
    queue = queue
      .then(async () => {
        if (!admitted)
          throw new Error(
            "Choose a supported viewport and admitted layout before continuing.",
          );
        if (
          target &&
          "getGeneration" in target &&
          target.getGeneration() !== generation
        )
          throw Error(
            "The chart refreshed. Review the current dose and repeat the action.",
          );
        const result =
          patient && board
            ? await board.dispatch(patient, event)
            : await session.dispatch(event);
        const refused = (
          patient ? boardSessions.get(patient) : session
        )?.getSnapshot().result;
        status.textContent =
          (result && typeof result === "object" && "message" in result
            ? String(result.message)
            : undefined) ??
          (refused && typeof refused === "object" && "blocked" in refused
            ? refused.blocked.reason
            : "");
      })
      .catch(report)
      .finally(() => {
        if (--pending === 0) root.removeAttribute("aria-busy");
      });
  }
  function paintCurrent() {
    const ordinary = session.getSnapshot();
    const snapshot = board
      ? {
          ...ordinary,
          ui: JSON.parse(
            layout(
              JSON.stringify({ op: "board-screen", panes: board.panes() }),
            ),
          ),
        }
      : ordinary;
    if (!snapshot.ui || !snapshot.layout)
      throw new Error("Lean semantic screen/layout API is required");
    // Layout and painting see the screen with its session group; the journal
    // keeps the clinical screen.
    const sessioned = z
      .object({
        screen: z.custom<NonNullable<typeof snapshot.ui>>(),
        signOut: z.string(),
      })
      .parse(
        JSON.parse(
          layout(JSON.stringify({ op: "session", screen: snapshot.ui })),
        ),
      );
    signOutComp = sessioned.signOut;
    const shown = sessioned.screen;
    const viewport = { w: window.innerWidth * 64, h: window.innerHeight * 64 };
    const start = performance.now();
    let output: Output;
    if (references === undefined) {
      const selected = referencePaint(
        shown,
        viewport,
        referenceLimit(
          String(content.program.specVersion),
          persona,
          snapshot.ui.screen ?? "",
        ),
      );
      output = selected.output;
      root.dataset.referenceLayout = selected.dense ? "dense" : "fixed-shell";
      root.dataset.referenceGenerator = referenceGeneratorVersion;
    } else {
      const encoded = layout(
        JSON.stringify({
          op: "family-paint",
          references,
          screen: shown,
          viewport,
          maxTargetsPerViewport: referenceLimit(
            String(content.program.specVersion),
            persona,
            snapshot.ui.screen ?? "",
          ),
        }),
      );
      if (!encoded) throw Error("Missing Lean layout output");
      output = JSON.parse(encoded);
      root.dataset.referenceLayout = "custom";
    }
    root.dataset.layoutMs = String(performance.now() - start);
    admitted = output.accepted;
    if (!output.accepted) {
      root.inert = true;
      delete root.dataset.accepted;
      throw new Error(
        `Lean refused this layout/viewport: ${JSON.stringify(output.findings ?? output)}`,
      );
    }
    root.inert = false;
    painter.patch(shown, output);
    if (board) board.onPaint();
    else session.onPaint(snapshot.ui);
    // Read-only browser evidence; no state/dispatch hook is exposed here.
    root.dispatchEvent(new CustomEvent("lean-paint", { detail: output }));
    status.textContent = "";
  }
  function paint() {
    try {
      paintCurrent();
    } catch (error) {
      admitted = false;
      root.inert = true;
      delete root.dataset.accepted;
      throw error;
    }
  }
  for (const current of board ? boardSessions.values() : [session])
    current.subscribe(() => {
      try {
        paint();
      } catch (error) {
        report(error);
      }
    });
  window.addEventListener("resize", () => {
    try {
      paint();
    } catch (error) {
      report(error);
    }
  });
  paint();
  status.textContent = "";
}
void main().catch((error) => {
  const status = document.getElementById("status");
  if (status) status.textContent = String(error);
});
