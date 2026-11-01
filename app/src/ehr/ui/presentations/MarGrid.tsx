import type { Info } from "./StructuredInfo";
import { SuppliedStatus } from "./StructuredInfo";
import { DisplayValue } from "../display";

const detailKeys = new Set([
  "Medication",
  "Dose",
  "Route",
  "Frequency",
  "Category",
  "Order status",
]);
/** Medication details stay together; hour columns are already assigned by Lean. */
export function MarGrid({ node }: { node: Info }) {
  const columns = [
    ...new Set(node.rows.flatMap((row) => row.map(([key]) => key))),
  ].filter((key) => !detailKeys.has(key));
  return (
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
                        data-order-detail={key}
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
                        <SuppliedStatus value={value} />
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
  );
}
