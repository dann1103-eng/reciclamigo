import type { MetadataRoute } from "next";

// El mismo color de papel que el themeColor del layout raíz.
const PAPER = "#f7f6ef";

/**
 * La app se instala desde el navegador (PWA): no hay tienda. Abre en /inicio, que lleva a cada
 * persona a la pantalla de su rol. El ícono se genera en /pwa-icon/[size].
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Reciclamigo",
    short_name: "Reciclamigo",
    description: "Mercado circular de plástico en El Salvador: publica tu lote y un reciclador cercano lo recoge.",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    lang: "es-SV",
    background_color: PAPER,
    theme_color: PAPER,
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      // Con margen de seguridad para que Android lo recorte en círculo o cuadrado sin cortar el símbolo.
      { src: "/pwa-icon/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
