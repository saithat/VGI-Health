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
  "release",
  "discharge",
  "clean",
  "ready",
];
const labels: Record<AdtAction, string> = {
  admit: "Admit",
  assign: "Assign bed",
  transfer: "Transfer",
  release: "Release bed",
  discharge: "Discharge",
  clean: "Start cleaning",
  ready: "Mark ready",
};

export function AdtApp() {
  const [user, setUser] = useState<MarUser>();
  const [board, setBoard] = useState<Board>();
  const [patient, setPatient] = useState("");
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
    const currentBed = board.state.patients.find((p) => p.id === patient)?.bed;
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
      ...(action === "discharge"
        ? {}
        : { bed: action === "release" ? (currentBed ?? 0) : Number(bed) }),
      ...(action === "transfer" ? { source: currentBed ?? 0 } : {}),
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
        setError(messageOf(e));
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
                  <Text>Status: {b.phase}</Text>
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
                must finish before a bed can be marked ready.
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
                    {!["release", "discharge"].includes(action) && (
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
                              {b.unit} · {b.id} · {b.phase}
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
