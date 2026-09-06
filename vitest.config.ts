import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/ui/demo-api.test.tsx"],
    testTimeout: 30000,
    hookTimeout: 60000,
    maxWorkers: 2,
  },
});
