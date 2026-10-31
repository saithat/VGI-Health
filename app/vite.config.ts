import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { runsPlugin } from "./scripts/runs-plugin";

export default defineConfig({
  envDir: "..",
  plugins: [react(), runsPlugin()],
  test: { environment: "jsdom", include: ["tests/**/*.test.{ts,tsx,js}"] },
});
