import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";
import { z } from "zod";
import { nativeCancellation, nativeEnvironment, runNative } from "./native-process.js";
import { REPO_ROOT } from "./util.js";
export const viewport = { w: 1440 * 64, h: 900 * 64 };
export const viewports = [
  viewport,
  { w: 1280 * 64, h: 800 * 64 },
  { w: 1920 * 64, h: 1080 * 64 },
];
export const findingSchema = z.object({
  rule: z.string(),
  metric: z.string().optional(),
  node: z.string().optional(),
  peer: z.string().optional(),
  actual: z.number().optional(),
  required: z.number().optional(),
  deficit: z.number().optional(),
  warning: z.boolean().optional(),
});
export const replySchema = z
  .object({
    accepted: z.boolean().optional(),
    linked: z.boolean().optional(),
    error: z.string().optional(),
    findings: z.array(findingSchema).optional(),
    shapes: z.array(z.array(z.json())).optional(),
    uncoveredShape: z.array(z.json()).optional(),
  })
  .passthrough();
export type LayoutReply = z.infer<typeof replySchema>;
export type LayoutRunner = (
  requests: readonly unknown[],
) => Promise<LayoutReply[]>;
/** EOF flushes ui-layout stdout. Batch independent requests; no recompilation. */
export const layoutRunner: LayoutRunner = async (requests) => {
  if (!requests.length) return [];
  const result = await runNative(
    path.join(REPO_ROOT, "lean/.lake/build/bin/ui-layout"),
    [],
    { input: requests.map((r) => JSON.stringify(r)).join("\n") + "\n" },
  );
  if (result.code !== 0)
    throw Error(`ui-layout exit ${result.code}: ${result.stderr.slice(-2000)}`);
  const rows = result.stdout
    .trim()
    .split("\n")
    .map((line) => replySchema.parse(JSON.parse(line)));
  if (rows.length !== requests.length)
    throw Error("Incomplete ui-layout batch");
  return rows;
};
/** Existing native interpreter; sequential dependent replay calls. */
export class EhrSession {
  private child;
  private pending:
    | {
        resolve: (value: unknown) => void;
        reject: (error: Error) => void;
        timer: NodeJS.Timeout;
      }
    | undefined;
  private failure: Error | undefined;
  private readonly cancellation=nativeCancellation.getStore();
  private readonly cancel=()=>this.child.kill('SIGKILL');
  constructor(binary: string) {
    this.cancellation?.throwIfAborted();
    this.child = spawn(binary, ["serve"], { stdio: ["pipe", "pipe", "pipe"], env: nativeEnvironment() });
    this.cancellation?.addEventListener('abort',this.cancel,{once:true});
    let stderr = "";
    this.child.stderr.on("data", (d) => {
      stderr = (stderr + String(d)).slice(-2000);
    });
    const fail = (error: Error) => {
      this.failure = error;
      if (this.pending) {
        clearTimeout(this.pending.timer);
        this.pending.reject(error);
        this.pending = undefined;
      }
    };
    this.child.on("error", fail);
    this.child.stdin.on("error", fail);
    this.child.on("exit", (code) =>
      fail(Error(`ehr serve exited ${code}: ${stderr}`)),
    );
    createInterface({ input: this.child.stdout }).on("line", (line) => {
      const p = this.pending;
      if (!p) return;
      this.pending = undefined;
      clearTimeout(p.timer);
      try {
        const r = z
          .object({ result: z.unknown(), error: z.string().optional() })
          .parse(JSON.parse(line));
        if (r.error) throw Error(r.error);
        p.resolve(r.result);
      } catch (e) {
        p.reject(e instanceof Error ? e : Error(String(e)));
      }
    });
  }
  call(op: string, input: unknown): Promise<unknown> {
    if (this.failure) return Promise.reject(this.failure);
    if (this.pending)
      return Promise.reject(Error("Concurrent dependent native calls"));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.failure = Error(`ehr serve ${op} timeout`);
        this.child.kill("SIGKILL");
        reject(this.failure);
      }, 120000);
      this.pending = { resolve, reject, timer };
      this.child.stdin.write(JSON.stringify({ op, input }) + "\n");
    });
  }
  close() {
    this.cancellation?.removeEventListener('abort',this.cancel);
    this.child.stdin.end();
    this.child.kill();
  }
}
