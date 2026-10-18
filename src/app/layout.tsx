import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Una sola familia: grotesca robusta, de rótulo de camión y báscula.
// El eje de ancho (wdth) da titulares semicondensados sin una segunda fuente.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Reciclamigo: el plástico de tu negocio tiene comprador",
    template: "%s · Reciclamigo",
  },
  description:
    "Mercado circular de plástico en El Salvador: los comercios publican sus lotes y recicladores cercanos los recogen, con trazabilidad para la Ley ANDRES.",
};

export const viewport: Viewport = {
  themeColor: "#f7f6ef",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-SV" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
