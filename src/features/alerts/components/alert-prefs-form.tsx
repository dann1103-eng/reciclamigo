"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { ResinMark } from "@/components/polymer/polymer-chip";
import { buttonVariants } from "@/components/ui/button";
import { firstIssue } from "@/features/lots/schemas";
import { POLYMER_CODES, type PolymerCode } from "@/lib/domain/polymers";
import { cn } from "@/lib/utils";

import { saveAlertPrefs } from "../actions";
import { alertPrefsSchema, normalizePolymers } from "../schemas";

export type AlertPrefsValues = {
  enabled: boolean;
  radiusKm: number;
  /** null = todos los tipos. */
  polymers: PolymerCode[] | null;
};

const choiceClass =
  "relative flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-[1.5px] border-border bg-card px-4 text-base font-bold transition-colors hover:bg-paper-2 has-checked:border-brand has-checked:bg-brand-soft has-checked:text-brand has-focus-visible:ring-3 has-focus-visible:ring-ring/50";

/**
 * Preferencias de aviso del reciclador: interruptor, radio (entre los configurados) y tipos de
 * plástico. Todo se guarda con un botón; la base valida que el radio sea uno de los disponibles.
 */
export function AlertPrefsForm({
  radiiKm,
  extraPlanRadiusKm,
  initial,
}: {
  /** Radios que ofrece la app (`settings.alertRadiiKm`). */
  radiiKm: number[];
  extraPlanRadiusKm: number;
  initial: AlertPrefsValues;
}) {
  // Elegir los cinco tipos es lo mismo que "todos" (null): se compara siempre en esa forma.
  const [saved, setSaved] = useState<AlertPrefsValues>(() => ({ ...initial, polymers: normalizePolymers(initial.polymers) }));
  const [enabled, setEnabled] = useState(initial.enabled);
  const [radiusKm, setRadiusKm] = useState(initial.radiusKm);
  const [selected, setSelected] = useState<PolymerCode[]>(initial.polymers ?? POLYMER_CODES);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const polymers = normalizePolymers(selected);
  const dirty =
    enabled !== saved.enabled ||
    radiusKm !== saved.radiusKm ||
    JSON.stringify(polymers) !== JSON.stringify(saved.polymers);

  function togglePolymer(code: PolymerCode) {
    setSelected((current) =>
      // Se conserva el orden de siempre (PET, HDPE…) sin importar en cuál se toca primero.
      POLYMER_CODES.filter((c) => (c === code ? !current.includes(c) : current.includes(c))),
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const input = { radiusKm, polymers, enabled };
    const check = alertPrefsSchema.safeParse(input);
    if (!check.success) return setError(firstIssue(check.error));

    startTransition(async () => {
      try {
        const result = await saveAlertPrefs(input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSaved({ enabled, radiusKm, polymers });
        toast.success("Avisos guardados", {
          description: enabled ? "Te avisamos de los lotes que cumplan lo que elegiste." : "No recibirás avisos de lotes nuevos.",
        });
      } catch {
        setError("No se pudo guardar. Revisa la conexión e inténtalo de nuevo.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 rounded-xl border border-border bg-card p-4 shadow-raised">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span id="avisos-interruptor" className="text-base font-bold">
            Recibir avisos de lotes
          </span>
          <span className="text-sm text-muted-foreground">
            {enabled ? "Te avisamos de los lotes nuevos cerca de ti." : "Apagado: no te avisamos de lotes nuevos."}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="avisos-interruptor"
          onClick={() => setEnabled((value) => !value)}
          className={cn(
            "relative inline-flex h-11 w-16 shrink-0 items-center rounded-full border-[1.5px] outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
            enabled ? "border-brand bg-brand" : "border-input bg-paper-3",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute size-8 rounded-full bg-card shadow-raised transition-all duration-200 motion-reduce:transition-none",
              enabled ? "left-[calc(100%-2.25rem)]" : "left-1",
            )}
          />
        </button>
      </div>

      <fieldset disabled={!enabled} className="flex min-w-0 flex-col gap-3 disabled:opacity-50">
        <legend className="mb-1 text-base font-bold">¿Hasta dónde quieres que te avisemos?</legend>
        <div className="flex flex-wrap gap-2">
          {radiiKm.map((km) => (
            <label key={km} className={cn(choiceClass, "min-w-20 tabular")}>
              <input
                type="radio"
                name="radio"
                value={km}
                checked={radiusKm === km}
                onChange={() => setRadiusKm(km)}
                className="sr-only"
              />
              {km} km
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={!enabled} className="flex min-w-0 flex-col gap-3 disabled:opacity-50">
        <legend className="mb-1 text-base font-bold">¿De qué plásticos?</legend>
        <div className="flex flex-wrap gap-2">
          {POLYMER_CODES.map((code) => (
            <label key={code} className={choiceClass}>
              <input
                type="checkbox"
                name="plastico"
                value={code}
                checked={selected.includes(code)}
                onChange={() => togglePolymer(code)}
                className="sr-only"
              />
              <ResinMark code={code} />
              {code}
            </label>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {polymers === null ? "Te avisamos de todos los tipos." : "Marca solo los que recoges."}
        </p>
      </fieldset>

      <p className="rounded-lg bg-paper-2 px-3 py-2 text-sm text-muted-foreground">
        Los lotes de comercios con plan te llegan antes y desde un poco más lejos: hasta{" "}
        <strong className="tabular font-semibold text-foreground">{extraPlanRadiusKm} km</strong> más que el radio que elegiste.
      </p>

      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending || !dirty} className={buttonVariants({ size: "xl", className: "w-full sm:w-fit" })}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
