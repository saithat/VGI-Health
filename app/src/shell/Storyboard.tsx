import type { ReactNode } from "react";
import { conceptText, dateText, type ChartData } from "../data/fhir";

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="story-section">
      <h3>
        {title}
        <span>{count}</span>
      </h3>
      {children}
    </section>
  );
}
export function Storyboard({ data }: { data: ChartData }) {
  const problems = data.resources.filter(
    (item) => item.resourceType === "Condition",
  );
  const medications = data.resources
    .filter((item) => item.resourceType === "MedicationRequest")
    .filter((item) => item.status === "active");
  const vitals = data.resources
    .filter((item) => item.resourceType === "Observation")
    .filter((item) =>
      item.category?.some((category) =>
        category.coding?.some((code) => code.code === "vital-signs"),
      ),
    );
  const encounters = data.resources
    .filter((item) => item.resourceType === "Encounter")
    .sort((a, b) =>
      (b.period?.start ?? "").localeCompare(a.period?.start ?? ""),
    );
  const appointments = data.resources.filter(
    (item) => item.resourceType === "Appointment",
  );
  const orders = data.resources.filter(
    (item) => item.resourceType === "ServiceRequest",
  );
  return (
    <aside className="storyboard" aria-label="Patient storyboard">
      <div className="story-title">
        <span>CHART AT A GLANCE</span>
        <strong>Longitudinal record</strong>
      </div>
      <Section title="Active problems" count={problems.length}>
        <ul>
          {problems.map((item) => (
            <li key={item.id}>
              <span className="status-dot" />
              {conceptText(item.code)}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Current medications" count={medications.length}>
        <ul>
          {medications.map((item) => (
            <li key={item.id}>
              <strong>{conceptText(item.medicationCodeableConcept)}</strong>
              <small>{item.dosageInstruction?.[0]?.text}</small>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Recent vitals" count={vitals.length}>
        <div className="vitals-mini">
          {vitals.map((item) => (
            <div key={item.id}>
              <span>{conceptText(item.code)}</span>
              <strong>
                {item.component
                  ? item.component
                      .map((part) => part.valueQuantity?.value)
                      .join("/")
                  : (item.valueQuantity?.value ?? "—")}{" "}
                <small>
                  {item.valueQuantity?.unit ??
                    item.component?.[0]?.valueQuantity?.unit}
                </small>
              </strong>
            </div>
          ))}
        </div>
        <small className="subtle">
          Recorded {dateText(vitals[0]?.effectiveDateTime)}
        </small>
      </Section>
      <Section title="Last visit" count={encounters.length}>
        <p>
          {dateText(encounters[0]?.period?.start)}
          <small>
            {encounters[0]?.type?.map(conceptText).join(", ") ??
              "No prior encounter"}
          </small>
        </p>
      </Section>
      <Section title="Upcoming appointments" count={appointments.length}>
        <ul>
          {appointments.map((item) => (
            <li key={item.id}>
              <strong>{dateText(item.start)}</strong>
              <small>{item.description ?? item.status}</small>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Open orders" count={orders.length}>
        <ul>
          {orders.map((item) => (
            <li key={item.id}>
              {conceptText(item.code)}
              <small>
                {dateText(item.authoredOn)} · {item.status}
              </small>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Chart advisories" count={data.context.careGaps.length}>
        <ul>
          {data.context.careGaps.map((gap) => (
            <li className="care-gap" key={gap}>
              ◷ {gap}
            </li>
          ))}
        </ul>
        <small className="subtle">
          Display metadata · safety alerts come from the interpreter
        </small>
      </Section>
    </aside>
  );
}
