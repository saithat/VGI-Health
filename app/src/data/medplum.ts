import { MedplumClient } from "@medplum/core";
import { z } from "zod";
import { offlineChart } from "../mock/patient";
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
export const environment = environmentSchema.parse(import.meta.env);
// All direct Medplum access, authentication and future writes belong here.
export const medplum = new MedplumClient({
  baseUrl: environment.VITE_MEDPLUM_BASE_URL,
  clientId: environment.VITE_MEDPLUM_CLIENT_ID,
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
  if (!medplum.isAuthenticated()) return offlineChart;
  // Reject malformed responses rather than silently replacing them with a chart.
  // Network/auth failures alone select the clearly marked synthetic fallback.
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
  } catch {
    return chartSchema.parse({
      ...offlineChart,
      message:
        "Medplum unavailable · showing a separate synthetic demonstration patient",
    });
  }
  return chartSchema.parse({
    patient: patientSchema.parse(responses[0]),
    resources: z.array(resourceSchema).parse(responses[1]),
    source: "medplum",
    message: "Connected to Medplum · read-only chart",
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
