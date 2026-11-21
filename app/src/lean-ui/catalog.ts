import {
  prepareWorldChart,
  worldDirectory,
  worldSchedule,
  worldWorkDate,
  chartDateForTimelineDay,
} from "../data/worldChart";
import { keepFocusedTask, selectedRowSource } from "../data/patientDirectory";
import { currentProgram, loadCatalog, personas, readArtifact, programSpecPath, recordingManifest, verifyRecordedBuild } from "../browser/data";
import { loadWasmInterp } from "../core/wasmInterp";
import { createSession } from "../core/session";
import { replayScreen,createReferencePainter, referenceLimit } from "./reference";
import { createPainter } from "./painter";
const roles: Record<string, string> = {
  P1: "physician",
  P2: "physician",
  P3: "rn",
  P4: "np",
  P5: "surgeon",
};
export async function openCatalogProgram(root: HTMLElement, status: HTMLElement) {
  const query = new URLSearchParams(window.location.search);
  const catalog = await loadCatalog();
  const persona = query.get("persona") ?? "P1";
  if (!personas.some((id) => id === persona))
    throw new Error("Unknown persona");
  const path = query.get("program");
  const program = path
    ? catalog.programs.find((program) => program.path === path)
    : currentProgram(catalog, persona, query.get("run"));
  if (!program)
    throw new Error("Program is not in the committed UI catalog");
  if (program.run) await recordingManifest(program.run);
  const release = query.get("release") ?? program.release;
  if (!["v1", "v2", "v3"].includes(release))
    throw new Error("Unknown release");
  const dayParam = query.get("day");
  if (dayParam !== null && !/^(?:[0-9]|10)$/.test(dayParam))
    throw new Error("Unknown chart day");
  const defaultDate = await worldWorkDate();
  const workDate =
    query.get("date") ??
    (dayParam === null
      ? defaultDate
      : chartDateForTimelineDay(Number(dayParam), defaultDate));
  const daySchedule = await worldSchedule(persona, workDate);
  const [interp, spec, source] = await Promise.all([
    loadWasmInterp(),
    readArtifact(programSpecPath({ ...program, release })),
    readArtifact(`/${program.path}`),
  ]);
  const design = await verifyRecordedBuild(program.path, source);
  if (
    typeof source !== "object" ||
    source === null ||
    Array.isArray(source)
  )
    throw new Error("Invalid program");
  // Interactive historical layouts receive the fixed workspace wrapper.
  // Recorded ReplayApp keeps its original program and event semantics.
  const sessionProgram = { ...source, patientSelection: true };
  const context = {
    today: workDate,
    now: 540,
    receipts: [],
    record: [["viewerPersona", persona]],
    ...(persona === "P2"
      ? { encounterKind: "emergency" }
      : persona === "P3"
        ? { encounterKind: "inpatient" }
        : {}),
  };
  const graph = await worldDirectory(workDate);
  const extraPatients = catalog.patients.map((p) => ({
    id: p.id,
    name: p.name,
    mrn: p.mrn ?? "",
  }));
  const facts = JSON.parse(
    interp.facts(
      JSON.stringify({
        bundle: graph,
        context,
        directoryOnly: true,
        extraPatients,
      }),
    ),
  );
  const session = createSession(
    interp,
    spec,
    sessionProgram,
    facts,
    {
      id: persona,
      role: roles[persona],
    },
    {
      async loadPatient(id, selectedContext, event) {
        const chosen = catalog.patients.find((p) => p.id === id);
        if (!chosen)
          throw new Error("Patient is not in the offline fixture catalog");
        const raw = await readArtifact(`/${chosen.bundlePath}`);
        const activityWorkflows: Record<string, string> = {
          inboxResults: "W2",
          inboxRxRequests: "W7",
          edTrackBoard: "W3",
          shiftWorklist: "W4",
          unitCensus: "W4",
          orSchedule: "W6",
          consultList: "W6",
        };
        const personaWorkflows: Record<string, string> = {
          P1: "W1",
          P2: "W3",
          P3: "W4",
          P4: "W5",
          P5: "W6",
        };
        const workflow =
          activityWorkflows[selectedContext.activity] ??
          personaWorkflows[persona];
        const { bundle, worldContext } = await prepareWorldChart(
          raw,
          chosen.bundlePath,
          workDate,
          daySchedule?.tasks.find(
            (task) => task.patientId === id && task.workflow === workflow,
          ),
        );
        const source = selectedRowSource(
          facts.facts.patientDirectory,
          selectedContext,
          event,
          id,
        );
        const encounterId = source?.startsWith("Encounter/")
          ? source.slice(10)
          : undefined;
        const projection = JSON.parse(
          interp.facts(
            JSON.stringify({
              bundle: {
                ...bundle,
                entry: bundle.entry.filter((entry) =>
                  keepFocusedTask(entry.resource, source, id),
                ),
              },
              worldContext:
                worldContext &&
                typeof worldContext === "object" &&
                "entry" in worldContext &&
                Array.isArray(worldContext.entry)
                  ? {
                      ...worldContext,
                      entry: worldContext.entry.filter(
                        (entry: { resource?: unknown }) =>
                          keepFocusedTask(entry.resource, source, id),
                      ),
                    }
                  : worldContext,
              context: {
                ...context,
                ...(encounterId ? { encounterId } : {}),
              },
              extraPatients,
            }),
          ),
        );
        projection.facts.patientDirectory = facts.facts.patientDirectory;
        return projection;
      },
      onError(error) {
        status.textContent = String(error);
      },
    },
  );
  const layout = interp.layout;
  if (!layout) throw Error("Lean layout API is required");
  const reference = createReferencePainter(layout, design);
  const painter = createPainter(root, {
    dispatch: event => session.dispatch(event),
    keyboard: (profile, rows, cols, state, key) => JSON.parse(layout(JSON.stringify({op:"keyboard", profile, rows, cols, state, key}))),
  });
  const paint = () => {
    const snapshot = session.getSnapshot();
    const ui = snapshot.ui && replayScreen(layout, snapshot.ui);
    if (!ui) throw Error("Lean semantic screen is unavailable");
    const {output} = reference(ui, {w:innerWidth*64,h:innerHeight*64}, referenceLimit(release, persona, ui.screen ?? ""));
    if (!output.accepted) throw Error("Lean refused the recorded layout");
    painter.patch(ui,output);
  };
  session.subscribe(paint);
  addEventListener("resize", paint);
  status.textContent = "";
  paint();
}
