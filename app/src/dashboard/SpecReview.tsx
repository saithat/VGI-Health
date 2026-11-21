import { useEffect, useMemo, useState } from "react";
import { loadSpecReview } from "./data";
import type { SpecReviewData } from "./spec-review-data";
import "./spec-review.css";

type Item = SpecReviewData["items"][number];

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
): Item[] {
  const q = query.trim().toLowerCase();
  return items.filter(
    (i) =>
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
    () => (data ? filterItems(data.items, query, kind, where) : []),
    [data, query, kind, where],
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
  const theorems = data.items.filter(
    (i) => i.kind === "theorem" || i.kind === "lemma",
  ).length;
  return (
    <section
      className="spec-review"
      aria-label="Specifications awaiting owner review"
    >
      <p className="spec-intro">
        Every Lean statement marked for owner review, read from the source each
        time this page loads. An item leaves the list when its “for owner
        review” marker is removed after review. For a theorem, only the
        statement is shown: the proof is checked by Lean and needs no review.
        For a definition, the whole body is the specification.
      </p>
      <dl className="spec-stats">
        <div>
          <dt>Awaiting review</dt>
          <dd>{data.total}</dd>
        </div>
        <div>
          <dt>Theorem statements</dt>
          <dd>{theorems}</dd>
        </div>
        <div>
          <dt>Definitions and types</dt>
          <dd>{data.total - theorems}</dd>
        </div>
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
          key={`${file}|${query}|${kind}|${where}`}
          file={file}
          items={items}
          initiallyOpen={shown.length <= 30}
        />
      ))}
    </section>
  );
}
