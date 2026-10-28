"use client";

import { BellOff, BellRing, LoaderCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { usePushDevice, type PushDeviceState } from "../use-push-device";

import { InstallHint } from "./install-hint";

const STATUS: Record<Exclude<PushDeviceState, "needs-install">, string> = {
  checking: "Revisando este teléfono…",
  unconfigured: "Los avisos todavía no están configurados.",
  unsupported: "Este navegador no puede recibir avisos. Prueba con Chrome, Edge, Firefox o Safari actualizados.",
  blocked:
    "Bloqueaste los avisos de Reciclamigo en este navegador. Para recibirlos, permítelos en la configuración del sitio y vuelve aquí.",
  off: "Activa los avisos para enterarte de los lotes cuando se publican, sin tener el mapa abierto.",
  on: "Los avisos están activos en este teléfono.",
};

/**
 * Activar o desactivar los avisos push de este teléfono: registra el service worker, pide el permiso,
 * se suscribe y guarda el dispositivo en el servidor.
 */
export function EnablePush() {
  const { state, busy, error, enable, disable } = usePushDevice();

  return (
    <section aria-labelledby="avisos-telefono" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-raised">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          {state === "on" ? <BellRing className="size-5" aria-hidden="true" /> : <BellOff className="size-5" aria-hidden="true" />}
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="avisos-telefono" className="text-lg font-bold tracking-tight">
            Avisos en este teléfono
          </h2>
          {state === "needs-install" ? null : (
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {STATUS[state]}
            </p>
          )}
        </div>
      </div>

      {state === "needs-install" ? <InstallHint /> : null}

      {state === "off" ? (
        <button type="button" onClick={enable} disabled={busy} className={buttonVariants({ size: "xl", className: "w-full sm:w-fit" })}>
          {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <BellRing aria-hidden="true" />}
          {busy ? "Activando…" : "Activar avisos"}
        </button>
      ) : null}

      {state === "on" ? (
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          className={buttonVariants({ size: "lg", variant: "outline", className: "h-11 w-full px-4 sm:w-fit" })}
        >
          {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          {busy ? "Desactivando…" : "Desactivar"}
        </button>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
