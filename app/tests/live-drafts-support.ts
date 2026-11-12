import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { z } from "zod";
import type { Bundle } from "../src/data/liveStore";
import { bundleSchema } from "../src/data/fhir";
const serviceSchema = z.object({
  base: z.string(),
  token: z.string(),
  spec: z.unknown(),
  program: z.unknown(),
  directory: z
    .unknown()
    .refine((value) => bundleSchema.safeParse(value).success),
});
/** Run service sources in their own Node process and TypeScript configuration. */
export async function startDraftService() {
  const child = spawn(
    process.execPath,
    [
      "--experimental-strip-types",
      fileURLToPath(
        new URL("../../services/commit/test/drafts-host.ts", import.meta.url),
      ),
    ],
    {
      env: {
        ...process.env,
        EHR_BIN: fileURLToPath(
          new URL("../../lean/.lake/build/bin/ehr", import.meta.url),
        ),
      },
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    },
  );
  const stdout = child.stdout;
  const stderr = child.stderr;
  if (!stdout || !stderr) throw new Error("Missing service output pipes");
  let errors = "";
  stderr.on("data", (bytes) => {
    errors += String(bytes);
  });
  const ready = await new Promise<z.infer<typeof serviceSchema>>(
    (resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`Draft service timeout: ${errors}`));
      }, 20_000);
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Draft service exited ${code}: ${errors}`));
      });
      let output = "";
      stdout.on("data", (bytes) => {
        output += String(bytes);
        if (output.includes("\n")) {
          clearTimeout(timer);
          try {
            resolve(
              serviceSchema.parse(JSON.parse(output.split("\n")[0] ?? "")),
            );
          } catch (error) {
            child.kill();
            reject(error);
          }
        }
      });
    },
  );
  const directory: Bundle = JSON.parse(JSON.stringify(ready.directory));
  let nextControl = 0;
  async function control(input: {
    advanceMs?: number;
    changePatient?: string;
  }) {
    const id = ++nextControl;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Draft service control timeout")),
        5000,
      );
      const receive = (message: unknown) => {
        if (z.object({ id: z.number() }).parse(message).id !== id) return;
        clearTimeout(timer);
        child.off("message", receive);
        resolve();
      };
      child.on("message", receive);
      child.send({ id, ...input });
    });
  }
  return {
    ...ready,
    advance: (advanceMs: number) => control({ advanceMs }),
    changePatient: (changePatient: string) => control({ changePatient }),
    directory,
    async close() {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    },
  };
}
