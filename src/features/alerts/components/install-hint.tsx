import { Share, SquarePlus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Pista para iPhone: los avisos solo funcionan con la app instalada en la pantalla de inicio.
 * Quien la usa decide cuándo mostrarla (iPhone y app sin instalar).
 */
export function InstallHint({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg bg-paper-2 p-3 text-sm", className)}>
      <p className="font-semibold">En iPhone, instala la app primero</p>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-muted-foreground">
        <li>
          Abre Reciclamigo en Safari y toca <Share className="inline size-4 align-text-bottom text-foreground" aria-hidden="true" />{" "}
          <strong className="font-semibold text-foreground">Compartir</strong>.
        </li>
        <li>
          Elige <SquarePlus className="inline size-4 align-text-bottom text-foreground" aria-hidden="true" />{" "}
          <strong className="font-semibold text-foreground">Agregar a pantalla de inicio</strong>.
        </li>
        <li>Abre Reciclamigo desde el ícono nuevo y activa los avisos.</li>
      </ol>
    </div>
  );
}
