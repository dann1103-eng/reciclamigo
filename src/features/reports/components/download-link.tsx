import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Enlace a un archivo que genera el servidor (PDF o CSV). Es un <a> normal y no un Link de Next:
 * la respuesta es una descarga (Content-Disposition: attachment), no una pantalla de la app. Sin el
 * atributo `download`, si el servidor responde con un error (p. ej. venció el plan) el navegador
 * muestra el mensaje en español en vez de fallar en silencio.
 */
export function DownloadLink({
  href,
  children,
  variant = "outline",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "outline" | "default";
  className?: string;
}) {
  return (
    <a href={href} className={cn(buttonVariants({ variant, size: "lg" }), "h-11 px-4", className)}>
      {children}
    </a>
  );
}
