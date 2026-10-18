"use client";

import { X } from "lucide-react";

/** Aviso flotante bajo el encabezado cuando falla un cambio de cuenta. */
export function SwitchError({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-20 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-destructive/30 bg-card px-4 py-3 text-sm font-medium shadow-float"
    >
      <p className="flex-1 text-foreground">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="-m-1 rounded-md p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <X className="size-4" aria-hidden="true" />
        <span className="sr-only">Cerrar aviso</span>
      </button>
    </div>
  );
}
