import type { Plugin, Rollup } from "vite";
import { gzipSync } from "node:zlib";
/** Audit the transitive emitted chunks, including dynamic imports, rather than
 * only looking at the tiny entry stub or package.json dependencies. */
export function leanBundlePlugin(): Plugin {
  return {
    name: "lean-clinical-bundle-audit",
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter(
        (value): value is Rollup.OutputChunk => value.type === "chunk",
      );
      function graph(entry: Rollup.OutputChunk) {
        const visited = new Map<string, Rollup.OutputChunk>();
        const walk = (chunk: Rollup.OutputChunk) => {
          if (visited.has(chunk.fileName)) return;
          visited.set(chunk.fileName, chunk);
          for (const name of [...chunk.imports, ...chunk.dynamicImports]) {
            const next = bundle[name];
            if (next?.type === "chunk") walk(next);
          }
        };
        walk(entry);
        return {
          chunks: [...visited.keys()],
          modules: [
            ...new Set(
              [...visited.values()].flatMap((c) => Object.keys(c.modules)),
            ),
          ].sort(),
          bytes: [...visited.values()].reduce(
            (n, c) => n + Buffer.byteLength(c.code),
            0,
          ),
          gzipBytes: [...visited.values()].reduce(
            (n, c) => n + gzipSync(c.code).length,
            0,
          ),
        };
      }
      const lean = chunks.find((c) => c.facadeModuleId?.endsWith("/lean.html"));
      const app = chunks.find((c) => c.facadeModuleId?.endsWith("/index.html"));
      if (!lean || !app) throw new Error("Missing application entry chunks");
      const report = { lean: graph(lean), app: graph(app) };
      if (
        report.lean.modules.some((id) =>
          /node_modules\/(?:\.pnpm\/)?(?:react(?:-dom)?(?:@|\/)|@mantine)/.test(
            id,
          ),
        )
      )
        throw new Error("Framework dependency reached the Lean clinical entry");
      this.emitFile({
        type: "asset",
        fileName: "lean-bundle-report.json",
        source: JSON.stringify(report, null, 2) + "\n",
      });
    },
  };
}
