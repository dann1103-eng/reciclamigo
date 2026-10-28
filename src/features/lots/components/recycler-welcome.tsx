"use client";

import { Smartphone, X } from "lucide-react";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "reciclamigo:bienvenida-reciclador";

// Estado del navegador (localStorage) leído como fuente externa: así no hay parpadeo ni setState en un efecto.
let dismissedNow = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function shouldShow(): boolean {
  if (dismissedNow) return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "visto";
  } catch {
    return true; // sin almacenamiento (ventana privada): se muestra y ya
  }
}

function dismiss() {
  dismissedNow = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, "visto");
  } catch {
    // sin almacenamiento: volverá a salir en la próxima visita
  }
  listeners.forEach((listener) => listener());
}

/**
 * Bienvenida del reciclador: no necesita descargar nada, entra desde un enlace o un QR y
 * coordina por WhatsApp. Se puede cerrar y no vuelve a salir en ese teléfono.
 */
export function RecyclerWelcome() {
  const visible = useSyncExternalStore(subscribe, shouldShow, () => false);
  if (!visible) return null;

  return (
    <aside aria-label="Cómo funciona para recicladores" className="flex items-start gap-3 rounded-xl border border-border bg-brand-soft px-4 py-4">
      <Smartphone className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-bold">No tienes que descargar nada</p>
        <p className="text-sm">
          Entras desde un enlace o un QR, ves los lotes cerca en el mapa y reservas el que te sirve. Después coordinas el retiro con
          el comercio por WhatsApp. Reservar es gratis y no pagas comisión si eres reciclador de base.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="-m-2 grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <X className="size-4" aria-hidden="true" />
        <span className="sr-only">Cerrar</span>
      </button>
    </aside>
  );
}
