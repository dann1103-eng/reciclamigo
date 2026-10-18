import { defineConfig } from "@playwright/test";

// Las pruebas que reinician el demo necesitan DEMO_RESET_TOKEN de .env.local.
try {
  process.loadEnvFile(".env.local");
} catch {
  // En CI o sin .env.local se usan las variables del entorno.
}

// Usa el Edge instalado en Windows (sin descargar navegadores). Contra local por defecto;
// E2E_BASE_URL apunta a otro despliegue (p. ej. producción en Vercel).
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: "msedge",
    viewport: { width: 1366, height: 768 },
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
