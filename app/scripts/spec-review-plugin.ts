import type { Plugin } from "vite";
import { sendArtifact } from "./artifact-response";
import { buildSpecReview } from "./spec-review.mjs";

/** Serves the owner-review catalog, rebuilt from the Lean sources per request. */
export function specReviewPlugin(): Plugin {
  const attach = (
    server: Pick<import("vite").ViteDevServer, "middlewares">,
  ) => {
    server.middlewares.use(async (req, res, next) => {
      if (
        new URL(req.url ?? "/", "http://localhost").pathname !==
        "/spec-review.json"
      )
        return next();
      try {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        await sendArtifact(
          req,
          res,
          "/spec-review.json",
          Buffer.from(JSON.stringify(await buildSpecReview())),
        );
      } catch (error) {
        console.error("Spec review failed:", error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: "Unable to read the Lean sources" }));
      }
    });
  };
  return {
    name: "spec-review",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
