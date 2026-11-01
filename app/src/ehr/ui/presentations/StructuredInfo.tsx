import type { ReactNode } from "react";
import type { UiPresentationKind } from "../../../../../lean/generated/ehr-types";
import type { NodeOf, Pair } from "../types";
import { DisplayValue } from "../display";
import { ClinicalChart } from "./charts";
import { MarGrid } from "./MarGrid";
import "./presentations.css";

export type Info = NodeOf<"info">;
export type RowActions = ReadonlyMap<number, ReactNode>;

/** Color decorates source text. It never determines a clinical value. */
export function suppliedTone(value: string): string | undefined {
  const word = (value.split(/[·\n]/)[0] ?? "").trim().toLowerCase();
  if (/^(overdue|critical|urgent|stat|hh|ll|abnormal|a)$/.test(word))
    return "red";
  if (/^(low|l)$/.test(word)) return "blue";
  if (/^(high|h)$/.test(word)) return "amber";
  if (/^(given|complete|completed|signed|done)$/.test(word)) return "green";
  if (
    /^(held|on-hold|needs review|in progress|in-progress|roomed|arrived)$/.test(
      word,
    )
  )
    return "amber";
  if (/^(refused|declined)$/.test(word)) return "violet";
  if (/^(due|scheduled|pending|booked|ordered|requested|unread)$/.test(word))
    return "blue";
  if (
    /^(future|stopped|discontinued|cancelled|canceled|unknown|not given|not-done)$/.test(
      word,
    )
  )
    return "neutral";
  return undefined;
}
export function SuppliedStatus({ value }: { value: string }) {
  const tone = suppliedTone(value);
  return (
    <span className={tone ? `presentation-status tone-${tone}` : undefined}>
      <DisplayValue value={value || "—"} />
    </span>
  );
}
function isStatus(key: string, kind: UiPresentationKind): boolean {
  return (
    /status|priority|^flag$|^acuity$|^labs$|^imaging$/i.test(key) ||
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
  return (
    <div className="presentation-table-wrap">
      <table
        className={`presentation-table table-${kind}${actions?.size ? " with-row-actions" : ""}`}
        data-columns={columns.length}
        aria-label={node.label}
      >
        <thead>
          <tr>
            {(columns.length ? columns : ["Record"]).map((key) => (
              <th key={key} scope="col">
                {key}
              </th>
            ))}
            {!!actions?.size && <th scope="col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {node.rows.length === 0 ? (
            <tr>
              <td>No records on file</td>
            </tr>
          ) : (
            node.rows.map((row, i) => (
              <tr key={i}>
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
                            ) : (
                              <DisplayValue value={value || "—"} />
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
function NoteCards({ node }: { node: Info }) {
  return (
    <ul className="presentation-notes" aria-label={node.label}>
      {node.rows.length === 0 && <li>No records on file</li>}
      {node.rows.map((row, i) => (
        <li key={i}>
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
      {kind === "folderList" ? (
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
