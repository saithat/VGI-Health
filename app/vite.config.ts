import { defineConfig } from "vitest/config";
import { catalogPlugin } from "./scripts/catalog-plugin";
import react from "@vitejs/plugin-react";
import { runsPlugin } from "./scripts/runs-plugin";

export default defineConfig({
  envDir: "..",
  plugins: [react(), runsPlugin(), catalogPlugin()],
  test: { environment: "jsdom", include: ["tests/**/*.test.{ts,tsx,js}"] },
});
