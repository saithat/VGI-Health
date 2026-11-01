import { useState } from "react";
import { TextInput } from "@mantine/core";
import { ClinicalIcon } from "../ehr/ui/Icons";
import { formatDisplayValue } from "../ehr/ui/display";
import type { Catalog, Patient } from "./data";
import "./browser.css";

const sourceName = (source: string) =>
  source === "synthetic-hospital" ? "Synthetic Hospital" : "Synthea";
const flagsFor = (patient: Patient) => [
  ...Object.entries(patient.flags)
    .filter(([, enabled]) => enabled)
    .map(([flag]) => flag),
  ...(patient.encounterClass === "EMER" ? ["ED"] : []),
  ...(patient.encounterClass === "IMP" ? ["inpatient"] : []),
];

export function PatientPicker({
  catalog,
  value,
  onChange,
}: {
  catalog: Catalog;
  value: string;
  onChange: (patient: Patient) => void;
}) {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [flags, setFlags] = useState<string[]>([]);
  const patients = catalog.patients.filter(
    (patient) =>
      `${patient.name} ${patient.mrn ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!source || patient.source === source) &&
      flags.every((flag) => flagsFor(patient).includes(flag)),
  );
  const selected = catalog.patients.find((patient) => patient.id === value);
  return (
    <section className="patient-picker" aria-label="Choose a patient">
      <div className="browser-section-heading">
        <ClinicalIcon name="user" />
        <h2>Patient</h2>
        <span>{catalog.patients.length} synthetic charts</span>
      </div>
      <TextInput
        type="search"
        label="Search by name or MRN"
        value={search}
        leftSection={<ClinicalIcon name="search" />}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />
      <div className="patient-filters" aria-label="Patient source">
        {[
          ["", "All sources"],
          ["synthea", "Synthea"],
          ["synthetic-hospital", "Synthetic Hospital"],
        ].map(([id, label]) => (
          <button
            type="button"
            className="filter-chip"
            key={id}
            aria-pressed={source === id}
            disabled={source === id}
            title={source === id ? "Current patient source" : undefined}
            onClick={() => setSource(id ?? "")}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="patient-filters" aria-label="Patient filters">
        {[
          "pediatric",
          "allergic",
          "anticoagulated",
          "surgical",
          "ED",
          "inpatient",
        ].map((flag) => (
          <button
            type="button"
            className="filter-chip"
            key={flag}
            aria-pressed={flags.includes(flag)}
            onClick={() =>
              setFlags((current) =>
                current.includes(flag)
                  ? current.filter((item) => item !== flag)
                  : [...current, flag],
              )
            }
          >
            {flag}
          </button>
        ))}
      </div>
      <p className="patient-match-count" role="status">
        {patients.length} matching patients
      </p>
      <div
        className="patient-cards"
        role="group"
        aria-label="Matching patients"
      >
        {patients.map((patient) => (
          <button
            type="button"
            className="patient-card"
            key={patient.id}
            aria-pressed={value === patient.id}
            disabled={value === patient.id}
            title={value === patient.id ? "Selected patient" : undefined}
            onClick={() => onChange(patient)}
          >
            <strong>{patient.name}</strong>
            <span>
              {patient.age} years · {patient.sex} · MRN{" "}
              {patient.mrn ?? "not recorded"}
            </span>
            <span className="patient-card-tags">
              {flagsFor(patient).map((flag) => (
                <span
                  key={flag}
                  className={`browser-badge ${flag === "allergic" ? "warning" : "info"}`}
                >
                  {flag}
                </span>
              ))}
            </span>
          </button>
        ))}
        {!patients.length && <p>No patients match these filters.</p>}
      </div>
      {selected && (
        <div className="selected-patient" aria-label="Selected patient summary">
          <span className="browser-eyebrow">SELECTED CHART</span>
          <h3>{selected.name}</h3>
          <p>
            {selected.age} years · {selected.sex} ·{" "}
            {sourceName(selected.source)}
          </p>
          <dl>
            <div>
              <dt>Allergies</dt>
              <dd className={selected.allergies.length ? "allergy-text" : ""}>
                {selected.allergies.join(", ") || "No allergy records on file"}
              </dd>
            </div>
            <div>
              <dt>Problems on file</dt>
              <dd>{selected.problems.join(" · ") || "No problems on file"}</dd>
            </div>
            <div>
              <dt>Latest recorded weight</dt>
              <dd>
                {selected.weight ? (
                  <>
                    {selected.weight.value}
                    <br />
                    <span className="browser-muted">
                      {formatDisplayValue(selected.weight.date) ||
                        "Date not recorded"}
                    </span>
                  </>
                ) : (
                  "Not recorded"
                )}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
