import type { Info } from "./StructuredInfo";
import { SuppliedStatus } from "./StructuredInfo";
import { DisplayValue } from "../display";

const detailKeys = new Set([
  "Medication",
  "Dose",
  "Route",
  "Frequency",
  "Order status",
]);
/** Medication details stay together; hour columns are already assigned by Lean. */
export function MarGrid({ node }: { node: Info }) {
  const columns = [
    ...new Set(node.rows.flatMap((row) => row.map(([key]) => key))),
  ].filter((key) => !detailKeys.has(key));
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
              <th scope="col">Medication / order details</th>
              {columns.map((key) => (
                <th key={key} scope="col">
                  {key}
                </th>
              ))}
            </tr>
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
                <span className="mar-documentation-time">{record.time}</span>
                <SuppliedStatus value={record.value} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
