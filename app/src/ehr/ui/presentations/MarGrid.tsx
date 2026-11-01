import type { Info, RowActions } from "./StructuredInfo";
import { SuppliedStatus } from "./StructuredInfo";
import { DisplayValue } from "../display";
import { clinicalTime } from "../clinical-formatters";

const detailKeys = new Set([
  "Medication",
  "Dose",
  "Route",
  "Frequency",
  "Instructions",
  "Category",
  "PRN indication",
  "Order status",
]);
/** Medication details stay together; hour columns are already assigned by Lean. */
export function MarGrid({
  node,
  actions,
}: {
  node: Info;
  actions?: RowActions | undefined;
}) {
  const columns = [
    ...new Set(node.rows.flatMap((row) => row.map(([key]) => key))),
  ].filter((key) => !detailKeys.has(key));
  const hours = columns.map((key) => {
    const iso =
      /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?\s*(Z|[+-]\d{2}:\d{2})?$/.exec(
        key,
      );
    if (iso)
      return {
        key,
        day: `${iso[1]}${iso[3] ? ` ${iso[3]}` : ""}`,
        label: iso[2] ?? key,
      };
    const match = /^(.*\S)\s+(\d{2}:\d{2})$/.exec(key);
    return { key, day: match?.[1] ?? "", label: match?.[2] ?? key };
  });
  const dated = hours.some((hour) => hour.day !== "");
  const groups: { day: string; key: string; count: number }[] = [];
  for (const hour of hours) {
    const previous = groups.at(-1);
    if (hour.day && previous?.day === hour.day) previous.count += 1;
    else groups.push({ day: hour.day, key: hour.key, count: 1 });
  }
  const documentation = node.rows.flatMap((row) => {
    const medication =
      row.find(([key]) => key === "Medication")?.[1] ?? "Medication";
    return row.flatMap(([key, value]) =>
      !detailKeys.has(key) && value.split(" · ").length > 3
        ? [{ medication, time: key, value }]
        : [],
    );
  });
  return (
    <>
      <div className="presentation-table-wrap">
        <table
          className="presentation-table presentation-mar"
          aria-label={node.label}
        >
          <thead>
            <tr>
              <th scope="col" rowSpan={dated ? 2 : 1}>
                Medication / order details
              </th>
              {dated
                ? groups.map((group) => (
                    <th
                      key={group.key}
                      scope={group.day ? "colgroup" : "col"}
                      colSpan={group.count}
                      rowSpan={group.day ? 1 : 2}
                      className={group.day ? "mar-day-heading" : undefined}
                    >
                      <span
                        title={group.day || group.key}
                        aria-label={group.day || group.key}
                      >
                        {clinicalTime(group.day || group.key)}
                      </span>
                    </th>
                  ))
                : columns.map((key) => (
                    <th key={key} scope="col">
                      <span title={key} aria-label={key}>
                        {clinicalTime(key)}
                      </span>
                    </th>
                  ))}
            </tr>
            {dated && (
              <tr>
                {hours
                  .filter((hour) => hour.day)
                  .map((hour) => (
                    <th key={hour.key} scope="col" className="mar-hour-heading">
                      <span title={hour.key} aria-label={hour.label}>
                        {hour.label.replace(":", "")}
                      </span>
                    </th>
                  ))}
              </tr>
            )}
          </thead>
          <tbody>
            {node.rows.length === 0 && (
              <tr>
                <td>No records on file</td>
              </tr>
            )}
            {node.rows.map((row, i) => (
              <tr key={i}>
                <td data-column="Medication / order details">
                  <dl className="mar-order-details">
                    {row
                      .filter(([key]) => detailKeys.has(key))
                      .map(([key, value], n) => (
                        <div
                          key={n}
                          className={
                            key === "Medication"
                              ? "mar-medication-name"
                              : "mar-medication-detail"
                          }
                        >
                          <dt>{key}</dt>
                          <dd>
                            {key === "Order status" ? (
                              <SuppliedStatus value={value} />
                            ) : (
                              <DisplayValue value={value || "—"} />
                            )}
                          </dd>
                        </div>
                      ))}
                  </dl>
                  {actions?.get(i) && (
                    <div className="presentation-row-actions">
                      {actions.get(i)}
                    </div>
                  )}
                </td>
                {columns.map((key) => (
                  <td key={key} data-column={key}>
                    {row
                      .filter(([name, value]) => name === key && value !== "")
                      .map(([, value], n) => (
                        <span className="presentation-cell-value" key={n}>
                          <SuppliedStatus
                            value={value.split(" · ").slice(0, 3).join(" · ")}
                          />
                        </span>
                      ))}
                    {!row.some(
                      ([name, value]) => name === key && value !== "",
                    ) && <span className="presentation-missing">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {documentation.length > 0 && (
        <>
          <h4 className="presentation-subheading">
            Administration documentation
          </h4>
          <ul
            className="mar-documentation"
            aria-label={`${node.label} administration details`}
          >
            {documentation.map((record, i) => (
              <li key={i}>
                <strong>{record.medication}</strong>
                <span
                  className="mar-documentation-time"
                  title={record.time}
                  aria-label={record.time}
                >
                  {clinicalTime(record.time)}
                </span>
                <SuppliedStatus value={record.value} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
