import { clinicalDate, isClinicalDay } from "./clinicalDate";
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
} from "./fhir-r4";
import type { Role, Receipt } from "../../../lean/generated/ehr-types";
import { resourceRef, systems } from "./commitMapper";
import { z } from "zod";
import {
  chartSchema,
  patientSchema,
  resourceSchema,
  type ChartData,
} from "./fhir";
import {
  marRequest,
  restoreMar,
  loginMar,
  logoutMar,
  type MarUser,
} from "./commitService";

export interface LiveUser {
  practitioner: Practitioner;
  persona: string;
  role: Role;
}
let identity: LiveUser | undefined;
const patientVersions = new Map<string, number>();
export const patientVersion = (patient: string) => patientVersions.get(patient);
function liveUser(me: MarUser): LiveUser {
  const role = z.enum(["physician", "rn", "np", "surgeon"]).parse(me.user.role);
  if (!me.persona)
    throw new Error("The authenticated account has no clinician persona");
  return {
    persona: me.persona,
    role,
    practitioner: {
      resourceType: "Practitioner",
      id: me.user.id,
      name: [{ text: me.name ?? me.persona }],
      identifier: [
        { system: `${systems.local}/sid/persona`, value: me.persona },
      ],
    },
  };
}
let restoring: Promise<LiveUser | undefined> | undefined;
export function restoreUser() {
  restoring ??= restoreMar()
    .then((me) => {
      identity = me ? liveUser(me) : undefined;
      return identity;
    })
    .finally(() => {
      restoring = undefined;
    });
  return restoring;
}
export function currentUser() {
  return identity;
}
export async function quickSignIn(persona: string): Promise<LiveUser> {
  await loginMar(persona.toLowerCase());
  throw new Error("Redirecting to Keycloak");
}
export async function signOut() {
  identity = undefined;
  logoutMar();
}
export async function loadPatientBundle(patientId: string): Promise<Bundle> {
  const snapshot = z
    .object({
      version: z.number(),
      snapshot: z.object({ bundle: z.unknown() }),
    })
    .parse(
      await marRequest(`/patients/${encodeURIComponent(patientId)}/chart`),
    );
  patientVersions.set(patientId, snapshot.version);
  return JSON.parse(JSON.stringify(snapshot.snapshot.bundle));
}
let directoryRead: Promise<Bundle> | undefined;
let directoryUntil = 0;
export function invalidateDirectory() {
  directoryUntil = 0;
}
async function directory(): Promise<Bundle> {
  if (!directoryRead || Date.now() >= directoryUntil) {
    directoryUntil = Date.now() + 1000;
    directoryRead = marRequest("/directory")
      .then((value) => JSON.parse(JSON.stringify(value)))
      .catch((error) => {
        directoryRead = undefined;
        throw error;
      });
  }
  return directoryRead;
}
export async function loadChart(
  patientId = "sample-patient",
): Promise<ChartData> {
  if (!identity)
    throw new Error(
      "Sign in with Keycloak, or explicitly choose Demo / replay",
    );
  const resources = bundleResources(await loadPatientBundle(patientId));
  return chartSchema.parse({
    patient: patientSchema.parse(
      resources.find((r) => r.resourceType === "Patient"),
    ),
    resources: resources
      .filter((r) => r.resourceType !== "Patient")
      .map((r) => resourceSchema.parse(r)),
    source: "commit",
    message: "Connected to the commit service",
    context: {
      codeStatus: "Not loaded",
      isolation: "Not loaded",
      careGaps: [],
      criticalFlags: [],
      asOf: new Date().toISOString().slice(0, 10),
    },
  });
}
/** Read-only filtering of the authenticated directory. This is never a write API. */
export async function searchResources(
  type: ResourceType,
  query: Record<string, string> = {},
): Promise<Resource[]> {
  const resources = bundleResources(await directory()).filter(
    (r) => r.resourceType === type,
  );
  return resources.filter((r) =>
    Object.entries(query).every(([key, value]) => {
      if (key.startsWith("_") && key !== "_id" && key !== "_tag") return true;
      if (key === "_id") return r.id === value;
      if (key === "name")
        return (
          r.resourceType === "Patient" &&
          JSON.stringify(r.name).toLowerCase().includes(value.toLowerCase())
        );
      if (key === "identifier")
        return (
          "identifier" in r &&
          Array.isArray(r.identifier) &&
          r.identifier.some((i) => `${i.system}|${i.value}` === value)
        );
      if (key === "_tag")
        return (
          r.meta?.tag?.some((i) => `${i.system}|${i.code}` === value) ?? false
        );
      if (key === "status")
        return "status" in r && value.split(",").includes(String(r.status));
      if (key === "class")
        return r.resourceType === "Encounter" && r.class.code === value;
      if (key === "date")
        return r.resourceType !== "List" || r.date?.slice(0, 10) === value;
      if (key === "physical-type")
        return (
          r.resourceType === "Location" &&
          r.physicalType?.coding?.some((c) => c.code === value)
        );
      // Remaining query keys are reference/code paths. Directory membership is
      // already server-authorized; retain exact resource identity for Lean.
      return JSON.stringify(r).includes(value);
    }),
  );
}
export async function readResource(
  type: ResourceType,
  id: string,
): Promise<Resource> {
  const r = bundleResources(await directory()).find(
    (r) => r.resourceType === type && r.id === id,
  );
  if (r) return r;
  throw new Error(`Resource unavailable: ${type}/${id}`);
}
export async function readSavedResource(link: string): Promise<Resource> {
  if (!/^\/commit\/patients\/[A-Za-z0-9.-]+\/resources\//.test(link))
    throw new Error("Invalid saved resource reference");
  return JSON.parse(JSON.stringify(await marRequest(link.slice(7))));
}
export async function searchPatients(name: string): Promise<Patient[]> {
  return (
    await searchResources("Patient", name.trim() ? { name: name.trim() } : {})
  ).filter((r): r is Patient => r.resourceType === "Patient");
}
/** The same authorized directory feeds client and server workspace transitions. */
export async function loadListContext(
  user: LiveUser,
  today: string,
): Promise<Bundle> {
  if (!user.practitioner.id || !/^\d{4}-\d{2}-\d{2}$/.test(today))
    throw new Error("Invalid workspace context");
  return directory();
}

export const bundleResources = (bundle: Bundle): Resource[] =>
  bundle.entry?.flatMap((e) => (e.resource ? [e.resource] : [])) ?? [];
export async function startEncounter(
  patient: Patient,
  user: LiveUser,
): Promise<Encounter> {
  if (!user.practitioner.id)
    throw new Error("Sign in before opening an encounter");
  invalidateDirectory();
  const snapshot = z
    .object({ version: z.number() })
    .parse(await marRequest(`/patients/${patient.id}`));
  return JSON.parse(
    JSON.stringify(
      await marRequest("/encounters", {
        patient: patient.id,
        expectedVersion: snapshot.version,
        requestId: crypto.randomUUID(),
      }),
    ),
  );
}
export interface Worklist {
  resources: Resource[];
  locations: Location[];
  medications: MedicationRequest[];
  administrations: Resource[];
}
export async function loadWorklist(
  user: LiveUser,
  today = clinicalDate(),
): Promise<Worklist> {
  const profiles = await searchResources("Practitioner", {
    identifier: `${systems.local}/sid/persona|${user.persona}`,
  });
  const sourceProfile =
    profiles.find((r) => r.id !== user.practitioner.id) ?? user.practitioner;
  const actor = resourceRef(sourceProfile).reference ?? "";
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
              status: "booked,arrived,checked-in",
            }).then((rows) =>
              rows.filter(
                (r) =>
                  r.resourceType === "Appointment" &&
                  isClinicalDay(r.start, today),
              ),
            ),
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
  const provenance = resources.filter((r) => r.resourceType === "Provenance");
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
