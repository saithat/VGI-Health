import {
  prepareWorldChart,
  worldDirectory,
  worldSchedule,
  worldWorkDate,
  chartDateForTimelineDay,
} from "./data/worldChart";
import { keepFocusedTask, selectedRowSource } from "./data/patientDirectory";
import { clinicianRoleNames } from "./ehr/ui/personas";
import { navigate } from "./navigation";
import type { PresentationBundle } from "./ehr/ui/presentation-types";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Alert, Button, Drawer } from "@mantine/core";
import { UiScreenView } from "./ehr/ui/Screen";
import { loadWasmInterp } from "./core/wasmInterp";
import { createSession } from "./core/session";
import type { Interp } from "./core/interp";
import {
  currentProgram,
  ehrUrl,
  loadCatalog,
  personas,
  readArtifact,
  verifyRecordedBuild,
  programSpecPath,
  verdictsSchema,
  type Catalog,
  type ProgramEntry,
} from "./browser/data";

type Session = ReturnType<typeof createSession>;
interface Workspace {
  presentations: PresentationBundle | null;
  session: Session;
  catalog: Catalog;
  program: ProgramEntry;
  persona: string;
  verdict: { status: string; output?: unknown };
}
let interpreter: Promise<Interp> | undefined;
const roles: Record<string, string> = {
  P1: "physician",
  P2: "physician",
  P3: "rn",
  P4: "np",
  P5: "surgeon",
};
const pretty = (value: unknown) => JSON.stringify(value, null, 2);
function LiveWorkspace({ workspace }: { workspace: Workspace }) {
  const { session, catalog, program, persona, verdict } = workspace;
  const { ui, state, result } = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
  );
  const [error, setError] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const view = inspecting ? session.getSnapshot().view : undefined;
  const dispatch = (event: Parameters<typeof session.dispatch>[0]) => {
    try {
      session.dispatch(event);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  };
  return (
    <>
      {error && (
        <Alert role="alert" color="red">
          {error}
        </Alert>
      )}
      <div
        className="live-page"
        aria-hidden={inspecting ? true : undefined}
        ref={(element) => {
          if (element) element.inert = inspecting;
        }}
      >
        {ui ? (
          <UiScreenView
            screen={ui}
            presentations={workspace.presentations}
            onEvent={dispatch}
            viewer={`${program.path.includes("/bad/") ? `REJECTED example: ${program.expectedProperty ?? verdict.status} · ` : ""}${clinicianRoleNames[persona] ?? "Clinician"} · ${program.run ? `rev ${program.version}` : `${program.release} ${program.path.endsWith("/canonical.json") ? "vendor reference" : "baseline"}`}`}
          />
        ) : (
          <Alert color="red" role="alert">
            The semantic renderer is unavailable. Rebuild the EHR WASM assets.
          </Alert>
        )}
      </div>
      {window.location.pathname === "/ehr" &&
        new URLSearchParams(window.location.search).get("inspect") === "1" && (
          <>
            {!inspecting && (
              <Button
                size="compact-xs"
                variant="default"
                className="inspector-toggle"
                onClick={() => setInspecting(true)}
              >
                Inspector
              </Button>
            )}
            <Drawer
              opened={inspecting}
              onClose={() => setInspecting(false)}
              position="right"
              title="Encounter inspector"
              closeButtonProps={{ "aria-label": "Close inspector" }}
              size="lg"
            >
              {view && (
                <div className="inspector-content">
                  <a href={`/browse?persona=${persona}`}>← UI browser</a>
                  <label>
                    Persona{" "}
                    <select
                      aria-label="Persona"
                      value={persona}
                      onChange={(event) => {
                        const id = event.currentTarget.value;
                        navigate(
                          ehrUrl(currentProgram(catalog, id, program.run), id),
                        );
                      }}
                    >
                      {personas.map((id) => (
                        <option key={id}>{id}</option>
                      ))}
                    </select>
                  </label>

                  <p>
                    {program.release} · {program.path}
                  </p>
                  <Button
                    size="xs"
                    onClick={() => navigate(window.location.href)}
                  >
                    Reset episode
                  </Button>
                  <a
                    href={
                      program.run
                        ? `/dashboard?run=${encodeURIComponent(program.run)}`
                        : "/dashboard"
                    }
                  >
                    Dashboard
                  </a>
                  <h2>Current screen</h2>
                  <p>
                    {view.title} · {state.screen}
                  </p>
                  <p aria-live="polite">
                    Last step:{" "}
                    {result === null ? "initialized" : pretty(result)}
                  </p>
                  <h2>Checker verdict</h2>
                  <p>{verdict.status}</p>
                  {verdict.output !== undefined && (
                    <pre>{pretty(verdict.output)}</pre>
                  )}
                  <h2>Enabled actions</h2>
                  <pre>{pretty(view.enabled)}</pre>
                  <h2>Blocked reasons</h2>
                  <pre>{pretty(view.blocked)}</pre>
                  <h2>Captured values · provenance</h2>
                  <pre data-testid="captured">{pretty(state.captured)}</pre>
                  <h2>Pending confirms</h2>
                  <pre>
                    {pretty(
                      view.items
                        .filter((item) => item.pendingConfirm)
                        .map((item) => ({
                          component: item.comp.id,
                          value: item.value,
                          provenance: item.provenance,
                        })),
                    )}
                  </pre>
                  <h2>Receipts</h2>
                  <pre>{pretty(state.receipts)}</pre>
                  <h2>Acknowledged alerts</h2>
                  <pre>{pretty(state.acked)}</pre>
                  <h2>Commit log</h2>
                  <pre data-testid="commits">{pretty(state.commits)}</pre>
                </div>
              )}
            </Drawer>
          </>
        )}
    </>
  );
}

/** Every EHR route loads real Lean; mock interpreters are confined to dashboard recordings. */
export function App() {
  const [workspace, setWorkspace] = useState<Workspace>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
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
      const [interp, spec, source, verdicts] = await Promise.all([
        (interpreter ??= loadWasmInterp()),
        readArtifact(programSpecPath({ ...program, release })),
        readArtifact(`/${program.path}`),
        readArtifact("/verdicts.json")
          .then((data) => verdictsSchema.parse(data))
          .catch(() => verdictsSchema.parse({ programs: {} })),
      ]);
      const presentations = await verifyRecordedBuild(program.path, source);
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
              inBasketResults: "W2",
              inBasketRxRequests: "W7",
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
            if (active)
              setError(error instanceof Error ? error.message : String(error));
          },
        },
      );
      if (active) {
        setWorkspace({
          session,
          presentations,
          catalog,
          program: { ...program, release },
          persona,
          verdict: verdicts.programs[program.path] ?? {
            status: "verdict not computed",
          },
        });
        const canonicalUrl = new URL(
          ehrUrl(
            { ...program, release },
            persona,
            dayParam === null ? undefined : Number(dayParam),
          ),
          window.location.href,
        );
        canonicalUrl.searchParams.delete("patient");
        if (query.has("date")) canonicalUrl.searchParams.set("date", workDate);
        if (query.get("inspect") === "1")
          canonicalUrl.searchParams.set("inspect", "1");
        if (query.get("audit") === "buttons")
          canonicalUrl.searchParams.set("audit", "buttons");
        window.history.replaceState(
          null,
          "",
          canonicalUrl.pathname + canonicalUrl.search,
        );
      }
    }
    load().catch((error: unknown) => {
      if (active)
        setError(error instanceof Error ? error.message : String(error));
    });
    return () => {
      active = false;
    };
  }, []);
  if (error)
    return (
      <main className="browser-page">
        <a href="/browse">← UI browser</a>
        <h1>Unable to open this program</h1>
        <p role="alert">{error}</p>
      </main>
    );
  if (!workspace) return <p>Loading department workspace…</p>;
  return <LiveWorkspace workspace={workspace} />;
}
