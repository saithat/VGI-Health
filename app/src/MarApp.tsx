import { useEffect, useState } from "react";
import { Alert, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
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

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
let restored: Promise<MarUser | undefined> | undefined;

function administrationLabel(
  administration: MarItem["administrations"][number],
) {
  const outcome = administration.statusReason
    ?.flatMap((reason) => reason.coding ?? [])
    .find((coding) => coding.system === "urn:vgi:mar-status")?.code;
  switch (administration.status) {
    case "completed":
      return "Given";
    case "on-hold":
      return outcome === "delayed" ? "Delayed" : "Held";
    case "not-done":
      return outcome === "held"
        ? "Held"
        : outcome === "refused"
          ? "Refused"
          : "Not given";
    case "in-progress":
      return "In progress";
    default:
      return administration.status;
  }
}

/** W4 uses the same authenticated commit authority as every other live workflow. */
export function MarApp() {
  const [user, setUser] = useState<MarUser>();
  const [items, setItems] = useState<MarItem[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
  /** The scheduled dose opens on the Lean clinical page, through the same
   * MAR session and shared dose authority (`marPatient`/`marRelease`/
   * `marWorkflow`). This list, sign-in and cosigning stay here. */
  function open(item: MarItem) {
    if (!user) return;
    if (user.user.role !== "rn") {
      setError("MAR requires the RN role.");
      return;
    }
    location.assign(
      `/lean.html?${new URLSearchParams({
        persona: user.persona ?? "P3",
        marPatient: item.patient,
        marRelease: item.release,
        marWorkflow: item.workflow,
      })}`,
    );
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
                      {administrationLabel(administration)} ·{" "}
                      {administration.effectiveDateTime}
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
        </Stack>
      )}
    </main>
  );
}
