import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { z } from "zod";
const schema = z.object({
  base: z.string(),
  tokens: z.record(z.string(), z.string()),
  users: z.record(z.string(), z.unknown()),
});
export async function startPainterService(persona: string) {
  const child = spawn(
    process.execPath,
    [
      "--experimental-strip-types",
      fileURLToPath(
        new URL(
          "../../services/commit/test/lean-painter-host.ts",
          import.meta.url,
        ),
      ),
    ],
    {
      env: {
        ...process.env,
        LEAN_PAINTER_TEST_PERSONA: persona,
        EHR_BIN: fileURLToPath(
          new URL("../../lean/.lake/build/bin/ehr", import.meta.url),
        ),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let errors = "";
  child.stderr.on("data", (bytes) => {
    errors += String(bytes);
  });
  const ready = await new Promise<z.infer<typeof schema>>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Painter service timeout: ${errors}`));
    }, 30000);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Painter service exit ${code}: ${errors}`));
    });
    let buffer = "";
    child.stdout.on("data", (bytes) => {
      buffer += String(bytes);
      if (!buffer.includes("\n")) return;
      clearTimeout(timeout);
      try {
        resolve(schema.parse(JSON.parse(buffer.split("\n")[0] ?? "")));
      } catch (error) {
        child.kill();
        reject(error);
      }
    });
  });
  return {
    ...ready,
    async close() {
      const closed = once(child, "exit");
      child.kill("SIGTERM");
      await closed;
    },
  };
}
