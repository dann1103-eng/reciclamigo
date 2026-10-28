"use client";

import { BellRing, LoaderCircle, X } from "lucide-react";
import { useSyncExternalStore } from "react";

import { buttonVariants } from "@/components/ui/button";

import { usePushDevice } from "../use-push-device";

import { InstallHint } from "./install-hint";

const COPY = {
  valorizador: {
    title: "Recibe avisos de lotes cerca",
    hint: "Te avisamos cuando alguien publique plástico en tu radio.",
  },
  generador: {
    title: "Recibe avisos de tus lotes",
    hint: "Te avisamos cuando reserven tu lote o confirmen una entrega.",
  },
} as const;

// Cerrar la franja se recuerda en este navegador (si no se puede guardar, solo hasta recargar).
const STORAGE_KEY = "reciclamigo:avisos-franja-cerrada";
let closedThisSession = false;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function isClosed(): boolean {
  if (closedThisSession) return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function close() {
  closedThisSession = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // modo privado o almacenamiento bloqueado: se recuerda solo hasta recargar
  }
  listeners.forEach((listener) => listener());
}

/**
 * Franja compacta para las pantallas de inicio: invita a activar los avisos. Desaparece si ya están
 * activos, si no se pueden activar (sin soporte, bloqueados o sin configurar) o si la persona la cerró.
 */
export function EnablePushPrompt({ role = "valorizador" }: { role?: "generador" | "valorizador" }) {
  const { state, busy, error, enable } = usePushDevice();
  // En el servidor se asume cerrada: la franja nunca sale en el HTML y aparece ya revisado el teléfono.
  const closed = useSyncExternalStore(subscribe, isClosed, () => true);

  if (closed || (state !== "off" && state !== "needs-install")) return null;
  const copy = COPY[role];

  return (
    <section aria-label="Avisos" className="flex flex-col gap-3 rounded-xl border border-border bg-brand-soft px-4 py-3">
      <div className="flex items-center gap-3">
        <BellRing className="size-5 shrink-0 text-brand" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{state === "needs-install" ? "Instala la app para recibir avisos" : copy.title}</p>
          {state === "off" ? <p className="text-sm text-muted-foreground">{copy.hint}</p> : null}
        </div>
        {state === "off" ? (
          <button type="button" onClick={enable} disabled={busy} className={buttonVariants({ size: "lg", className: "h-11 shrink-0 px-4" })}>
            {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
            {busy ? "Activando…" : "Activar"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={close}
          aria-label="Ahora no"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-paper-2 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      {state === "needs-install" ? <InstallHint className="bg-card" /> : null}
      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
