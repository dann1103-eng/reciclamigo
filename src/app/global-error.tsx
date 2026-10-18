"use client";

import "./globals.css";

// Último recurso si falla el layout raíz: reemplaza todo el documento.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es-SV">
      <body className="flex min-h-dvh flex-col items-start justify-center gap-6 px-5 sm:px-16">
        <h1 className="text-3xl font-extrabold tracking-tight">Reciclamigo no pudo cargar</h1>
        <p className="text-lg text-muted-foreground">Revisa la conexión e inténtalo de nuevo.</p>
        <button
          type="button"
          onClick={reset}
          className="h-12 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground"
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
