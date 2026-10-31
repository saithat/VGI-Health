import { Button, NativeSelect, Paper } from "@mantine/core";
import { SignInForm } from "@medplum/react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { createMockInterp } from "./core/interp";
import { createSession } from "./core/session";
import type { Role } from "./core/types";
import { environment, loadChart, signOut } from "./data/medplum";
import type { ChartData } from "./data/fhir";
import { offlineChart } from "./mock/patient";
import { mockFacts, mockProgram, mockSpec, mockViews } from "./mock/workflow";
import { paint } from "./ehr/painter";

const personaSchema = z.enum(["P1", "P2", "P3", "P4", "P5"]);
const personas: {
  value: z.infer<typeof personaSchema>;
  label: string;
  role: Role;
  name: string;
}[] = [
  {
    value: "P1",
    label: "P1 · Primary care physician",
    role: "physician",
    name: "Jordan Lee, MD",
  },
  {
    value: "P2",
    label: "P2 · ED physician",
    role: "physician",
    name: "Sam Rivera, MD",
  },
  {
    value: "P3",
    label: "P3 · Inpatient RN",
    role: "rn",
    name: "Casey Patel, RN",
  },
  {
    value: "P4",
    label: "P4 · Pediatric NP",
    role: "np",
    name: "Avery Chen, NP",
  },
  {
    value: "P5",
    label: "P5 · General surgeon",
    role: "surgeon",
    name: "Taylor Brooks, MD",
  },
];
export function App() {
  const [personaId, setPersonaId] =
    useState<z.infer<typeof personaSchema>>("P1");
  const [login, setLogin] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<ChartData>(offlineChart);
  const [loadError, setLoadError] = useState("");
  const persona =
    personas.find((item) => item.value === personaId) ?? personas[0];
  if (!persona) throw new Error("No development personas configured");
  const session = useMemo(() => {
    // Never carry the synthetic patient's sample bindings into a connected chart.
    const fixtureViews =
      data.source === "offline"
        ? mockViews
        : mockViews.map((view) => ({
            ...view,
            items: view.items.map((item) => ({ ...item, bound: null })),
          }));
    return createSession(
      createMockInterp(fixtureViews, mockFacts, data),
      mockSpec,
      mockProgram,
      {
        resourceType: "Bundle",
        type: "collection",
        entry: [data.patient, ...data.resources].map((resource) => ({
          resource,
        })),
      },
      { id: personaId, role: persona.role },
    );
  }, [personaId, persona.role, data]);
  const { page } = useSyncExternalStore(session.subscribe, session.getSnapshot);
  useEffect(() => {
    let active = true;
    // A read-only effect; all FHIR operations stay in the single data module.
    loadChart()
      .then((chart) => {
        if (active) {
          setData(chart);
          setLoadError("");
        }
      })
      .catch((error: unknown) => {
        if (active)
          setLoadError(
            error instanceof Error ? error.message : "Chart validation failed",
          );
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  if (login)
    return (
      <main className="signin-page">
        <div className="signin-brand">
          VGI<span>HEALTH</span>
        </div>
        <Paper withBorder shadow="sm" p="xl" w={420} maw="95vw">
          <h1>Clinical workspace</h1>
          <p className="subtle">Sign in to your local Medplum instance.</p>
          <SignInForm
            clientId={environment.VITE_MEDPLUM_CLIENT_ID}
            onSuccess={() => {
              setLogin(false);
              setRefresh((value) => value + 1);
            }}
          />
          <Button
            variant="subtle"
            mt="md"
            fullWidth
            onClick={() => setLogin(false)}
          >
            Continue with offline demonstration
          </Button>
          <small className="subtle">
            Server: {environment.VITE_MEDPLUM_BASE_URL}
          </small>
        </Paper>
      </main>
    );

  return (
    <div>
      <div className="workspace-toolbar">
        <div className="persona-control">
          <label htmlFor="persona">DEV PERSONA</label>
          <NativeSelect
            id="persona"
            size="xs"
            value={personaId}
            data={personas.map(({ value, label }) => ({ value, label }))}
            onChange={(event) =>
              setPersonaId(personaSchema.parse(event.currentTarget.value))
            }
          />
          <span>{persona.name}</span>
        </div>
        <Button
          size="compact-xs"
          variant="default"
          onClick={() => {
            if (data.source === "medplum") {
              signOut()
                .then(() => setRefresh((value) => value + 1))
                .catch(() => setLoadError("Sign-out failed"));
            } else setLogin(true);
          }}
        >
          {data.source === "medplum" ? "Sign out" : "Sign in"}
        </Button>
      </div>
      {loadError && <p role="alert">{loadError}</p>}
      {paint(page, session.dispatch)}
    </div>
  );
}
