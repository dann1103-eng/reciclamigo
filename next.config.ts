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
};

export default nextConfig;
