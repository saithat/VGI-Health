import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
const envDir = fileURLToPath(new URL("../", import.meta.url));
const env = loadEnv("test", envDir, "");
for (const key of [
  "VGI_USER_PASSWORD",
  "MEDPLUM_CLIENT_ID",
  "MEDPLUM_CLIENT_SECRET",
]) {
  if (env[key]) process.env[key] ??= env[key];
}
export default defineConfig({
  envDir,
  test: {
    environment: "node",
    include: ["live/**/*.test.ts"],
    fileParallelism: false,
    // Full clinical episodes traverse the dense canonical WASM trees serially.
    testTimeout: 180000,
    hookTimeout: 30000,
  },
});
