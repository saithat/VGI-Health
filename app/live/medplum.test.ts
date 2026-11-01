import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadEhrInterp } from "../public/ehr/interp-loader.mjs";
import { createWasmInterp } from "../src/core/wasmInterp";
import { createLiveSession } from "../src/core/liveSession";
import {
  backendAvailable,
  bundleResources,
  executeTransaction,
  loadPatientBundle,
  loadWorklist,
  readResource,
  readSavedResource,
  searchResources,
  serviceLogin,
  signIn,
  type Encounter,
  type LiveUser,
  type Patient,
  type Resource,
} from "../src/data/medplum";
import type { Event, Value } from "../../lean/generated/ehr-types";
import { mapCommit, type CommitInput } from "../src/data/commitMapper";
import releaseSpec from "../../releases/v3/spec.json";
// Full FHIR mapping remains supported while current release exports use core.
import mapperSpec from "../tests/fixtures/spec-v3-full.json";

const available = await backendAvailable();
const json = async (path: string): Promise<unknown> =>
  JSON.parse(await readFile(new URL(`../../${path}`, import.meta.url), "utf8"));
const created: string[] = [];
let user: LiveUser;
let patient: Patient;
let encounter: Encounter;
const now = new Date().toISOString();
const uuid = crypto.randomUUID();

async function seed(resources: Resource[]): Promise<Resource[]> {
  const response = await executeTransaction({
    resourceType: "Bundle",
    type: "transaction",
    entry: resources.map((resource) => ({
      resource,
      request: { method: "POST", url: resource.resourceType },
    })),
  });
  return Promise.all(
    (response.entry ?? []).map(async (entry) => {
      const location = entry.response?.location ?? "";
      const match = location.match(
        /(?:^|\/)([A-Z][A-Za-z]+)\/([A-Za-z0-9.-]+)(?:\/_history\/\d+)?$/,
      );
      const resource = resources.find((r) => r.resourceType === match?.[1]);
      if (!resource || !match?.[2])
        throw new Error(`No created resource location: ${location}`);
      created.push(`${resource.resourceType}/${match[2]}`);
      return readResource(resource.resourceType, match[2]);
    }),
  );
}

describe.skipIf(!available)(
  "local Medplum with real WASM and transaction mapper",
  () => {
    beforeAll(async () => {
      const clientId = process.env.MEDPLUM_CLIENT_ID;
      const secret = process.env.MEDPLUM_CLIENT_SECRET;
      const password = process.env.VGI_USER_PASSWORD;
      if (!clientId || !secret || !password)
        throw new Error(
          "Medplum is up; run make setup to configure .env for live tests",
        );
      await serviceLogin(clientId, secret);
      const [p] = await seed([
        {
          resourceType: "Patient",
          name: [{ given: ["Live"], family: `Integration-${uuid}` }],
          birthDate: "1980-01-01",
          gender: "male",
        },
      ]);
      if (p?.resourceType !== "Patient")
        throw new Error("Patient seeding failed");
      patient = p;
      const [e] = await seed([
        {
          resourceType: "Encounter",
          status: "in-progress",
          class: { code: "AMB" },
          serviceType: {
            coding: [
              {
                system: "https://vgi-health.example/fhir/CodeSystem/service",
                code: "primary-care",
              },
            ],
          },
          subject: { reference: `Patient/${patient.id}` },
          period: { start: now },
        },
      ]);
      if (e?.resourceType !== "Encounter")
        throw new Error("Encounter seeding failed");
      encounter = e;
      await seed(
        [
          "section741IncreasedOverdoseRisk",
          "section741CaregiverEducationApplies",
          "institutionalDeaExemption",
        ].map((risk) => ({
          resourceType: "Observation",
          status: "final",
          subject: { reference: `Patient/${patient.id}` },
          encounter: { reference: `Encounter/${encounter.id}` },
          effectiveDateTime: now,
          code: {
            coding: [
              {
                system:
                  "https://vgi-health.example/fhir/CodeSystem/clinical-risk",
                code: risk,
              },
            ],
          },
          valueCodeableConcept: {
            coding: [
              {
                system: "https://vgi-health.example/fhir/CodeSystem/assessment",
                code: "no",
              },
            ],
          },
        })),
      );
      user = await signIn("p1@vgi-health.example", password);
      expect(user.persona).toBe("P1");
    });
    afterAll(async () => {
      if (!patient?.id) return;
      // Delete only this run's isolated patient resources, never seeded charts.
      const bundle = await loadPatientBundle(patient.id ?? "");
      const refs = [
        ...new Set([
          ...bundleResources(bundle)
            .filter((r) => r.resourceType !== "Patient")
            .map((r) => `${r.resourceType}/${r.id}`),
          ...created.reverse(),
        ]),
      ];
      if (refs.length)
        await executeTransaction({
          resourceType: "Bundle",
          type: "transaction",
          entry: refs.map((url) => ({ request: { method: "DELETE", url } })),
        });
    });
    it("P1 full W1: rooming, note, ICD-10, medication with refills, CPT, refetched facts and links", async () => {
      const interp = createWasmInterp(await loadEhrInterp());
      const spec = await json("releases/v3/spec.json");
      const program = await json("releases/v3/personas/P1.json");
      const session = await createLiveSession(
        interp,
        spec,
        program,
        await loadPatientBundle(patient.id ?? ""),
        user,
        { patient, encounter },
      );
      const dispatch = async (event: Event) => {
        await session.dispatch(event);
        // Real human acknowledgments, through the same WASM event as the UI.
        for (
          let retry = 0;
          retry < 10 && session.getSnapshot().state.popup;
          retry++
        ) {
          const popup = session.getSnapshot().state.popup;
          if (popup) await session.dispatch({ ack: { alert: popup[0] } });
          await session.dispatch(event);
        }
        expect(session.getSnapshot().result, JSON.stringify(event)).toBe("ok");
      };
      const click = (comp: string) => dispatch({ click: { comp } });
      const enter = (comp: string, value: string | Value) => {
        const item = session
          .getSnapshot()
          .view.items.find((i) => i.comp.id === comp);
        const element =
          item &&
          typeof item.comp.kind === "object" &&
          "field" in item.comp.kind
            ? item.comp.kind.field.element
            : "";
        const kind = releaseSpec.elements.find((e) => e.id === element)?.kind;
        return dispatch({
          enter: {
            comp,
            value:
              typeof value !== "string"
                ? value
                : kind === "flag"
                  ? { flag: { b: value === "true" } }
                  : typeof kind === "object" &&
                      ("coded" in kind || "scan" in kind)
                    ? { code: { c: value } }
                    : { text: { s: value } },
          },
        });
      };
      await click("home.work.w1Rooming");
      await enter("w1Rooming.weight", { qty: { tenths: 720, unit: "kg" } });
      await enter("w1Rooming.bpSystolic", {
        qty: { tenths: 1200, unit: "none" },
      });
      await enter("w1Rooming.bpDiastolic", {
        qty: { tenths: 800, unit: "none" },
      });
      await enter("w1Rooming.chiefComplaint", "Hypertension follow-up");
      await click("w1Rooming.review.allergyList");
      await click("w1Rooming.next");
      await click("w1MedRec.review.currentMeds");
      await enter("w1MedRec.decision0", "continue");
      await click("w1MedRec.next");
      await enter(
        "w1Hpi.hpi",
        "BP improving with medication. No adverse effects.",
      );
      await enter("w1Hpi.ros", "No chest pain or dyspnea.");
      await click("w1Hpi.next");
      await enter("w1Exam.exam", "Well appearing, normal heart and lungs.");
      await enter(
        "w1Exam.assessmentPlan",
        "Continue treatment; check metabolic panel.",
      );
      await enter("w1Exam.visitDiagnosis", { code: { c: "I10" } });
      // Filing the note persists rooming vitals. The subsequent ordering phase
      // displays the saved, version-bound weight rather than fabricating evidence.
      await click("w1Exam.nav.w1Close");
      await enter("w1Close.levelOfService", { code: { c: "99213" } });
      await enter("w1Close.followUp", "4 weeks");
      await enter("w1Close.patientInstructions", "Check home BP daily.");
      await click("w1Close.commit.signNote");
      expect(session.getSnapshot().state.commits).toContain("signNote");
      await click("w1Close.nav.w1Orders");
      await click("w1Orders.prefLisinopril");
      // Blueprint groups can contain hidden aliases for the same element.
      // Confirm only the currently shown control, then re-read Lean's view.
      for (let count = 0; count < 20; count++) {
        const item = session
          .getSnapshot()
          .view.items.find(
            (item) =>
              item.comp.id.startsWith("w1Orders.") &&
              item.shown &&
              item.pendingConfirm,
          );
        if (!item) break;
        await dispatch({ confirm: { comp: item.comp.id } });
        if (count === 19) throw new Error("Order confirmations did not settle");
      }
      await enter("w1Orders.refills", { qty: { tenths: 30, unit: "none" } });
      for (const [id, value] of Object.entries({
        indication: "Hypertension",
        pharmacy: "Community pharmacy",
        substitution: "true",
        prn: "false",
        orderDiagnosis: "I10",
      }))
        await enter(`w1Orders.${id}`, value);
      for (const [id, value] of Object.entries({
        prescriptionPatientName: "Live Integration",
        prescriptionPatientAddress: "100 Test Lane",
        prescriptionDirections: "Take 10 mg by mouth daily",
        prescriberLicenseClassification: "Physician",
      })) {
        const comp = `w1Orders.legal.${id}`;
        // Optional full-profile fields are absent in the temporary core UI.
        if (
          session
            .getSnapshot()
            .view.items.some((item) => item.shown && item.comp.id === comp)
        )
          await enter(comp, value);
      }
      await click("w1Orders.toSign");
      await click("w1Verify.continue");
      await enter(
        "w1Sign.patientIdReentry",
        `LI/M/${new Date().getUTCFullYear() - 1980}`,
      );
      expect(
        session
          .getSnapshot()
          .view.blocked.find(([comp]) => comp === "w1Sign.commit.signOrders"),
      ).toBeUndefined();
      const result = await session.dispatch({
        click: { comp: "w1Sign.commit.signOrders" },
      });
      expect(session.getSnapshot().state.commits).toContain("signOrders");
      expect(result?.links.length).toBeGreaterThan(0);
      const saved = await readSavedResource(result?.links[0] ?? "");
      expect(saved.id).toBeTruthy();
      expect(saved.meta?.versionId).toBeTruthy();
      const resources = bundleResources(
        await loadPatientBundle(patient.id ?? ""),
      );
      const request = resources.find(
        (r) => r.resourceType === "MedicationRequest",
      );
      expect(request).toMatchObject({
        encounter: { reference: `Encounter/${encounter.id}` },
        requester: { reference: `Practitioner/${user.practitioner.id}` },
        dispenseRequest: { numberOfRepeatsAllowed: 3 },
        dosageInstruction: [
          { doseAndRate: [{ doseQuantity: { value: 10, unit: "mg" } }] },
        ],
      });
      const condition = resources.find((r) => r.resourceType === "Condition");
      expect(condition).toMatchObject({
        code: {
          coding: [
            { code: "I10", system: "http://hl7.org/fhir/sid/icd-10-cm" },
          ],
        },
      });
      expect(
        resources.find((r) => r.resourceType === "Encounter"),
      ).toMatchObject({
        diagnosis: [{ condition: { reference: `Condition/${condition?.id}` } }],
      });
      expect(
        resources.find((r) => r.resourceType === "ChargeItem"),
      ).toMatchObject({
        context: { reference: `Encounter/${encounter.id}` },
        code: { coding: [{ code: "99213" }] },
      });
      expect(
        resources.find((r) => r.resourceType === "DocumentReference"),
      ).toMatchObject({
        context: { encounter: [{ reference: `Encounter/${encounter.id}` }] },
        type: { coding: [{ code: "11506-3" }] },
      });
      expect(
        resources.filter(
          (r) =>
            r.resourceType === "Observation" &&
            r.category?.some((c) =>
              c.coding?.some((coding) => coding.code === "vital-signs"),
            ),
        ),
      ).toHaveLength(2);
      expect(JSON.stringify(session.getSnapshot().ui)).toContain("72");
      const provenance = await searchResources("Provenance", {
        target: `Patient/${patient.id}/_history/${patient.meta?.versionId}`,
      });
      expect(provenance.length).toBeGreaterThan(0);
      created.push(...provenance.map((r) => `Provenance/${r.id}`));
    });
    it("P2 admits through the canonical WASM disposition screen into a real bed", async () => {
      const p2 = await signIn(
        "p2@vgi-health.example",
        process.env.VGI_USER_PASSWORD ?? "",
      );
      try {
        const [ed, bed] = await seed([
          {
            resourceType: "Encounter",
            status: "in-progress",
            class: { code: "EMER" },
            subject: { reference: `Patient/${patient.id}` },
            period: { start: now },
            serviceType: { coding: [{ code: "emergency" }] },
          },
          {
            resourceType: "Location",
            name: `WASM admission bed ${uuid}`,
            status: "active",
            physicalType: { coding: [{ code: "bd" }] },
          },
        ]);
        if (
          ed?.resourceType !== "Encounter" ||
          bed?.resourceType !== "Location"
        )
          throw new Error("Admission setup failed");
        await seed(
          [
            "emergencyCareRefused",
            "unstableCertifiedTransfer",
            "emtalaTransfer",
          ].map((risk) => ({
            resourceType: "Observation",
            status: "final",
            subject: { reference: `Patient/${patient.id}` },
            encounter: { reference: `Encounter/${ed.id}` },
            effectiveDateTime: now,
            code: {
              coding: [
                {
                  system:
                    "https://vgi-health.example/fhir/CodeSystem/clinical-risk",
                  code: risk,
                },
              ],
            },
            valueCodeableConcept: { coding: [{ code: "no" }] },
          })),
        );
        const session = await createLiveSession(
          createWasmInterp(await loadEhrInterp()),
          releaseSpec,
          await json("releases/v3/personas/P2.json"),
          await loadPatientBundle(patient.id ?? ""),
          p2,
          { patient, encounter: ed, bed },
        );
        const act = async (event: Event) => {
          await session.dispatch(event);
          for (
            let attempt = 0;
            attempt < 10 && session.getSnapshot().state.popup;
            attempt++
          ) {
            const popup = session.getSnapshot().state.popup;
            if (popup) await session.dispatch({ ack: { alert: popup[0] } });
            await session.dispatch(event);
          }
          expect(session.getSnapshot().result, JSON.stringify(event)).toBe(
            "ok",
          );
        };
        await act({ click: { comp: "home.work.w3TrackBoard" } });
        await act({ click: { comp: "w3TrackBoard.nav.w3Disposition" } });
        for (const [element, text] of Object.entries({
          dispositionChoice: "admit",
          visitDiagnosis: "J18.9",
          dispositionCondition: "stable",
          admitService: "Internal medicine",
          admitLevelOfCare: "ward",
          postHospitalNeeds: "Inpatient monitoring and antibiotics",
          postHospitalServiceAvailability: "Ward bed available",
          postHospitalServiceAccess: "Admitting service accepted patient",
          dischargePlanningEvaluation: "Continued inpatient care needed",
          dischargeEvaluationDiscussion: "Admission discussed with patient",
          hospitalCourse:
            "Stabilized in ED; requires ongoing inpatient treatment",
          futureCareRecommendations: "Inpatient monitoring and treatment",
          futureCareArrangements: "Ward team accepted handoff",
          edDepartureTime: now,
          continuingCareInformationGiven: "true",
        })) {
          const item = session
            .getSnapshot()
            .view.items.find(
              (item) =>
                item.shown &&
                typeof item.comp.kind === "object" &&
                "field" in item.comp.kind &&
                item.comp.kind.field.element === element,
            );
          if (!item) {
            if (
              [
                "dispositionChoice",
                "visitDiagnosis",
                "dispositionCondition",
              ].includes(element)
            )
              throw new Error(`No shown disposition field for ${element}`);
            continue; // This release omits optional full-profile evidence fields.
          }
          const definition = releaseSpec.elements.find((e) => e.id === element);
          await act({
            enter: {
              comp: item.comp.id,
              value:
                definition?.kind === "flag"
                  ? { flag: { b: text === "true" } }
                  : typeof definition?.kind === "object" &&
                      "coded" in definition.kind
                    ? { code: { c: text } }
                    : { text: { s: text } },
            },
          });
        }
        const commit = session
          .getSnapshot()
          .view.items.find(
            (item) =>
              item.shown &&
              typeof item.comp.kind === "object" &&
              "button" in item.comp.kind &&
              typeof item.comp.kind.button.action === "object" &&
              "commit" in item.comp.kind.button.action &&
              item.comp.kind.button.action.commit.commit === "disposition",
          );
        if (!commit) throw new Error("No disposition commit control");
        expect(
          session
            .getSnapshot()
            .view.blocked.find(([id]) => id === commit.comp.id),
        ).toBeUndefined();
        await act({ click: { comp: commit.comp.id } });
        expect(session.getSnapshot().state.commits).toContain("disposition");
        const inpatient = (
          await searchResources("Encounter", {
            patient: patient.id ?? "",
            class: "IMP",
          })
        ).find(
          (r) =>
            r.resourceType === "Encounter" &&
            r.partOf?.reference === `Encounter/${ed.id}`,
        );
        expect(inpatient).toMatchObject({
          status: "in-progress",
          location: [{ location: { reference: `Location/${bed.id}` } }],
        });
        expect(await readResource("Location", bed.id ?? "")).toMatchObject({
          operationalStatus: { code: "O" },
        });
      } finally {
        await signIn(
          "p1@vgi-health.example",
          process.env.VGI_USER_PASSWORD ?? "",
        );
      }
    });
    it("all persona worklist searches are accepted by local Medplum", async () => {
      const password = process.env.VGI_USER_PASSWORD ?? "";
      try {
        for (const persona of ["P1", "P2", "P3", "P4", "P5"]) {
          const principal = await signIn(
            `${persona.toLowerCase()}@vgi-health.example`,
            password,
          );
          expect(principal.persona).toBe(persona);
          const worklist = await loadWorklist(principal, "2026-11-02");
          expect(worklist.resources).toBeInstanceOf(Array);
          for (const item of worklist.resources) {
            if (item.resourceType === "Appointment") {
              expect(
                item.participant.some(
                  (p) =>
                    p.actor?.reference ===
                    `Practitioner/${principal.practitioner.id}`,
                ),
              ).toBe(true);
              expect(item.start?.slice(0, 10)).toBe("2026-11-02");
            }
            if (item.resourceType === "Task")
              expect(item.owner?.reference).toBe(
                `Practitioner/${principal.practitioner.id}`,
              );
            if (
              item.resourceType === "Encounter" &&
              ["P2", "P3"].includes(persona)
            )
              expect(item.class.code).toBe(persona === "P2" ? "EMER" : "IMP");
          }
          for (const order of worklist.medications)
            expect(
              worklist.resources.some(
                (e) =>
                  e.resourceType === "Encounter" &&
                  `Encounter/${e.id}` === order.encounter?.reference,
              ),
            ).toBe(true);
        }
      } finally {
        await signIn("p1@vgi-health.example", password);
      }
    });
    it("an optimistic-lock failure rolls back the bundle and preserves the clinician's inputs", async () => {
      const [e] = await seed([
        {
          resourceType: "Encounter",
          status: "in-progress",
          class: { code: "AMB" },
          serviceType: { coding: [{ code: "primary-care" }] },
          subject: { reference: `Patient/${patient.id}` },
          period: { start: now },
        },
      ]);
      if (e?.resourceType !== "Encounter") throw new Error("No encounter");
      const interp = createWasmInterp(await loadEhrInterp());
      const session = await createLiveSession(
        interp,
        await json("releases/v3/spec.json"),
        await json("releases/v3/personas/P1.json"),
        await loadPatientBundle(patient.id ?? ""),
        user,
        { patient, encounter: e },
      );
      const act = async (event: Event) => {
        await session.dispatch(event);
        const popup = session.getSnapshot().state.popup;
        if (popup) {
          await session.dispatch({ ack: { alert: popup[0] } });
          await session.dispatch(event);
        }
      };
      await act({ click: { comp: "home.work.w1Rooming" } });
      await act({
        enter: {
          comp: "w1Rooming.weight",
          value: { qty: { tenths: 720, unit: "kg" } },
        },
      });
      await act({
        enter: {
          comp: "w1Rooming.chiefComplaint",
          value: { text: { s: "BP follow-up" } },
        },
      });
      await act({ click: { comp: "w1Rooming.nav.w1MedRec" } });
      await act({
        enter: {
          comp: "w1MedRec.decision0",
          value: { code: { c: "continue" } },
        },
      });
      await act({ click: { comp: "w1MedRec.nav.w1Hpi" } });
      await act({
        enter: {
          comp: "w1Hpi.hpi",
          value: { text: { s: "Keep this unsaved narrative" } },
        },
      });
      await act({
        enter: { comp: "w1Hpi.ros", value: { text: { s: "No new symptoms" } } },
      });
      await act({ click: { comp: "w1Hpi.nav.w1Exam" } });
      await act({
        enter: { comp: "w1Exam.visitDiagnosis", value: { code: { c: "I10" } } },
      });
      await act({
        enter: {
          comp: "w1Exam.exam",
          value: { text: { s: "Normal examination" } },
        },
      });
      await act({
        enter: {
          comp: "w1Exam.assessmentPlan",
          value: { text: { s: "Continue treatment" } },
        },
      });
      await act({ click: { comp: "w1Exam.nav.w1Close" } });
      await act({
        enter: {
          comp: "w1Close.levelOfService",
          value: { code: { c: "99213" } },
        },
      });
      await act({
        enter: { comp: "w1Close.followUp", value: { code: { c: "4 weeks" } } },
      });
      await act({
        enter: {
          comp: "w1Close.patientInstructions",
          value: { text: { s: "Check BP" } },
        },
      });
      const before = session.getSnapshot().state.captured;
      expect(
        session.getSnapshot().view.blocked,
        JSON.stringify(session.getSnapshot().view.blocked),
      ).toEqual([]);
      const count = (
        await searchResources("DocumentReference", {
          patient: patient.id ?? "",
        })
      ).length;
      await executeTransaction({
        resourceType: "Bundle",
        type: "transaction",
        entry: [
          {
            resource: {
              ...e,
              reasonCode: [{ text: "Concurrent clinician update" }],
            },
            request: { method: "PUT", url: `Encounter/${e.id}` },
          },
        ],
      });
      // Clear real popups first; the second click reaches the stale PUT.
      const event: Event = { click: { comp: "w1Close.commit.signNote" } };
      let failure: unknown;
      for (let retry = 0; retry < 10; retry++) {
        try {
          await session.dispatch(event);
        } catch (error) {
          failure = error;
          break;
        }
        const popup = session.getSnapshot().state.popup;
        if (!popup)
          throw new Error(
            `Commit did not reach the transaction: ${JSON.stringify(session.getSnapshot().result)}`,
          );
        await session.dispatch({ ack: { alert: popup[0] } });
      }
      expect(failure).toBeInstanceOf(Error);
      expect(String(failure)).toContain("Precondition Failed");
      expect(session.getSnapshot().state.captured).toEqual(before);
      expect(session.getSnapshot().state.commits).not.toContain("signNote");
      expect(
        (
          await searchResources("DocumentReference", {
            patient: patient.id ?? "",
          })
        ).length,
      ).toBe(count);
    });
    it("P2 admission, P3 administration, P5 discharge mapper transactions resolve real FHIR links", async () => {
      const spec = mapperSpec;
      const [bed] = await seed([
        {
          resourceType: "Location",
          status: "active",
          name: `Integration bed ${uuid}`,
          physicalType: {
            coding: [
              {
                system:
                  "http://terminology.hl7.org/CodeSystem/location-physical-type",
                code: "bd",
              },
            ],
          },
        },
      ]);
      if (bed?.resourceType !== "Location") throw new Error("No bed");
      const values = (values: Record<string, string>) =>
        Object.entries(values).map(([element, s]) => ({
          element,
          slot: 0,
          value: { text: { s } },
          confirmed: true,
          byHuman: true,
        }));
      const password = process.env.VGI_USER_PASSWORD ?? "";
      const p2 = await signIn("p2@vgi-health.example", password);
      const [ed] = await seed([
        {
          resourceType: "Encounter",
          status: "in-progress",
          class: { code: "EMER" },
          subject: { reference: `Patient/${patient.id}` },
          period: { start: now },
        },
      ]);
      if (ed?.resourceType !== "Encounter") throw new Error("No ED encounter");
      const base: CommitInput = {
        commitId: "disposition",
        elements: spec.elements,
        captured: values({
          dispositionChoice: "admit",
          admittingDiagnosis: "J18.9",
          drug: "lisinopril",
          dose: "10",
          doseUnit: "mg",
          freq: "daily",
        }),
        patient,
        encounter: ed,
        user: p2.practitioner,
        now,
        transactionId: crypto.randomUUID(),
        bed,
      };
      const response = await executeTransaction(mapCommit(base));
      expect(response.type).toBe("transaction-response");
      const admissions = await searchResources("Encounter", {
        patient: patient.id ?? "",
        class: "IMP",
      });
      const inpatient = admissions.find(
        (r) =>
          r.resourceType === "Encounter" &&
          r.partOf?.reference === `Encounter/${ed.id}`,
      );
      if (inpatient?.resourceType !== "Encounter")
        throw new Error("No inpatient encounter");
      expect(inpatient).toMatchObject({
        partOf: { reference: `Encounter/${ed.id}` },
        location: [{ location: { reference: `Location/${bed.id}` } }],
      });
      expect(await readResource("Location", bed.id ?? "")).toMatchObject({
        operationalStatus: { code: "O" },
      });
      const [request] = await searchResources("MedicationRequest", {
        encounter: inpatient.id ?? "",
        category: "inpatient",
      });
      if (request?.resourceType !== "MedicationRequest")
        throw new Error("No inpatient order");
      const p3 = await signIn("p3@vgi-health.example", password);
      await executeTransaction(
        mapCommit({
          ...base,
          user: p3.practitioner,
          encounter: inpatient,
          commitId: "administerMed",
          transactionId: crypto.randomUUID(),
          medication: request,
          captured: values({ adminStatus: "given", administeredDose: "10 mg" }),
        }),
      );
      expect(
        await searchResources("MedicationAdministration", {
          patient: patient.id ?? "",
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: "completed",
            request: { reference: `MedicationRequest/${request.id}` },
            performer: [
              { actor: { reference: `Practitioner/${p3.practitioner.id}` } },
            ],
          }),
        ]),
      );
      const p5 = await signIn("p5@vgi-health.example", password);
      const freshBed = await readResource("Location", bed.id ?? "");
      if (freshBed.resourceType !== "Location") throw new Error("No bed");
      await executeTransaction(
        mapCommit({
          ...base,
          user: p5.practitioner,
          bed: freshBed,
          encounter: inpatient,
          commitId: "discharge",
          transactionId: crypto.randomUUID(),
          captured: values({
            dischargeDestination: "home",
            dischargeInstructions: "Follow up in clinic",
            drug: "lisinopril",
            dose: "10",
            doseUnit: "mg",
            freq: "daily",
            refills: "2",
          }),
        }),
      );
      expect(await readResource("Encounter", inpatient.id ?? "")).toMatchObject(
        {
          status: "finished",
          hospitalization: {
            dischargeDisposition: { coding: [{ code: "home" }] },
          },
        },
      );
      expect(await readResource("Location", bed.id ?? "")).toMatchObject({
        operationalStatus: { code: "U" },
      });
      expect(
        await searchResources("MedicationRequest", {
          patient: patient.id ?? "",
          category: "discharge",
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            encounter: { reference: `Encounter/${inpatient.id}` },
          }),
        ]),
      );
    });
    it("results acknowledgment and messaging, renewal, immunization, operative note and consent validate on Medplum", async () => {
      const p1 = await signIn(
        "p1@vgi-health.example",
        process.env.VGI_USER_PASSWORD ?? "",
      );
      const values = (values: Record<string, string>) =>
        Object.entries(values).map(([element, s]) => ({
          element,
          slot: 0,
          value: { text: { s } },
          confirmed: true,
          byHuman: true,
        }));
      const makeInput = (
        commitId: string,
        value: Record<string, string>,
      ): CommitInput => ({
        commitId,
        captured: values(value),
        elements: mapperSpec.elements,
        patient,
        encounter: sessionEncounter(encounter),
        user: p1.practitioner,
        now,
        transactionId: crypto.randomUUID(),
      });
      const [task] = await seed([
        {
          resourceType: "Task",
          status: "requested",
          intent: "order",
          for: { reference: `Patient/${patient.id}` },
        },
      ]);
      if (task?.resourceType !== "Task") throw new Error("No result task");
      await executeTransaction(
        mapCommit({
          ...makeInput("ackResult", {
            resultAction: "reviewed",
            patientMessage: "Your test was reviewed; please arrange follow-up.",
          }),
          task,
        }),
      );
      expect(await readResource("Task", task.id ?? "")).toMatchObject({
        status: "completed",
      });
      expect(
        await searchResources("Communication", { patient: patient.id ?? "" }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            recipient: [{ reference: `Patient/${patient.id}` }],
            status: "completed",
          }),
        ]),
      );
      const original = bundleResources(
        await loadPatientBundle(patient.id ?? ""),
      ).find((r) => r.resourceType === "MedicationRequest");
      const [refillTask] = await seed([
        {
          resourceType: "Task",
          status: "requested",
          intent: "order",
          for: { reference: `Patient/${patient.id}` },
        },
      ]);
      if (
        original?.resourceType !== "MedicationRequest" ||
        refillTask?.resourceType !== "Task"
      )
        throw new Error("No refill context");
      await executeTransaction(
        mapCommit({
          ...makeInput("approveRefill", {
            refillQuantity: "90",
            refillRefills: "2",
          }),
          task: refillTask,
          renewal: original,
        }),
      );
      expect(
        await searchResources("MedicationRequest", {
          patient: patient.id ?? "",
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            priorPrescription: {
              reference: `MedicationRequest/${original.id}`,
            },
            dispenseRequest: expect.objectContaining({
              numberOfRepeatsAllowed: 2,
            }),
          }),
        ]),
      );
      await executeTransaction(
        mapCommit({
          ...makeInput("recordImmunization", {}),
          captured: [
            ...values({
              vaccine: "140",
              vaccineLot: "LIVE-LOT",
              vaccineManufacturer: "Test manufacturer",
              vaccineSite: "left arm",
              vaccineAdministrationDate: now,
              visEditionDate: "2025-01-31",
            }),
            {
              element: "visGiven",
              slot: 0,
              confirmed: true,
              byHuman: true,
              value: { flag: { b: true } },
            },
          ],
        }),
      );
      await executeTransaction(
        mapCommit(
          makeInput("signOpNote", {
            opProcedure: "44970",
            opFindings: "Synthetic integration operative findings",
            opPreopDiagnosis: "K35.80",
          }),
        ),
      );
      await executeTransaction(
        mapCommit(
          makeInput("documentTreatmentConsent", {
            treatmentDecision: "permit",
            consentVerified: "true",
          }),
        ),
      );
      expect(
        await searchResources("Immunization", { patient: patient.id ?? "" }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            vaccineCode: expect.objectContaining({
              coding: expect.arrayContaining([
                expect.objectContaining({ code: "140" }),
              ]),
            }),
            lotNumber: "LIVE-LOT",
          }),
        ]),
      );
      expect(
        await searchResources("Procedure", { patient: patient.id ?? "" }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            encounter: { reference: `Encounter/${encounter.id}` },
          }),
        ]),
      );
      expect(
        await searchResources("Consent", { patient: patient.id ?? "" }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: "active",
            verification: [
              {
                verified: true,
                verifiedWith: { reference: `Patient/${patient.id}` },
                verificationDate: now,
              },
            ],
          }),
        ]),
      );
    });
  },
);
function sessionEncounter(resource: Resource): Encounter {
  if (resource.resourceType !== "Encounter")
    throw new Error("Not an encounter");
  return resource;
}
