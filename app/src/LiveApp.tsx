import { CURRENT_RELEASE } from "./core/currentRelease";
import { worldWorkDate } from "./data/worldChart";
import { clinicianRoleNames } from "./ehr/ui/personas";
import type { PresentationBundle } from "./ehr/ui/presentation-types";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Alert,
  Button,
  Drawer,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { UiScreenView } from "./ehr/ui/Screen";
import { loadWasmInterp } from "./core/wasmInterp";
import { createLiveSession, type LiveContext } from "./core/liveSession";
import { medicationDue } from "./data/worklist";
import {
  loadCatalog,
  readArtifact,
  verifyRecordedBuild,
  programSpecPath,
} from "./browser/data";
import {
  availableBeds,
  bundleResources,
  restoreUser,
  loadPatientBundle,
  loadListContext,
  loadWorklist,
  quickSignIn,
  readResource,
  readSavedResource,
  searchPatients,
  signOut,
  startEncounter,
  type Bundle,
  type Encounter,
  type LiveUser,
  type Location,
  type MedicationRequest,
  type Patient,
  type Resource,
  type Task,
  type Worklist,
} from "./data/medplum";

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
const nameOf = (patient: Patient) =>
  patient.name?.[0]?.text ||
  [...(patient.name?.[0]?.given ?? []), patient.name?.[0]?.family]
    .filter(Boolean)
    .join(" ") ||
  "Name not recorded";
const patientReference = (resource: Resource) => {
  if (resource.resourceType === "Appointment")
    return resource.participant.find((p) =>
      p.actor?.reference?.startsWith("Patient/"),
    )?.actor;
  if (resource.resourceType === "Task") return resource.for;
  if (
    "subject" in resource &&
    resource.subject &&
    typeof resource.subject === "object" &&
    "reference" in resource.subject &&
    typeof resource.subject.reference === "string"
  )
    return { reference: resource.subject.reference };
  return undefined;
};
const titles: Record<string, string> = {
  P1: "Today's clinic · In-basket · Refills",
  P2: "Emergency department track board",
  P3: "Ward census · Medication worklist",
  RN2: "Ward census · Independent checks",
  P4: "Pediatric appointments",
  P5: "OR schedule · Consults",
};
type Session = Awaited<ReturnType<typeof createLiveSession>>;
interface Selection {
  bundle: Bundle;
  worldContext: Bundle;
  patient: Patient;
  encounters: Encounter[];
  tasks: Task[];
  medications: MedicationRequest[];
  beds: Location[];
  workItem?: Resource;
}

const personaLabels: Record<string, string> = {
  P1: "P1 · Primary care",
  P2: "P2 · Emergency",
  P3: "P3 · Inpatient RN",
  P4: "P4 · Pediatric NP",
  P5: "P5 · Surgeon",
  RN2: "RN2 · Second nurse",
};

/** Program shown in live mode: the persona's latest certified personalized
version from a recorded run, the persona's canonical projection if none
exists yet, or the original canonical baseline. */
async function liveProgram(
  persona: string,
  baseline: boolean,
): Promise<{
  spec: unknown;
  program: unknown;
  presentations?: PresentationBundle | null;
}> {
  if (baseline)
    return {
      spec: await readArtifact(`/releases/${CURRENT_RELEASE}/spec.json`),
      program: await readArtifact(
        `/releases/${CURRENT_RELEASE}/personas/${persona}.json`,
      ),
    };
  const catalog = await loadCatalog();
  const deployed = catalog.programs.find(
    (p) =>
      p.persona === persona && p.deployed && p.run !== null && p.run !== "mock",
  );
  if (deployed) {
    const program = await readArtifact(`/${deployed.path}`);
    const presentations = await verifyRecordedBuild(deployed.path, program);
    return {
      presentations,
      spec: await readArtifact(programSpecPath(deployed)),
      program,
    };
  }
  return {
    spec: await readArtifact(`/releases/${CURRENT_RELEASE}/spec.json`),
    program: await readArtifact(
      `/releases/${CURRENT_RELEASE}/personas/${persona}.json`,
    ),
  };
}

function Login({
  onLogin,
}: {
  onLogin: (user: LiveUser, baseline: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [baselinePersona, setBaselinePersona] = useState("P1");
  async function login(persona: string, baseline: boolean) {
    setPending(true);
    setError("");
    try {
      onLogin(await quickSignIn(persona), baseline);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="signin-page">
      <div className="signin-brand">
        VGI HEALTH <span>LIVE · Local Medplum</span>
      </div>
      <Paper p="xl" withBorder w="min(520px, 95vw)">
        <Title order={1} size="h2">
          Choose a clinician
        </Title>
        <Text mb="lg">
          Each opens that clinician's current certified EHR. Changes save to the
          local Medplum server.
        </Text>
        {error && (
          <Alert role="alert" color="red" mb="md">
            {error}
          </Alert>
        )}
        <Stack gap="xs">
          {Object.keys(personaLabels).map((persona) => (
            <Button
              key={persona}
              variant="light"
              justify="flex-start"
              disabled={pending}
              title={pending ? "Loading Medplum data" : undefined}
              onClick={() => void login(persona, false)}
            >
              {personaLabels[persona]}
            </Button>
          ))}
          <label className="baseline-persona-picker">
            Baseline clinician
            <select
              aria-label="Baseline clinician"
              value={baselinePersona}
              onChange={(event) =>
                setBaselinePersona(event.currentTarget.value)
              }
            >
              {Object.entries(personaLabels)
                .filter(([id]) => id !== "RN2")
                .map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <Button
            mt="md"
            variant="outline"
            disabled={pending}
            title={pending ? "Loading Medplum data" : undefined}
            onClick={() => void login(baselinePersona, true)}
          >
            Original canonical EHR (baseline)
          </Button>
        </Stack>
      </Paper>
      <a href="/browse">Demo / replay — no Docker required</a>
      <a href="/dashboard">Offline dashboard</a>
    </main>
  );
}

function Chart({
  presentations,
  session,
  onClose,
  viewer,
}: {
  presentations: PresentationBundle | null;
  session: Session;
  onClose: () => void;
  viewer: string;
}) {
  const { ui } = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const inspecting =
    new URLSearchParams(window.location.search).get("inspect") === "1";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState(false);
  const [links, setLinks] = useState<string[]>([]);
  const [resourceOpen, setResourceOpen] = useState(false);
  const [savedResource, setSavedResource] = useState<Resource>();
  const [resourceError, setResourceError] = useState("");
  function viewResource(link: string) {
    if (!inspecting) return;
    setResourceOpen(true);
    setSavedResource(undefined);
    setResourceError("");
    void readSavedResource(link)
      .then(setSavedResource)
      .catch((error: unknown) => setResourceError(errorText(error)));
  }
  const closeChart = () => {
    setPanel(false);
    setError("");
    onClose();
  };
  return (
    <>
      <div
        aria-busy={pending}
        ref={(el) => {
          if (el) el.inert = pending || panel || (inspecting && resourceOpen);
        }}
      >
        {ui ? (
          <UiScreenView
            presentations={presentations}
            screen={ui}
            viewer={viewer}
            onEvent={(event) => {
              if (pending) return;
              setError("");
              // Ordinary input events resolve immediately; only commits wait on I/O.
              setPending(true);
              void session
                .dispatch(event)
                .then((result) => {
                  if (result) {
                    setLinks(result.links);
                    notifications.show({
                      title: inspecting
                        ? "Medplum"
                        : result.refreshRequired
                          ? "Chart refresh needed"
                          : "Saved",
                      message: inspecting ? (
                        <>
                          {result.message}
                          {inspecting && (
                            <ul>
                              {result.links.map((link, index) => (
                                <li key={link}>
                                  <Button
                                    size="compact-xs"
                                    variant="subtle"
                                    data-resource-link={link}
                                    onClick={() => viewResource(link)}
                                  >
                                    View saved record {index + 1}
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      ) : result.refreshRequired ? (
                        "Your changes have been saved. Return to the worklist and reopen the chart before continuing."
                      ) : (
                        `${result.message}. Your changes have been saved.`
                      ),
                      color: result.refreshRequired ? "orange" : "green",
                      autoClose: 12000,
                    });
                  }
                })
                .catch((error: unknown) => {
                  setError(errorText(error));
                  setPanel(true);
                })
                .finally(() => setPending(false));
            }}
          />
        ) : (
          <Alert color="red">Semantic WASM renderer unavailable</Alert>
        )}
      </div>
      {Boolean(ui?.banner.length) && (
        <div className="live-controls">
          {!inspecting && (
            <Button
              size="xs"
              variant="default"
              loading={pending}
              title={pending ? "Saving encounter changes" : undefined}
              onClick={() => setPanel(true)}
            >
              Encounter options
            </Button>
          )}
          <Button
            size="xs"
            loading={pending}
            title={pending ? "Saving encounter changes" : undefined}
            onClick={inspecting ? () => setPanel(true) : closeChart}
          >
            {inspecting ? "Live encounter" : "Close chart"}
          </Button>
        </div>
      )}
      <Drawer
        transitionProps={{ duration: 0 }}
        zIndex={1100}
        opened={panel}
        onClose={() => setPanel(false)}
        title={inspecting ? "Live Medplum encounter" : "Encounter options"}
        closeButtonProps={{
          "aria-label": inspecting
            ? "Close live encounter"
            : "Close encounter options",
        }}
      >
        <Stack>
          <Text>
            {ui?.banner.find(([label]) => label === "Patient")?.[1] ||
              "Patient chart"}
          </Text>
          {error && (
            <Alert role="alert" color="red">
              {inspecting ? error : "Unable to save this change."}
              <p>
                Your inputs are retained. Close this panel, correct the issue,
                and retry the action.
              </p>
            </Alert>
          )}
          {inspecting && links.length > 0 && (
            <div role="status">
              <p>Saved resources</p>
              <ul>
                {links.map((link, index) => (
                  <li key={link}>
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      data-resource-link={link}
                      onClick={() => viewResource(link)}
                    >
                      View saved record {index + 1}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button variant="default" onClick={closeChart}>
            Return to worklist
          </Button>
          {inspecting && <a href="/dashboard">Demo / replay dashboard</a>}
        </Stack>
      </Drawer>
      <Modal
        transitionProps={{ duration: 0 }}
        opened={inspecting && resourceOpen}
        onClose={() => setResourceOpen(false)}
        title="Saved Medplum resource"
        size="xl"
        zIndex={1200}
        closeButtonProps={{ "aria-label": "Close saved resource" }}
      >
        {resourceError ? (
          <Alert role="alert" color="red">
            {resourceError}
          </Alert>
        ) : savedResource ? (
          <pre
            aria-label="Saved resource JSON"
            style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          >
            {JSON.stringify(savedResource, null, 2)}
          </pre>
        ) : (
          <p role="status">Loading saved resource…</p>
        )}
      </Modal>
    </>
  );
}

function SelectEncounter({
  selection,
  user,
  onOpen,
  onRefresh,
  pending,
}: {
  selection: Selection;
  user: LiveUser;
  onOpen: (context: LiveContext) => void;
  onRefresh: (created: Encounter) => Promise<void>;
  pending: boolean;
}) {
  const { patient, encounters, tasks, medications, beds } = selection;
  const active = encounters.find((e) =>
    ["in-progress", "arrived", "triaged"].includes(e.status),
  );
  const [encounterId, setEncounter] = useState(
    (selection.workItem?.resourceType === "Encounter"
      ? selection.workItem.id
      : selection.workItem?.resourceType === "Task"
        ? selection.workItem.encounter?.reference?.replace(/^Encounter\//, "")
        : selection.workItem?.resourceType === "MedicationRequest"
          ? selection.workItem.encounter?.reference?.replace(/^Encounter\//, "")
          : undefined) ??
      active?.id ??
      encounters[0]?.id ??
      "",
  );
  const [taskId, setTask] = useState(
    selection.workItem?.resourceType === "Task"
      ? (selection.workItem.id ?? "")
      : "",
  );
  const [medicationId, setMedication] = useState(
    selection.workItem?.resourceType === "MedicationRequest"
      ? (selection.workItem.id ?? "")
      : "",
  );
  const [bedId, setBed] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const encounter = encounters.find((e) => e.id === encounterId);
  const task = tasks.find((t) => t.id === taskId);
  const medication = medications.find((m) => m.id === medicationId);
  const original =
    task?.focus?.reference ??
    task?.input?.find((i) =>
      i.valueReference?.reference?.startsWith("MedicationRequest/"),
    )?.valueReference?.reference;
  const renewal = medications.find(
    (m) => `MedicationRequest/${m.id}` === original,
  );
  const bed = beds.find(
    (b) =>
      b.id === bedId ||
      (!bedId &&
        encounter?.location?.some(
          (location) => location.location.reference === `Location/${b.id}`,
        )),
  );
  return (
    <Paper p="lg" withBorder mt="lg">
      <Title order={2}>{nameOf(patient)}</Title>
      <Text>DOB {patient.birthDate ?? "not recorded"}</Text>
      <Stack mt="md">
        <label>
          Encounter{" "}
          <select
            value={encounterId}
            onChange={(e) => setEncounter(e.currentTarget.value)}
            aria-label="Live encounter"
          >
            {encounters.map((e) => (
              <option key={e.id} value={e.id}>
                {e.period?.start?.slice(0, 16)} · {e.class.code} · {e.status}
              </option>
            ))}
          </select>
        </label>
        <label>
          In Basket / refill request{" "}
          <select
            value={taskId}
            onChange={(e) => setTask(e.currentTarget.value)}
          >
            <option value="">No request selected</option>
            {tasks
              .filter((t) => t.status !== "completed")
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.description ??
                    t.code?.text ??
                    "Request details not recorded"}
                </option>
              ))}
          </select>
        </label>
        <label>
          Medication order / MAR{" "}
          <select
            value={medicationId}
            onChange={(e) => setMedication(e.currentTarget.value)}
          >
            <option value="">No medication selected</option>
            {medications
              .filter((m) => m.status === "active")
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.medicationCodeableConcept?.text ??
                    m.medicationCodeableConcept?.coding?.[0]?.display ??
                    "Medication name not recorded"}{" "}
                  · {m.dosageInstruction?.[0]?.text}
                </option>
              ))}
          </select>
        </label>
        {user.persona === "P2" && (
          <label>
            Admission bed{" "}
            <select
              value={bedId}
              onChange={(e) => setBed(e.currentTarget.value)}
            >
              <option value="">Select a bed for admit</option>
              {beds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name ?? "Bed name not recorded"}
                </option>
              ))}
            </select>
          </label>
        )}
        <Group>
          <Button
            disabled={!encounter || pending || starting}
            title={
              !encounter
                ? "Select or start an encounter first"
                : pending || starting
                  ? "Loading encounter"
                  : undefined
            }
            onClick={() => {
              if (encounter)
                onOpen({
                  patient,
                  encounter,
                  ...(task ? { task } : {}),
                  ...(medication ? { medication } : {}),
                  ...(renewal ? { renewal } : {}),
                  ...(bed ? { bed } : {}),
                });
            }}
          >
            Open EHR
          </Button>
          <Button
            variant="default"
            loading={starting}
            disabled={pending}
            title={
              starting
                ? "Creating encounter"
                : pending
                  ? "Loading Medplum data"
                  : undefined
            }
            onClick={() => {
              setStarting(true);
              setError("");
              void startEncounter(patient, user)
                .then(onRefresh)
                .catch((e: unknown) => setError(errorText(e)))
                .finally(() => setStarting(false));
            }}
          >
            Start new encounter
          </Button>
        </Group>
        {error && (
          <Alert role="alert" color="red">
            {error}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

function PatientWorkspaceHome({
  user,
  baseline,
  onLogout,
}: {
  user: LiveUser;
  baseline: boolean;
  onLogout: () => void;
}) {
  const [loaded, setLoaded] = useState<{
    session: Session;
    presentations: PresentationBundle | null;
  }>();
  const [legacy, setLegacy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      const persona = user.persona === "RN2" ? "P3" : user.persona;
      const [interp, content] = await Promise.all([
        loadWasmInterp(),
        liveProgram(persona, baseline),
      ]);
      const program =
        typeof content.program === "object" &&
        content.program !== null &&
        !Array.isArray(content.program)
          ? { ...content.program, patientSelection: true }
          : content.program;
      const selectionEnabled =
        typeof program === "object" &&
        program !== null &&
        "patientSelection" in program &&
        program.patientSelection === true;
      if (!selectionEnabled) {
        if (active) setLegacy(true);
        return;
      }
      const date =
        new URLSearchParams(window.location.search).get("date") ??
        (await worldWorkDate());
      const [graph, patients] = await Promise.all([
        loadListContext(user, date),
        searchPatients(""),
      ]);
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
        program,
        directory,
        user,
        undefined,
        date,
      );
      if (active)
        setLoaded({ session, presentations: content.presentations ?? null });
    }
    void load().catch((error: unknown) => {
      if (active) setError(errorText(error));
    });
    return () => {
      active = false;
    };
  }, [user, baseline]);
  if (legacy)
    return <Home user={user} baseline={baseline} onLogout={onLogout} />;
  if (error)
    return (
      <Alert role="alert" color="red">
        {error}
      </Alert>
    );
  if (!loaded) return <p>Loading Medplum department workspace…</p>;
  return (
    <Chart
      session={loaded.session}
      presentations={loaded.presentations}
      viewer={clinicianRoleNames[user.persona] ?? "Clinician"}
      onClose={() => {
        void loaded.session
          .dispatch({ click: { comp: "workspace.return" } })
          .catch((error: unknown) => setError(errorText(error)));
      }}
    />
  );
}

function Home({
  user,
  baseline,
  onLogout,
}: {
  user: LiveUser;
  baseline: boolean;
  onLogout: () => void;
}) {
  const [worklist, setWorklist] = useState<Worklist>();
  const [names, setNames] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selection, setSelection] = useState<Selection>();
  const [session, setSession] = useState<Session>();
  const [presentations, setPresentations] = useState<PresentationBundle | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [workDate, setWorkDate] = useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  useEffect(() => {
    let active = true;
    void loadWorklist(user, workDate)
      .then(async (worklist) => {
        if (!active) return;
        setWorklist(worklist);
        const refs = [
          ...new Set(
            worklist.resources
              .map((r) => patientReference(r)?.reference)
              .filter((r): r is string => Boolean(r?.startsWith("Patient/"))),
          ),
        ];
        const pairs = await Promise.all(
          refs.map(async (ref) => {
            const patient = await readResource("Patient", ref.slice(8));
            return [
              ref,
              patient.resourceType === "Patient"
                ? (nameOf(patient) ?? ref)
                : ref,
            ];
          }),
        );
        if (active) setNames(Object.fromEntries(pairs));
      })
      .catch((e: unknown) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [user, revision, workDate]);
  async function select(patientId: string, workItem?: Resource) {
    setPending(true);
    setError("");
    try {
      const [bundle, beds, worldContext] = await Promise.all([
        loadPatientBundle(patientId),
        user.persona === "P2" ? availableBeds() : Promise.resolve([]),
        loadListContext(user, workDate),
      ]);
      const resources = bundleResources(bundle);
      const patient = resources.find(
        (r): r is Patient => r.resourceType === "Patient",
      );
      if (!patient) throw new Error("Patient missing from Medplum bundle");
      const assignedLocations = [
        ...new Set(
          resources.flatMap((r) =>
            r.resourceType === "Encounter"
              ? (r.location?.flatMap((l) =>
                  l.location.reference?.startsWith("Location/")
                    ? [l.location.reference.slice(9)]
                    : [],
                ) ?? [])
              : [],
          ),
        ),
      ];
      const locations = (
        await Promise.all(
          assignedLocations.map((id) => readResource("Location", id)),
        )
      ).flatMap((r) => (r.resourceType === "Location" ? [r] : []));
      setSelection({
        bundle,
        worldContext,
        patient,
        ...(workItem ? { workItem } : {}),
        beds: [
          ...beds,
          ...locations.filter((l) => !beds.some((b) => b.id === l.id)),
        ],
        encounters: resources
          .filter((r): r is Encounter => r.resourceType === "Encounter")
          .sort((a, b) =>
            (b.period?.start ?? "").localeCompare(a.period?.start ?? ""),
          ),
        tasks: resources.filter((r): r is Task => r.resourceType === "Task"),
        medications: resources.filter(
          (r): r is MedicationRequest => r.resourceType === "MedicationRequest",
        ),
      });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPending(false);
    }
  }
  if (session)
    return (
      <Chart
        presentations={presentations}
        session={session}
        viewer={clinicianRoleNames[user.persona] ?? "Clinician"}
        onClose={() => {
          setSession(undefined);
          setSelection(undefined);
          setRevision((r) => r + 1);
        }}
      />
    );
  return (
    <main className="browser-page live-home">
      <nav aria-label="Workspace">
        <strong>
          VGI HEALTH · LIVE · {clinicianRoleNames[user.persona] ?? "Clinician"}
          {baseline ? " · ORIGINAL CANONICAL" : ""}
        </strong>
        <a href="/browse">Demo / replay</a>
        <a href="/dashboard">Dashboard</a>
        <Button
          size="xs"
          variant="default"
          onClick={() =>
            void signOut()
              .then(onLogout)
              .catch((e: unknown) => setError(errorText(e)))
          }
        >
          Sign out
        </Button>
      </nav>
      <Title order={1} mt="xl">
        {titles[user.persona]}
      </Title>
      <Text>
        {user.practitioner.name?.[0]?.text ??
          [
            ...(user.practitioner.name?.[0]?.given ?? []),
            user.practitioner.name?.[0]?.family,
          ].join(" ")}{" "}
        · Worklist date {workDate}
      </Text>
      {error && (
        <Alert role="alert" color="red" mt="md">
          {error}
        </Alert>
      )}
      <Group mt="md" align="end">
        <TextInput
          type="date"
          label="Worklist date"
          description="Seeded world day 1 is November 2, 2026."
          value={workDate}
          onChange={(event) => {
            if (event.currentTarget.value) {
              setWorkDate(event.currentTarget.value);
              setWorklist(undefined);
            }
          }}
        />
        <Button
          variant="light"
          onClick={() => {
            setWorklist(undefined);
            setRevision((r) => r + 1);
            notifications.show({ message: "Worklist refreshed" });
          }}
        >
          Refresh worklist
        </Button>
      </Group>
      {!worklist ? (
        <p>Loading Medplum worklist…</p>
      ) : (
        <div className="worklist-scroll">
          <table className="worklist-table">
            <caption>Current appointments, tasks and encounters</caption>
            <thead>
              <tr>
                <th scope="col">Patient</th>
                <th scope="col">Work item</th>
                <th scope="col">Location / acuity</th>
                <th scope="col">Time / status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {worklist.resources.map((r) => {
                const ref = patientReference(r);
                const encounter =
                  r.resourceType === "Encounter" ? r : undefined;
                const location = encounter?.location?.[0]?.location;
                const scheduled =
                  r.resourceType === "Appointment"
                    ? r.start
                    : r.resourceType === "ServiceRequest"
                      ? (r.occurrenceDateTime ?? r.occurrencePeriod?.start)
                      : r.resourceType === "Procedure"
                        ? (r.performedDateTime ??
                          r.performedPeriod?.start ??
                          worklist.resources.flatMap((order) =>
                            order.resourceType === "ServiceRequest" &&
                            r.basedOn?.some(
                              (ref) =>
                                ref.reference === `ServiceRequest/${order.id}`,
                            )
                              ? [
                                  order.occurrenceDateTime ??
                                    order.occurrencePeriod?.start,
                                ]
                              : [],
                          )[0])
                        : r.resourceType === "Task"
                          ? r.authoredOn
                          : undefined;
                const elapsed = encounter?.period?.start
                  ? Math.max(
                      0,
                      Math.floor(
                        (Date.now() - Date.parse(encounter.period.start)) /
                          60000,
                      ),
                    )
                  : undefined;
                const label =
                  r.resourceType === "Appointment" || r.resourceType === "Task"
                    ? r.description
                    : r.resourceType === "ServiceRequest" ||
                        r.resourceType === "Procedure"
                      ? (r.code?.text ?? r.code?.coding?.[0]?.display)
                      : encounter?.class.code;
                return (
                  <tr key={`${r.resourceType}/${r.id}`}>
                    <td>
                      {ref?.display ??
                        names[ref?.reference ?? ""] ??
                        ref?.reference ??
                        "No patient"}
                    </td>
                    <td>
                      {r.resourceType} · {label}
                    </td>
                    <td>
                      {location?.display ??
                        worklist.locations.find(
                          (l) => `Location/${l.id}` === location?.reference,
                        )?.name ??
                        "—"}{" "}
                      {encounter?.priority?.coding?.[0]?.code ??
                        encounter?.priority?.text ??
                        ""}
                    </td>
                    <td>
                      {elapsed !== undefined
                        ? `${elapsed} min`
                        : (scheduled?.replace("T", " ").slice(0, 16) ??
                          "")}{" "}
                      ·{" "}
                      {"status" in r && typeof r.status === "string"
                        ? r.status
                        : ""}
                    </td>
                    <td>
                      <Button
                        size="xs"
                        disabled={
                          pending || !ref?.reference?.startsWith("Patient/")
                        }
                        title={
                          pending
                            ? "Loading patient"
                            : !ref?.reference?.startsWith("Patient/")
                              ? "No patient is linked to this work item"
                              : undefined
                        }
                        onClick={() => {
                          if (ref?.reference)
                            void select(ref.reference.slice(8), r);
                        }}
                      >
                        Open patient
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!worklist.resources.length && (
            <p>
              No current work items assigned. Search for a patient below to
              start a visit.
            </p>
          )}
        </div>
      )}
      {worklist && ["P3", "RN2"].includes(user.persona) && (
        <section aria-label="Medications due">
          <Title order={2} mt="lg">
            Medications due
          </Title>
          <ul>
            {worklist.medications.map((m) => {
              const administrations = worklist.administrations.flatMap((a) =>
                a.resourceType === "MedicationAdministration" ? [a] : [],
              );
              const due = medicationDue(
                m,
                administrations,
                new Date().toISOString(),
              );
              return (
                <li key={m.id}>
                  {m.subject.display ??
                    names[m.subject.reference ?? ""] ??
                    m.subject.reference}
                  :{" "}
                  {m.medicationCodeableConcept?.text ??
                    m.medicationCodeableConcept?.coding?.[0]?.display}{" "}
                  · <strong>{due.status}</strong>{" "}
                  {due.due ? new Date(due.due).toLocaleString() : ""} ·{" "}
                  {m.dosageInstruction?.[0]?.text}{" "}
                  <Button
                    size="xs"
                    variant="subtle"
                    disabled={
                      pending || !m.subject.reference?.startsWith("Patient/")
                    }
                    title={
                      pending
                        ? "Loading patient"
                        : !m.subject.reference?.startsWith("Patient/")
                          ? "No patient is linked to this medication"
                          : undefined
                    }
                    onClick={() => {
                      if (m.subject.reference?.startsWith("Patient/"))
                        void select(m.subject.reference.slice(8), m);
                    }}
                  >
                    Open MAR patient
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <form
        className="patient-search"
        onSubmit={(e) => {
          e.preventDefault();
          setPending(true);
          setError("");
          void searchPatients(query)
            .then((results) => {
              setPatients(results);
              notifications.show({
                message: `${results.length} patient${results.length === 1 ? "" : "s"} found`,
              });
            })
            .catch((e: unknown) => setError(errorText(e)))
            .finally(() => setPending(false));
        }}
      >
        <TextInput
          label="Patient search"
          placeholder="Name (leave blank to browse)"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
        <Button
          type="submit"
          loading={pending}
          title={pending ? "Searching patients" : undefined}
        >
          Search patients
        </Button>
      </form>
      <ul>
        {patients.map((p) => (
          <li key={p.id}>
            <Button
              variant="subtle"
              disabled={pending}
              title={pending ? "Loading Medplum data" : undefined}
              onClick={() => void select(p.id ?? "")}
            >
              {nameOf(p)} · {p.birthDate}
            </Button>
          </li>
        ))}
      </ul>
      {selection && (
        <SelectEncounter
          key={`${selection.patient.id}/${selection.encounters.length}/${selection.workItem?.id ?? ""}`}
          selection={selection}
          user={user}
          pending={pending}
          onRefresh={(created) => select(selection.patient.id ?? "", created)}
          onOpen={(context) => {
            setPending(true);
            setError("");
            const persona = user.persona === "RN2" ? "P3" : user.persona;
            void Promise.all([loadWasmInterp(), liveProgram(persona, baseline)])
              .then(([interp, { spec, program, presentations }]) => {
                setPresentations(presentations ?? null);
                return createLiveSession(
                  interp,
                  spec,
                  program,
                  selection.bundle,
                  user,
                  { ...context, worldContext: selection.worldContext },
                );
              })
              .then(setSession)
              .catch((e: unknown) => setError(errorText(e)))
              .finally(() => setPending(false));
          }}
        />
      )}
    </main>
  );
}
export function LiveApp() {
  const [user, setUser] = useState<LiveUser>();
  const [baseline, setBaseline] = useState(
    () => sessionStorage.getItem("vgi.baseline") === "1",
  );
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void restoreUser()
      .then((user) => {
        if (active) setUser(user);
      })
      .catch((e: unknown) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <>
      {error && (
        <Alert role="alert" color="red">
          {error}
        </Alert>
      )}
      {user ? (
        <PatientWorkspaceHome
          user={user}
          baseline={baseline}
          onLogout={() => {
            sessionStorage.removeItem("vgi.baseline");
            setBaseline(false);
            setUser(undefined);
          }}
        />
      ) : (
        <Login
          onLogin={(next, isBaseline) => {
            sessionStorage.setItem("vgi.baseline", isBaseline ? "1" : "0");
            setBaseline(isBaseline);
            setUser(next);
          }}
        />
      )}
    </>
  );
}
