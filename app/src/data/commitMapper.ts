import type {
  Bundle, BundleEntry, CodeableConcept, Condition, Encounter, Location,
  MedicationRequest, Patient, Practitioner, Quantity, Reference, Resource, Task,
} from "@medplum/fhirtypes";
import type { Captured, ElementSpec, Receipt, Value } from "../../../lean/generated/ehr-types";

export const systems = {
  icd10: "http://hl7.org/fhir/sid/icd-10-cm",
  cpt: "http://www.ama-assn.org/go/cpt",
  loinc: "http://loinc.org",
  cvx: "http://hl7.org/fhir/sid/cvx",
  rxnorm: "http://www.nlm.nih.gov/research/umls/rxnorm",
  local: "https://vgi-health.example/fhir",
} as const;

// Our own short labels; this is deliberately not a redistributed CPT catalog.
export const cptLabels: Readonly<Record<string, string>> = {
  "99213": "Office follow-up", "99214": "Office follow-up, higher complexity",
  "99215": "Office follow-up, extended complexity", "99203": "New office visit",
  "99204": "New office visit, higher complexity", "99205": "New office visit, extended complexity",
};

export interface CommitInput {
  commitId: string;
  captured: readonly Captured[];
  elements: readonly Pick<ElementSpec, "id" | "label" | "fhirTarget">[];
  patient: Patient;
  encounter: Encounter;
  user: Practitioner;
  now: string;
  transactionId: string;
  task?: Task;
  renewal?: MedicationRequest;
  medication?: MedicationRequest;
  bed?: Location;
  cosigner?: Practitioner;
  intent?: "order" | "plan";
  diagnosisCategory?: "encounter-diagnosis" | "problem-list-item";
  reviewed?: readonly Resource[];
  receipt?: Receipt;
}

export function valueText(value: Value): string {
  if ("qty" in value) return String(value.qty.tenths / 10);
  if ("code" in value) return value.code.c;
  if ("text" in value) return value.text.s;
  if ("flag" in value) return String(value.flag.b);
  return value.user.u;
}
const cc = (text: string, system?: string): CodeableConcept => system
  ? { coding: [{ system, code: text }], text }
  : { text };
const required = (text: string, name: string): string => {
  if (!text.trim()) throw new Error(`Missing ${name}`);
  return text;
};
export function resourceRef<T extends Resource>(resource: T): Reference<T> {
  return { reference: `${resource.resourceType}/${required(resource.id ?? "", `${resource.resourceType} id`)}` };
}
const ext = (name: string, value: string) => ({ url: `${systems.local}/StructureDefinition/${name}`, valueString: value });
const utf8Base64 = (text: string) => btoa(Array.from(new TextEncoder().encode(text), (byte) => String.fromCharCode(byte)).join(""));

/** Pure serialization of a Lean-authorized commit. It never decides whether a
 * commit is allowed. No clock, UUID generation, SDK, HTTP, or mutation lives here.
 * Element IDs disambiguate paths such as the several Observation.valueQuantitys;
 * every captured element must retain its exported fhirTarget.
 */
export function mapCommit(input: CommitInput): Bundle {
  const { patient, encounter, user, now } = input;
  const subject = resourceRef(patient);
  const context = resourceRef(encounter);
  const actor = resourceRef(user);
  if (encounter.subject?.reference !== subject.reference) throw new Error("Encounter does not belong to this patient");
  const entries: BundleEntry[] = [];
  const definitions = new Map(input.elements.map((e) => [e.id, e]));
  const captured = input.captured.filter((c) => c.confirmed);
  for (const c of captured) {
    if (!definitions.get(c.element)?.fhirTarget) throw new Error(`Missing fhirTarget for ${c.element}`);
  }
  const field = (id: string, slot = 0) => captured.find((c) => c.element === id && c.slot === slot);
  const text = (id: string, slot = 0) => {
    const c = field(id, slot);
    return c ? valueText(c.value) : "";
  };
  const number = (id: string, slot = 0) => {
    const raw = text(id, slot);
    const result = Number(raw);
    if (!raw || !Number.isFinite(result) || result < 0) throw new Error(`Invalid ${id}`);
    return result;
  };
  const add = <T extends Resource>(resource: T): Reference<T> => {
    const uuid = `${input.transactionId.slice(0, 24)}${String(entries.length + 1).padStart(12, "0")}`;
    const fullUrl = `urn:uuid:${uuid}`;
    entries.push({ fullUrl, resource, request: { method: "POST", url: resource.resourceType } });
    return { reference: fullUrl };
  };
  const update = (resource: Resource) => {
    entries.push({ resource, request: {
      method: "PUT", url: required(resourceRef(resource).reference ?? "", "reference"),
      ...(resource.meta?.versionId ? { ifMatch: `W/"${resource.meta.versionId}"` } : {}),
    } });
  };
  const changedEncounter: Encounter = structuredClone(encounter);
  let encounterChanged = false;
  const diagnosis = (id: string): Reference<Condition> | undefined => {
    const code = text(id);
    if (!code) return undefined;
    const condition: Condition = {
      resourceType: "Condition", subject, encounter: context,
      clinicalStatus: cc("active", "http://terminology.hl7.org/CodeSystem/condition-clinical"),
      category: [cc(input.diagnosisCategory ?? "encounter-diagnosis", "http://terminology.hl7.org/CodeSystem/condition-category")],
      code: cc(code, systems.icd10), recordedDate: now, recorder: actor,
    };
    const ref = add(condition);
    changedEncounter.diagnosis = [...(changedEncounter.diagnosis ?? []), { condition: ref }];
    encounterChanged = true;
    return ref;
  };
  const note = (loinc: string, title: string, filter: (id: string, target: string) => boolean) => {
    const sections = captured.filter((c) => filter(c.element, definitions.get(c.element)?.fhirTarget ?? ""));
    if (!sections.length) throw new Error(`No sections entered for ${title}`);
    add({ resourceType: "DocumentReference", status: "current", docStatus: "final", subject,
      type: cc(loinc, systems.loinc), date: now, author: [actor], authenticator: actor,
      context: { encounter: [context] }, description: title,
      content: [{ attachment: { contentType: "text/plain; charset=utf-8", title,
        data: utf8Base64(sections.map((c) => `${definitions.get(c.element)?.label ?? c.element}\n${valueText(c.value)}`).join("\n\n")), creation: now } }],
    });
  };
  const medicationOrders = (discharge = false) => {
    const slots = [...new Set(captured.filter((c) => c.element === "drug").map((c) => c.slot))];
    for (const slot of slots) {
      const drug = required(text("drug", slot), "drug");
      const dose = number("dose", slot);
      const unit = text("doseUnit", slot) || (field("dose", slot)?.value && "mg");
      const frequency = text("freq", slot);
      const duration = text("duration", slot);
      const quantity = text("quantity", slot);
      const refills = text("refills", slot);
      const reason = text("abxIndication", slot) || text("indication", slot);
      const dx = text("orderDiagnosis", slot) || text("visitDiagnosis");
      add({ resourceType: "MedicationRequest", status: "active", intent: input.intent ?? "order",
        subject, encounter: context, requester: actor, authoredOn: now,
        medicationCodeableConcept: /^\d+$/.test(drug) ? cc(drug, systems.rxnorm) : cc(drug),
        category: [cc(discharge ? "discharge" : encounter.class?.code === "IMP" ? "inpatient" : "outpatient", "http://terminology.hl7.org/CodeSystem/medicationrequest-category")],
        dosageInstruction: [{ text: text("prescriptionDirections", slot) || `${dose} ${unit || ""} ${text("route", slot)} ${frequency}`,
          route: cc(text("route", slot)), timing: { code: cc(frequency) },
          asNeededBoolean: text("prn", slot) === "true",
          doseAndRate: [{ doseQuantity: { value: dose, unit: String(unit || "mg"), system: "http://unitsofmeasure.org", code: String(unit || "mg") } }],
        }],
        dispenseRequest: {
          ...(quantity ? { quantity: { value: number("quantity", slot) } } : {}),
          ...(refills ? { numberOfRepeatsAllowed: number("refills", slot) } : {}),
          ...(duration ? { expectedSupplyDuration: { value: number("duration", slot), unit: "days", system: "http://unitsofmeasure.org", code: "d" } } : {}),
          ...(text("pharmacy", slot) ? { performer: { display: text("pharmacy", slot) } } : {}),
        },
        ...(reason || dx ? { reasonCode: [...(reason ? [cc(reason)] : []), ...(dx ? [cc(dx, systems.icd10)] : [])] } : {}),
        substitution: { allowedBoolean: text("substitution", slot) === "true" },
        extension: captured.filter((c) => c.slot === slot && definitions.get(c.element)?.fhirTarget.startsWith("MedicationRequest.extension.")).map((c) => ext(c.element, valueText(c.value))),
        ...(text("orderComment", slot) ? { note: [{ text: text("orderComment", slot) }] } : {}),
      });
    }
  };
  const serviceOrders = () => {
    for (const id of ["labTest", "orderCode", "resultFollowUpOrder", "postOpLabs", "postOpActivity", "surgeryDecision"]) {
      for (const c of captured.filter((c) => c.element === id)) {
        const code = valueText(c.value);
        if (!code) continue;
        add({ resourceType: "ServiceRequest", status: "active", intent: input.intent ?? "order", subject, encounter: context,
          requester: actor, authoredOn: now, code: cc(code, id === "labTest" || id === "postOpLabs" ? systems.loinc : undefined),
          ...(text("labDiagnosis", c.slot) ? { reasonCode: [cc(text("labDiagnosis", c.slot), systems.icd10)] } : {}),
          ...(text("labFasting", c.slot) ? { patientInstruction: text("labFasting", c.slot) } : {}),
          ...(text("priorAuthRequest", c.slot) ? { extension: [ext("priorAuthRequest", text("priorAuthRequest", c.slot))] } : {}),
        });
      }
    }
  };
  const finishTask = () => {
    const task = input.task;
    if (!task?.id || task.for?.reference !== subject.reference) throw new Error("Select a Task for this patient");
    update({ ...task, status: "completed", owner: actor, executionPeriod: { ...task.executionPeriod, end: now },
      ...(text("refillDecision") ? { businessStatus: cc(text("refillDecision")) } : {}),
      ...(text("resultAction") ? { output: [...(task.output ?? []), { type: cc("result-action"), valueCodeableConcept: cc(text("resultAction")) }] } : {}),
    });
  };
  const message = () => {
    if (text("patientMessage")) add({ resourceType: "Communication", status: "completed", subject, encounter: context,
      sender: actor, recipient: [subject], sent: now, payload: [{ contentString: text("patientMessage") }],
      ...(input.task ? { basedOn: [resourceRef(input.task)] } : {}),
    });
  };
  const vitals = () => {
    const codes: Record<string, [string, string]> = { weight: ["29463-7", "kg"], height: ["8302-2", "cm"],
      headCircumference: ["9843-4", "cm"], heartRate: ["8867-4", "/min"], respRate: ["9279-1", "/min"],
      temperature: ["8310-5", "Cel"], spo2: ["2708-6", "%"] };
    for (const [id, [code, unit]] of Object.entries(codes)) {
      if (field(id)) add({ resourceType: "Observation", status: "final", subject, encounter: context,
        performer: [actor], effectiveDateTime: now, code: cc(code, systems.loinc),
        category: [cc("vital-signs", "http://terminology.hl7.org/CodeSystem/observation-category")],
        valueQuantity: { value: number(id), unit, system: "http://unitsofmeasure.org", code: unit },
      });
    }
    if (field("bpSystolic") || field("bpDiastolic")) add({ resourceType: "Observation", status: "final", subject, encounter: context,
      performer: [actor], effectiveDateTime: now, code: cc("85354-9", systems.loinc),
      category: [cc("vital-signs", "http://terminology.hl7.org/CodeSystem/observation-category")],
      component: [["bpSystolic", "8480-6"], ["bpDiastolic", "8462-4"]].flatMap(([id, code]) => id && code && field(id)
        ? [{ code: cc(code, systems.loinc), valueQuantity: { value: number(id), unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" } }] : []),
    });
  };
  switch (input.commitId) {
    case "signOrders":
    case "signFormattedPrescription":
    case "signOralLiquidPrescription":
    case "signOralMethotrexate":
      medicationOrders(); serviceOrders(); break;
    case "signNote":
    case "signProgressNote":
    case "chartAssessment": {
      note(input.commitId === "chartAssessment" ? "34746-8" : "11506-3", "Clinical note", (id, target) => target.startsWith("Composition.section") || target === "DocumentReference.content" || id === "chiefComplaint");
      vitals();
      diagnosis(text("visitDiagnosis") ? "visitDiagnosis" : "progressWorkingDiagnosis");
      if (text("chiefComplaint")) {
        changedEncounter.reasonCode = [cc(text("chiefComplaint"))]; encounterChanged = true;
      }
      const cpt = text("levelOfService");
      if (cpt) {
        const label = cptLabels[cpt];
        if (!label) throw new Error(`CPT ${cpt} is not in the shipped code set`);
        add({ resourceType: "ChargeItem", status: "billable", subject, context,
          code: { coding: [{ system: systems.cpt, code: cpt, display: label }], text: label },
          occurrenceDateTime: now, enterer: actor, performer: [{ actor }],
        });
      }
      break;
    }
    case "diagnoses": diagnosis("visitDiagnosis"); break;
    case "signOpNote":
      note("11504-8", "Operative note", (id, target) => id.startsWith("op") || target.startsWith("Composition.section"));
      add({ resourceType: "Procedure", status: "completed", subject, encounter: context,
        code: cc(required(text("opProcedure"), "procedure")), performedDateTime: now,
        performer: [{ actor }], reasonCode: [cc(text("opPreopDiagnosis"), systems.icd10)],
        outcome: cc(text("opCondition") || text("opPostopDiagnosis")),
        note: captured.filter((c) => c.element.startsWith("op")).map((c) => ({ text: `${c.element}: ${valueText(c.value)}` })),
      }); break;
    case "recordAdmission":
    case "disposition": {
      const choice = input.commitId === "recordAdmission" ? "admit" : required(text("dispositionChoice"), "disposition");
      if (choice === "admit") {
        if (!input.bed?.id) throw new Error("Select an available bed Location before admission");
        add({ resourceType: "Encounter", status: "in-progress", class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "IMP" },
          subject, partOf: context, period: { start: now }, participant: [{ individual: actor }],
          location: [{ location: resourceRef(input.bed), status: "active", period: { start: now } }],
          hospitalization: { admitSource: cc(text("arrivalMode") || "emd", "http://terminology.hl7.org/CodeSystem/admit-source") },
        });
        diagnosis(text("admittingDiagnosis") ? "admittingDiagnosis" : "visitDiagnosis");
        changedEncounter.status = "finished"; changedEncounter.period = { ...encounter.period, end: now }; encounterChanged = true;
      } else if (choice === "discharge") {
        changedEncounter.status = "finished"; changedEncounter.period = { ...encounter.period, end: now };
        changedEncounter.hospitalization = { ...encounter.hospitalization, dischargeDisposition: cc("home", "http://terminology.hl7.org/CodeSystem/discharge-disposition") };
        encounterChanged = true; medicationOrders(true);
      } else {
        add({ resourceType: "ServiceRequest", status: "active", intent: "order", subject, encounter: context,
          code: cc("Consultation"), requester: actor, authoredOn: now, performerType: cc(text("admitService")) });
      }
      break;
    }
    case "discharge":
      changedEncounter.status = "finished"; changedEncounter.period = { ...encounter.period, end: now };
      changedEncounter.hospitalization = { ...encounter.hospitalization, dischargeDisposition: cc(required(text("dischargeDestination"), "discharge destination"), "http://terminology.hl7.org/CodeSystem/discharge-disposition") };
      encounterChanged = true; diagnosis("dischargeDiagnosis"); medicationOrders(true);
      if (text("dischargeInstructions")) note("18842-5", "Discharge summary", (id, target) => id.startsWith("discharge") || target.startsWith("Composition.section"));
      break;
    case "administerMed": {
      const order = input.medication;
      if (!order?.id || order.subject.reference !== subject.reference) throw new Error("Select the medication order for this patient");
      const status = required(text("adminStatus"), "administration status");
      const completed = ["given", "completed"].includes(status);
      if (!completed && !["held", "refused", "not-done"].includes(status)) throw new Error("Unknown administration status");
      const doseRaw = text("administeredDose");
      const parsed = doseRaw.match(/^(\d+(?:\.\d+)?)\s*(mg|mcg|g|mL|units)$/);
      const dose: Quantity | undefined = parsed ? { value: Number(parsed[1]), unit: parsed[2] ?? "mg" } : field("dose") ? { value: number("dose"), unit: text("doseUnit") || "mg" } : order.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity;
      if (completed && !dose) throw new Error("Enter the administered dose and unit");
      if (text("highAlertCosign") && (!input.cosigner?.id || text("highAlertCosign") !== input.cosigner.id && text("highAlertCosign") !== `Practitioner/${input.cosigner.id}`)) throw new Error("Cosigner must resolve to a second Practitioner");
      if (input.cosigner?.id === user.id) throw new Error("Cosigner must differ from administering practitioner");
      add({ resourceType: "MedicationAdministration", status: completed ? "completed" : "not-done", subject, context,
        request: resourceRef(order),
        ...(order.medicationCodeableConcept ? { medicationCodeableConcept: order.medicationCodeableConcept } : { medicationReference: order.medicationReference ?? {} }),
        effectiveDateTime: text("actualAdministrationTime") || now,
        performer: [{ actor }, ...(input.cosigner ? [{ actor: resourceRef(input.cosigner), function: cc("Independent double check") }] : [])],
        ...(completed ? { dosage: { ...(dose ? { dose } : {}), route: cc(text("actualAdministrationRoute") || text("route")), site: cc(text("adminSite")) } } : { statusReason: [cc(required(text("adminReason"), "reason not administered"))] }),
        extension: ["wristbandScan", "medScan"].filter((id) => text(id)).map((id) => ext(id, text(id))),
      }); break;
    }
    case "recordImmunization":
      add({ resourceType: "Immunization", status: "completed", patient: subject, encounter: context,
        vaccineCode: cc(required(text("vaccine"), "CVX vaccine code"), systems.cvx),
        occurrenceDateTime: text("vaccineAdministrationDate") || now, primarySource: true,
        lotNumber: required(text("vaccineLot"), "vaccine lot"), manufacturer: { display: required(text("vaccineManufacturer"), "manufacturer") },
        site: cc(required(text("vaccineSite"), "vaccine site")), route: cc(text("vaccineRoute")),
        performer: [{ actor }], education: [{ documentType: "VIS", presentationDate: required(text("visGiven"), "VIS presentation date"), publicationDate: required(text("visEditionDate"), "VIS publication date") }],
      }); break;
    case "ackResult": finishTask(); message(); serviceOrders(); break;
    case "approveRefill": {
      const original = input.renewal;
      if (!original?.id || original.subject.reference !== subject.reference) throw new Error("Select the original prescription for this patient");
      const { id: _id, meta: _meta, ...copy } = original;
      void _id; void _meta;
      const request: MedicationRequest = { ...copy, status: "active", intent: "order", encounter: context,
        authoredOn: now, requester: actor, priorPrescription: resourceRef(original),
        dispenseRequest: { ...original.dispenseRequest,
          ...(text("refillQuantity") ? { quantity: { value: number("refillQuantity") } } : {}),
          ...(text("refillRefills") ? { numberOfRepeatsAllowed: number("refillRefills") } : {}),
          ...(text("refillPharmacy") ? { performer: { display: text("refillPharmacy") } } : {}),
        },
      };
      if (text("refillDose")) request.dosageInstruction = [{ ...original.dosageInstruction?.[0], doseAndRate: [{ doseQuantity: { value: number("refillDose"), unit: "mg" } }] }];
      if (text("refillNote")) request.note = [{ text: text("refillNote") }];
      const renewal = add(request); finishTask();
      const taskEntry = entries.find((entry) => entry.resource?.resourceType === "Task");
      if (taskEntry?.resource?.resourceType === "Task") taskEntry.resource.output = [...(taskEntry.resource.output ?? []), { type: cc("renewal"), valueReference: renewal }];
      break;
    }
    case "denyRefill": finishTask(); message(); break;
    case "markReviewed": {
      if (!input.reviewed?.length || !input.receipt) throw new Error("No versioned resources selected for review");
      add({ resourceType: "Provenance", recorded: now, activity: cc("review", `${systems.local}/CodeSystem/activity`),
        target: input.reviewed.map((r) => ({ reference: `${resourceRef(r).reference}/_history/${required(r.meta?.versionId ?? "", "reviewed resource versionId")}` })),
        agent: [{ who: actor }], extension: [{ url: `${systems.local}/StructureDefinition/review-receipt`, valueString: JSON.stringify(input.receipt) }],
      }); break;
    }
    default:
      if (/consent|TreatmentDecision|HivDecision|AdvanceCareDecision/i.test(input.commitId)) {
        add({ resourceType: "Consent", status: "active", patient: subject, performer: [actor], dateTime: now,
          scope: cc("patient-privacy", "http://terminology.hl7.org/CodeSystem/consentscope"),
          category: [cc("59284-0", systems.loinc)], policyRule: cc("vgi-clinical-consent"),
          provision: { type: ["deny", "refuse"].includes(text("treatmentDecision") || text("hivTestDecision")) ? "deny" : "permit" },
          verification: [{ verified: text("consentVerified") === "true", verifiedWith: subject, verificationDate: now }],
          sourceAttachment: { contentType: "text/plain; charset=utf-8", data: utf8Base64(captured.map((c) => `${c.element}: ${valueText(c.value)}`).join("\n")) },
        });
      } else throw new Error(`FHIR mapping is not available for commit ${input.commitId}`);
  }
  if (encounterChanged) update(changedEncounter);
  if (!entries.length) throw new Error(`No writable values for ${input.commitId}`);
  return { resourceType: "Bundle", type: "transaction", identifier: { system: `${systems.local}/transaction`, value: input.transactionId }, entry: entries };
}
