// Spec-review catalog, derived from the Lean sources on every request.
// A declaration needs owner review while its doc comment, a preceding line
// comment, or an enclosing module doc says "for owner review". Removing that
// phrase (after review) removes the item; nothing here is hand-maintained.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

export const repoRoot = resolve(import.meta.dirname, "../..");
const FLAG = /for\s+owner\s+review/i;
const MODIFIER =
  "(?:(?:private|protected|noncomputable|partial|unsafe|nonrec|scoped)\\s+)*";
const DECL = new RegExp(
  `^(?:@\\[[^\\]]*\\]\\s*)*${MODIFIER}(def|theorem|lemma|abbrev|structure|inductive|class|instance|opaque|axiom)\\b\\s*([^\\s:({\\[]*)`,
);
const TOP_LEVEL =
  /^(\/--|\/-!|@\[|namespace\b|end\b|section\b|open\b|#|--|set_option\b|variable\b|attribute\b|deriving\b|universe\b|mutual\b|private\b|protected\b|noncomputable\b|partial\b|unsafe\b|def\b|theorem\b|lemma\b|abbrev\b|structure\b|inductive\b|class\b|instance\b|opaque\b|axiom\b|example\b|import\b|macro\b|syntax\b|elab\b|notation\b|infix)/;
const MAX_LINES = 80;

async function leanFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await leanFiles(path)));
    else if (entry.name.endsWith(".lean")) out.push(path);
  }
  return out;
}

/** End index (exclusive) of a block comment starting at line `i`. */
function commentEnd(lines, i) {
  let depth = 0;
  for (let j = i; j < lines.length; j++) {
    depth += (lines[j].match(/\/-/g) ?? []).length;
    depth -= (lines[j].match(/-\//g) ?? []).length;
    if (depth <= 0) return j + 1;
  }
  return lines.length;
}

function stripComment(text) {
  return text
    .replace(/^\s*\/-[-!]?\s?/, "")
    .replace(/\s*-\/\s*$/, "")
    .replace(/^\s*--\s?/gm, "")
    .trim();
}

/** Theorem statements stop at the top-level `:=`; definitions keep their body. */
function declarationText(lines, start, kind) {
  let end = start + 1;
  while (
    end < lines.length &&
    !(lines[end] && !/^\s/.test(lines[end]) && TOP_LEVEL.test(lines[end]))
  )
    end++;
  while (end > start + 1 && !lines[end - 1].trim()) end--;
  let text = lines.slice(start, end).join("\n");
  if (kind === "theorem" || kind === "lemma") {
    let depth = 0;
    for (let k = 0; k < text.length - 1; k++) {
      const ch = text[k];
      if ("([{⟨".includes(ch)) depth++;
      else if (")]}⟩".includes(ch)) depth--;
      else if (depth === 0 && ch === ":" && text[k + 1] === "=") {
        text = text.slice(0, k).trimEnd();
        break;
      }
    }
  }
  const all = text.split("\n");
  return {
    end,
    code:
      all.length > MAX_LINES
        ? [...all.slice(0, MAX_LINES), "  …"].join("\n")
        : text,
    truncated: all.length > MAX_LINES,
  };
}

/** A flagged comment (line or block) and the code lines it annotates. */
function inlineSpan(lines, i) {
  const indent = lines[i].length - lines[i].trimStart().length;
  let j;
  if (lines[i].trim().startsWith("/-")) j = commentEnd(lines, i);
  else {
    j = i + 1;
    while (j < lines.length && lines[j].trim().startsWith("--")) j++;
  }
  const note = stripComment(lines.slice(i, j).join("\n"));
  let k = j;
  while (k < lines.length && k - j < 30 && lines[k].trim()) {
    const ind = lines[k].length - lines[k].trimStart().length;
    if (k > j && ind <= indent && /^(--|\/-|\}|\]|\))/.test(lines[k].trim()))
      break;
    if (k > j && ind === 0) break;
    k++;
  }
  return { note, codeStart: j, stop: k };
}

function inlineItem(file, lines, i, namespaces, presetNote) {
  const { note, codeStart, stop } = presetNote
    ? { note: presetNote, codeStart: i, stop: inlineSpan(lines, i).stop }
    : inlineSpan(lines, i);
  return {
    file,
    line: i + 1,
    kind: "inline",
    name: namespaces.filter(Boolean).join("."),
    note,
    code: lines.slice(codeStart, stop).join("\n"),
    scope: "inline",
    truncated: false,
    stop,
  };
}

export function parseLean(file, source) {
  const lines = source.split("\n");
  const items = [];
  const namespaces = [];
  let fileNote = null; // flagged module doc before the first declaration
  let sectionNote = null;
  let seenDecl = false;
  let pendingNote = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const ns = /^namespace\s+(\S+)/.exec(line);
    if (ns) namespaces.push(ns[1]);
    const end = /^end\s+(\S+)/.exec(line);
    if (end && namespaces.at(-1) === end[1]) namespaces.pop();
    if (trimmed.startsWith("/-")) {
      const stop = commentEnd(lines, i);
      const text = lines.slice(i, stop).join("\n");
      if (trimmed.startsWith("/-!")) {
        const flagged = FLAG.test(text) ? stripComment(text) : null;
        if (flagged && !seenDecl) fileNote = flagged;
        else sectionNote = flagged;
      } else if (trimmed.startsWith("/--"))
        pendingNote = { text: stripComment(text), flagged: FLAG.test(text) };
      i = stop - 1;
      continue;
    }
    if (trimmed.startsWith("--") && FLAG.test(line)) {
      const { note, codeStart, stop } = inlineSpan(lines, i);
      if (codeStart < lines.length && DECL.exec(lines[codeStart])) {
        pendingNote = { text: note, flagged: true };
        i = codeStart - 1;
        continue;
      }
      items.push(inlineItem(file, lines, i, namespaces));
      i = stop - 1;
      continue;
    }
    const decl = /^\S/.test(line) ? DECL.exec(line) : null;
    if (decl) {
      const kind = decl[1];
      const own = pendingNote?.flagged ? pendingNote.text : null;
      seenDecl = true;
      const note = own ?? sectionNote ?? fileNote;
      const { end: stop, code, truncated } = declarationText(lines, i, kind);
      if (note) {
        const local = decl[2] || "(anonymous)";
        items.push({
          file,
          line: i + 1,
          kind,
          name: local.startsWith("_root_.")
            ? local.slice(7)
            : [...namespaces, local].filter(Boolean).join("."),
          note,
          code,
          scope: own ? "declaration" : "section",
          ...(own ? {} : { docstring: pendingNote?.text ?? null }),
          truncated,
        });
      } else {
        // Flags inside an unflagged declaration annotate part of its body.
        for (let k = i + 1; k < stop; k++) {
          const t = lines[k].trim();
          const block = t.startsWith("/-")
            ? lines.slice(k, commentEnd(lines, k)).join("\n")
            : null;
          if (
            (block && FLAG.test(block)) ||
            (t.startsWith("--") && FLAG.test(t))
          ) {
            const it = inlineItem(file, lines, k, [...namespaces, decl[2]]);
            items.push(it);
            k = it.stop - 1;
          } else if (block) k = commentEnd(lines, k) - 1;
        }
      }
      pendingNote = null;
      i = stop - 1;
      continue;
    }
    if (trimmed && pendingNote?.flagged) {
      // A flagged doc comment that precedes no declaration: keep it visible.
      items.push({
        ...inlineItem(file, lines, i, namespaces, pendingNote.text),
        line: i,
      });
    }
    if (trimmed) pendingNote = null;
  }
  return items;
}

export async function buildSpecReview(root = repoRoot) {
  const leanRoot = join(root, "lean");
  const files = (await leanFiles(join(leanRoot, "Ehr"))).sort();
  const digest = createHash("sha256");
  const items = [];
  for (const path of files) {
    const source = await readFile(path, "utf8");
    const file = relative(root, path).split(sep).join("/");
    digest.update(file).update("\0").update(source).update("\0");
    for (const item of parseLean(file, source)) {
      delete item.stop;
      items.push(item);
    }
  }
  const kinds = {};
  for (const item of items) kinds[item.kind] = (kinds[item.kind] ?? 0) + 1;
  return {
    schemaVersion: 1,
    sourceDigest: digest.digest("hex"),
    filesScanned: files.length,
    total: items.length,
    kinds,
    items,
  };
}
