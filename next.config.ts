import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Casi todas las rutas dependen de la sesión de Supabase (cookies), así que
  // renderizamos de forma dinámica sin Cache Components por ahora.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    // El "certificado" ahora es un comprobante; los enlaces y QR anteriores siguen funcionando.
    return [{ source: "/certificados/:code", destination: "/comprobantes/:code", permanent: true }];
  },
  async headers() {
    return [
      {
        // El service worker de los avisos push nunca se guarda en caché.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
