import { useEffect, useState, useSyncExternalStore } from "react";
import { Alert, Button, Drawer, Group, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { UiScreenView } from "./ehr/ui/Screen";
import { loadWasmInterp } from "./core/wasmInterp";
import { createLiveSession, type LiveContext } from "./core/liveSession";
import { readArtifact } from "./browser/data";
import { availableBeds, bundleResources, restoreUser, loadPatientBundle, loadWorklist, quickSignIn, readResource, searchPatients, signIn, signOut, startEncounter,
  type Bundle, type Encounter, type LiveUser, type Location, type MedicationRequest, type Patient, type Resource, type Task, type Worklist } from "./data/medplum";

const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
const nameOf = (patient: Patient) => patient.name?.[0]?.text || [...(patient.name?.[0]?.given ?? []), patient.name?.[0]?.family].filter(Boolean).join(" ") || patient.id;
const patientReference = (resource: Resource) => {
  if (resource.resourceType === "Appointment") return resource.participant.find((p) => p.actor?.reference?.startsWith("Patient/"))?.actor;
  if (resource.resourceType === "Task") return resource.for;
  if ("subject" in resource && resource.subject && typeof resource.subject === "object" && "reference" in resource.subject && typeof resource.subject.reference === "string") return { reference: resource.subject.reference };
  return undefined;
};
const titles: Record<string, string> = { P1: "Today's clinic · In-basket · Refills", P2: "Emergency department track board", P3: "Ward census · Medication worklist", RN2: "Ward census · Independent checks", P4: "Pediatric appointments", P5: "OR schedule · Consults" };
type Session = Awaited<ReturnType<typeof createLiveSession>>;
interface Selection { bundle: Bundle; patient: Patient; encounters: Encounter[]; tasks: Task[]; medications: MedicationRequest[]; beds: Location[] }

function Login({ onLogin }: { onLogin: (user: LiveUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function login(persona?: string) {
    setPending(true); setError("");
    try { onLogin(persona ? await quickSignIn(persona) : await signIn(email, password)); }
    catch (error) { setError(errorText(error)); }
    finally { setPending(false); }
  }
  return <main className="signin-page">
    <div className="signin-brand">VGI HEALTH <span>LIVE · Local Medplum</span></div>
    <Paper p="xl" withBorder w="min(520px, 95vw)">
      <Title order={1} size="h2">Clinician sign-in</Title>
      <Text mb="lg">Sign in to your local EHR. Changes save to Medplum.</Text>
      {error && <Alert role="alert" color="red" mb="md">{error}</Alert>}
      <form onSubmit={(event) => { event.preventDefault(); void login(); }}>
        <Stack>
          <TextInput label="Medplum email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
          <PasswordInput label="Password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.currentTarget.value)} />
          <Button type="submit" loading={pending}>Sign in</Button>
        </Stack>
      </form>
      <Text mt="lg" fw={600}>Dev persona quick-login</Text>
      <Text size="sm" mb="xs">Seeded synthetic accounts · local server only</Text>
      <Group>{["P1", "P2", "P3", "P4", "P5", "RN2"].map((persona) => <Button key={persona} variant="light" disabled={pending} onClick={() => void login(persona)}>{persona}</Button>)}</Group>
    </Paper>
    <a href="/browse">Demo / replay — no Docker required</a>
    <a href="/dashboard">Offline dashboard</a>
  </main>;
}

function Chart({ session, onClose }: { session: Session; onClose: () => void }) {
  const { ui } = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState(false);
  const [links, setLinks] = useState<string[]>([]);
  return <>
    <div aria-busy={pending} ref={(el) => { if (el) el.inert = pending || panel; }}>
      {ui ? <UiScreenView screen={ui} onEvent={(event) => {
        if (pending) return;
        setError("");
        // Ordinary input events resolve immediately; only commits wait on I/O.
        setPending(true);
        void session.dispatch(event).then((result) => {
          if (result) { setLinks(result.links); notifications.show({ title: "Medplum", message: <>{result.message}<ul>{result.links.map((link) => <li key={link}><a href={link} target="_blank" rel="noreferrer">{new URL(link).pathname}</a></li>)}</ul></>, color: "green", autoClose: 12000 }); }
        }).catch((error: unknown) => { setError(errorText(error)); setPanel(true); }).finally(() => setPending(false));
      }} /> : <Alert color="red">Semantic WASM renderer unavailable</Alert>}
    </div>
    <div className="live-controls"><Button size="xs" loading={pending} onClick={() => setPanel(true)}>Live encounter</Button></div>
    <Drawer opened={panel} onClose={() => setPanel(false)} title="Live Medplum encounter" closeButtonProps={{ "aria-label": "Close live encounter" }}>
      <Stack>
        <Text>Encounter/{session.getContext().encounter.id}</Text>
        {error && <Alert role="alert" color="red">{error}<p>Your inputs are retained. Close this panel, correct the issue, and retry the action.</p></Alert>}
        {links.length > 0 && <div role="status"><p>Saved resources</p><ul>{links.map((link) => <li key={link}><a href={link} target="_blank" rel="noreferrer">{new URL(link).pathname}</a></li>)}</ul></div>}
        <Button variant="default" onClick={onClose}>Back to worklist / refresh chart</Button>
        <a href="/dashboard">Demo / replay dashboard</a>
      </Stack>
    </Drawer>
  </>;
}

function SelectEncounter({ selection, user, onOpen, onRefresh, pending }: { selection: Selection; user: LiveUser; onOpen: (context: LiveContext) => void; onRefresh: () => Promise<void>; pending: boolean }) {
  const { patient, encounters, tasks, medications, beds } = selection;
  const active = encounters.find((e) => ["in-progress", "arrived", "triaged"].includes(e.status));
  const [encounterId, setEncounter] = useState(active?.id ?? encounters[0]?.id ?? "");
  const [taskId, setTask] = useState("");
  const [medicationId, setMedication] = useState("");
  const [bedId, setBed] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const encounter = encounters.find((e) => e.id === encounterId);
  const task = tasks.find((t) => t.id === taskId);
  const medication = medications.find((m) => m.id === medicationId);
  const original = task?.focus?.reference ?? task?.input?.find((i) => i.valueReference?.reference?.startsWith("MedicationRequest/"))?.valueReference?.reference;
  const renewal = medications.find((m) => `MedicationRequest/${m.id}` === original);
  const bed = beds.find((b) => b.id === bedId);
  return <Paper p="lg" withBorder mt="lg"><Title order={2}>{nameOf(patient)}</Title>
    <Text>DOB {patient.birthDate ?? "not recorded"} · Patient/{patient.id}</Text>
    <Stack mt="md">
      <label>Encounter <select value={encounterId} onChange={(e) => setEncounter(e.currentTarget.value)} aria-label="Live encounter">{encounters.map((e) => <option key={e.id} value={e.id}>{e.period?.start?.slice(0, 16)} · {e.class.code} · {e.status} · {e.id}</option>)}</select></label>
      <label>In-basket / refill Task <select value={taskId} onChange={(e) => setTask(e.currentTarget.value)}><option value="">No Task selected</option>{tasks.filter((t) => t.status !== "completed").map((t) => <option key={t.id} value={t.id}>{t.description ?? t.code?.text ?? t.id}</option>)}</select></label>
      <label>Medication order / MAR <select value={medicationId} onChange={(e) => setMedication(e.currentTarget.value)}><option value="">No medication selected</option>{medications.filter((m) => m.status === "active").map((m) => <option key={m.id} value={m.id}>{m.medicationCodeableConcept?.text ?? m.medicationCodeableConcept?.coding?.[0]?.display ?? m.id} · {m.dosageInstruction?.[0]?.text}</option>)}</select></label>
      {user.persona === "P2" && <label>Admission bed <select value={bedId} onChange={(e) => setBed(e.currentTarget.value)}><option value="">Select a bed for admit</option>{beds.map((b) => <option key={b.id} value={b.id}>{b.name ?? b.id}</option>)}</select></label>}
      <Group><Button disabled={!encounter || pending || starting} onClick={() => {
        if (encounter) onOpen({ patient, encounter, ...(task ? { task } : {}), ...(medication ? { medication } : {}), ...(renewal ? { renewal } : {}), ...(bed ? { bed } : {}) });
      }}>Open canonical EHR</Button>
      <Button variant="default" loading={starting} disabled={pending} onClick={() => {
        setStarting(true); setError("");
        void startEncounter(patient, user).then(onRefresh).catch((e: unknown) => setError(errorText(e))).finally(() => setStarting(false));
      }}>Start new encounter</Button></Group>
      {error && <Alert role="alert" color="red">{error}</Alert>}
    </Stack>
  </Paper>;
}

function Home({ user, onLogout }: { user: LiveUser; onLogout: () => void }) {
  const [worklist, setWorklist] = useState<Worklist>();
  const [names, setNames] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selection, setSelection] = useState<Selection>();
  const [session, setSession] = useState<Session>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void loadWorklist(user).then(async (worklist) => {
      if (!active) return;
      setWorklist(worklist);
      const refs = [...new Set(worklist.resources.map((r) => patientReference(r)?.reference).filter((r): r is string => Boolean(r?.startsWith("Patient/"))))];
      const pairs = await Promise.all(refs.map(async (ref) => {
        const patient = await readResource("Patient", ref.slice(8));
        return [ref, patient.resourceType === "Patient" ? nameOf(patient) ?? ref : ref];
      }));
      if (active) setNames(Object.fromEntries(pairs));
    }).catch((e: unknown) => { if (active) setError(errorText(e)); });
    return () => { active = false; };
  }, [user, revision]);
  async function select(patientId: string) {
    setPending(true); setError("");
    try {
      const [bundle, beds] = await Promise.all([loadPatientBundle(patientId), user.persona === "P2" ? availableBeds() : Promise.resolve([])]);
      const resources = bundleResources(bundle);
      const patient = resources.find((r): r is Patient => r.resourceType === "Patient");
      if (!patient) throw new Error("Patient missing from Medplum bundle");
      setSelection({ bundle, patient, beds, encounters: resources.filter((r): r is Encounter => r.resourceType === "Encounter").sort((a, b) => (b.period?.start ?? "").localeCompare(a.period?.start ?? "")),
        tasks: resources.filter((r): r is Task => r.resourceType === "Task"), medications: resources.filter((r): r is MedicationRequest => r.resourceType === "MedicationRequest") });
    } catch (e) { setError(errorText(e)); } finally { setPending(false); }
  }
  if (session) return <Chart session={session} onClose={() => { setSession(undefined); setSelection(undefined); setRevision((r) => r + 1); }} />;
  return <main className="browser-page live-home">
    <nav aria-label="Workspace"><strong>VGI HEALTH · LIVE · {user.persona}</strong><a href="/browse">Demo / replay</a><a href="/dashboard">Dashboard</a><Button size="xs" variant="default" onClick={() => void signOut().then(onLogout).catch((e: unknown) => setError(errorText(e)))}>Sign out</Button></nav>
    <Title order={1} mt="xl">{titles[user.persona]}</Title>
    <Text>{user.practitioner.name?.[0]?.text ?? [...(user.practitioner.name?.[0]?.given ?? []), user.practitioner.name?.[0]?.family].join(" ")} · {new Date().toLocaleDateString()}</Text>
    {error && <Alert role="alert" color="red" mt="md">{error}</Alert>}
    <Button mt="md" variant="light" onClick={() => setRevision((r) => r + 1)}>Refresh worklist</Button>
    {!worklist ? <p>Loading Medplum worklist…</p> : <div className="worklist-scroll"><table className="worklist-table"><caption>Current appointments, tasks and encounters</caption>
      <thead><tr><th scope="col">Patient</th><th scope="col">Work item</th><th scope="col">Location / acuity</th><th scope="col">Time / status</th><th scope="col">Action</th></tr></thead>
      <tbody>{worklist.resources.map((r) => {
        const ref = patientReference(r);
        const encounter = r.resourceType === "Encounter" ? r : undefined;
        const location = encounter?.location?.[0]?.location;
        const elapsed = encounter?.period?.start ? Math.max(0, Math.floor((Date.now() - Date.parse(encounter.period.start)) / 60000)) : undefined;
        const label = r.resourceType === "Appointment" || r.resourceType === "Task" ? r.description : r.resourceType === "ServiceRequest" || r.resourceType === "Procedure" ? r.code?.text ?? r.code?.coding?.[0]?.display : encounter?.class.code;
        return <tr key={`${r.resourceType}/${r.id}`}><td>{ref?.display ?? names[ref?.reference ?? ""] ?? ref?.reference ?? "No patient"}</td><td>{r.resourceType} · {label}</td><td>{location?.display ?? worklist.locations.find((l) => `Location/${l.id}` === location?.reference)?.name ?? "—"} {encounter?.priority?.coding?.[0]?.code ?? encounter?.priority?.text ?? ""}</td><td>{r.resourceType === "Appointment" ? r.start?.slice(11, 16) : elapsed !== undefined ? `${elapsed} min` : ""} · {"status" in r && typeof r.status === "string" ? r.status : ""}</td><td><Button size="xs" disabled={pending || !ref?.reference?.startsWith("Patient/")} onClick={() => { if (ref?.reference) void select(ref.reference.slice(8)); }}>Open patient</Button></td></tr>;
      })}</tbody></table>{!worklist.resources.length && <p>No current work items assigned. Search for a patient below to start a visit.</p>}</div>}
    {worklist && ["P3", "RN2"].includes(user.persona) && <section aria-label="Medications due"><Title order={2} mt="lg">Medication schedule</Title><ul>{worklist.medications.map((m) => <li key={m.id}>{m.subject.display ?? names[m.subject.reference ?? ""] ?? m.subject.reference}: {m.medicationCodeableConcept?.text ?? m.medicationCodeableConcept?.coding?.[0]?.display} · {m.dosageInstruction?.[0]?.text ?? m.dosageInstruction?.[0]?.timing?.code?.text ?? "Schedule not recorded"} · Latest administration: {worklist.administrations.filter((a) => a.resourceType === "MedicationAdministration" && a.request?.reference === `MedicationRequest/${m.id}`).map((a) => a.resourceType === "MedicationAdministration" ? `${a.effectiveDateTime} ${a.status}` : "").sort().at(-1) ?? "none"}</li>)}</ul></section>}
    <form className="patient-search" onSubmit={(e) => { e.preventDefault(); setPending(true); setError(""); void searchPatients(query).then(setPatients).catch((e: unknown) => setError(errorText(e))).finally(() => setPending(false)); }}>
      <TextInput label="Patient search" placeholder="Name (leave blank to browse)" value={query} onChange={(e) => setQuery(e.currentTarget.value)} />
      <Button type="submit" loading={pending}>Search Medplum</Button>
    </form>
    <ul>{patients.map((p) => <li key={p.id}><Button variant="subtle" disabled={pending} onClick={() => void select(p.id ?? "")}>{nameOf(p)} · {p.birthDate}</Button></li>)}</ul>
    {selection && <SelectEncounter key={`${selection.patient.id}/${selection.encounters.length}`} selection={selection} user={user} pending={pending} onRefresh={() => select(selection.patient.id ?? "")} onOpen={(context) => {
      setPending(true); setError("");
      const persona = user.persona === "RN2" ? "P3" : user.persona;
      void Promise.all([loadWasmInterp(), readArtifact("/releases/v2/spec.json"), readArtifact(`/releases/v2/personas/${persona}.json`)]).then(([interp, spec, program]) => createLiveSession(interp, spec, program, selection.bundle, user, context)).then(setSession).catch((e: unknown) => setError(errorText(e))).finally(() => setPending(false));
    }} />}
  </main>;
}
export function LiveApp() {
  const [user, setUser] = useState<LiveUser>();
  const [error, setError] = useState("");
  useEffect(() => { let active = true; void restoreUser().then((user) => { if (active) setUser(user); }).catch((e: unknown) => { if (active) setError(errorText(e)); }); return () => { active = false; }; }, []);
  return <>{error && <Alert role="alert" color="red">{error}</Alert>}{user ? <Home user={user} onLogout={() => setUser(undefined)} /> : <Login onLogin={setUser} />}</>;
}
