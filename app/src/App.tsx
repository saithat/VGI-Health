import { navigate } from "./navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Alert, Button, Drawer } from "@mantine/core";
import { UiScreenView } from "./ehr/ui/Screen";
import { loadWasmInterp } from "./core/wasmInterp";
import { createSession } from "./core/session";
import type { Interp } from "./core/interp";
import { PatientPicker } from "./browser/Browse";
import {
  currentProgram,
  defaultPatient,
  ehrUrl,
  loadCatalog,
  personas,
  readArtifact,
  verdictsSchema,
  type Catalog,
  type ProgramEntry,
  type Patient,
} from "./browser/data";

type Session = ReturnType<typeof createSession>;
interface Workspace {
  session: Session;
  catalog: Catalog;
  program: ProgramEntry;
  patient: Patient;
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
  const { session, catalog, program, patient, persona, verdict } = workspace;
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
          <UiScreenView screen={ui} onEvent={dispatch} />
        ) : (
          <Alert color="red" role="alert">
            The semantic renderer is unavailable. Rebuild the EHR WASM assets.
          </Alert>
        )}
      </div>
      {window.location.pathname === "/ehr" && (
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
                <a href={`/browse?patient=${patient.id}&persona=${persona}`}>
                  ← UI browser
                </a>
                <label>
                  Persona{" "}
                  <select
                    aria-label="Persona"
                    value={persona}
                    onChange={(event) => {
                      const id = event.currentTarget.value;
                      navigate(
                        ehrUrl(
                          currentProgram(catalog, id, program.run),
                          defaultPatient(catalog, id).id,
                          id,
                        ),
                      );
                    }}
                  >
                    {personas.map((id) => (
                      <option key={id}>{id}</option>
                    ))}
                  </select>
                </label>
                <details className="patient-switcher">
                  <summary>
                    {patient.name} · {patient.age} · {patient.encounterClass} ·
                    Change patient
                  </summary>
                  <PatientPicker
                    catalog={catalog}
                    value={patient.id}
                    onChange={(selected) =>
                      navigate(ehrUrl(program, selected.id, persona))
                    }
                  />
                </details>
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
                  Last step: {result === null ? "initialized" : pretty(result)}
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
      if (!["v1", "v1.1", "v2"].includes(release))
        throw new Error("Unknown release");
      const patientId = query.get("patient");
      const patient = patientId
        ? catalog.patients.find((patient) => patient.id === patientId)
        : defaultPatient(catalog, persona);
      if (!patient)
        throw new Error("Patient is not in the committed patient fixtures");
      const [interp, spec, source, bundle, verdicts] = await Promise.all([
        (interpreter ??= loadWasmInterp()),
        readArtifact(`/releases/${release}/spec.json`),
        readArtifact(`/${program.path}`),
        readArtifact(`/${patient.bundlePath}`),
        readArtifact("/verdicts.json")
          .then((data) => verdictsSchema.parse(data))
          .catch(() => verdictsSchema.parse({ programs: {} })),
      ]);
      const facts = JSON.parse(
        interp.facts(
          JSON.stringify({
            bundle,
            context: {
              today: catalog.referenceDate,
              now: 540,
              receipts: [],
              record: [],
              ...(persona === "P2"
                ? { encounterKind: "emergency" }
                : persona === "P3"
                  ? { encounterKind: "inpatient" }
                  : persona === "P5"
                    ? { encounterKind: "preop" }
                    : {}),
            },
          }),
        ),
      );
      const session = createSession(interp, spec, source, facts, {
        id: persona,
        role: roles[persona],
      });
      if (active) {
        setWorkspace({
          session,
          catalog,
          program: { ...program, release },
          patient,
          persona,
          verdict: verdicts.programs[program.path] ?? {
            status: "verdict not computed",
          },
        });
        window.history.replaceState(
          null,
          "",
          ehrUrl({ ...program, release }, patient.id, persona),
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
  if (!workspace)
    return <p>Loading real Lean WASM and committed patient bundle…</p>;
  return <LiveWorkspace workspace={workspace} />;
}
