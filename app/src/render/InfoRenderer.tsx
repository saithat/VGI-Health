import { type ReactNode } from "react";
import {
  conceptText,
  dateText,
  type ChartData,
  type Observation,
} from "../data/fhir";
import { TrendChart } from "./TrendChart";

function DenseTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: { id: string; cells: ReactNode[] }[];
}) {
  if (rows.length === 0)
    return <div className="empty-state">No records available.</div>;
  return (
    <div className="table-scroll">
      <table className="dense-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, index) => (
                <td key={index}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function observationValue(item: Observation): string {
  if (item.component)
    return (
      item.component
        .map((part) => `${part.valueQuantity?.value ?? "—"}`)
        .join(" / ") + ` ${item.component[0]?.valueQuantity?.unit ?? ""}`
    );
  return item.valueQuantity
    ? `${item.valueQuantity.value ?? "—"} ${item.valueQuantity.unit ?? ""}`
    : (item.valueString ?? "—");
}

/** Display-only mapping of InfoId to validated FHIR projections. */
export function InfoRenderer({
  info,
  data,
}: {
  info: string;
  data: ChartData;
}) {
  switch (info) {
    case "allergyList":
      return (
        <DenseTable
          headers={["Allergen", "Reaction", "Severity", "Status", "Recorded"]}
          rows={data.resources
            .filter(
              (resource) => resource.resourceType === "AllergyIntolerance",
            )
            .map((item) => ({
              id: item.id,
              cells: [
                <strong className="allergy-text">
                  {conceptText(item.code)}
                </strong>,
                item.reaction
                  ?.flatMap((reaction) =>
                    reaction.manifestation.map(conceptText),
                  )
                  .join("; ") ?? "—",
                item.reaction
                  ?.map((reaction) => reaction.severity)
                  .join(", ") ?? "—",
                conceptText(item.clinicalStatus),
                dateText(item.recordedDate),
              ],
            }))}
        />
      );
    case "currentMeds":
      return (
        <DenseTable
          headers={["Medication", "Directions", "Status", "Ordered"]}
          rows={data.resources
            .filter((resource) => resource.resourceType === "MedicationRequest")
            .filter((resource) => resource.status === "active")
            .map((item) => ({
              id: item.id,
              cells: [
                <strong>
                  {conceptText(item.medicationCodeableConcept) === "—"
                    ? (item.medicationReference?.display ?? "—")
                    : conceptText(item.medicationCodeableConcept)}
                </strong>,
                item.dosageInstruction?.map((dose) => dose.text).join("; ") ??
                  "—",
                item.status,
                dateText(item.authoredOn),
              ],
            }))}
        />
      );
    case "vitals":
      return (
        <DenseTable
          headers={["Vital sign", "Value", "Recorded", "Source"]}
          rows={data.resources
            .filter((resource) => resource.resourceType === "Observation")
            .filter((resource) =>
              resource.category?.some((category) =>
                category.coding?.some((code) => code.code === "vital-signs"),
              ),
            )
            .sort((a, b) =>
              (b.effectiveDateTime ?? "").localeCompare(
                a.effectiveDateTime ?? "",
              ),
            )
            .map((item) => ({
              id: item.id,
              cells: [
                conceptText(item.code),
                <strong>{observationValue(item)}</strong>,
                dateText(item.effectiveDateTime),
                `Observation/${item.id}`,
              ],
            }))}
        />
      );
    case "resultTrend": {
      const labs = data.resources
        .filter((resource) => resource.resourceType === "Observation")
        .filter((resource) =>
          resource.category?.some((category) =>
            category.coding?.some((code) => code.code === "laboratory"),
          ),
        );
      const groups = new Map<string, Observation[]>();
      for (const item of labs) {
        const key = `${item.code.coding?.[0]?.code ?? conceptText(item.code)}|${item.valueQuantity?.unit ?? ""}`;
        groups.set(key, [...(groups.get(key) ?? []), item]);
      }
      return (
        <div>
          {[...groups].map(([key, observations]) => (
            <TrendChart
              key={key}
              label={conceptText(observations[0]?.code)}
              observations={observations}
            />
          ))}
          <DenseTable
            headers={["Test", "Result", "Reference", "Date", "Flag"]}
            rows={[...labs]
              .sort((a, b) =>
                (b.effectiveDateTime ?? "").localeCompare(
                  a.effectiveDateTime ?? "",
                ),
              )
              .map((item) => ({
                id: item.id,
                cells: [
                  conceptText(item.code),
                  observationValue(item),
                  item.referenceRange
                    ?.map(
                      (range) =>
                        range.text ??
                        `${range.low?.value ?? ""}–${range.high?.value ?? ""}`,
                    )
                    .join("; ") ?? "—",
                  dateText(item.effectiveDateTime),
                  item.interpretation?.map(conceptText).join(", ") ?? "—",
                ],
              }))}
          />
        </div>
      );
    }
    case "problemList":
      return (
        <DenseTable
          headers={["Problem / diagnosis", "Status", "Onset"]}
          rows={data.resources
            .filter((resource) => resource.resourceType === "Condition")
            .map((item) => ({
              id: item.id,
              cells: [
                <strong>{conceptText(item.code)}</strong>,
                conceptText(item.clinicalStatus),
                dateText(item.onsetDateTime ?? item.recordedDate),
              ],
            }))}
        />
      );
    case "immunizations":
      return (
        <DenseTable
          headers={["Vaccine", "Administered", "Status", "Lot", "Site"]}
          rows={data.resources
            .filter((resource) => resource.resourceType === "Immunization")
            .map((item) => ({
              id: item.id,
              cells: [
                conceptText(item.vaccineCode),
                dateText(item.occurrenceDateTime),
                item.status,
                item.lotNumber ?? "—",
                conceptText(item.site),
              ],
            }))}
        />
      );
    case "growthChart": {
      const observations = data.resources.filter(
        (resource) => resource.resourceType === "Observation",
      );
      const weights = observations.filter((item) =>
        item.code.coding?.some((code) => code.code === "29463-7"),
      );
      const heights = observations.filter((item) =>
        item.code.coding?.some((code) => code.code === "8302-2"),
      );
      return (
        <>
          <p className="subtle">
            Recorded growth measurements. Percentiles require an
            interpreter-provided reference dataset.
          </p>
          <TrendChart observations={weights} label="Body weight" />
          <TrendChart observations={heights} label="Body height" />
        </>
      );
    }
    case "encounters":
      return (
        <DenseTable
          headers={["Date", "Encounter", "Organization", "Status"]}
          rows={data.resources
            .filter((resource) => resource.resourceType === "Encounter")
            .sort((a, b) =>
              (b.period?.start ?? "").localeCompare(a.period?.start ?? ""),
            )
            .map((item) => ({
              id: item.id,
              cells: [
                dateText(item.period?.start),
                item.type?.map(conceptText).join("; ") ?? "—",
                item.serviceProvider?.display ?? "—",
                item.status,
              ],
            }))}
        />
      );
    default:
      return (
        <div className="empty-state">
          No FHIR display adapter registered for “{info}”.
        </div>
      );
  }
}
