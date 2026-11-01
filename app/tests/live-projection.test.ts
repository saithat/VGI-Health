import { expect, it } from "vitest";
import type { InfoPayload } from "../../lean/generated/ehr-types";
import { createMockInterp } from "../src/core/interp";
import { projectLive } from "../src/core/liveSession";
import type { Bundle, Encounter, Patient } from "../src/data/medplum";
import { mockFacts, mockViews } from "../src/mock/workflow";

it("retains Lean queue data and gives explicit version-bound context precedence", () => {
  const patient: Patient = {
    resourceType: "Patient",
    id: "patient",
    meta: { versionId: "1" },
    name: [{ given: ["Alex"], family: "Morgan" }],
    birthDate: "1980-01-01",
  };
  const encounter: Encounter = {
    resourceType: "Encounter",
    id: "visit",
    status: "in-progress",
    class: { code: "AMB" },
  };
  const bundle: Bundle = {
    resourceType: "Bundle",
    type: "collection",
    entry: [{ resource: patient }, { resource: encounter }],
  };
  const payload: InfoPayload = {
    info: "inbasketItems",
    patient: "patient",
    artifactKey: "ambulatory:messages",
    artifact: "source-version",
    version: 1,
    fields: [],
    identifiers: [],
    availability: [],
    rows: [{ id: "row", slot: 0, fields: [["Subject", "Review result"]] }],
  };
  const interp = {
    ...createMockInterp(mockViews, mockFacts),
    facts: () =>
      JSON.stringify({
        facts: {
          ...mockFacts,
          patientId: "patient",
          infoPayloads: [payload, { ...payload, info: "careIdentity" }],
          artifactBindings: [
            {
              key: payload.artifactKey,
              artifact: payload.artifact,
              version: 1,
            },
          ],
        },
        display: { meds: [] },
      }),
  };
  const projected = projectLive(
    interp,
    bundle,
    {
      persona: "P1",
      role: "physician",
      practitioner: { resourceType: "Practitioner", id: "doctor" },
    },
    "2026-11-02T09:00:00-08:00",
    [],
    { patient, encounter },
  );
  expect(
    projected.facts.infoPayloads?.find((item) => item.info === "inbasketItems"),
  ).toEqual(payload);
  expect(
    projected.facts.infoPayloads?.filter(
      (item) => item.info === "careIdentity",
    ),
  ).toHaveLength(1);
  expect(
    projected.facts.infoPayloads?.find((item) => item.info === "careIdentity")
      ?.artifactKey,
  ).toBe("live:careIdentity");
  expect(projected.facts.artifactBindings).toContainEqual({
    key: payload.artifactKey,
    artifact: payload.artifact,
    version: 1,
  });
});
