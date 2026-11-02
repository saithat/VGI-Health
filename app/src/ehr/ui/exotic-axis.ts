import type { UiNode, UiScreen } from "./types";
export interface SourceAxis {
  dated: { minute: number; node: UiNode }[];
  undated: UiNode[];
}
/** Reject ambiguous local timestamps and impossible calendar dates. */
export function sourceMinute(value: string): number | null {
  let text = value;
  if (
    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(
      value,
    )
  ) {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    if (
      year === undefined ||
      month === undefined ||
      day === undefined ||
      new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !==
        value.slice(0, 10)
    )
      return null;
    if (value.length === 10) text += "T00:00:00Z";
  } else if (/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/.test(value))
    text += " 00:00:00 GMT";
  else return null;
  const stamp = Date.parse(text);
  if (!Number.isFinite(stamp) || stamp < 0) return null;
  if (
    /^[A-Z]/.test(value) &&
    new Date(stamp).toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    }) !== value
  )
    return null;
  return Math.floor(stamp / 60000);
}
/** Source-date index only. Complete clinical rows stay in the workspace below.
Unknown dates acquire no coordinate; equal dates retain source order. */
export function sourceAxis(screen: UiScreen): SourceAxis {
  const dated: SourceAxis["dated"] = [];
  const visit = (node: UiNode) => {
    if ("info" in node)
      for (const row of node.info.rows) {
        const date = row.find(
          ([key, value]) =>
            /date|recorded|collected|issued|time/i.test(key) &&
            sourceMinute(value) !== null,
        );
        if (date) {
          const minute = sourceMinute(date[1]);
          if (minute !== null)
            dated.push({
              minute,
              node: {
                text: { s: `${node.info.label} · ${date[0]}: ${date[1]}` },
              },
            });
        }
      }
    if ("section" in node) node.section.children.forEach(visit);
    if ("columns" in node) node.columns.children.forEach(visit);
    if ("timeline" in node) node.timeline.children.forEach(visit);
    if ("presentation" in node) node.presentation.children.forEach(visit);
    if ("valueSet" in node) node.valueSet.children.forEach(visit);
    if ("chartReferences" in node) node.chartReferences.children.forEach(visit);
    if ("rowAction" in node) node.rowAction.children.forEach(visit);
    if ("tabs" in node) node.tabs.body.forEach(visit);
  };
  [...screen.workspace, ...screen.side].forEach(visit);
  dated.sort((a, b) => a.minute - b.minute);
  return { dated, undated: [] };
}
