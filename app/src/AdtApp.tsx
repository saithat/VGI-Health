import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  loginMar,
  logoutMar,
  restoreMar,
  MarConflict,
  MarRejected,
  type MarUser,
} from "./data/commitService";
import {
  adtRefusal,
  readBoard,
  sendAdt,
  subscribeBoard,
  type AdtAction,
  type AdtIntent,
  type Board,
} from "./data/adtService";

let restored: Promise<MarUser | undefined> | undefined;
const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
const selectStyle = { minHeight: 36, maxWidth: "100%", padding: "0.25rem" };
const actions: AdtAction[] = [
  "admit",
  "assign",
  "transfer",
  "swap",
  "cancelAdmit",
  "cancelTransfer",
  "cancelDischarge",
  "release",
  "discharge",
  "clean",
  "ready",
];
const labels: Record<AdtAction, string> = {
  admit: "Admit",
  assign: "Assign bed",
  transfer: "Transfer",
  swap: "Swap beds (A17)",
  cancelAdmit: "Cancel admission (A11)",
  cancelTransfer: "Cancel transfer (A12)",
  cancelDischarge: "Cancel discharge (A13)",
  release: "Release bed",
  discharge: "Discharge",
  clean: "Start cleaning",
  ready: "Mark ready",
};

export function AdtApp() {
  const [user, setUser] = useState<MarUser>();
  const [board, setBoard] = useState<Board>();
  const [patient, setPatient] = useState("");
  const [other, setOther] = useState("");
  const [bed, setBed] = useState("");
  const [action, setAction] = useState<AdtAction>("admit");
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const intent = useRef<AdtIntent>();
  useEffect(() => {
    let active = true;
    restored ??= restoreMar();
    void restored
      .then((value) => {
        if (active) setUser(value);
      })
      .catch((e) => {
        if (active) setError(messageOf(e));
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    let stop: (() => void) | undefined;
    void readBoard()
      .then((next) => {
        if (!active) return;
        setBoard(next);
        setPatient(next.state.patients[0]?.id ?? "");
        setBed(String(next.state.beds[0]?.id ?? ""));
        stop = subscribeBoard(
          next.cursor,
          (value) => {
            if (active) setBoard(value);
          },
          (e) => {
            if (active) setError(messageOf(e));
          },
        );
      })
      .catch((e) => {
        if (active) setError(messageOf(e));
      });
    return () => {
      active = false;
      stop?.();
    };
  }, [user]);
  async function submit() {
    if (!board || pending) return;
    const selectedPatient = board.state.patients.find((p) => p.id === patient);
    const currentBed = selectedPatient?.bed;
    const otherBed = board.state.patients.find((p) => p.id === other)?.bed;
    const cancelKind = action === "cancelAdmit" ? "admit" : action === "cancelTransfer" ? "transfer" : action === "cancelDischarge" ? "discharge" : undefined;
    if (!intent.current && cancelKind && selectedPatient?.last?.kind !== cancelKind) {
      setError("Select the patient's latest matching ADT event. Later movements prevent this cancellation.");
      return;
    }
    if (!intent.current && action === "swap" && (other === patient || currentBed == null || otherBed == null)) {
      setError("Select two different admitted patients with assigned beds.");
      return;
    }
    if (
      !intent.current &&
      ["transfer", "release"].includes(action) &&
      currentBed == null
    ) {
      setError("Select a patient with an assigned bed.");
      return;
    }
    setPending(true);
    setError("");
    setMessage("");
    // Keep the identical payload and ID until a durable outcome is known.
    const command = intent.current ?? {
      requestId: crypto.randomUUID(),
      expected: board.versions,
      patient,
      action,
      ...(action === "discharge" || action === "cancelAdmit" || action === "cancelTransfer"
        ? {}
        : { bed: action === "swap" ? (otherBed ?? 0) : action === "release" ? (currentBed ?? 0) : Number(bed) }),
      ...(["transfer", "swap"].includes(action) ? { source: currentBed ?? 0 } : {}),
      ...(action === "swap" ? { other } : {}),
      ...(cancelKind ? { event: selectedPatient?.revision ?? 0 } : {}),
    };
    intent.current = command;
    try {
      await sendAdt(command);
      intent.current = undefined;
      setUncertain(false);
      setMessage(`${labels[command.action]} saved.`);
      try {
        setBoard(await readBoard());
      } catch (readError) {
        setError(`Saved. Board refresh failed: ${messageOf(readError)}`);
      }
    } catch (e) {
      if (e instanceof MarConflict || e instanceof MarRejected) {
        intent.current = undefined;
        setUncertain(false);
        setError(adtRefusal(messageOf(e)));
        try {
          setBoard(await readBoard());
        } catch (readError) {
          setError(messageOf(readError));
        }
      } else {
        setUncertain(true);
        setError(
          `Outcome unknown (${command.requestId}). Reconcile this command before starting another. ${messageOf(e)}`,
        );
      }
    } finally {
      setPending(false);
    }
  }
  const selected = board?.state.patients.find((p) => p.id === patient);
  const clerk = board?.roles.every((r) => r === "admittingClerk");
  return (
    <main style={{ padding: "1rem", maxWidth: 1200, margin: "auto" }}>
      <Group justify="space-between" mb="lg">
        <Title order={1}>Bed management</Title>
        <a href="/?workflow=mar">Medication administration</a>
        {user && (
          <>
            <Text>{user.name ?? user.user.id}</Text>
            <Button variant="subtle" onClick={logoutMar}>
              Sign out
            </Button>
          </>
        )}
      </Group>
      {error && (
        <Alert color="red" role="alert" mb="md">
          {error}
        </Alert>
      )}
      {message && (
        <Alert role="status" mb="md">
          {message}
        </Alert>
      )}
      {!user ? (
        <Button
          onClick={() => {
            void loginMar().catch((e) => setError(messageOf(e)));
          }}
        >
          Sign in with Keycloak
        </Button>
      ) : (
        board && (
          <Stack>
            <Title order={2}>Bed board</Title>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} aria-live="polite">
              {board.state.beds.map((b) => (
                <Paper withBorder p="md" key={b.id} data-testid={`bed-${b.id}`}>
                  <Text fw={700}>
                    {b.unit} · Bed {b.id}
                  </Text>
                  <Text>Status: {b.active ? b.phase : `Inactive · ${b.phase}`}</Text>
                  <Text>Patient: {b.occupant ?? "None"}</Text>
                </Paper>
              ))}
            </SimpleGrid>
            <Paper withBorder p="md">
              <Title order={2}>Patient census</Title>
              {board.state.patients.map((p) => (
                <Text key={p.id} data-testid={`patient-${p.id}`}>
                  {p.id} · {p.admitted ? "Admitted" : "Not admitted"} ·{" "}
                  {p.bed === null ? "No bed" : `Bed ${p.bed}`}
                </Text>
              ))}
            </Paper>
            <Paper withBorder p="md">
              <Title order={2}>Update placement</Title>
              <Text size="sm" mb="md">
                Release leaves the patient admitted and the bed dirty. Cleaning
                must finish before a bed can be marked ready. Swap records completed
                placement of both patients atomically; transport is separate.
                Cancellation compensates the latest ADT event. Clinical documentation
                stays linked to the original encounter and is not retracted.
              </Text>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <fieldset
                  disabled={pending || uncertain}
                  style={{ border: 0, padding: 0 }}
                >
                  <Stack>
                    {!["clean", "ready"].includes(action) && (
                      <label>
                        Patient{" "}
                        <select
                          style={selectStyle}
                          aria-label="Patient"
                          value={patient}
                          onChange={(e) => setPatient(e.target.value)}
                        >
                          {board.state.patients.map((p) => (
                            <option key={p.id}>{p.id}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      Action{" "}
                      <select
                        style={selectStyle}
                        aria-label="Action"
                        value={action}
                        onChange={(e) => {
                          const next = actions.find(
                            (a) => a === e.target.value,
                          );
                          if (next) setAction(next);
                        }}
                      >
                        {actions
                          .filter(
                            (a) => !clerk || ["admit", "assign"].includes(a),
                          )
                          .map((a) => (
                            <option key={a} value={a}>
                              {labels[a]}
                            </option>
                          ))}
                      </select>
                    </label>
                    {action === "swap" && (
                      <label>
                        Other patient{" "}
                        <select style={selectStyle} aria-label="Other patient" value={other}
                          onChange={(e) => setOther(e.target.value)}>
                          <option value="">Select patient</option>
                          {board.state.patients.filter((p) => p.id !== patient && p.admitted && p.bed !== null).map((p) => (
                            <option key={p.id} value={p.id}>{p.id} · Bed {p.bed}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    {["cancelAdmit", "cancelTransfer", "cancelDischarge"].includes(action) && (
                      <Text role="status">
                        Original event: {selected?.last ? `${patient}:${selected.revision} · ${selected.last.kind}` : "No cancellable latest movement"}.
                        {selected?.last?.kind === "transfer" && ` Origin bed: ${selected.last.source}; destination bed: ${selected.last.target}. Origin must be empty and ready.`}
                        {action === "cancelDischarge" && " Choose a ready bed explicitly; this reopens the original encounter."}
                      </Text>
                    )}
                    {!["release", "discharge", "swap", "cancelAdmit", "cancelTransfer"].includes(action) && (
                      <label>
                        Bed{" "}
                        <select
                          style={selectStyle}
                          aria-label="Bed"
                          value={bed}
                          onChange={(e) => setBed(e.target.value)}
                        >
                          {board.state.beds.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.unit} · {b.id} · {b.active ? b.phase : `inactive · ${b.phase}`}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <Button
                      type="submit"
                      disabled={
                        (["transfer", "release"].includes(action) &&
                          selected?.bed === null) ||
                        pending
                      }
                    >
                      {labels[action]}
                    </Button>
                  </Stack>
                </fieldset>
              </form>
              {uncertain && (
                <Button
                  mt="md"
                  disabled={pending}
                  onClick={() => {
                    void submit();
                  }}
                >
                  Reconcile command
                </Button>
              )}
            </Paper>
          </Stack>
        )
      )}
    </main>
  );
}
