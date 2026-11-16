import { z } from "zod";
import { loadWasmInterp } from "../core/wasmInterp";
import { createLiveSession } from "../core/liveSession";
import { clinicalDate } from "../data/clinicalDate";
import {
  loadListContext,
  restoreUser,
  searchPatients,
  type Bundle,
} from "../data/liveStore";
import { loginMar, marRequest } from "../data/commitService";
import { readArtifact } from "../browser/data";
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
  const query = new URLSearchParams(location.search);
  const callback = new URL("lean.html", location.href).href;
  const user = await restoreUser(callback);
  if (!user) {
    status.textContent = "";
    const login = document.createElement("button");
    login.textContent = `Sign in as ${query.get("persona") ?? "P1"}`;
    login.onclick = () => {
      const target = new URL("lean.html", location.href);
      void loginMar(
        query.get("persona")?.toLowerCase() ?? "p1",
        target.href,
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
  );
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
    dispatch(event) {
      pending++;
      root.setAttribute("aria-busy", "true");
      queue = queue
        .then(async () => {
          if (!admitted)
            throw new Error(
              "Choose a supported viewport and admitted layout before continuing.",
            );
          const result = await session.dispatch(event);
          const refused = session.getSnapshot().result;
          status.textContent =
            result?.message ??
            (refused && typeof refused === "object" && "blocked" in refused
              ? refused.blocked.reason
              : "");
        })
        .catch(report)
        .finally(() => {
          if (--pending === 0) root.removeAttribute("aria-busy");
        });
    },
  });
  function paintCurrent() {
    const snapshot = session.getSnapshot();
    if (!snapshot.ui || !snapshot.layout)
      throw new Error("Lean semantic screen/layout API is required");
    const viewport = { w: window.innerWidth * 64, h: window.innerHeight * 64 };
    const start = performance.now();
    const encoded = snapshot.layout({
      viewport,
      ...(references === undefined ? {} : { references }),
    });
    if (!encoded) throw new Error("Missing Lean layout output");
    const output: Output = JSON.parse(encoded);
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
    painter.patch(snapshot.ui, output);
    session.onPaint(snapshot.ui);
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
  session.subscribe(() => {
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
