import { execFileSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { brotliCompress, gzip, constants } from "node:zlib";
import { promisify } from "node:util";
import type { Plugin } from "vite";
import { acceptedEncoding } from "./artifact-response";

/** Precompress only the small built app, never copy the repository data trees. */
export function compressionPlugin(): Plugin {
  let output = "";
  let leanHash = "";
  return {
    name: "compressed-preview-assets",
    async configResolved(config) {
      output = resolve(config.root, config.build.outDir);
      leanHash = JSON.parse(
        await readFile(
          resolve(config.root, "public/ehr/manifest.json"),
          "utf8",
        ),
      ).leanSourceHash;
    },
    async closeBundle() {
      await writeFile(
        resolve(output, "build-info.json"),
        JSON.stringify({
          revision: execFileSync("git", ["rev-parse", "HEAD"], {
            encoding: "utf8",
          }).trim(),
          mainRevision: execFileSync("git", ["rev-parse", "origin/main"], {
            encoding: "utf8",
          }).trim(),
          leanHash,
          builtAt: new Date().toISOString(),
        }),
      );
      async function compress(directory: string): Promise<void> {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          const file = resolve(directory, entry.name);
          if (entry.isDirectory()) await compress(file);
          else if (/\.(?:js|mjs|css|html|json|wasm|svg)$/.test(file)) {
            const body = await readFile(file);
            await writeFile(
              `${file}.br`,
              await promisify(brotliCompress)(body, {
                params: { [constants.BROTLI_PARAM_QUALITY]: 6 },
              }),
            );
            await writeFile(`${file}.gz`, await promisify(gzip)(body));
          }
        }
      }
      await compress(output);
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const file = resolve(output, `.${decodeURIComponent(url.pathname)}`);
        if (
          !file.startsWith(output + sep) ||
          !/\.(?:js|mjs|css|html|json|wasm|svg)$/.test(file)
        )
          return next();
        try {
          const type = file.endsWith(".wasm")
            ? "application/wasm"
            : /\.(m?js)$/.test(file)
              ? "text/javascript"
              : file.endsWith(".css")
                ? "text/css"
                : file.endsWith(".json")
                  ? "application/json"
                  : file.endsWith(".svg")
                    ? "image/svg+xml"
                    : "text/html";
          const encoding = acceptedEncoding(req.headers["accept-encoding"]);
          const body = await readFile(
            file + (encoding === "br" ? ".br" : encoding ? ".gz" : ""),
          );
          res.setHeader("Content-Type", type);
          res.setHeader("Vary", "Accept-Encoding");
          res.setHeader(
            "Cache-Control",
            /\/assets\/[^/]+-[\w-]+\./.test(url.pathname) ||
              (url.pathname.endsWith(".wasm") &&
                url.searchParams.get("v") === leanHash)
              ? "public, max-age=31536000, immutable"
              : "no-cache",
          );
          if (encoding) res.setHeader("Content-Encoding", encoding);
          res.setHeader("Content-Length", body.length);
          res.end(req.method === "HEAD" ? undefined : body);
        } catch {
          next();
        }
      });
    },
  };
}
