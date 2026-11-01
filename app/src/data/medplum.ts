import { ClientStorage, MemoryStorage, MedplumClient } from "@medplum/core";
import type {
  Bundle,
  Encounter,
  Location,
  MedicationRequest,
  Patient,
  Practitioner,
  Resource,
  ResourceType,
  Task,
} from "@medplum/fhirtypes";
import type { Role, Receipt } from "../../../lean/generated/ehr-types";
import {
  mapCommit,
  resourceRef,
  systems,
  type CommitInput,
} from "./commitMapper";
import { z } from "zod";
import {
  chartSchema,
  patientSchema,
  resourceSchema,
  type ChartData,
} from "./fhir";

const environmentSchema = z.object({
  VITE_MEDPLUM_BASE_URL: z.url().default("http://localhost:8103/"),
  VITE_MEDPLUM_CLIENT_ID: z.string().default(""),
  VITE_MEDPLUM_PATIENT_ID: z.string().min(1).default("sample-patient"),
});
export const environment = environmentSchema.parse(import.meta.env ?? {});
// All direct Medplum access, authentication and future writes belong here.
const storage = new ClientStorage(
  typeof window === "undefined" ? new MemoryStorage() : window.localStorage,
);
/** In the browser, use the app server's same-origin Medplum proxy, so live mode
 * works from any device that can reach the app. Tests and Node scripts use the
 * configured base URL directly. */
const medplumBaseUrl =
  typeof window !== "undefined" && window.location.protocol.startsWith("http")
    ? `${window.location.origin}/medplum/`
    : environment.VITE_MEDPLUM_BASE_URL;
const medplum = new MedplumClient({
  baseUrl: medplumBaseUrl,
  clientId: environment.VITE_MEDPLUM_CLIENT_ID,
  storage,
});

async function readAll(
  type: Parameters<typeof medplum.searchResourcePages>[0],
  query: Record<string, string>,
): Promise<unknown[]> {
  const resources: unknown[] = [];
  for await (const page of medplum.searchResourcePages(type, query))
    resources.push(...page);
  return resources;
}

export async function loadChart(
  patientId = environment.VITE_MEDPLUM_PATIENT_ID,
): Promise<ChartData> {
  const id = z.string().min(1).parse(patientId);
  if (!medplum.isAuthenticated())
    throw new Error("Sign in to Medplum, or explicitly choose Demo / replay");
  // Live failures stay visible. Replay is always an explicit mode choice.
  let responses: unknown[];
  try {
    const patient = await medplum.readResource("Patient", id);
    const searches = await Promise.all([
      readAll("AllergyIntolerance", {
        patient: id,
        _count: "100",
      }),
      readAll("MedicationRequest", {
        patient: id,
        status: "active",
        _count: "100",
      }),
      readAll("Observation", {
        patient: id,
        category: "vital-signs",
        _sort: "-date",
        _count: "100",
      }),
      readAll("Observation", {
        patient: id,
        category: "laboratory",
        _sort: "-date",
        _count: "100",
      }),
      readAll("Condition", { patient: id, _count: "100" }),
      readAll("Immunization", { patient: id, _count: "100" }),
      readAll("Encounter", {
        patient: id,
        _sort: "-date",
        _count: "100",
      }),
      readAll("Appointment", {
        patient: id,
        status: "booked",
        _count: "100",
      }),
      readAll("ServiceRequest", {
        patient: id,
        status: "active",
        _count: "100",
      }),
      readAll("Coverage", {
        beneficiary: id,
        status: "active",
        _count: "100",
      }),
    ]);
    responses = [patient, searches.flat()];
  } catch (error) {
    throw new Error(
      `Medplum chart load failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return chartSchema.parse({
    patient: patientSchema.parse(responses[0]),
    resources: z.array(resourceSchema).parse(responses[1]),
    source: "medplum",
    message: "Connected to Medplum",
    context: {
      codeStatus: "Not loaded",
      isolation: "Not loaded",
      careGaps: [],
      criticalFlags: [],
      asOf: new Date().toISOString().slice(0, 10),
    },
  });
}

export async function signOut(): Promise<void> {
  await medplum.signOut();
}

export interface LiveUser {
  practitioner: Practitioner;
  persona: string;
  role: Role;
}
const personaRoles: Record<string, Role> = {
  P1: "physician",
  P2: "physician",
  P3: "rn",
  RN2: "rn",
  P4: "np",
  P5: "surgeon",
};
export function currentUser(): LiveUser | undefined {
  const profile = medplum.getProfile();
  if (!medplum.isAuthenticated() || profile?.resourceType !== "Practitioner")
    return undefined;
  const persona = profile.identifier?.find(
    (id) => id.system === `${systems.local}/sid/persona`,
  )?.value;
  const role = persona ? personaRoles[persona] : undefined;
  if (!persona || !role)
    throw new Error(
      "Practitioner has no seeded VGI persona/role. Run make setup.",
    );
  return { practitioner: profile, persona, role };
}
export async function restoreUser(): Promise<LiveUser | undefined> {
  await medplum.getInitPromise();
  await medplum.getProfileAsync();
  return currentUser();
}
export async function signIn(
  email: string,
  password: string,
): Promise<LiveUser> {
  const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const challenge = btoa(
    Array.from(new Uint8Array(hash), (n) => String.fromCharCode(n)).join(""),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  storage.setString("codeVerifier", verifier);
  const result = await medplum.startLogin({
    email,
    password,
    codeChallengeMethod: "S256",
    codeChallenge: challenge,
  });
  let code = result.code;
  if (!code && result.memberships) {
    const projectId = import.meta.env?.VITE_MEDPLUM_PROJECT_ID;
    const membership =
      result.memberships.find(
        (m) => m.project?.reference === `Project/${projectId}`,
      ) ??
      (result.memberships.length === 1 ? result.memberships[0] : undefined);
    if (!membership?.id)
      throw new Error("No unambiguous VGI Health membership for this login");
    const response: unknown = await medplum.post("auth/profile", {
      login: result.login,
      profile: membership.id,
    });
    code = z.object({ code: z.string() }).parse(response).code;
  }
  if (!code)
    throw new Error(
      "Sign-in needs verification or MFA; finish it in the Medplum app.",
    );
  await medplum.processCode(code);
  const user = currentUser();
  if (!user) throw new Error("Sign-in did not return a Practitioner profile");
  return user;
}
export async function quickSignIn(persona: string): Promise<LiveUser> {
  if (!Object.hasOwn(personaRoles, persona)) throw new Error("Unknown persona");
  const response = await fetch("/__dev/persona-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona }),
  });
  if (!response.ok)
    throw new Error(
      "Persona login needs the app server started with `make run` and the local .env from `make install`.",
    );
  const { password } = z
    .object({ password: z.string() })
    .parse(await response.json());
  return signIn(`${persona.toLowerCase()}@vgi-health.example`, password);
}
export async function backendAvailable(): Promise<boolean> {
  try {
    return (
      await fetch(new URL("healthcheck", medplumBaseUrl), {
        signal: AbortSignal.timeout(2500),
      })
    ).ok;
  } catch {
    return false;
  }
}
export async function serviceLogin(
  clientId: string,
  secret: string,
): Promise<void> {
  await medplum.startClientLogin(clientId, secret);
}
export async function searchResources(
  type: ResourceType,
  query: Record<string, string> = {},
): Promise<Resource[]> {
  const resources: Resource[] = [];
  for await (const page of medplum.searchResourcePages(
    type,
    { _count: "100", ...query },
    { cache: "no-store" },
  ))
    resources.push(...page);
  return resources;
}
export async function readResource(
  type: ResourceType,
  id: string,
): Promise<Resource> {
  return medplum.readResource(type, id, { cache: "no-store" });
}
/** Open saved resources through the authenticated same-origin client. */
export async function readSavedResource(link: string): Promise<Resource> {
  const match =
    /\/fhir\/R4\/([A-Za-z]+)\/([A-Za-z0-9.-]+)(?:\/_history\/([A-Za-z0-9.-]+))?\/?$/.exec(
      new URL(link, medplumBaseUrl).pathname,
    );
  const type = match?.[1],
    id = match?.[2],
    version = match?.[3];
  if (!type || !id) throw new Error("Invalid saved resource reference");
  return medplum.get<Resource>(
    new URL(
      `fhir/R4/${type}/${id}${version ? `/_history/${version}` : ""}`,
      medplumBaseUrl,
    ),
    { cache: "no-store" },
  );
}
export async function searchPatients(name: string): Promise<Patient[]> {
  const results = await searchResources(
    "Patient",
    name.trim() ? { name: name.trim(), _sort: "family" } : { _sort: "family" },
  );
  return results.filter((r): r is Patient => r.resourceType === "Patient");
}
const patientQueries: [ResourceType, string][] = [
  ["AllergyIntolerance", "patient"],
  ["MedicationRequest", "patient"],
  ["MedicationStatement", "patient"],
  ["MedicationAdministration", "patient"],
  ["MedicationDispense", "patient"],
  ["Observation", "patient"],
  ["Condition", "patient"],
  ["Immunization", "patient"],
  ["Encounter", "patient"],
  ["Appointment", "patient"],
  ["ServiceRequest", "patient"],
  ["Procedure", "patient"],
  ["DiagnosticReport", "patient"],
  ["DocumentReference", "patient"],
  ["Coverage", "beneficiary"],
  ["Task", "patient"],
  ["Communication", "patient"],
  ["Consent", "patient"],
  ["ChargeItem", "subject"],
  ["QuestionnaireResponse", "patient"],
  ["CarePlan", "patient"],
];
export async function loadPatientBundle(patientId: string): Promise<Bundle> {
  const id = z
    .string()
    .regex(/^[A-Za-z0-9.-]+$/)
    .parse(patientId);
  const [patient, ...groups] = await Promise.all([
    readResource("Patient", id),
    ...patientQueries.map(([type, parameter]) =>
      searchResources(type, { [parameter]: id }),
    ),
  ]);
  // Preserve full R4 records, extensions, links, and meta.versionId for Lean.
  return {
    resourceType: "Bundle",
    type: "collection",
    entry: [patient, ...groups.flat()].map((resource) => ({ resource })),
  };
}
export const bundleResources = (bundle: Bundle): Resource[] =>
  bundle.entry?.flatMap((e) => (e.resource ? [e.resource] : [])) ?? [];
export async function executeTransaction(bundle: Bundle): Promise<Bundle> {
  if (bundle.type !== "transaction")
    throw new Error("Writes must use an atomic transaction");
  const response = await medplum.executeBatch(bundle, { cache: "no-store" });
  const failure = response.entry?.find(
    (e) => !e.response?.status?.startsWith("2"),
  );
  if (failure)
    throw new Error(
      JSON.stringify(failure.response?.outcome ?? failure.response),
    );
  medplum.invalidateAll();
  return response;
}
export async function startEncounter(
  patient: Patient,
  user: LiveUser,
): Promise<void> {
  const inpatient = ["P3", "RN2"].includes(user.persona);
  await executeTransaction({
    resourceType: "Bundle",
    type: "transaction",
    entry: [
      {
        resource: {
          resourceType: "Encounter",
          status: "in-progress",
          subject: resourceRef(patient),
          serviceType: {
            coding: [
              {
                system: `${systems.local}/CodeSystem/service`,
                code:
                  user.persona === "P2"
                    ? "emergency"
                    : inpatient
                      ? "inpatient"
                      : user.persona === "P5"
                        ? "surgical-clinic"
                        : "primary-care",
              },
            ],
          },
          class: {
            system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            code: user.persona === "P2" ? "EMER" : inpatient ? "IMP" : "AMB",
          },
          period: { start: new Date().toISOString() },
          participant: [{ individual: resourceRef(user.practitioner) }],
        },
        request: { method: "POST", url: "Encounter" },
      },
    ],
  });
}
export async function persistCommit(input: CommitInput): Promise<{
  response: Bundle;
  bundle: Bundle;
  links: string[];
  refreshError?: string;
}> {
  const response = await executeTransaction(mapCommit(input));
  const links =
    response.entry?.flatMap((entry) => {
      const location = entry.response?.location;
      return location
        ? [
            new URL(
              `fhir/R4/${(location.startsWith("http") ? new URL(location).pathname : location).replace(/^.*fhir\/R4\//, "").replace(/^\/+/, "")}`,
              medplumBaseUrl,
            ).href,
          ]
        : [];
    }) ?? [];
  // A failed refetch must never make a successful transaction look retryable.
  try {
    return {
      response,
      bundle: await loadPatientBundle(input.patient.id ?? ""),
      links,
    };
  } catch (error) {
    return {
      response,
      bundle: { resourceType: "Bundle", type: "collection", entry: [] },
      links,
      refreshError: `Saved. Refresh failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
export interface Worklist {
  resources: Resource[];
  locations: Location[];
  medications: MedicationRequest[];
  administrations: Resource[];
}
export async function loadWorklist(
  user: LiveUser,
  today = new Date().toLocaleDateString("en-CA"),
): Promise<Worklist> {
  const actor = resourceRef(user.practitioner).reference ?? "";
  const persona = user.persona;
  const resources: Resource[] =
    persona === "P2" || persona === "P3" || persona === "RN2"
      ? await searchResources("Encounter", {
          class: persona === "P2" ? "EMER" : "IMP",
          status: "arrived,triaged,in-progress,onleave",
        })
      : (
          await Promise.all([
            searchResources("Appointment", {
              actor,
              date: today,
              status: "booked,arrived,checked-in",
            }),
            searchResources("Task", {
              owner: actor,
              status: "requested,received,accepted,ready,in-progress,on-hold",
            }),
            ...(persona === "P5"
              ? [
                  searchResources("ServiceRequest", {
                    performer: actor,
                    status: "active",
                  }),
                  searchResources("Procedure", {
                    performer: actor,
                    status: "preparation,in-progress",
                  }),
                  searchResources("Encounter", {
                    participant: actor,
                    status: "planned,arrived,in-progress",
                  }),
                ]
              : []),
          ])
        ).flat();
  const inpatient = persona === "P3" || persona === "RN2";
  const [locations, medications, administrations] = await Promise.all([
    searchResources("Location", { status: "active" }),
    inpatient
      ? Promise.all(
          resources
            .filter((r): r is Encounter => r.resourceType === "Encounter")
            .map((e) =>
              searchResources("MedicationRequest", {
                status: "active",
                encounter: e.id ?? "",
              }),
            ),
        ).then((groups) => groups.flat())
      : [],
    inpatient
      ? searchResources("MedicationAdministration", {
          status: "completed,not-done",
        })
      : [],
  ]);
  return {
    resources,
    locations: locations.filter(
      (r): r is Location => r.resourceType === "Location",
    ),
    medications: medications.flatMap((r) =>
      r.resourceType === "MedicationRequest" ? [r] : [],
    ),
    administrations,
  };
}
export async function availableBeds(): Promise<Location[]> {
  const results = await searchResources("Location", {
    status: "active",
    "physical-type": "bd",
  });
  return results.filter(
    (r): r is Location =>
      r.resourceType === "Location" &&
      r.operationalStatus?.code !== "O" &&
      r.operationalStatus?.code !== "H" &&
      r.operationalStatus?.code !== "C",
  );
}
export async function resolveCosigner(value: string): Promise<Practitioner> {
  const results = value.startsWith("Practitioner/")
    ? [await readResource("Practitioner", value.slice(13))]
    : await searchResources(
        "Practitioner",
        value === "RN2"
          ? { identifier: `${systems.local}/sid/persona|RN2` }
          : { _id: value },
      );
  const nurse = results.find(
    (r): r is Practitioner => r.resourceType === "Practitioner",
  );
  if (!nurse)
    throw new Error("Second nurse not found. Use RN2 or a Practitioner ID.");
  if (
    !nurse.qualification?.some((q) =>
      q.code.coding?.some(
        (coding) =>
          coding.system === "http://terminology.hl7.org/CodeSystem/v2-0360" &&
          coding.code === "RN",
      ),
    )
  )
    throw new Error("The second performer must be a registered nurse");
  return nurse;
}

/** Receipt provenance is retrieved by its patient targets, not a fictitious
 * Provenance.patient search. Lean receives these as its documented context. */
export async function loadReviewReceipts(
  bundle: Bundle,
  user: LiveUser,
  now: string,
): Promise<Receipt[]> {
  const resources = bundleResources(bundle);
  const targets = resources.filter((r) => r.meta?.versionId);
  const queries: Promise<Resource[]>[] = [];
  for (let index = 0; index < targets.length; index += 20)
    queries.push(
      searchResources("Provenance", {
        target: targets
          .slice(index, index + 20)
          .map(
            (r) => `${resourceRef(r).reference}/_history/${r.meta?.versionId}`,
          )
          .join(","),
      }),
    );
  const provenance = (await Promise.all(queries)).flat();
  const found = new Map<string, Receipt>();
  for (const p of provenance) {
    if (
      p.resourceType !== "Provenance" ||
      p.recorded.slice(0, 10) !== now.slice(0, 10) ||
      !p.agent.some(
        (a) => a.who.reference === resourceRef(user.practitioner).reference,
      )
    )
      continue;
    if (
      !p.target.every((t) =>
        targets.some(
          (r) =>
            t.reference ===
            `${resourceRef(r).reference}/_history/${r.meta?.versionId}`,
        ),
      )
    )
      continue;
    const raw = p.extension?.find((e) =>
      e.url.endsWith("/review-receipt"),
    )?.valueString;
    if (!raw) continue;
    let decoded: unknown;
    try {
      decoded = JSON.parse(raw);
    } catch {
      continue;
    }
    const parsed = z
      .object({
        info: z.string(),
        dataVersion: z.number(),
        time: z.number(),
        role: z.enum(["physician", "rn", "np", "surgeon"]),
        user: z.string(),
      })
      .safeParse(decoded);
    if (
      parsed.success &&
      parsed.data.user === user.practitioner.id &&
      parsed.data.role === user.role
    )
      found.set(p.id ?? raw, parsed.data);
  }
  return [...found.values()];
}

export type {
  Bundle,
  Encounter,
  Location,
  MedicationRequest,
  Patient,
  Practitioner,
  Resource,
  Task,
};
