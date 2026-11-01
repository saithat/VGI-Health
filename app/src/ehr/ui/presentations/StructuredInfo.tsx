import type { ReactNode } from "react";
import type { UiPresentationKind } from "../../../../../lean/generated/ehr-types";
import type { NodeOf, Pair } from "../types";
import { DisplayValue, statusTone } from "../display";
import { emptyInfoText, formatMedicationDirections } from "../clinical-display";
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
                {key}
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
            node.rows.map((row, i) => (
              <tr
                key={i}
                aria-label={row
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(" · ")}
                title={row
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(" · ")}
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
                            {isStatus(key, kind) ? (
                              <SuppliedStatus value={value} />
                            ) : key === "Text" || key === "Title" ? (
                              value || "—"
                            ) : (
                              <span title={value} aria-label={value}>
                                {node.infoId === "currentMeds" &&
                                key === "Instructions" ? (
                                  formatMedicationDirections(
                                    row.find(
                                      ([name]) => name === "Medication",
                                    )?.[1] ?? "",
                                    value,
                                  ) || "—"
                                ) : (
                                  <DisplayValue value={value || "—"} />
                                )}
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
            ))
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
      <h4 className="presentation-subheading">Recorded measurements</h4>
      <RecordTable node={{ ...node, rows: measurements }} kind="growth" />
      {references.length > 0 && (
        <>
          <h4 className="presentation-subheading">Reference curve data</h4>
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
      <h3 className="presentation-heading">{node.label}</h3>
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
