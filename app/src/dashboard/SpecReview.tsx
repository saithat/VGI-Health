import { useEffect, useMemo, useState } from "react";
import { loadSpecReview } from "./data";
import type { SpecReviewData } from "./spec-review-data";
import "./spec-review.css";

type Item = SpecReviewData["items"][number];
const classKeys = ["trusted", "proven", "unverified"] as const;
export const classLabels = {
  trusted: "Trusted base, review",
  proven: "Proven lemma, no review needed",
  unverified: "Unverified code",
};

const kindLabel: Record<string, string> = {
  theorem: "Theorem",
  lemma: "Theorem",
  def: "Definition",
  abbrev: "Definition",
  structure: "Structure",
  inductive: "Type",
  class: "Class",
  instance: "Instance",
  inline: "Inline rule",
};
const scopeLabel = {
  declaration: "Flagged on the declaration",
  section: "Flagged by the module note",
  inline: "Flagged inside a declaration",
};
/** Join wrapped source lines; keep paragraph and list breaks. */
const prose = (text: string) =>
  text.replace(/([^\n])\n[ \t]*(?!\n|(?:[-*]|\d+\.)\s)/g, "$1 ");
const area = (file: string) => file.split("/")[2]?.replace(/\.lean$/, "") ?? "";

export function filterItems(
  items: Item[],
  query: string,
  kind: string,
  where: string,
  classification = "all",
): Item[] {
  const q = query.trim().toLowerCase();
  return items.filter(
    (i) =>
      (classification === "all" || i.classification === classification) &&
      (kind === "all" || (kindLabel[i.kind] ?? i.kind) === kind) &&
      (where === "all" || area(i.file) === where) &&
      (!q ||
        i.name.toLowerCase().includes(q) ||
        i.file.toLowerCase().includes(q) ||
        i.note.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q)),
  );
}

function ItemView({ item }: { item: Item }) {
  return (
    <article className="spec-item">
      <header>
        <span className={`spec-kind spec-kind-${item.kind}`}>
          {kindLabel[item.kind] ?? item.kind}
        </span>
        <code className="spec-name">{item.name || "(file scope)"}</code>
        <span className="spec-where">
          {item.file.replace(/^lean\//, "")}:{item.line}
        </span>
      </header>
      <p className="spec-scope">{classLabels[item.classification]}</p>
      <p className="spec-note" title={scopeLabel[item.scope]}>
        {prose(
          item.scope === "section" && item.docstring
            ? item.docstring
            : item.note,
        )}
      </p>
      {item.scope === "section" && (
        <p className="spec-scope">{scopeLabel.section}</p>
      )}
      <pre className="spec-code">{item.code}</pre>
      {item.truncated && (
        <p className="spec-scope">
          Shortened; open the file for the full text.
        </p>
      )}
    </article>
  );
}

function FileGroup({
  file,
  items,
  initiallyOpen,
}: {
  file: string;
  items: Item[];
  initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const note = items.find((i) => i.scope === "section")?.note;
  return (
    <details
      className="spec-file"
      open={initiallyOpen}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span className="spec-file-name">{file.replace(/^lean\//, "")}</span>
        <span className="spec-count">{items.length}</span>
      </summary>
      {open && (
        <>
          {note && <p className="spec-module-note">{prose(note)}</p>}
          {items.map((i) => (
            <ItemView key={`${i.file}:${i.line}`} item={i} />
          ))}
        </>
      )}
    </details>
  );
}

export function SpecReview() {
  const [data, setData] = useState<SpecReviewData | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [where, setWhere] = useState("all");
  const [classification, setClassification] = useState("trusted");
  useEffect(() => {
    let live = true;
    loadSpecReview()
      .then((d) => live && setData(d))
      .catch((e: unknown) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, []);
  const shown = useMemo(
    () =>
      data ? filterItems(data.items, query, kind, where, classification) : [],
    [data, query, kind, where, classification],
  );
  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const i of shown) map.set(i.file, [...(map.get(i.file) ?? []), i]);
    return [...map];
  }, [shown]);
  if (error)
    return (
      <p className="failure-message" role="alert">
        Unable to read the Lean sources: {error}
      </p>
    );
  if (!data) return <p role="status">Reading the Lean sources…</p>;
  const kinds = [
    ...new Set(data.items.map((i) => kindLabel[i.kind] ?? i.kind)),
  ].sort();
  const areas = [...new Set(data.items.map((i) => area(i.file)))].sort();
  return (
    <section
      className="spec-review"
      aria-label="Specifications awaiting owner review"
    >
      <p className="spec-intro">
        Source flags grouped by Lean’s generated statement and definition
        closure from the canonical headline guarantees (
        {data.trustedDeclarations} declarations).
      </p>
      <p className="spec-intro">
        <strong>Trusted base:</strong> Review the statements, definitions and
        types reachable from those guarantees.
      </p>
      <p className="spec-intro">
        <strong>Proven lemmas:</strong> Lean checks these proofs, and their
        statements are outside that closure, so no review is needed.
      </p>
      <p className="spec-intro">
        <strong>Unverified code:</strong> No headline theorem covers these
        definitions, types or inline rules outside the closure.
      </p>
      <dl className="spec-stats">
        {classKeys.map((key) => (
          <div key={key}>
            <dt>{classLabels[key]}</dt>
            <dd>{data.classes[key]}</dd>
          </div>
        ))}
        <div>
          <dt>Files</dt>
          <dd>{new Set(data.items.map((i) => i.file)).size}</dd>
        </div>
        <div>
          <dt>Source digest</dt>
          <dd title={data.sourceDigest}>
            <code>{data.sourceDigest.slice(0, 12)}</code>
          </dd>
        </div>
      </dl>
      <div className="spec-filters">
        <label>
          Class
          <select
            value={classification}
            onChange={(e) => setClassification(e.currentTarget.value)}
          >
            <option value="all">All classes</option>
            {classKeys.map((key) => (
              <option key={key} value={key}>
                {classLabels[key]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Search
          <input
            type="search"
            value={query}
            placeholder="Name, file, note or text"
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
        </label>
        <label>
          Kind
          <select value={kind} onChange={(e) => setKind(e.currentTarget.value)}>
            <option value="all">All kinds</option>
            {kinds.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label>
          Area
          <select
            value={where}
            onChange={(e) => setWhere(e.currentTarget.value)}
          >
            <option value="all">All areas</option>
            {areas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <span role="status" className="spec-shown">
          {shown.length} shown in {groups.length} files
        </span>
      </div>
      {groups.map(([file, items]) => (
        <FileGroup
          key={`${file}|${query}|${kind}|${where}|${classification}`}
          file={file}
          items={items}
          initiallyOpen={shown.length <= 30}
        />
      ))}
    </section>
  );
}
