import { defineConfig, loadEnv } from "vite";
const env = loadEnv("test", "..", "");
for (const key of [
  "VGI_USER_PASSWORD",
  "MEDPLUM_CLIENT_ID",
  "MEDPLUM_CLIENT_SECRET",
]) {
  process.env[key] ??= env[key];
}
export default defineConfig({
  envDir: "..",
  test: {
    environment: "node",
    include: ["live/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 90000,
    hookTimeout: 30000,
  },
});
