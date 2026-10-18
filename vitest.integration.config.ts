import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Pruebas contra el proyecto Supabase real (.env.local). Necesitan `npm run seed` antes.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // server-only lanza error fuera de React Server Components.
      "server-only": fileURLToPath(new URL("./tests/integration/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    env: loadEnv("", process.cwd(), ""),
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
