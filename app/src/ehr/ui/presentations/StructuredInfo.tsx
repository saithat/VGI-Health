import type { ReactNode } from "react";
import type { UiPresentationKind } from "../../../../../lean/generated/ehr-types";
import type { NodeOf, Pair } from "../types";
import { DisplayValue, statusTone } from "../display";
import {
  formatMedicationDirections,
  emptyInfoText,
  sectionCaption,
} from "../clinical-display";
import {
  clinicalTime,
  observationValue,
  resultTone,
  displayRows,
  columnCaption,
  internalSource,
} from "../clinical-formatters";
import { ClinicalChart } from "./charts";
import { MarGrid } from "./MarGrid";
import "./presentations.css";

export type Info = NodeOf<"info">;
export type RowActions = ReadonlyMap<number, ReactNode>;

/** Color decorates source text. It never determines a clinical value. */
export function suppliedTone(value: string): string | undefined {
  const tone = statusTone(value);
  return tone === "yellow" ? "amber" : tone === "gray" ? "neutral" : tone;
}
export function SuppliedStatus({ value }: { value: string }) {
  const tone = suppliedTone(value);
  return (
    <span
      className={
        tone
          ? `clinical-status status-${statusTone(value)} presentation-status tone-${tone}`
          : undefined
      }
    >
      <DisplayValue value={value || "—"} />
    </span>
  );
}
function isStatus(key: string, kind: UiPresentationKind): boolean {
  return (
    /status|priority|confirmation|review state|scheduled|administration|^\d{1,2}:\d{2}|^flag$|^acuity$|^labs$|^imaging$/i.test(
      key,
    ) ||
    (kind === "timeGrid" &&
      !["Medication", "Dose", "Route", "Frequency"].includes(key))
  );
}
/** Preserve every key and duplicate cell; header order comes directly from Lean. */
export function RecordTable({
  node,
  kind,
  actions,
}: {
  node: Info;
  kind: UiPresentationKind;
  actions?: RowActions | undefined;
}) {
  const columns = [
    ...new Set(node.rows.flatMap((row) => row.map(([key]) => key))),
  ];
  if (!node.rows.length)
    return (
      <table className="presentation-table" aria-label={node.label}>
        <tbody>
          <tr>
            <td>No records on file</td>
          </tr>
        </tbody>
      </table>
    );
  if (columns.length === 0) columns.push("Record");
  return (
    <div className="presentation-table-wrap">
      <table
        className={`presentation-table table-${kind}${actions?.size ? " with-row-actions" : ""}`}
        data-columns={columns.length}
        data-medication-grid={
          columns.some((column) => /^(medication|drug)$/i.test(column)) ||
          undefined
        }
        aria-label={node.label}
      >
        <thead>
          <tr>
            {(columns.length ? columns : ["Record"]).map((key) => (
              <th key={key} scope="col" data-column={key}>
                <span title={key} aria-label={key}>
                  {columnCaption(clinicalTime(key))}
                </span>
              </th>
            ))}
            {!!actions?.size && (
              <th scope="col" data-column="Actions">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {node.rows.length === 0 ? (
            <tr>
              <td>No records on file</td>
            </tr>
          ) : (
            displayRows(node.rows, !actions?.size).map(
              ({ cells: row, source, index: i }) => (
                <tr
                  key={i}
                  className={
                    resultTone(row.find(([key]) => key === "Flag")?.[1] ?? "")
                      ? `result-${resultTone(row.find(([key]) => key === "Flag")?.[1] ?? "")}`
                      : undefined
                  }
                  title={source
                    .flat()
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" · ")}
                  aria-label={source
                    .flat()
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" · ")}
                  onClick={
                    actions?.get(i)
                      ? (event) => {
                          if (
                            event.target instanceof Element &&
                            event.target.closest(
                              "button, a, input, select, textarea, label, [role=combobox], [contenteditable=true]",
                            )
                          )
                            return;
                          const controls =
                            event.currentTarget.querySelectorAll<HTMLElement>(
                              "button[data-event]:not(:disabled), input[data-event]:not(:disabled), select[data-event]:not(:disabled), textarea[data-event]:not(:disabled)",
                            );
                          const control = controls[0];
                          if (
                            controls.length === 1 &&
                            control?.matches('button[data-event="click"]') &&
                            control.closest(".clinical-navigation-action")
                          )
                            control.click();
                        }
                      : undefined
                  }
                >
                  {columns.map((key, c) => {
                    const values = row
                      .filter(([name]) => name === key)
                      .map(([, value]) => value);
                    return (
                      <td
                        key={key}
                        data-column={key}
                        data-first={c === 0 || undefined}
                      >
                        {values.length ? (
                          values.map((value, n) => (
                            <span className="presentation-cell-value" key={n}>
                              {key === "Text" || key === "Title" ? (
                                value
                              ) : /^acuity$|^ESI$/i.test(key) &&
                                /^(?:ESI\s*)?[1-5]$/i.test(value) ? (
                                <span
                                  className={`presentation-status esi-${value.replace(/\D/g, "")}`}
                                  title={value}
                                  aria-label={value}
                                >
                                  ESI {value.replace(/\D/g, "")}
                                </span>
                              ) : isStatus(key, kind) ? (
                                <>
                                  <span
                                    className="clinical-status-icon"
                                    aria-hidden="true"
                                  >
                                    {/^labs$|^imaging$/i.test(key)
                                      ? /^(final|resulted|completed|results? available|report available)$/i.test(
                                          value,
                                        )
                                        ? "✓ "
                                        : /^(pending|requested|ordered)$/i.test(
                                              value,
                                            )
                                          ? "◷ "
                                          : ""
                                      : ""}
                                  </span>
                                  <SuppliedStatus value={value} />
                                </>
                              ) : (kind === "trackBoard" &&
                                  key === "Arrival") ||
                                ((kind === "schedule" ||
                                  kind === "orSchedule") &&
                                  /^(Time|Start)$/i.test(key)) ? (
                                <span title={value} aria-label={value}>
                                  {clinicalTime(value)}
                                </span>
                              ) : key === "Source" && internalSource(value) ? (
                                <span title={value} aria-label={value}>
                                  {columnCaption(value) === value
                                    ? "Source details"
                                    : columnCaption(value)}
                                </span>
                              ) : node.infoId === "currentMeds" &&
                                key === "Instructions" ? (
                                <span title={value} aria-label={value}>
                                  {formatMedicationDirections(
                                    row.find(
                                      ([name]) => name === "Medication",
                                    )?.[1] ?? "",
                                    value,
                                  ) || "—"}
                                </span>
                              ) : (
                                <span title={value} aria-label={value}>
                                  <DisplayValue
                                    value={
                                      (kind !== "growth" &&
                                        /^(value|result)$/i.test(key)) ||
                                      (kind === "flowsheet" &&
                                        clinicalTime(key) !== key)
                                        ? observationValue(value) || "—"
                                        : value || "—"
                                    }
                                  />
                                </span>
                              )}
                            </span>
                          ))
                        ) : (
                          <span className="presentation-missing">—</span>
                        )}
                      </td>
                    );
                  })}
                  {!!actions?.size && (
                    <td data-column="Actions">
                      <div className="presentation-row-actions">
                        {actions.get(i)}
                      </div>
                    </td>
                  )}
                </tr>
              ),
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
/** Patient measurements and published reference rows serve different reading tasks. */
function GrowthRecords({ node }: { node: Info }) {
  const reference = (row: Pair[]) =>
    row.some(([key, value]) => key === "Percentile" && value !== "");
  const measurements = node.rows.filter((row) => !reference(row));
  const references = node.rows.filter(reference);
  return (
    <>
      <h4 className="presentation-subheading">Recorded Measurements</h4>
      <RecordTable node={{ ...node, rows: measurements }} kind="growth" />
      {references.length > 0 && (
        <>
          <h4 className="presentation-subheading">Reference Curve Data</h4>
          <RecordTable
            node={{
              ...node,
              label: `${node.label} reference data`,
              rows: references,
            }}
            kind="growth"
          />
        </>
      )}
    </>
  );
}
function FolderList({
  node,
  actions,
}: {
  node: Info;
  actions?: RowActions | undefined;
}) {
  return (
    <ul className="presentation-folders" aria-label={node.label}>
      {node.rows.length === 0 && <li>No records on file</li>}
      {node.rows.map((row, i) => (
        <li key={i}>
          {row.map(([key, value], j) => (
            <span
              key={`${key}-${j}`}
              className={
                key === "Folder"
                  ? "presentation-folder-name"
                  : key === "Count" || key === "Unread"
                    ? "presentation-folder-count"
                    : "presentation-folder-detail"
              }
            >
              {key !== "Folder" && (
                <span className="presentation-field-label">{key} </span>
              )}
              {key === "Status" ? (
                <SuppliedStatus value={value} />
              ) : (
                <DisplayValue value={value || "—"} />
              )}
            </span>
          ))}
          {actions?.get(i) && (
            <div className="presentation-row-actions">{actions.get(i)}</div>
          )}
        </li>
      ))}
    </ul>
  );
}
/** Imported provenance stays visible in secondary typography. No characters are removed. */
export function NoteTitle({ value }: { value: string }) {
  const metadata =
    / Source date \d{4}-\d{2}-\d{2}; structured dates shifted [+-]?\d+ days\. Note text retained verbatim\.?$/.exec(
      value,
    );
  if (!metadata) return value;
  return (
    <>
      {value.slice(0, metadata.index)}
      <span className="presentation-note-provenance">
        {value.slice(metadata.index)}
      </span>
    </>
  );
}
function NoteCards({ node }: { node: Info }) {
  return (
    <ul className="presentation-notes" aria-label={node.label}>
      {node.rows.length === 0 && <li>No records on file</li>}
      {node.rows.map((row, i) => (
        <li
          key={i}
          aria-label={row.map(([key, value]) => `${key}: ${value}`).join(" · ")}
        >
          <dl>
            {row.map(([key, value], j) => (
              <div
                key={`${key}-${j}`}
                className={
                  key === "Text"
                    ? "presentation-note-body"
                    : key === "Title"
                      ? "presentation-note-title"
                      : "presentation-note-detail"
                }
              >
                <dt>{key}</dt>
                <dd>
                  {key === "Status" ? (
                    <SuppliedStatus value={value} />
                  ) : key === "Text" ? (
                    value || "—"
                  ) : key === "Title" ? (
                    <NoteTitle value={value || "—"} />
                  ) : (
                    <DisplayValue value={value || "—"} />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
/** A source-declared current document shares the structured information painter. */
export function ClinicalDocument({ node }: { node: Info }) {
  return (
    <div
      className="clinical-info info-document"
      data-comp-id={node.comp || undefined}
      data-info-id={node.infoId}
    >
      <h3 className="clinical-info-label">{node.label}</h3>
      <div
        role="region"
        aria-label={node.label}
        tabIndex={0}
        className="clinical-document-body"
      >
        {node.rows.map((row, index) => (
          <div className="clinical-document-section" key={index}>
            {row.map(([key, value], cell) =>
              key === "Section" ? (
                <h4 key={cell}>{value}</h4>
              ) : key === "Text" ? (
                <div key={cell} className="clinical-document-text">
                  {value}
                </div>
              ) : (
                <div key={cell} className="clinical-document-detail">
                  <span>{key}: </span>
                  <span>{value}</span>
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
export function StructuredInfo({
  node,
  kind,
  actions,
}: {
  node: Info;
  kind: UiPresentationKind;
  actions?: RowActions | undefined;
}) {
  return (
    <div
      className={`clinical-info clinical-presentation presentation-${kind}`}
      data-comp-id={node.comp || undefined}
      data-info-id={node.infoId}
    >
      <h3 className="presentation-heading" title={node.label}>
        {sectionCaption(node.label)}
      </h3>
      {node.rows.length === 0 ? (
        <p
          role="note"
          aria-label={node.label}
          className="clinical-empty presentation-empty"
        >
          {emptyInfoText(node.infoId)}
        </p>
      ) : kind === "folderList" ? (
        <FolderList node={node} actions={actions} />
      ) : kind === "notes" ? (
        <NoteCards node={node} />
      ) : (
        <>
          {(kind === "trend" || kind === "growth") && (
            <ClinicalChart node={node} kind={kind} />
          )}
          {kind === "timeGrid" ? (
            <MarGrid node={node} actions={actions} />
          ) : kind === "growth" ? (
            <GrowthRecords node={node} />
          ) : (
            <RecordTable node={node} kind={kind} actions={actions} />
          )}
        </>
      )}
    </div>
  );
}
export function rowValue(row: Pair[], key: string): string {
  return row.find(([name]) => name === key)?.[1] ?? "";
}
