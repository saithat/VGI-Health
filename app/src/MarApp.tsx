import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Alert, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { UiScreenView } from "./ehr/ui/Screen";
import { loadWasmInterp } from "./core/wasmInterp";
import { createLiveSession } from "./core/liveSession";
import {
  loginMar,
  logoutMar,
  restoreMar,
  marDirectory,
  marCosign,
  subscribeMar,
  type MarItem,
  type MarUser,
} from "./data/commitService";

type Session = Awaited<ReturnType<typeof createLiveSession>>;
const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
let restored: Promise<MarUser | undefined> | undefined;

function MarChart({ session, viewer }: { session: Session; viewer: string }) {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const queue = useRef(Promise.resolve());
  if (!snapshot.ui) return <Alert role="alert">MAR renderer unavailable</Alert>;
  return (
    <>
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      <div aria-busy={pending}>
        <UiScreenView
          screen={snapshot.ui}
          viewer={viewer}
          onEvent={(event) => {
            setPending(true);
            const generation =
              "getGeneration" in session ? session.getGeneration() : undefined;
            queue.current = queue.current
              .then(() => {
                if (
                  "getGeneration" in session &&
                  session.getGeneration() !== generation
                )
                  throw new Error(
                    "The chart refreshed. Review the current dose and repeat the action.",
                  );
                return session.dispatch(event);
              })
              .then(() => setError(""))
              .catch((error) => setError(messageOf(error)))
              .finally(() => setPending(false));
          }}
        />
      </div>
    </>
  );
}

/** The W4 service entry point needs no Medplum identity or transaction client. */
export function MarApp() {
  const [user, setUser] = useState<MarUser>();
  const [items, setItems] = useState<MarItem[]>([]);
  const [session, setSession] = useState<Session>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    restored ??= restoreMar();
    void restored
      .then((value) => {
        if (active) setUser(value);
      })
      .catch((error) => {
        if (active) setError(messageOf(error));
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const stops: (() => void)[] = [];
    const load = async () => {
      const next = await marDirectory();
      if (active) setItems(next);
      return next;
    };
    void load()
      .then((next) => {
        if (!active) return;
        const patients = new Map(
          next.map((item) => [item.patient, item.version]),
        );
        for (const [patient, version] of patients)
          stops.push(
            subscribeMar(
              patient,
              version,
              () => {
                void load().catch((error) => {
                  if (active) setError(messageOf(error));
                });
              },
              (error) => {
                if (active) setError(messageOf(error));
              },
            ),
          );
      })
      .catch((error) => {
        if (active) setError(messageOf(error));
      });
    return () => {
      active = false;
      stops.forEach((stop) => stop());
    };
  }, [user]);
  useEffect(
    () => () => {
      if (session && "close" in session) session.close();
    },
    [session],
  );
  async function open(item: MarItem) {
    if (!user) return;
    setPending(true);
    setError("");
    try {
      const interp = await loadWasmInterp();
      const next = await createLiveSession(
        interp,
        {},
        {},
        { resourceType: "Bundle", type: "collection", entry: [] },
        {
          practitioner: { resourceType: "Practitioner", id: user.user.id },
          persona: user.persona ?? "P3",
          role: user.user.role,
        },
        undefined,
        undefined,
        {
          patient: item.patient,
          release: item.release,
          workflow: item.workflow,
          onUpdate: setMessage,
        },
      );
      setSession(next);
    } catch (error) {
      setError(messageOf(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <main>
      <Group justify="space-between" p="md">
        <Title order={1}>Medication administration</Title>
        {user && (
          <>
            <Text>{user.name ?? user.persona}</Text>
            <Button variant="subtle" onClick={logoutMar}>
              Sign out
            </Button>
          </>
        )}
        <a href="/">Other clinical workflows</a>
      </Group>
      {error && (
        <Alert role="alert" color="red">
          {error}
        </Alert>
      )}
      {message && <Alert role="status">{message}</Alert>}
      {!user ? (
        <Paper p="xl">
          <Text mb="md">Sign in to open the inpatient MAR.</Text>
          <Button
            onClick={() => {
              void loginMar().catch((error) => setError(messageOf(error)));
            }}
          >
            Sign in with Keycloak
          </Button>
        </Paper>
      ) : (
        <Stack p="md">
          <Title order={2}>Scheduled doses</Title>
          {items.map((item) => (
            <Paper withBorder p="md" key={`${item.patient}/${item.workflow}`}>
              <Text fw={600}>
                {item.patientResource.name
                  ?.map((name) =>
                    [...(name.given ?? []), name.family]
                      .filter(Boolean)
                      .join(" "),
                  )
                  .join(", ")}
              </Text>
              <Text>
                {item.order.medicationCodeableConcept?.text} · Due{" "}
                {item.scheduledTime}
              </Text>
              <div aria-live="polite" data-testid="mar-history">
                {item.administrations.length ? (
                  item.administrations.map((administration) => (
                    <Text key={administration.id}>
                      {administration.status === "completed"
                        ? "Given"
                        : "Not given"}{" "}
                      · {administration.effectiveDateTime}
                      {administration.statusReason
                        ?.map((reason) => reason.text)
                        .join("; ")}
                    </Text>
                  ))
                ) : (
                  <Text>No administration recorded</Text>
                )}
              </div>
              <Group mt="sm">
                <Button
                  disabled={pending}
                  onClick={() => {
                    void open(item);
                  }}
                >
                  Open MAR
                </Button>
                <Button
                  variant="light"
                  onClick={() => {
                    void marCosign(item)
                      .then((result) =>
                        setMessage(
                          `Independent check recorded for this dose. Cosigner: ${result.cosigner}`,
                        ),
                      )
                      .catch((error) => setError(messageOf(error)));
                  }}
                >
                  Cosign independent check
                </Button>
              </Group>
            </Paper>
          ))}
          {session && (
            <MarChart
              session={session}
              viewer={`${user.name ?? user.persona} · Inpatient RN`}
            />
          )}
        </Stack>
      )}
    </main>
  );
}
