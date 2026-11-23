import { useState } from "react";
import { releaseLabel } from "../../../scripts/historical-releases.mjs";
import type { DecisionRecord } from "./agent-evidence";
import type { RunData } from "./data";
import { personas } from "./WorkflowComplexity";
import { Certificate } from "./Certificate";
const releaseNames: Record<string, string> = {
  v2: "Prior authorization",
  v3: "Antibiotic indication policy",
};
/** Recorded kept customizations read "night N: a.; b."; show one item per change. */
function customizationItems(entries: string[]) {
  return entries.map((entry) => {
    const match = /^(night \d+):\s*(.*)$/i.exec(entry);
    return {
      night: match?.[1] ?? "",
      items: (match?.[2] ?? entry)
        .split(/;\s+/)
        .map((item) => item.trim())
        .filter(Boolean),
    };
  });
}
export function Releases({
  run,
  open,
}: {
  run: RunData;
  open: (record: DecisionRecord) => void;
}) {
  const releaseIds = ["v2", "v3"];
  const find = (persona: string, release: string) =>
    run.records.find(
      (r) =>
        r.persona === persona &&
        r.release &&
        releaseLabel(r.release.id, run.manifest.runId) === release,
    );
  const cells = personas.flatMap((p) =>
    releaseIds.flatMap((release) => {
      const record = find(p.id, release);
      return record ? [{ persona: p, release, record }] : [];
    }),
  );
  const [selected, setSelected] = useState(
    () =>
      (
        cells.find((c) => c.record.release?.recheck.status === "fail") ??
        cells[0]
      )?.record ?? null,
  );
  const detail = cells.find((c) => c.record === selected);
  return (
    <div className="releases">
      <div className="release-summary">
        {releaseIds.map((release) => {
          const here = cells.filter((c) => c.release === release);
          const failed = here.filter(
            (c) => c.record.release?.recheck.status === "fail",
          ).length;
          const certified = here.filter((c) => c.record.certificate).length;
          return (
            <div key={release} className="summary-tile">
              <span className="summary-label">
                {release} · {releaseNames[release] ?? "Vendor release"}
              </span>
              <strong className="summary-value">
                {here.length
                  ? `${certified} of ${here.length} re-certified`
                  : "Not reached"}
              </strong>
              <span className="summary-detail">
                {here.length
                  ? failed
                    ? `Old UI failed the new rules for ${failed} of ${here.length} personas, so each was migrated`
                    : `Old UI already met the new rules for all ${here.length} personas`
                  : "No persona reached this release in this run"}
              </span>
            </div>
          );
        })}
      </div>
      <table className="release-grid">
        <caption>
          Did each persona’s existing UI pass the new release, and is the result
          certified? Select a cell for details.
        </caption>
        <thead>
          <tr>
            <th scope="col">Persona</th>
            {releaseIds.map((release) => (
              <th key={release} scope="col">
                {release} · {releaseNames[release] ?? "Vendor release"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {personas.map((p) => (
            <tr key={p.id}>
              <th scope="row">
                {p.name} <span className="page-heading-id">{p.id}</span>
              </th>
              {releaseIds.map((release) => {
                const r = find(p.id, release);
                if (!r)
                  return (
                    <td key={release} className="release-cell-empty">
                      No migration recorded
                    </td>
                  );
                const passed = r.release?.recheck.status === "pass";
                const kept = customizationItems(
                  r.release?.customizationsKept ?? [],
                ).reduce((n, k) => n + k.items.length, 0);
                const dropped = r.release?.customizationsDropped.length ?? 0;
                return (
                  <td key={release}>
                    <div
                      className={`release-cell ${selected === r ? "selected" : ""}`}
                    >
                      <button
                        className="release-cell-select"
                        aria-pressed={selected === r}
                        onClick={() => setSelected(r)}
                      >
                        <span className={passed ? "flat" : "migrated"}>
                          {passed ? "Old UI passed" : "Old UI failed"}
                        </span>
                        <span className={r.certificate ? "status-ok" : ""}>
                          {r.certificate
                            ? `✓ Certified ${releaseLabel(r.certificate.specVersion, run.manifest.runId)}`
                            : r.certification.result}
                        </span>
                        <span className="effect-caption">
                          {kept
                            ? `${kept} customization${kept === 1 ? "" : "s"} kept`
                            : "No customizations to carry"}
                          {dropped ? ` · ${dropped} dropped` : ""}
                        </span>
                      </button>
                      <button
                        className="release-replay"
                        aria-label={`Inspect ${p.id} ${release} migration`}
                        title="Replay before / after on screen"
                        onClick={() => open(r)}
                      >
                        Replay
                      </button>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {detail && (
        <section className="release-detail" aria-label="Migration details">
          <h3>
            {detail.persona.name} · {detail.release}{" "}
            {releaseNames[detail.release] ?? "release"}
          </h3>
          <div className="release-detail-grid">
            <div>
              <h4>
                {detail.record.release?.recheck.status === "pass"
                  ? "Why no migration was needed"
                  : "What the migration changed"}
              </h4>
              <p>
                {detail.record.chosen?.rationale ?? detail.record.hypothesis}
              </p>
              {detail.record.release?.recheck.status === "fail" &&
                detail.record.release.recheck.property && (
                  <p className="effect-caption">
                    Old UI broke rule{" "}
                    <strong>{detail.record.release.recheck.property}</strong>
                  </p>
                )}
              <button onClick={() => open(detail.record)}>
                Replay before / after
              </button>
            </div>
            <div>
              <h4>Customizations kept</h4>
              {detail.record.release?.customizationsKept.length ? (
                customizationItems(
                  detail.record.release.customizationsKept,
                ).map((k, i) => (
                  <div key={i} className="kept-group">
                    {k.night && (
                      <span className="effect-caption">{k.night}</span>
                    )}
                    <ul>
                      {k.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="effect-caption">
                  None — this persona had no customizations yet.
                </p>
              )}
              <h4>Dropped</h4>
              {detail.record.release?.customizationsDropped.length ? (
                <ul>
                  {detail.record.release.customizationsDropped.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="effect-caption">Nothing dropped.</p>
              )}
              <Certificate record={detail.record} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
