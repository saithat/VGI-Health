import { readFile, stat } from "node:fs/promises";
import { brotliCompress, gzip } from "node:zlib";
import { promisify } from "node:util";
import type { IncomingMessage, ServerResponse } from "node:http";

const br = promisify(brotliCompress),
  gz = promisify(gzip);
export function acceptedEncoding(header = ""): "br" | "gzip" | null {
  const qualities = new Map(
    header.split(",").map((part) => {
      const [name = "", ...params] = part.trim().split(";");
      const quality = params
        .find((p) => p.trim().startsWith("q="))
        ?.trim()
        .slice(2);
      return [name, quality === undefined ? 1 : Number(quality)] as const;
    }),
  );
  const quality = (name: string) =>
    qualities.get(name) ?? qualities.get("*") ?? 0;
  return quality("br") > 0 && quality("br") >= quality("gzip")
    ? "br"
    : quality("gzip") > 0
      ? "gzip"
      : null;
}
const cache = new Map<
  string,
  { stamp: string; body: Buffer; br: Buffer; gzip: Buffer }
>();
/** Bounded server-side cache; repository artifacts are revalidated after edits. */
export async function sendArtifact(
  req: IncomingMessage,
  res: ServerResponse,
  key: string,
  source: string | Buffer,
  immutable = false,
) {
  const stamp =
    typeof source === "string"
      ? await stat(source).then((s) => `${s.mtimeMs}-${s.size}`)
      : source.toString("base64");
  let entry = cache.get(key);
  if (!entry || entry.stamp !== stamp) {
    const body = typeof source === "string" ? await readFile(source) : source;
    entry = { stamp, body, br: await br(body), gzip: await gz(body) };
    if (cache.size >= 64) cache.delete(cache.keys().next().value ?? "");
    cache.set(key, entry);
  }
  const etag = `W/"${entry.body.length}-${typeof source === "string" ? stamp : (await import("node:crypto")).createHash("sha256").update(source).digest("hex")}"`;
  res.setHeader(
    "Cache-Control",
    immutable
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate",
  );
  res.setHeader("ETag", etag);
  res.setHeader("Vary", "Accept-Encoding");
  if (req.headers["if-none-match"] === etag) {
    res.statusCode = 304;
    res.end();
    return;
  }
  const encoding = acceptedEncoding(req.headers["accept-encoding"]);
  if (encoding) res.setHeader("Content-Encoding", encoding);
  const body = encoding ? entry[encoding] : entry.body;
  res.setHeader("Content-Length", body.length);
  res.end(req.method === "HEAD" ? undefined : body);
}
