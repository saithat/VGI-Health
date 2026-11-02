import { z } from "zod";
import type {
  Event,
  FactsOutput,
  State,
  StepOutput,
} from "../../../lean/generated/ehr-types";

const issuer =
  import.meta.env.VITE_KEYCLOAK_ISSUER ?? "http://localhost:8180/realms/vgi";
const clientId = "vgi-mar";
const base = "/commit";
const callback = () => `${location.origin}/?workflow=mar`;
const tokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});
const userSchema = z.object({
  user: z.object({
    id: z.string(),
    role: z.enum(["rn", "physician", "np", "surgeon"]),
  }),
  persona: z.string().optional(),
  name: z.string().optional(),
});
export type MarUser = z.infer<typeof userSchema>;
let tokens: z.infer<typeof tokenSchema> | undefined;
let expiresAt = 0;
let refreshing: Promise<void> | undefined;
const b64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

/** Authorization Code + S256 PKCE; credentials stay on Keycloak's login page.
 * The verifier/state survive only the redirect. Tokens remain in memory. */
export async function loginMar(username?: string) {
  const verifier = b64(crypto.getRandomValues(new Uint8Array(32)));
  const state = b64(crypto.getRandomValues(new Uint8Array(32)));
  sessionStorage.setItem("vgi.mar.login", JSON.stringify({ verifier, state }));
  const challenge = b64(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  location.assign(
    `${issuer}/protocol/openid-connect/auth?${new URLSearchParams({
      client_id: clientId,
      ...(username ? { login_hint: username } : {}),
      redirect_uri: callback(),
      response_type: "code",
      scope: "openid profile",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    })}`,
  );
}
async function tokenRequest(params: Record<string, string>) {
  const res = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, ...params }),
  });
  if (!res.ok) throw new Error("Keycloak session expired. Sign in again.");
  tokens = tokenSchema.parse(await res.json());
  expiresAt = Date.now() + tokens.expires_in * 1000;
}
export async function restoreMar(): Promise<MarUser | undefined> {
  const query = new URLSearchParams(location.search);
  if (query.has("error"))
    throw new Error(`Keycloak login: ${query.get("error")}`);
  if (query.has("code")) {
    const pending = z
      .object({ verifier: z.string(), state: z.string() })
      .parse(JSON.parse(sessionStorage.getItem("vgi.mar.login") ?? "null"));
    sessionStorage.removeItem("vgi.mar.login");
    if (pending.state !== query.get("state"))
      throw new Error("Keycloak login state did not match this tab.");
    const code = query.get("code");
    if (!code) throw new Error("Missing authorization code");
    // Remove the one-use authorization code before any rendering or other requests.
    history.replaceState(null, "", "/?workflow=mar");
    await tokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: callback(),
      code_verifier: pending.verifier,
    });
  }
  return tokens ? userSchema.parse(await marRequest("/me")) : undefined;
}
export function logoutMar() {
  tokens = undefined;
  location.assign(
    `${issuer}/protocol/openid-connect/logout?${new URLSearchParams({ client_id: clientId, post_logout_redirect_uri: callback() })}`,
  );
}
async function accessToken() {
  if (!tokens) throw new Error("Sign in with Keycloak to open MAR.");
  if (Date.now() >= expiresAt - 30_000) {
    const refreshToken = tokens.refresh_token;
    refreshing ??= tokenRequest({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).finally(() => {
      refreshing = undefined;
    });
    await refreshing;
  }
  if (!tokens) throw new Error("Sign in again.");
  return tokens.access_token;
}
export class MarConflict extends Error {}
export class MarRejected extends Error {}
export async function marRequest(
  path: string,
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result: unknown = await res.json();
  if (!res.ok) {
    const error = z
      .object({ error: z.string().optional(), reason: z.string().optional() })
      .parse(result);
    if (res.status === 409)
      throw new MarConflict(
        error.reason === "dose_already_administered"
          ? "This scheduled dose was already administered. MAR refreshed; review the recorded dose."
          : "Another nurse changed this chart. MAR refreshed; review the current dose before continuing.",
      );
    const message =
      error.reason === "invalid_mar_status_or_guard"
        ? "Administration rejected. Use given, held or refused and complete the required checks."
        : (error.reason ?? error.error ?? `MAR service returned ${res.status}`);
    if (res.status < 500) throw new MarRejected(message);
    throw new Error(message);
  }
  return result;
}
// The native service produces the same Lean wire types as WASM. The host parses
// the envelope here; semantic codecs and clinical checks remain in Lean.
export interface MarOpened {
  sessionId: string;
  revision: number;
  version: number;
  state: State;
  projection: FactsOutput;
  spec: unknown;
  program: unknown;
  user: MarUser["user"];
  shared: { version: number };
}
export async function openMar(input: {
  patient: string;
  release: string;
  workflow: string;
}): Promise<MarOpened> {
  return JSON.parse(JSON.stringify(await marRequest("/sessions", input)));
}
export async function marEvent(
  session: MarOpened,
  event: Event,
): Promise<StepOutput & { revision: number }> {
  return JSON.parse(
    JSON.stringify(
      await marRequest(`/sessions/${session.sessionId}/events`, {
        revision: session.revision,
        event,
      }),
    ),
  );
}
export async function marCommit(
  session: MarOpened,
  event: Event,
  requestId: string,
): Promise<{ state: State; version: number }> {
  const command = {
    requestId,
    sessionId: session.sessionId,
    revision: session.revision,
    expectedVersion: session.version,
    expectedSharedVersion: session.shared.version,
    event,
  };
  try {
    return JSON.parse(JSON.stringify(await marRequest("/commands", command)));
  } catch (error) {
    // A transport/503 failure can conceal COMMIT. Recover only this exact intent;
    // never allocate another request ID or automatically replay stale evidence.
    if (error instanceof MarConflict || error instanceof MarRejected)
      throw error;
    let outcome: {
      status: number;
      body: { state: State; version: number; reason?: string };
    };
    try {
      outcome = JSON.parse(
        JSON.stringify(await marRequest(`/requests/${requestId}`)),
      );
    } catch {
      throw new Error(
        `Save outcome unknown (${requestId}). Keep this chart open and retry the same action to reconcile.`,
      );
    }
    if (outcome.status === 201) return outcome.body;
    if (outcome.status === 409)
      throw new MarConflict("The dose changed. MAR refreshed; repeat review.");
    throw new MarRejected(outcome.body.reason ?? "Administration rejected");
  }
}

const itemSchema = z.object({
  release: z.string(),
  workflow: z.string(),
  patient: z.string(),
  version: z.number(),
  medicationRequest: z.string(),
  encounter: z.string(),
  scheduledTime: z.string(),
  patientResource: z.object({
    name: z
      .array(
        z.object({
          given: z.array(z.string()).optional(),
          family: z.string().optional(),
        }),
      )
      .optional(),
  }),
  order: z.object({
    medicationCodeableConcept: z
      .object({ text: z.string().optional() })
      .optional(),
  }),
  administrations: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      effectiveDateTime: z.string(),
      statusReason: z
        .array(z.object({ text: z.string().optional() }))
        .optional(),
    }),
  ),
});
export type MarItem = z.infer<typeof itemSchema>;
export async function marDirectory() {
  return z
    .object({ items: z.array(itemSchema) })
    .parse(await marRequest("/mar")).items;
}
export async function marCosign(item: MarItem) {
  return z.object({ cosigner: z.string(), version: z.number() }).parse(
    await marRequest("/mar/cosigns", {
      patient: item.patient,
      release: item.release,
      workflow: item.workflow,
      expectedVersion: item.version,
    }),
  );
}

/** Header-authenticated SSE with a durable cursor. No tokens in URLs. Each
 * reconnect revalidates/refreshes identity, and catch-up is handled by the server. */
export function subscribeMar(
  patient: string,
  version: number,
  onVersion: (version: number) => void,
  onError: (error: unknown) => void,
) {
  const controller = new AbortController();
  let after = version;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function connect() {
    try {
      const res = await fetch(
        `${base}/patients/${encodeURIComponent(patient)}/events?after=${after}`,
        {
          headers: { Authorization: `Bearer ${await accessToken()}` },
          signal: controller.signal,
        },
      );
      if (!res.ok || !res.body)
        throw new Error(`MAR updates unavailable (${res.status})`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      while (!controller.signal.aborted) {
        const next = await reader.read();
        if (next.done) break;
        buffer += next.value;
        let end: number;
        while ((end = buffer.indexOf("\n\n")) >= 0) {
          const frame = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const id = frame.match(/^id: (\d+)$/m);
          if (id && Number(id[1]) > after) {
            after = Number(id[1]);
            onVersion(after);
          }
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) onError(error);
    }
    if (!controller.signal.aborted)
      timer = setTimeout(() => {
        void connect();
      }, 2000);
  }
  void connect();
  return () => {
    controller.abort();
    clearTimeout(timer);
  };
}
