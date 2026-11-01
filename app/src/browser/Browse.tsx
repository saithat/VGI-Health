import { useEffect, useState } from "react";
import {
  currentProgram,
  defaultPatient,
  ehrUrl,
  loadCatalog,
  personas,
  type Catalog,
  type Patient,
} from "./data";

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
      patient.name.toLowerCase().includes(search.toLowerCase()) &&
      (!source || patient.source === source) &&
      flags.every((flag) =>
        Object.entries(patient.flags).some(
          ([name, enabled]) => name === flag && enabled,
        ),
      ),
  );
  return (
    <fieldset className="patient-picker">
      <legend>
        Patient · {catalog.patients.length} committed synthetic patients
      </legend>
      <label>
        Search by name{" "}
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
      </label>
      <label>
        Data source{" "}
        <select aria-label="Patient source" value={source}
          onChange={(event) => setSource(event.currentTarget.value)}>
          <option value="">All sources</option>
          <option value="synthea">Synthea</option>
          <option value="synthetic-hospital">Synthetic Hospital</option>
        </select>
      </label>
      <div className="patient-filters">
        {["pediatric", "allergic", "anticoagulated", "surgical"].map((flag) => (
          <label key={flag}>
            <input
              type="checkbox"
              checked={flags.includes(flag)}
              onChange={() =>
                setFlags((current) =>
                  current.includes(flag)
                    ? current.filter((item) => item !== flag)
                    : [...current, flag],
                )
              }
            />
            {flag}
          </label>
        ))}
      </div>
      <label>
        {patients.length} matching patients{" "}
        <select
          aria-label="Patient"
          value={value}
          onChange={(event) => {
            const patient = catalog.patients.find(
              (patient) => patient.id === event.currentTarget.value,
            );
            if (patient) onChange(patient);
          }}
        >
          {!patients.some((patient) => patient.id === value) && (
            <option value={value}>Selected patient (outside filter)</option>
          )}
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name} · {patient.age} · {patient.sex} ·{" "}
              {patient.encounterClass} · {patient.source === "synthetic-hospital" ? "Synthetic Hospital" : "Synthea"}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}

export function Browse() {
  const query = new URLSearchParams(window.location.search);
  const [catalog, setCatalog] = useState<Catalog>();
  const [patient, setPatient] = useState(query.get("patient") ?? "");
  const [persona, setPersona] = useState(query.get("persona") ?? "P1");
  const [run, setRun] = useState(query.get("run") ?? "");
  const [error, setError] = useState("");
  useEffect(() => {
    loadCatalog()
      .then((data) => {
        setCatalog(data);
        setPatient((current) =>
          data.patients.some((patient) => patient.id === current)
            ? current
            : defaultPatient(data, persona).id,
        );
      })
      .catch((error: unknown) => setError(String(error)));
  }, [persona]);
  if (error) return <p role="alert">{error}</p>;
  if (!catalog) return <p>Loading offline UI catalog…</p>;
  const groups = [...new Set(catalog.programs.map((program) => program.group))];
  return (
    <main className="browser-page">
      <nav>
        <strong>VGI HEALTH · UI browser</strong>
        <a href="/dashboard">Recorded dashboard</a>
      </nav>
      <h1>Open a clinical UI</h1>
      <p>
        {catalog.programs.length} programs · real Lean WASM · local fixtures ·
        record date {catalog.referenceDate}
      </p>
      <PatientPicker
        catalog={catalog}
        value={patient}
        onChange={(selected) => setPatient(selected.id)}
      />
      <label>
        Acting persona{" "}
        <select
          aria-label="Acting persona"
          value={persona}
          onChange={(event) => {
            setPersona(event.currentTarget.value);
            setPatient(defaultPatient(catalog, event.currentTarget.value).id);
          }}
        >
          {personas.map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
      </label>
      <label>
        Current program source{" "}
        <select
          aria-label="Current program source"
          value={run}
          onChange={(event) => setRun(event.currentTarget.value)}
        >
          <option value="">v1 persona projection</option>
          {[
            ...new Set(
              catalog.programs.flatMap((program) =>
                program.run ? [program.run] : [],
              ),
            ),
          ].map((id) => (
            <option key={id} value={id}>
              {id}
              {catalog.programs.some(
                (program) => program.run === id && program.mock,
              )
                ? " · MOCK authored"
                : ""}
            </option>
          ))}
        </select>
      </label>
      <p>
        <a
          href={ehrUrl(
            currentProgram(catalog, persona, run || null),
            patient,
            persona,
          )}
        >
          Open {persona}’s current program →
        </a>
      </p>
      <div className="program-groups">
        {groups.map((group) => (
          <section key={group}>
            <h2>{group}</h2>
            <ul>
              {catalog.programs
                .filter((program) => program.group === group)
                .map((program) => (
                  <li key={program.path}>
                    <a
                      href={ehrUrl(
                        program,
                        patient,
                        program.label === "Canonical source"
                          ? persona
                          : program.persona,
                      )}
                    >
                      {program.label}
                    </a>
                    <small>
                      {program.path} · {program.release}
                    </small>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
