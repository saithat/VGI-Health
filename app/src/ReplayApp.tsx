import { useEffect, useState } from "react";
import type { Event } from "../../lean/generated/ehr-types";
import type { Interp } from "./core/interp";
import { loadWasmInterp } from "./core/wasmInterp";
import { Dashboard } from "./dashboard/Dashboard";
import {
  defaultRunSchema,
  loadRun,
  readRunJson,
  runIndexSchema,
  type RunData,
} from "./dashboard/data";
import { ReplayScreen } from "./dashboard/replay";

const personaNames = {
  P1: "Dr. Maya Chen, MD · Primary care physician",
  P2: "Dr. Marcus Okafor, MD · ED physician",
  P3: "Rosa Delgado, RN · Inpatient RN",
  P4: "Priya Raman, MSN, CPNP · Pediatric NP",
  P5: "Dr. James Whitaker, MD, FACS · General surgeon",
};
let interpreter: Promise<Interp> | undefined;
const wasm = () => (interpreter ??= loadWasmInterp());

/** Recorded inputs and events only: no agent calls or clinical writes in replay. */
export function ReplayApp({ dashboard = false }: { dashboard?: boolean }) {
  const query = new URLSearchParams(window.location.search);
  const [run, setRun] = useState<RunData>();
  const [interp, setInterp] = useState<Interp>();
  const [error, setError] = useState("");
  const [persona, setPersona] = useState(query.get("persona") ?? "P1");
  const [events, setEvents] = useState<Event[]>([]);
  useEffect(() => {
    let active = true;
    Promise.all([
      readRunJson("/runs/index.json"),
      readRunJson("/runs/default.json"),
      wasm(),
    ])
      .then(async ([raw, selected, loaded]) => {
        const id = query.get("run") ?? defaultRunSchema.parse(selected).runId;
        const entry = runIndexSchema
          .parse(raw)
          .find((entry) => entry.id === id);
        if (!entry) throw new Error(`Recorded run ${id} is unavailable`);
        const data = await loadRun(id, entry.files);
        if (active) {
          setRun(data);
          setInterp(loaded);
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setError(reason instanceof Error ? reason.message : "Replay failed");
      });
    return () => {
      active = false;
    };
    // The route is loaded once; dashboard owns subsequent run selection.
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!run || !interp) return <p>Loading recorded replay…</p>;
  if (dashboard) return <Dashboard interpFactory={() => interp} />;
  const task = run.replay?.tasks.find((task) => task.persona === persona);
  const version =
    task?.after.version ??
    Math.max(
      0,
      ...[...run.programs.keys()].flatMap((path) => {
        const match = new RegExp(`^programs/${persona}/v(\\d+)\\.json$`).exec(
          path,
        );
        return match ? [Number(match[1])] : [];
      }),
    );
  const runId = run.manifest.runId;
  return (
    <>
      <div className="workspace-toolbar">
        <label>
          REPLAY · Persona{" "}
          <select
            aria-label="Replay persona"
            value={persona}
            onChange={(event) => {
              setPersona(event.currentTarget.value);
              setEvents([]);
              window.history.replaceState(
                null,
                "",
                `/?persona=${event.currentTarget.value}&run=${encodeURIComponent(runId)}`,
              );
            }}
          >
            {Object.entries(personaNames).map(([id, name]) => (
              <option key={id} value={id}>
                {id} · {name}
              </option>
            ))}
          </select>
        </label>
        <span>
          Recorded run {runId} · v{version}
        </span>
        <button onClick={() => setEvents([])}>Reset replay</button>
        {task && (
          <button
            onClick={() =>
              setEvents(task.after.trace.map((entry) => entry.event))
            }
          >
            Replay recorded task
          </button>
        )}
        <a href={`/dashboard?run=${encodeURIComponent(runId)}`}>Dashboard</a>
      </div>
      <p>
        {run.manifest.warning ??
          "Recorded real run · Lean WASM interpreter · local replay"}
      </p>
      <ReplayScreen
        run={run}
        persona={persona}
        version={version}
        events={events}
        factory={run.manifest.ehr.mode === "fake" ? undefined : () => interp}
        onEvent={(event) => setEvents((current) => [...current, event])}
      />
    </>
  );
}
