/** Opt-in fictional lookup inputs; no draws from the historical world RNG.
 * These are illustrative records, not dose recommendations or real patients. */
import { dateTimeOf, SHIFTS } from "./calendar";
import { labObservation, labDef, type LabDef } from "./fhir";
import type { Json, Task } from "./schema";

function object(value: Json | undefined): Record<string, Json> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function withInformationData(task: Task): Task {
  const resources = [...task.todayResources];
  const drugs = [...task.choices.orders, ...task.choices.administer].map(o => o.drug);
  // Unchanged refill approvals keep their focused prescription in a contained Task.
  for (const resource of task.todayResources) {
    const contained = object(resource)["contained"];
    if (!Array.isArray(contained)) continue;
    for (const input of contained) {
      const medication = object(object(input)["medicationCodeableConcept"]);
      const coding = medication["coding"];
      if (!Array.isArray(coding)) continue;
      for (const term of coding) {
        const names: Record<string, string> = {"11289": "warfarin", "274783": "insulin glargine", "86009": "insulin lispro"};
        const name = names[String(object(term)["code"])];
        if (name !== undefined) drugs.push(name);
      }
    }
  }
  const clock = SHIFTS[task.persona].startClock + task.startMin;
  const addLab = (key: "glucose" | "inr" | "potassium" | "creatinine", value: number) => {
    const def: LabDef = labDef(key);
    const existing = task.todayResources.map(object).find(r => {
      const coding = object(r["code"])["coding"];
      return r["resourceType"] === "Observation" && Array.isArray(coding) && coding.some(c => object(c)["code"] === def.loinc);
    });
    const recorded = object(existing?.["valueQuantity"])["value"];
    const current = typeof recorded === "number" ? recorded : value;
    const flag = def.low !== undefined && current < def.low ? "L" : def.high !== undefined && current > def.high ? "H" : "N";
    const row = object(labObservation(`${task.id}-lookup-${key}`, task.patientId,
      task.day, clock - 5, key, current, flag));
    // Bedside snapshot: explicitly available before the decision, not a pending result.
    row["issued"] = dateTimeOf(task.day, clock - 4);
    resources.push(row);
  };
  if (drugs.some(d => d.startsWith("insulin "))) addLab("glucose", 142);
  if (drugs.includes("warfarin")) addLab("inr", 2.4);
  if (drugs.includes("potassium chloride")) { addLab("potassium", 3.2); addLab("creatinine", 1.1); }
  if (task.choices.administer.some(o => ["lisinopril", "amlodipine"].includes(o.drug))) {
    resources.push({resourceType: "Observation", id: `${task.id}-lookup-sbp`, status: "final",
      meta: {tag: [{system: "urn:vgi:world", code: "synthetic-today"}]},
      category: [{coding: [{system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs"}]}],
      code: {coding: [{system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure"}], text: "Systolic blood pressure"},
      subject: {reference: `Patient/${task.patientId}`}, effectiveDateTime: dateTimeOf(task.day, clock - 5),
      valueQuantity: {value: 118, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]"}});
  }
  if (task.choices.ackResult) {
    for (const input of task.todayResources) {
      const row = object(input);
      const quantity = object(row["valueQuantity"]);
      if (row["resourceType"] !== "Observation" || typeof quantity["value"] !== "number" || typeof row["effectiveDateTime"] !== "string") continue;
      const stamp = new Date(row["effectiveDateTime"]);
      if (!Number.isFinite(stamp.getTime())) continue;
      stamp.setUTCDate(stamp.getUTCDate() - 1);
      resources.push({...row, id: `${String(row["id"])}-lookup-prior`, effectiveDateTime: stamp.toISOString(),
        issued: stamp.toISOString(), extension: Array.isArray(row["extension"])
          ? row["extension"].filter(e => !String(object(e)["url"]).endsWith("critical-result-route")) : [], valueQuantity: {...quantity, value: Math.round(quantity["value"] * 0.95 * 100) / 100}});
    }
  }
  const added = resources.slice(task.todayResources.length);
  if (task.workflow === "W4" && added.length > 0) {
    // Supply the actual encounter link required by the existing acute projections.
    const encounter = `${task.id}-information-encounter`;
    resources.push({resourceType: "Encounter", id: encounter, status: "in-progress",
      class: {system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "IMP"},
      subject: {reference: `Patient/${task.patientId}`}, period: {start: dateTimeOf(task.day, clock - 6)}});
    for (const input of added) object(input)["encounter"] = {reference: `Encounter/${encounter}`};
  }
  return {...task, todayResources: resources};
}
