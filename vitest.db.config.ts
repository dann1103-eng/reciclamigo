import { defineConfig } from "vitest/config";

// Valida las migraciones SQL en un Postgres local (PGlite + PostGIS), sin Docker ni Supabase.
export default defineConfig({
  test: {
    include: ["tests/db/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
